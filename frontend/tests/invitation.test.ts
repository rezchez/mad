import { describe, it, expect } from 'bun:test';
import crypto from 'node:crypto';
import {
  createPersonnelInvitation,
  verifyInvitationToken,
  completeRegistration,
} from '../src/lib/pocketbase/invitations';
import { findUserByIdentifier, getAdminPocketBase } from '../src/lib/pocketbase/server';

function makeValidNationalId(prefix9: string) {
  const digits = prefix9.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i);
  }
  const rem = sum % 11;
  const check = rem < 2 ? rem : 11 - rem;
  return prefix9 + check;
}

describe('6. Admin-Directed Invitation & 24h Expiration Registration', () => {
  it('creates a 24-hour invitation with valid fields', async () => {
    const admin = await findUserByIdentifier('email', 'admin@school.ir');
    expect(admin).not.toBeNull();

    const uniquePhone = `0919${Math.floor(1000000 + Math.random() * 9000000)}`;

    const invite = await createPersonnelInvitation(admin!.id, {
      firstName: 'کیوان',
      lastName: 'مهرابی',
      phone: uniquePhone,
      role: 'teacher',
      department: 'گروه هوش مصنوعی',
    });

    expect(invite.token).toBeDefined();
    expect(invite.token.length).toBe(64);
    expect(invite.expiresAt).toBeDefined();
    expect(new Date(invite.expiresAt).getTime()).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);
  });

  it('verifies an active invitation token', async () => {
    const admin = await findUserByIdentifier('email', 'admin@school.ir');
    const uniquePhone = `0919${Math.floor(1000000 + Math.random() * 9000000)}`;

    const invite = await createPersonnelInvitation(admin!.id, {
      firstName: 'ساناز',
      lastName: 'نیکزاد',
      phone: uniquePhone,
      role: 'staff',
      department: 'امور بین‌الملل',
    });

    const verify = await verifyInvitationToken(invite.token);
    expect(verify.valid).toBe(true);
    if (verify.valid) {
      expect(verify.invitation.first_name).toBe('ساناز');
      expect(verify.invitation.phone).toBe(uniquePhone);
      expect(verify.invitation.role).toBe('staff');
    }
  });

  it('rejects an invalid or non-existent token', async () => {
    const verify = await verifyInvitationToken('nonexistenttoken12345678901234567890123456789012');
    expect(verify.valid).toBe(false);
    if (!verify.valid) {
      expect(verify.reason).toBe('not_found');
    }
  });

  it('rejects an expired token (> 24 hours)', async () => {
    const adminPb = await getAdminPocketBase();
    const uniqueToken = crypto.randomBytes(32).toString('hex');
    const uniquePhone = `0919${Math.floor(1000000 + Math.random() * 9000000)}`;

    const expiredRecord: any = await adminPb.collection('invitations').create({
      token: uniqueToken,
      first_name: 'تست',
      last_name: 'منقضی',
      phone: uniquePhone,
      role: 'teacher',
      department: 'تست',
      expires_at: new Date(Date.now() - 10000).toISOString(), // expired
      used: false,
    });

    const verify = await verifyInvitationToken(expiredRecord.token);
    expect(verify.valid).toBe(false);
    if (!verify.valid) {
      expect(verify.reason).toBe('expired');
    }
  });

  it('completes registration and immediately invalidates the invitation', async () => {
    const admin = await findUserByIdentifier('email', 'admin@school.ir');
    const uniquePhone = `0919${Math.floor(1000000 + Math.random() * 9000000)}`;
    const rand7 = Math.floor(1000000 + Math.random() * 9000000);
    const testNid = makeValidNationalId(`005${rand7}`.substring(0, 9));
    const uniqueEmail = `test.${rand7}@school.ir`;

    const invite = await createPersonnelInvitation(admin!.id, {
      firstName: 'کامران',
      lastName: 'بختیاری',
      phone: uniquePhone,
      role: 'teacher',
      department: 'گروه زبان فرانسه',
    });

    // Complete registration
    const result = await completeRegistration(invite.token, {
      password: 'StrongPassword123!',
      nationalId: testNid,
      email: uniqueEmail,
    });

    expect(result.success).toBe(true);
    expect(result.user.name).toBe('کامران بختیاری');

    // Token must now be marked as used and invalidated
    const verifyAfter = await verifyInvitationToken(invite.token);
    expect(verifyAfter.valid).toBe(false);
    if (!verifyAfter.valid) {
      expect(verifyAfter.reason).toBe('used');
    }

    // Subsequent registration attempt with the same token must fail
    expect(
      completeRegistration(invite.token, {
        password: 'AnotherPassword123!',
        nationalId: testNid,
        email: `another.${rand7}@school.ir`,
      })
    ).rejects.toThrow();
  });
});
