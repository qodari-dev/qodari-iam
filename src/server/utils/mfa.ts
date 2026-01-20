import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

const MFA_CODE_LENGTH = 6;
const MFA_EXPIRY_MINUTES = 3;
const MFA_MAX_ATTEMPTS = 5;

/**
 * Generates a secure 6-digit MFA code using crypto.randomInt
 */
export function generateMfaCode(): string {
  const min = Math.pow(10, MFA_CODE_LENGTH - 1);
  const max = Math.pow(10, MFA_CODE_LENGTH);
  return String(randomInt(min, max));
}

/**
 * Hashes an MFA code using SHA-256 for deterministic lookup
 */
export function hashMfaCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

/**
 * Verifies an MFA code against a stored hash using timing-safe comparison
 */
export function verifyMfaCode(code: string, hash: string): boolean {
  const codeHash = hashMfaCode(code);
  const expected = Buffer.from(hash);
  const provided = Buffer.from(codeHash);

  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

/**
 * Returns the expiry date for an MFA code (3 minutes from now)
 */
export function getMfaExpiryDate(): Date {
  return new Date(Date.now() + MFA_EXPIRY_MINUTES * 60 * 1000);
}

/**
 * Masks an email address for display (e.g., j***@example.com)
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;

  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }

  return `${local[0]}***@${domain}`;
}

export const MFA_CONFIG = {
  CODE_LENGTH: MFA_CODE_LENGTH,
  EXPIRY_MINUTES: MFA_EXPIRY_MINUTES,
  MAX_ATTEMPTS: MFA_MAX_ATTEMPTS,
} as const;
