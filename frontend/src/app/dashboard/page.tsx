import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getEmployeeProfile } from '@/lib/pocketbase/server';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const { user, token } = await getAuthenticatedUser();

  if (!user || !token) {
    redirect('/login');
  }

  // Retrieve employee record for authenticated user
  const employee = await getEmployeeProfile(token, user.id);

  return (
    <DashboardClient
      user={user}
      employee={employee}
    />
  );
}
