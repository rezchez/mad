import crypto from 'node:crypto';
import { getAdminPocketBase } from './server';
import { normalizeMobileNumber, isValidIranianNationalId, isValidEmail } from '../security/input-validation';

export interface CreateInvitationInput {
  firstName: string;
  lastName: string;
  phone: string;
  role: 'teacher' | 'staff';
  department?: string;
  nationalId?: string;
  email?: string;
}

export interface InvitationRecord {
  id: string;
  token: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  national_id?: string;
  role: 'teacher' | 'staff';
  department: string;
  expires_at: string;
  used: boolean;
  used_at?: string;
  created?: string;
}

/**
 * Creates a 24-hour single-use invitation record in PocketBase.
 * Requires admin privileges.
 */
export async function createPersonnelInvitation(
  adminUserId: string,
  input: CreateInvitationInput
): Promise<{ token: string; expiresAt: string; invitation: InvitationRecord }> {
  const adminPb = await getAdminPocketBase();

  const normalizedPhone = normalizeMobileNumber(input.phone);
  if (!normalizedPhone) {
    throw new Error('شماره تلفن همراه نامعتبر است.');
  }

  if (input.nationalId && !isValidIranianNationalId(input.nationalId)) {
    throw new Error('کد ملی وارد شده نامعتبر است.');
  }

  if (input.email && !isValidEmail(input.email)) {
    throw new Error('پست الکترونیک وارد شده نامعتبر است.');
  }

  // Generate cryptographically secure 64-char hex token
  const token = crypto.randomBytes(32).toString('hex');
  // 24 hours expiration
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const record: any = await adminPb.collection('invitations').create({
    token,
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    phone: normalizedPhone,
    email: input.email ? input.email.trim().toLowerCase() : '',
    national_id: input.nationalId ? input.nationalId.trim() : '',
    role: input.role,
    department: input.department ? input.department.trim() : '',
    expires_at: expiresAt,
    used: false,
    created_by: adminUserId,
  });

  return {
    token,
    expiresAt,
    invitation: {
      id: record.id,
      token: record.token,
      first_name: record.first_name,
      last_name: record.last_name,
      phone: record.phone,
      email: record.email,
      national_id: record.national_id,
      role: record.role,
      department: record.department,
      expires_at: record.expires_at,
      used: record.used,
      used_at: record.used_at,
      created: record.created,
    },
  };
}

/**
 * Validates whether an invitation token is active, unused, and not expired.
 */
export async function verifyInvitationToken(token: string): Promise<
  | { valid: true; invitation: InvitationRecord }
  | { valid: false; reason: 'not_found' | 'used' | 'expired'; message: string }
> {
  if (!token || token.length < 32) {
    return { valid: false, reason: 'not_found', message: 'لینک دعوت‌نامه نامعتبر است.' };
  }

  try {
    const adminPb = await getAdminPocketBase();
    const filter = adminPb.filter('token = {:token}', { token });
    const record: any = await adminPb.collection('invitations').getFirstListItem(filter);

    if (record.used) {
      return {
        valid: false,
        reason: 'used',
        message: 'این لینک دعوت‌نامه قبلاً استفاده شده و باطل گردیده است.',
      };
    }

    const expiryTime = new Date(record.expires_at).getTime();
    if (Date.now() > expiryTime) {
      return {
        valid: false,
        reason: 'expired',
        message: 'مهلت ۲۴ ساعته این لینک دعوت‌نامه به پایان رسیده و منقضی شده است.',
      };
    }

    return {
      valid: true,
      invitation: {
        id: record.id,
        token: record.token,
        first_name: record.first_name,
        last_name: record.last_name,
        phone: record.phone,
        email: record.email,
        national_id: record.national_id,
        role: record.role,
        department: record.department,
        expires_at: record.expires_at,
        used: record.used,
      },
    };
  } catch (e) {
    return { valid: false, reason: 'not_found', message: 'لینک دعوت‌نامه یافت نشد یا نامعتبر است.' };
  }
}

/**
 * Completes registration using a verified invitation, creates user and employee record,
 * and immediately invalidates the invitation token.
 */
export async function completeRegistration(
  token: string,
  data: {
    password: string;
    nationalId?: string;
    email?: string;
  }
): Promise<{ success: boolean; user: any }> {
  const verification = await verifyInvitationToken(token);
  if (!verification.valid) {
    throw new Error(verification.message);
  }

  const { invitation } = verification;
  const adminPb = await getAdminPocketBase();

  // Finalize national ID and email
  const nationalId = invitation.national_id || data.nationalId;
  const email = invitation.email || data.email;

  if (!nationalId || !isValidIranianNationalId(nationalId)) {
    throw new Error('کد ملی وارد شده نامعتبر است.');
  }

  if (!email || !isValidEmail(email)) {
    throw new Error('پست الکترونیک وارد شده نامعتبر است.');
  }

  if (!data.password || data.password.length < 8) {
    throw new Error('رمز عبور باید حداقل ۸ کاراکتر باشد.');
  }

  // Check uniqueness of national_id, phone, and email in users collection
  try {
    const existing = await adminPb.collection('users').getFirstListItem(
      adminPb.filter('email = {:email} || national_id = {:nid} || phone = {:phone}', {
        email,
        nid: nationalId,
        phone: invitation.phone,
      })
    );
    if (existing) {
      throw new Error('کاربری با این کد ملی، ایمیل یا شماره موبایل از قبل در سامانه وجود دارد.');
    }
  } catch (e: any) {
    // If error is 404, record does not exist which is expected
    if (e.status !== 404 && e.message?.includes('کاربری با این')) {
      throw e;
    }
  }

  const fullName = `${invitation.first_name} ${invitation.last_name}`;

  // 1. Create user in PocketBase
  const userRecord: any = await adminPb.collection('users').create({
    email,
    password: data.password,
    passwordConfirm: data.password,
    name: fullName,
    national_id: nationalId,
    phone: invitation.phone,
    role: invitation.role,
    verified: true,
    emailVisibility: false,
  });

  // 2. Generate personnel code
  const countRecord: any = await adminPb.collection('employees').getList(1, 1);
  const nextNum = (countRecord.totalItems || 0) + 101;
  const personnelCode = `EMP-${nextNum}`;

  // 3. Create employee record
  await adminPb.collection('employees').create({
    user: userRecord.id,
    personnel_code: personnelCode,
    first_name: invitation.first_name,
    last_name: invitation.last_name,
    national_id: nationalId,
    phone: invitation.phone,
    role: invitation.role,
    department: invitation.department,
  });

  // 4. Invalidate invitation token immediately (single-use)
  await adminPb.collection('invitations').update(invitation.id, {
    used: true,
    used_at: new Date().toISOString(),
  });

  return {
    success: true,
    user: {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      role: userRecord.role,
    },
  };
}

/**
 * Fetches all invitations created (for admin dashboard table).
 */
export async function listAllInvitations(): Promise<InvitationRecord[]> {
  try {
    const adminPb = await getAdminPocketBase();
    const records = await adminPb.collection('invitations').getFullList({
      sort: '-id',
    });

    return records.map((r: any) => ({
      id: r.id,
      token: r.token,
      first_name: r.first_name,
      last_name: r.last_name,
      phone: r.phone,
      email: r.email,
      national_id: r.national_id,
      role: r.role,
      department: r.department,
      expires_at: r.expires_at,
      used: Boolean(r.used),
      used_at: r.used_at,
      created: r.created,
    }));
  } catch (e) {
    return [];
  }
}
