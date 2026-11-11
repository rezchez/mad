import { describe, it, expect, beforeEach } from 'bun:test';
import {
  isValidIranianNationalId,
  normalizeMobileNumber,
  isValidEmail,
  normalizePersianDigits,
  parseAndValidateIdentifier,
} from '../src/lib/security/input-validation';
import {
  generateCaptchaChallenge,
  validateCaptcha,
  consumedCaptchaStore,
} from '../src/lib/security/captcha';
import { authRateLimiter, captchaRateLimiter } from '../src/lib/security/rate-limiter';
import {
  findUserByIdentifier,
  authenticateWithPassword,
  createUserPocketBase,
  getEmployeeProfile,
} from '../src/lib/pocketbase/server';

describe('1. Input Validation and Normalization', () => {
  it('converts Persian and Arabic digits to ASCII digits', () => {
    expect(normalizePersianDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
    expect(normalizePersianDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  });

  it('validates Iranian National ID with correct checksum', () => {
    // Valid National IDs with verified checksums
    expect(isValidIranianNationalId('0010000003')).toBe(true);
    expect(isValidIranianNationalId('0020000006')).toBe(true);
    expect(isValidIranianNationalId('0030000009')).toBe(true);
    // Persian digits
    expect(isValidIranianNationalId('۰۰۱۰۰۰۰۰۰۳')).toBe(true);
  });

  it('rejects invalid Iranian National IDs', () => {
    // Bad checksum
    expect(isValidIranianNationalId('0010000004')).toBe(false);
    expect(isValidIranianNationalId('1234567890')).toBe(false);
    // Repeating digits
    expect(isValidIranianNationalId('0000000000')).toBe(false);
    expect(isValidIranianNationalId('1111111111')).toBe(false);
    expect(isValidIranianNationalId('9999999999')).toBe(false);
    // Invalid length
    expect(isValidIranianNationalId('12345')).toBe(false);
    expect(isValidIranianNationalId('12345678901')).toBe(false);
    // Non-numeric
    expect(isValidIranianNationalId('abcdefghij')).toBe(false);
  });

  it('normalizes Iranian Mobile Phone numbers', () => {
    expect(normalizeMobileNumber('09121111111')).toBe('09121111111');
    expect(normalizeMobileNumber('+989121111111')).toBe('09121111111');
    expect(normalizeMobileNumber('00989121111111')).toBe('09121111111');
    expect(normalizeMobileNumber('989121111111')).toBe('09121111111');
    expect(normalizeMobileNumber('9121111111')).toBe('09121111111');
    expect(normalizeMobileNumber('0912-111-1111')).toBe('09121111111');
    expect(normalizeMobileNumber('۰۹۱۲۱۱۱۱۱۱۱')).toBe('09121111111');
  });

  it('rejects invalid mobile numbers', () => {
    expect(normalizeMobileNumber('08121111111')).toBeNull(); // not starting with 09
    expect(normalizeMobileNumber('0912111')).toBeNull(); // too short
    expect(normalizeMobileNumber('0912111111111')).toBeNull(); // too long
    expect(normalizeMobileNumber('0912abc1111')).toBeNull();
  });

  it('validates email addresses', () => {
    expect(isValidEmail('admin@school.ir')).toBe(true);
    expect(isValidEmail('teacher.name@domain.edu.ir')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
  });

  it('parses and detects identifier types correctly', () => {
    expect(parseAndValidateIdentifier('0010000003').type).toBe('national_id');
    expect(parseAndValidateIdentifier('09121111111').type).toBe('phone');
    expect(parseAndValidateIdentifier('admin@school.ir').type).toBe('email');
    expect(parseAndValidateIdentifier('0010000004').type).toBe('invalid'); // bad checksum
    expect(parseAndValidateIdentifier('bad-format').type).toBe('invalid');
  });
});

describe('2. Persian CAPTCHA Engine', () => {
  beforeEach(() => {
    consumedCaptchaStore.clear();
  });

  it('generates random mathematical challenge with Persian numerals', () => {
    const challenge = generateCaptchaChallenge();
    expect(challenge.id).toBeDefined();
    expect(challenge.question).toContain('؟');
    expect(challenge.question).toMatch(/[۰-۹]/);
    expect(challenge.token).toContain('.');
    expect(challenge.expiresAt).toBeGreaterThan(Date.now());
  });

  it('validates a correct CAPTCHA answer', () => {
    // Generate challenge and compute expected answer for verification
    const challenge = generateCaptchaChallenge();
    const [id, expiresAtStr, hmac] = challenge.token.split('.');

    // Extract the numbers from the Persian question
    const cleanQ = normalizePersianDigits(challenge.question);
    const match = cleanQ.match(/(\d+)\s*([+\-×])\s*(\d+)/);
    expect(match).not.toBeNull();
    const n1 = parseInt(match![1], 10);
    const op = match![2];
    const n2 = parseInt(match![3], 10);
    let expected = 0;
    if (op === '+') expected = n1 + n2;
    else if (op === '-') expected = n1 - n2;
    else expected = n1 * n2;

    const result = validateCaptcha(challenge.token, expected.toString());
    expect(result.success).toBe(true);
  });

  it('accepts answers written with Persian digits', () => {
    const challenge = generateCaptchaChallenge();
    const cleanQ = normalizePersianDigits(challenge.question);
    const match = cleanQ.match(/(\d+)\s*([+\-×])\s*(\d+)/);
    const n1 = parseInt(match![1], 10);
    const op = match![2];
    const n2 = parseInt(match![3], 10);
    let expected = op === '+' ? n1 + n2 : op === '-' ? n1 - n2 : n1 * n2;

    const persianAnswer = expected
      .toString()
      .split('')
      .map((c) => ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'][parseInt(c, 10)])
      .join('');

    const result = validateCaptcha(challenge.token, persianAnswer);
    expect(result.success).toBe(true);
  });

  it('rejects incorrect CAPTCHA answers', () => {
    const challenge = generateCaptchaChallenge();
    const result = validateCaptcha(challenge.token, '99999');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('incorrect');
    }
  });

  it('enforces single-use and prevents replay attacks', () => {
    const challenge = generateCaptchaChallenge();
    const cleanQ = normalizePersianDigits(challenge.question);
    const match = cleanQ.match(/(\d+)\s*([+\-×])\s*(\d+)/);
    const n1 = parseInt(match![1], 10);
    const op = match![2];
    const n2 = parseInt(match![3], 10);
    let expected = op === '+' ? n1 + n2 : op === '-' ? n1 - n2 : n1 * n2;

    // First use: Valid
    const firstResult = validateCaptcha(challenge.token, expected.toString());
    expect(firstResult.success).toBe(true);

    // Second use of the exact same challenge: Replay rejected!
    const secondResult = validateCaptcha(challenge.token, expected.toString());
    expect(secondResult.success).toBe(false);
    if (!secondResult.success) {
      expect(secondResult.reason).toBe('reused');
    }
  });

  it('rejects expired CAPTCHAs', () => {
    // Forge an expired token (timestamp in the past)
    const expiredTimestamp = Date.now() - 5000;
    const fakeToken = `fakeid.${expiredTimestamp}.fakehmac`;
    const result = validateCaptcha(fakeToken, '10');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('expired');
    }
  });

  it('rejects tampered CAPTCHA tokens', () => {
    const challenge = generateCaptchaChallenge();
    const parts = challenge.token.split('.');
    const tamperedToken = `${parts[0]}.${parts[1]}.badhmac12345`;
    const result = validateCaptcha(tamperedToken, '10');
    expect(result.success).toBe(false);
  });
});

describe('3. Rate Limiting and Brute-force Protection', () => {
  beforeEach(() => {
    authRateLimiter.clear();
    captchaRateLimiter.clear();
  });

  it('allows requests within limit and throttles after max attempts', () => {
    const key = 'test_ip:127.0.0.1';
    for (let i = 0; i < 5; i++) {
      const check = authRateLimiter.check(key, 5, 10000, 30000);
      expect(check.allowed).toBe(true);
      authRateLimiter.recordFailure(key);
    }

    // 6th attempt should be blocked with cooldown
    const blockedCheck = authRateLimiter.check(key, 5, 10000, 30000);
    expect(blockedCheck.allowed).toBe(false);
    expect(blockedCheck.cooldownSecondsRemaining).toBeGreaterThan(0);
  });

  it('resets rate limiting on successful login', () => {
    const key = 'test_ip:192.168.1.10';
    authRateLimiter.recordFailure(key);
    authRateLimiter.recordFailure(key);
    authRateLimiter.reset(key);

    const check = authRateLimiter.check(key, 5, 10000);
    expect(check.remaining).toBe(5);
  });
});

describe('4. PocketBase Authentication and Role-based Security', () => {
  it('resolves user by National ID', async () => {
    const user = await findUserByIdentifier('national_id', '0010000003');
    expect(user).not.toBeNull();
    expect(user?.email).toBe('admin@school.ir');
    expect(user?.role).toBe('admin');
  });

  it('resolves user by Mobile Phone', async () => {
    const user = await findUserByIdentifier('phone', '09122222222');
    expect(user).not.toBeNull();
    expect(user?.email).toBe('teacher@school.ir');
    expect(user?.role).toBe('teacher');
  });

  it('resolves user by Email', async () => {
    const user = await findUserByIdentifier('email', 'staff@school.ir');
    expect(user).not.toBeNull();
    expect(user?.role).toBe('staff');
  });

  it('authenticates valid credentials via PocketBase bcrypt verification', async () => {
    const auth = await authenticateWithPassword('teacher@school.ir', 'Password123!');
    expect(auth.token).toBeDefined();
    expect(auth.record.email).toBe('teacher@school.ir');
    expect(auth.record.role).toBe('teacher');
  });

  it('rejects invalid password via PocketBase', async () => {
    expect(
      authenticateWithPassword('teacher@school.ir', 'WrongPassword!')
    ).rejects.toThrow();
  });

  it('allows employee to access their own employee record', async () => {
    const auth = await authenticateWithPassword('teacher@school.ir', 'Password123!');
    const employee = await getEmployeeProfile(auth.token, auth.record.id);
    expect(employee).not.toBeNull();
    expect(employee?.first_name).toBe('سارا');
    expect(employee?.last_name).toBe('حسینی');
    expect(employee?.personnel_code).toBe('EMP-002');
  });

  it('prevents user from accessing another user protected employee record', async () => {
    // Teacher authenticates
    const teacherAuth = await authenticateWithPassword('teacher@school.ir', 'Password123!');
    const teacherPb = createUserPocketBase(teacherAuth.token);

    // Admin user record
    const adminUser = await findUserByIdentifier('email', 'admin@school.ir');
    expect(adminUser).not.toBeNull();

    // Teacher attempts to query admin's employee record
    try {
      await teacherPb.collection('employees').getFirstListItem(`user = "${adminUser!.id}"`);
      throw new Error('Should have failed');
    } catch (err: any) {
      expect(err.status).toBe(404); // PocketBase collection rule blocks access
    }
  });

  it('prevents unauthenticated public access to employees collection', async () => {
    const unauthPb = createUserPocketBase('');
    try {
      await unauthPb.collection('employees').getFirstListItem('user != ""');
      throw new Error('Should have failed');
    } catch (err: any) {
      expect(err.status).toBe(404);
    }
  });
});
