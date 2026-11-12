import PocketBase from 'pocketbase';
import { cookies } from 'next/headers';
import type { IdentifierType } from '../security/input-validation';

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8095';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@school.local';
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || 'password123456';

export const AUTH_COOKIE_NAME = 'pb_auth';

export interface SchoolUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'staff';
  national_id?: string;
  phone?: string;
}

export interface SchoolEmployee {
  id: string;
  user: string;
  personnel_code: string;
  first_name: string;
  last_name: string;
  national_id: string;
  phone: string;
  role: 'admin' | 'teacher' | 'staff';
  department: string;
  email?: string;
}

/**
 * Creates and returns an authenticated PocketBase instance using superuser credentials.
 * Kept exclusively on the server side.
 */
export async function getAdminPocketBase(): Promise<PocketBase> {
  const pb = new PocketBase(POCKETBASE_URL);
  await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
  return pb;
}

/**
 * Searches for a user record by National ID, Phone, or Email.
 * Returns the matching user or null.
 */
export async function findUserByIdentifier(
  type: IdentifierType,
  value: string
): Promise<SchoolUser | null> {
  if (type === 'invalid' || !value) return null;

  try {
    const adminPb = await getAdminPocketBase();
    let filter = '';

    if (type === 'email') {
      filter = adminPb.filter('email = {:val}', { val: value });
    } else if (type === 'national_id') {
      filter = adminPb.filter('national_id = {:val}', { val: value });
    } else if (type === 'phone') {
      filter = adminPb.filter('phone = {:val}', { val: value });
    }

    const record: any = await adminPb.collection('users').getFirstListItem(filter);

    return {
      id: record.id,
      email: record.email,
      name: record.name,
      role: record.role || 'teacher',
      national_id: record.national_id,
      phone: record.phone,
    };
  } catch (err: any) {
    return null;
  }
}

/**
 * Authenticates a user against PocketBase using email and password.
 * This reuses PocketBase's native bcrypt verification and auth token generation.
 */
export async function authenticateWithPassword(email: string, password: string) {
  const pb = new PocketBase(POCKETBASE_URL);
  const authData: any = await pb.collection('users').authWithPassword(email, password);
  return {
    token: authData.token,
    record: {
      id: authData.record.id,
      email: authData.record.email,
      name: authData.record.name,
      role: authData.record.role || 'teacher',
      national_id: authData.record.national_id,
      phone: authData.record.phone,
    } as SchoolUser,
  };
}

/**
 * Creates a PocketBase instance initialized with the given user token.
 */
export function createUserPocketBase(token: string): PocketBase {
  const pb = new PocketBase(POCKETBASE_URL);
  pb.authStore.save(token, null);
  return pb;
}

/**
 * Extracts and verifies the authenticated user from the request's cookies.
 * Verifies with PocketBase via authRefresh to guarantee the token is active and valid.
 */
export async function getAuthenticatedUser(cookieStore?: any): Promise<{
  user: SchoolUser | null;
  token: string | null;
}> {
  try {
    const resolvedCookies = cookieStore || (await cookies());
    const cookie = resolvedCookies.get(AUTH_COOKIE_NAME);

    if (!cookie || !cookie.value) {
      return { user: null, token: null };
    }

    const token = cookie.value;
    const userPb = createUserPocketBase(token);

    // Verify token validity with PocketBase authRefresh
    const refreshed: any = await userPb.collection('users').authRefresh();

    return {
      user: {
        id: refreshed.record.id,
        email: refreshed.record.email,
        name: refreshed.record.name,
        role: refreshed.record.role || 'teacher',
        national_id: refreshed.record.national_id,
        phone: refreshed.record.phone,
      },
      token: refreshed.token,
    };
  } catch (err) {
    return { user: null, token: null };
  }
}

/**
 * Retrieves the employee profile for the authenticated user, enforcing collection rules.
 */
export async function getEmployeeProfile(userToken: string, userId: string): Promise<SchoolEmployee | null> {
  try {
    const userPb = createUserPocketBase(userToken);
    const employee: any = await userPb.collection('employees').getFirstListItem(`user = "${userId}"`);

    return {
      id: employee.id,
      user: employee.user,
      personnel_code: employee.personnel_code,
      first_name: employee.first_name,
      last_name: employee.last_name,
      national_id: employee.national_id,
      phone: employee.phone,
      role: employee.role,
      department: employee.department,
    };
  } catch (e) {
    return null;
  }
}

/**
 * Retrieves all employees across the school. Only accessible to administrators.
 */
export async function getAllEmployees(): Promise<SchoolEmployee[]> {
  try {
    const adminPb = await getAdminPocketBase();
    const records = await adminPb.collection('employees').getFullList({
      sort: 'personnel_code',
      expand: 'user',
    });

    return records.map((emp: any) => ({
      id: emp.id,
      user: emp.user,
      personnel_code: emp.personnel_code,
      first_name: emp.first_name,
      last_name: emp.last_name,
      national_id: emp.national_id,
      phone: emp.phone,
      role: emp.role,
      department: emp.department,
      email: emp.expand?.user?.email || '',
    }));
  } catch (e) {
    return [];
  }
}
