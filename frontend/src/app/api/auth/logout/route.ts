import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/pocketbase/server';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'خروج با موفقیت انجام شد.',
  });

  response.cookies.delete(AUTH_COOKIE_NAME);
  response.cookies.delete('captcha_token');

  return response;
}
