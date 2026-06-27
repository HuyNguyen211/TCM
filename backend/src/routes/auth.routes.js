import { Router } from 'express';
import { validateBody } from '../middleware/validate.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { loginSchema, signupSchema } from '../validators/auth.schema.js';
import { list, create, update } from '../db/index.js';
import { newId, nowIso } from '../utils/id.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { publicUser } from '../utils/publicUser.js';

const router = Router();

/**
 * POST /api/auth/signup
 * Body: { email, password, name?, role? } -> creates a USERS row, returns { token, user }.
 * Password is hashed with scrypt (see utils/password.js) and never returned.
 */
router.post(
  '/signup',
  validateBody(signupSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name, role } = req.body;
    const users = await list('USERS');
    const exists = users.some((u) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return res.status(409).json({ error: 'Conflict', message: 'An account with this email already exists' });
    }

    const passwordHash = await hashPassword(password);
    const user = await create('USERS', {
      userId: newId(),
      email,
      role,
      projects: [],
      lastLogin: nowIso(),
      name,
      passwordHash,
    });

    const token = signToken({ userId: user.userId, email: user.email, role: user.role });
    res.status(201).json({ token, user: publicUser(user) });
  })
);

/**
 * POST /api/auth/login
 * Body: { email, password } -> verifies the password, returns { token, user }.
 */
router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const users = await list('USERS');
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    // Generic message to avoid revealing which emails are registered.
    const invalid = () =>
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });

    if (!user || !user.passwordHash) return invalid();
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return invalid();

    const updated = await update('USERS', user.userId, { lastLogin: nowIso() });
    const token = signToken({ userId: updated.userId, email: updated.email, role: updated.role });
    res.status(200).json({ token, user: publicUser(updated) });
  })
);

/**
 * POST /api/auth/logout
 * JWTs are stateless, so logout is primarily a client concern (discard the token).
 * This endpoint exists for symmetry and as a future hook for token revocation.
 */
router.post('/logout', (req, res) => {
  res.status(200).json({ ok: true });
});

/** GET /api/auth/me -> current user from JWT. */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const users = await list('USERS');
    const user = users.find((u) => u.userId === req.user.userId);
    if (!user) return res.status(404).json({ error: 'NotFound', message: 'User not found' });
    res.json({ user: publicUser(user) });
  })
);

export default router;
