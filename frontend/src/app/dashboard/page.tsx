import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getEmployeeProfile, getAllEmployees } from '@/lib/pocketbase/server';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const { user, token } = await getAuthenticatedUser();

  if (!user || !token) {
    redirect('/login');
  }

  // Retrieve employee record for authenticated user
  const employee = await getEmployeeProfile(token, user.id);

  // If user is admin, retrieve all employees across the school
  let allEmployees = null;
  if (user.role === 'admin') {
    allEmployees = await getAllEmployees();
  }

  return (
    <DashboardClient
      user={user}
      employee={employee}
      initialAllEmployees={allEmployees}
    />
  );
}
