import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/pocketbase/server';
import { createPersonnelInvitation, listAllInvitations } from '@/lib/pocketbase/invitations';

export async function GET() {
  const { user } = await getAuthenticatedUser();

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'دسترسی غیرمجاز. فقط مدیر سامانه دسترسی دارد.' }, { status: 403 });
  }

  const invitations = await listAllInvitations();
  return NextResponse.json({ invitations });
}

export async function POST(request: NextRequest) {
  const { user } = await getAuthenticatedUser();

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'دسترسی غیرمجاز. فقط مدیر سامانه می‌تواند دعوت‌نامه ثبت کند.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { firstName, lastName, phone, role, department, nationalId, email } = body || {};

    if (!firstName || !lastName || !phone || !role) {
      return NextResponse.json({ error: 'لطفاً نام، نام خانوادگی، شماره موبایل و نقش را وارد کنید.' }, { status: 400 });
    }

    if (role !== 'teacher' && role !== 'staff') {
      return NextResponse.json({ error: 'نقش انتخاب شده نامعتبر است.' }, { status: 400 });
    }

    const result = await createPersonnelInvitation(user.id, {
      firstName,
      lastName,
      phone,
      role,
      department,
      nationalId,
      email,
    });

    const host = request.headers.get('host') || 'localhost:3005';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const inviteUrl = `${protocol}://${host}/register?token=${result.token}`;

    return NextResponse.json({
      success: true,
      message: 'دعوت‌نامه با موفقیت صادر شد و ۲۴ ساعت مهلت دارد.',
      token: result.token,
      expiresAt: result.expiresAt,
      inviteUrl,
      invitation: result.invitation,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطا در صدور دعوت‌نامه' }, { status: 400 });
  }
}
