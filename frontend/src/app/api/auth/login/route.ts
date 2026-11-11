import { NextRequest, NextResponse } from 'next/server';
import { parseAndValidateIdentifier } from '@/lib/security/input-validation';
import { validateCaptcha } from '@/lib/security/captcha';
import { authRateLimiter } from '@/lib/security/rate-limiter';
import {
  findUserByIdentifier,
  authenticateWithPassword,
  AUTH_COOKIE_NAME,
} from '@/lib/pocketbase/server';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'درخواست ارسالی نامعتبر است.' }, { status: 400 });
  }

  const { identifier, password, captchaAnswer, rememberMe } = body || {};

  // Generic Persian error message to avoid account enumeration
  const GENERIC_AUTH_ERROR = 'اطلاعات ورود یا رمز عبور نادرست است.';

  // 1. IP-level Rate Limiting check
  const ipRateLimit = authRateLimiter.check(`login_ip:${ip}`, 5, 15 * 60 * 1000, 10 * 60 * 1000);
  if (!ipRateLimit.allowed) {
    return NextResponse.json(
      {
        error: `تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً پس از ${ipRateLimit.cooldownSecondsRemaining} ثانیه مجدداً تلاش کنید.`,
        cooldownSeconds: ipRateLimit.cooldownSecondsRemaining,
      },
      { status: 429 }
    );
  }

  // 2. Validate CAPTCHA
  const captchaToken = request.cookies.get('captcha_token')?.value;
  const captchaResult = validateCaptcha(captchaToken, captchaAnswer);

  if (!captchaResult.success) {
    authRateLimiter.recordFailure(`login_ip:${ip}`);

    let captchaErrorMsg = 'کد امنیتی اشتباه است.';
    if (captchaResult.reason === 'expired') {
      captchaErrorMsg = 'کد امنیتی منقضی شده است. لطفاً کد جدید را وارد کنید.';
    } else if (captchaResult.reason === 'reused') {
      captchaErrorMsg = 'کد امنیتی قبلاً استفاده شده است. لطفاً کد جدید دریافت کنید.';
    } else if (captchaResult.reason === 'missing' || captchaResult.reason === 'invalid_token') {
      captchaErrorMsg = 'لطفاً کد امنیتی را به درستی وارد کنید.';
    }

    return NextResponse.json(
      {
        error: captchaErrorMsg,
        captchaFailed: true,
      },
      { status: 400 }
    );
  }

  // 3. Validate Inputs
  if (!identifier || !password) {
    return NextResponse.json(
      { error: 'لطفاً تمام فیلدهای الزامی را تکمیل کنید.' },
      { status: 400 }
    );
  }

  const parsedId = parseAndValidateIdentifier(identifier);
  if (parsedId.type === 'invalid') {
    authRateLimiter.recordFailure(`login_ip:${ip}`);
    return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
  }

  // 4. Account-level Rate Limiting
  const accountKey = `login_acc:${parsedId.value}`;
  const accRateLimit = authRateLimiter.check(accountKey, 5, 15 * 60 * 1000, 10 * 60 * 1000);
  if (!accRateLimit.allowed) {
    return NextResponse.json(
      {
        error: `به دلیل تلاش‌های ناموفق مکرر، این حساب موقتاً در حالت تعلیق قرار گرفته است. لطفاً پس از ${accRateLimit.cooldownSecondsRemaining} ثانیه مجدداً تلاش کنید.`,
        cooldownSeconds: accRateLimit.cooldownSecondsRemaining,
      },
      { status: 429 }
    );
  }

  // 5. PocketBase User Resolution & Authentication
  try {
    const user = await findUserByIdentifier(parsedId.type, parsedId.value);
    if (!user) {
      // Record failure on both IP and account key
      authRateLimiter.recordFailure(`login_ip:${ip}`);
      authRateLimiter.recordFailure(accountKey);
      return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
    }

    // Authenticate using PocketBase's native password verification
    const authResult = await authenticateWithPassword(user.email, password);

    // Authentication Successful: Reset rate limits for IP and Account
    authRateLimiter.reset(`login_ip:${ip}`);
    authRateLimiter.reset(accountKey);

    // Prepare response
    const response = NextResponse.json({
      success: true,
      message: 'ورود با موفقیت انجام شد.',
      user: {
        id: authResult.record.id,
        name: authResult.record.name,
        email: authResult.record.email,
        role: authResult.record.role,
        national_id: authResult.record.national_id,
        phone: authResult.record.phone,
      },
      redirectTo: `/dashboard`,
    });

    // Set HttpOnly authentication cookie
    const maxAge = rememberMe ? 7 * 24 * 60 * 60 : undefined; // 7 days or session
    response.cookies.set(AUTH_COOKIE_NAME, authResult.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    // Invalidate the CAPTCHA cookie
    response.cookies.delete('captcha_token');

    return response;
  } catch (err: any) {
    authRateLimiter.recordFailure(`login_ip:${ip}`);
    authRateLimiter.recordFailure(accountKey);
    return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
  }
}
