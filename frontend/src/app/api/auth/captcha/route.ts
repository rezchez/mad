import { NextRequest, NextResponse } from 'next/server';
import { generateCaptchaChallenge } from '@/lib/security/captcha';
import { captchaRateLimiter } from '@/lib/security/rate-limiter';

export async function GET(request: NextRequest) {
  // Extract client IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

  // Apply rate limiting: max 30 CAPTCHA requests per minute per IP
  const rateLimit = captchaRateLimiter.check(`captcha_ip:${ip}`, 30, 60 * 1000, 2 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'تعداد درخواست‌های کد امنیتی بیش از حد مجاز است. لطفاً کمی صبر کنید.',
        cooldownSeconds: rateLimit.cooldownSecondsRemaining,
      },
      { status: 429 }
    );
  }

  // Generate new cryptographic Persian math challenge
  const challenge = generateCaptchaChallenge();

  const response = NextResponse.json({
    question: challenge.question,
    id: challenge.id,
    expiresAt: challenge.expiresAt,
  });

  // Bind the secure challenge token to an HttpOnly cookie
  response.cookies.set('captcha_token', challenge.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 120, // 2 minutes
  });

  return response;
}
