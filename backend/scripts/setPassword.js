/**
 * setPassword.js — set (or reset) a user's password by email.
 * Works in BOTH mock and sheets mode. Use it to backfill passwords for users
 * created before password auth existed, or to reset a forgotten password.
 *
 * Usage:
 *   node scripts/setPassword.js <email> <newPassword> [name]
 * Example:
 *   node scripts/setPassword.js demo@firegroup.io password123 "Demo Lead"
 */
import { initDb, list, update } from '../src/db/index.js';
import { hashPassword } from '../src/utils/password.js';

const [, , email, password, name] = process.argv;

if (!email || !password) {
  console.error('Usage: node scripts/setPassword.js <email> <newPassword> [name]');
  process.exit(1);
}
if (password.length < 8) {
  console.error('[setPassword] password must be at least 8 characters');
  process.exit(1);
}

async function main() {
  await initDb();
  const users = await list('USERS');
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error(`[setPassword] no user found with email ${email}. Sign up first or check the email.`);
    process.exit(1);
  }

  const patch = { passwordHash: await hashPassword(password) };
  if (name) patch.name = name;
  await update('USERS', user.userId, patch);

  console.log(`[setPassword] updated password for ${email}${name ? ` (name: ${name})` : ''}.`);
}

main().catch((err) => {
  console.error('[setPassword] failed:', err?.message || err);
  process.exit(1);
});
