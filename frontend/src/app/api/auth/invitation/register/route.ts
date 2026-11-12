import { NextRequest, NextResponse } from 'next/server';
import { validateCaptcha } from '@/lib/security/captcha';
import { completeRegistration } from '@/lib/pocketbase/invitations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password, nationalId, email, captchaAnswer } = body || {};

    if (!token) {
      return NextResponse.json({ error: 'لینک دعوت‌نامه نامعتبر است.' }, { status: 400 });
    }

    // 1. Verify Persian CAPTCHA
    const captchaToken = request.cookies.get('captcha_token')?.value;
    const captchaResult = validateCaptcha(captchaToken, captchaAnswer);

    if (!captchaResult.success) {
      let msg = 'کد امنیتی اشتباه است.';
      if (captchaResult.reason === 'expired') {
        msg = 'کد امنیتی منقضی شده است. لطفاً کد جدید وارد کنید.';
      } else if (captchaResult.reason === 'reused') {
        msg = 'کد امنیتی قبلاً استفاده شده است.';
      }
      return NextResponse.json({ error: msg, captchaFailed: true }, { status: 400 });
    }

    // 2. Complete registration & invalidate token
    const result = await completeRegistration(token, {
      password,
      nationalId,
      email,
    });

    const response = NextResponse.json({
      success: true,
      message: 'ثبت‌نام شما با موفقیت انجام شد و لینک دعوت‌نامه باطل گردید. اکنون می‌توانید وارد شوید.',
      user: result.user,
    });

    // Clear captcha cookie
    response.cookies.delete('captcha_token');

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطا در ثبت‌نام.' }, { status: 400 });
  }
}
