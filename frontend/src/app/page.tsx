import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/pocketbase/server';

export default async function HomePage() {
  const { user } = await getAuthenticatedUser();

  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
