/**
 * password.js — password hashing using Node's built-in scrypt.
 *
 * No external dependency (no bcrypt/argon2 native build needed). Stored format:
 *   scrypt:<saltHex>:<derivedKeyHex>
 * Verification is constant-time via crypto.timingSafeEqual.
 */
import crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);
const KEYLEN = 64;
const SALT_BYTES = 16;

/** Hash a plaintext password -> "scrypt:<salt>:<hash>" (safe to store). */
export async function hashPassword(plain) {
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const derived = await scrypt(plain, salt, KEYLEN);
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

/** Verify a plaintext password against a stored "scrypt:<salt>:<hash>" string. */
export async function verifyPassword(plain, stored) {
  if (typeof stored !== 'string') return false;
  const parts = stored.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hashHex] = parts;
  const expected = Buffer.from(hashHex, 'hex');
  const derived = await scrypt(plain, salt, KEYLEN);
  if (expected.length !== derived.length) return false;
  return crypto.timingSafeEqual(expected, derived);
}
