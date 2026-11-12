import { NextResponse } from 'next/server';
import { getAuthenticatedUser, getAllEmployees } from '@/lib/pocketbase/server';

export async function GET() {
  const { user } = await getAuthenticatedUser();

  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { error: 'دسترسی غیرمجاز. فقط مدیر سامانه به لیست پرسنل دسترسی دارد.' },
      { status: 403 }
    );
  }

  const employees = await getAllEmployees();

  return NextResponse.json({
    employees,
  });
}
