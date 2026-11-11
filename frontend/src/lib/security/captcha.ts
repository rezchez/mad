import crypto from 'node:crypto';
import { normalizePersianDigits } from './input-validation';

const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || 'default-fallback-insecure-secret-change-in-production';
const CAPTCHA_EXPIRATION_MS = 2 * 60 * 1000; // 2 minutes

// Persian digits representation
const PERSIAN_NUMERALS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(n: number | string): string {
  return n
    .toString()
    .split('')
    .map((char) => {
      const d = parseInt(char, 10);
      return !isNaN(d) ? PERSIAN_NUMERALS[d] : char;
    })
    .join('');
}

export interface CaptchaChallenge {
  id: string;
  question: string;
  token: string;
  expiresAt: number;
}

/**
 * Server-side store for consumed/invalidated challenge IDs to enforce single-use
 * and prevent replay attacks. Cleaned up periodically based on expiration.
 */
class NonceStore {
  private usedIds = new Map<string, number>();

  constructor() {
    // Periodically remove expired nonces every 60 seconds
    setInterval(() => {
      const now = Date.now();
      for (const [id, expiry] of this.usedIds.entries()) {
        if (now > expiry) {
          this.usedIds.delete(id);
        }
      }
    }, 60 * 1000).unref?.();
  }

  isUsed(id: string): boolean {
    return this.usedIds.has(id);
  }

  markUsed(id: string, expiresAt: number): void {
    this.usedIds.set(id, expiresAt);
  }

  clear(): void {
    this.usedIds.clear();
  }
}

export const consumedCaptchaStore = new NonceStore();

/**
 * Generates a cryptographically secure Persian math CAPTCHA challenge.
 */
export function generateCaptchaChallenge(): CaptchaChallenge {
  // Use crypto.randomInt for secure random selection
  const ops = ['+', '-', '×'] as const;
  const op = ops[crypto.randomInt(0, ops.length)];

  let num1 = 0;
  let num2 = 0;
  let answer = 0;

  if (op === '+') {
    num1 = crypto.randomInt(1, 25);
    num2 = crypto.randomInt(1, 20);
    answer = num1 + num2;
  } else if (op === '-') {
    num1 = crypto.randomInt(5, 30);
    num2 = crypto.randomInt(1, num1 + 1); // ensures answer >= 0
    answer = num1 - num2;
  } else {
    // Multiplication: smaller numbers for easy human mental calculation
    num1 = crypto.randomInt(2, 10);
    num2 = crypto.randomInt(2, 10);
    answer = num1 * num2;
  }

  const pNum1 = toPersianDigits(num1);
  const pNum2 = toPersianDigits(num2);
  const question = `${pNum1} ${op} ${pNum2} = ؟`;

  const id = crypto.randomBytes(16).toString('hex');
  const expiresAt = Date.now() + CAPTCHA_EXPIRATION_MS;

  // Compute HMAC over (id + answer + expiresAt)
  const hmac = crypto
    .createHmac('sha256', CAPTCHA_SECRET)
    .update(`${id}:${answer}:${expiresAt}`)
    .digest('hex');

  const token = `${id}.${expiresAt}.${hmac}`;

  return {
    id,
    question,
    token,
    expiresAt,
  };
}

export type CaptchaValidationResult =
  | { success: true }
  | { success: false; reason: 'missing' | 'expired' | 'reused' | 'invalid_token' | 'incorrect' };

/**
 * Validates a submitted CAPTCHA challenge token against the user's answer.
 * Enforces:
 * 1. Single-use (challenge immediately invalidated)
 * 2. Expiration (fails if beyond 2 minutes)
 * 3. Replay attack prevention
 * 4. Timing-attack safe HMAC comparison
 */
export function validateCaptcha(
  token: string | null | undefined,
  userAnswer: string | null | undefined
): CaptchaValidationResult {
  if (!token || !userAnswer) {
    return { success: false, reason: 'missing' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { success: false, reason: 'invalid_token' };
  }

  const [id, expiresAtStr, expectedHmac] = parts;
  const expiresAt = parseInt(expiresAtStr, 10);

  if (!id || isNaN(expiresAt) || !expectedHmac) {
    return { success: false, reason: 'invalid_token' };
  }

  // Check expiration
  if (Date.now() > expiresAt) {
    return { success: false, reason: 'expired' };
  }

  // Check replay / single-use
  if (consumedCaptchaStore.isUsed(id)) {
    return { success: false, reason: 'reused' };
  }

  // Mark as used IMMEDIATELY to prevent concurrent or replay attempts
  consumedCaptchaStore.markUsed(id, expiresAt);

  // Normalize user answer (converts Persian & Arabic numerals to ASCII)
  const cleanAnswer = normalizePersianDigits(userAnswer).trim();
  const numericAnswer = parseInt(cleanAnswer, 10);

  if (isNaN(numericAnswer) || numericAnswer < 0) {
    return { success: false, reason: 'incorrect' };
  }

  // Recompute HMAC with the user's answer
  const computedHmac = crypto
    .createHmac('sha256', CAPTCHA_SECRET)
    .update(`${id}:${numericAnswer}:${expiresAt}`)
    .digest('hex');

  // Use timing-safe equal to avoid side-channel timing attacks
  const bufExpected = Buffer.from(expectedHmac, 'hex');
  const bufComputed = Buffer.from(computedHmac, 'hex');

  if (bufExpected.length !== bufComputed.length || !crypto.timingSafeEqual(bufExpected, bufComputed)) {
    return { success: false, reason: 'incorrect' };
  }

  return { success: true };
}
