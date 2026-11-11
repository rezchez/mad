/**
 * Input validation and normalization for Iranian National ID, Mobile, and Email
 */

/**
 * Normalizes Persian and Arabic numerical digits to ASCII digits (0-9).
 */
export function normalizePersianDigits(str: string): string {
  if (!str) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result
      .replaceAll(persianDigits[i], i.toString())
      .replaceAll(arabicDigits[i], i.toString());
  }
  return result;
}

/**
 * Validates an Iranian National ID (کد ملی) using the official checksum algorithm.
 * Criteria:
 * 1. Must be exactly 10 digits.
 * 2. Cannot consist of all repeating identical digits (e.g. 0000000000, 1111111111).
 * 3. Sum of first 9 digits multiplied by their weights (10 down to 2) modulo 11.
 *    If remainder < 2, check digit must equal remainder.
 *    If remainder >= 2, check digit must equal 11 - remainder.
 */
export function isValidIranianNationalId(rawCode: string): boolean {
  if (!rawCode) return false;
  const code = normalizePersianDigits(rawCode).trim();

  // Exactly 10 digits
  if (!/^\d{10}$/.test(code)) {
    return false;
  }

  // Reject all repeating identical digits (e.g. "1111111111")
  if (/^(\d)\1{9}$/.test(code)) {
    return false;
  }

  const digits = code.split('').map(Number);
  const checkDigit = digits[9];

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i);
  }

  const remainder = sum % 11;
  if (remainder < 2) {
    return checkDigit === remainder;
  } else {
    return checkDigit === 11 - remainder;
  }
}

/**
 * Normalizes an Iranian mobile phone number into standard 11-digit `09xxxxxxxxx` format.
 * Accepts formats:
 * - 09123456789
 * - +989123456789
 * - 00989123456789
 * - 989123456789
 * - 9123456789
 * Returns normalized phone or null if invalid.
 */
export function normalizeMobileNumber(rawPhone: string): string | null {
  if (!rawPhone) return null;
  let phone = normalizePersianDigits(rawPhone).trim();

  // Strip common separators (spaces, dashes, parentheses)
  phone = phone.replace(/[\s\-_()]/g, '');

  if (phone.startsWith('+98')) {
    phone = '0' + phone.substring(3);
  } else if (phone.startsWith('0098')) {
    phone = '0' + phone.substring(4);
  } else if (phone.startsWith('98') && phone.length === 12) {
    phone = '0' + phone.substring(2);
  } else if (!phone.startsWith('0') && phone.startsWith('9') && phone.length === 10) {
    phone = '0' + phone;
  }

  // Must now be exactly 11 digits starting with 09
  if (/^09\d{9}$/.test(phone)) {
    return phone;
  }

  return null;
}

/**
 * Validates an email address.
 */
export function isValidEmail(rawEmail: string): boolean {
  if (!rawEmail) return false;
  const email = rawEmail.trim().toLowerCase();
  if (email.length > 254) return false;

  // RFC 5322 compliant email regex simplified for practical production use
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email);
}

export type IdentifierType = 'national_id' | 'phone' | 'email' | 'invalid';

export interface ParsedIdentifier {
  type: IdentifierType;
  value: string;
  original: string;
}

/**
 * Detects whether the given input is a National ID, Mobile Phone, or Email address,
 * and validates its format.
 */
export function parseAndValidateIdentifier(rawInput: string): ParsedIdentifier {
  const original = rawInput ? rawInput.trim() : '';
  if (!original) {
    return { type: 'invalid', value: '', original };
  }

  const normalizedDigits = normalizePersianDigits(original);

  // 1. Check for email (contains '@')
  if (original.includes('@')) {
    const cleanEmail = original.toLowerCase();
    if (isValidEmail(cleanEmail)) {
      return { type: 'email', value: cleanEmail, original };
    }
    return { type: 'invalid', value: cleanEmail, original };
  }

  // 2. Check for Iranian Mobile Phone
  const normalizedPhone = normalizeMobileNumber(normalizedDigits);
  if (normalizedPhone) {
    return { type: 'phone', value: normalizedPhone, original };
  }

  // 3. Check for Iranian National ID (10 digits)
  if (/^\d{10}$/.test(normalizedDigits)) {
    if (isValidIranianNationalId(normalizedDigits)) {
      return { type: 'national_id', value: normalizedDigits, original };
    }
    return { type: 'invalid', value: normalizedDigits, original };
  }

  return { type: 'invalid', value: original, original };
}
