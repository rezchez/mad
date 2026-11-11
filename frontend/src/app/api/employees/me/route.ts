import { NextResponse } from 'next/server';
import { getAuthenticatedUser, getEmployeeProfile } from '@/lib/pocketbase/server';

export async function GET() {
  const { user, token } = await getAuthenticatedUser();

  if (!user || !token) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز. لطفاً وارد سیستم شوید.' }, { status: 401 });
  }

  const employee = await getEmployeeProfile(token, user.id);

  if (!employee) {
    return NextResponse.json({ error: 'اطلاعات پرسنلی برای این کاربر یافت نشد.' }, { status: 404 });
  }

  return NextResponse.json({
    employee,
  });
}
