import { NextRequest, NextResponse } from 'next/server';
import { verifyInvitationToken } from '@/lib/pocketbase/invitations';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ valid: false, message: 'توکن دعوت‌نامه مشخص نشده است.' }, { status: 400 });
  }

  const result = await verifyInvitationToken(token);

  if (!result.valid) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
