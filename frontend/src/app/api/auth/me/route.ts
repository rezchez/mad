import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/pocketbase/server';

export async function GET() {
  const { user } = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: 'احراز هویت انجام نشده است.' }, { status: 401 });
  }

  return NextResponse.json({
    user,
  });
}
