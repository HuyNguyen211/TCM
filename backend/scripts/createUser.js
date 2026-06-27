/**
 * createUser.js — create a user, or promote/reset an existing one, from the CLI.
 * Useful for bootstrapping the FIRST admin (before any admin exists to use the API).
 * Works in BOTH mock and sheets mode.
 *
 * Usage:
 *   node scripts/createUser.js <email> <password> <role> [name]
 * Example:
 *   node scripts/createUser.js admin@firegroup.io "S3cret#Pass" admin "Site Admin"
 *
 * Roles: admin | lead | tester | viewer
 */
import { initDb, list, create, update } from '../src/db/index.js';
import { hashPassword } from '../src/utils/password.js';
import { newId } from '../src/utils/id.js';

const ROLES = ['admin', 'lead', 'tester', 'viewer'];
const [, , email, password, role = 'tester', name = ''] = process.argv;

if (!email || !password) {
  console.error('Usage: node scripts/createUser.js <email> <password> <role> [name]');
  process.exit(1);
}
if (!ROLES.includes(role)) {
  console.error(`[createUser] invalid role "${role}". Use one of: ${ROLES.join(', ')}`);
  process.exit(1);
}
if (password.length < 8) {
  console.error('[createUser] password must be at least 8 characters');
  process.exit(1);
}

async function main() {
  await initDb();
  const users = await list('USERS');
  const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  const passwordHash = await hashPassword(password);

  if (existing) {
    const patch = { role, passwordHash };
    if (name) patch.name = name;
    await update('USERS', existing.userId, patch);
    console.log(`[createUser] updated ${email} -> role: ${role}${name ? `, name: ${name}` : ''} (password reset).`);
  } else {
    await create('USERS', {
      userId: newId(),
      email,
      role,
      projects: [],
      lastLogin: '',
      name,
      passwordHash,
    });
    console.log(`[createUser] created ${email} -> role: ${role}${name ? `, name: ${name}` : ''}.`);
  }
}

main().catch((err) => {
  console.error('[createUser] failed:', err?.message || err);
  process.exit(1);
});
