import { Router } from 'express';
import { validateBody } from '../middleware/validate.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { loginSchema } from '../validators/auth.schema.js';
import { list, create, update } from '../db/index.js';
import { newId, nowIso } from '../utils/id.js';

const router = Router();

/**
 * POST /api/auth/login  (dev auth)
 * Body: { email, role? } -> upserts USERS row, returns { token, user }.
 * Swap this body for Google OAuth verification later; requireAuth stays the same.
 */
router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, role } = req.body;
    const users = await list('USERS');
    let user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (user) {
      user = await update('USERS', user.userId, { lastLogin: nowIso() });
    } else {
      user = await create('USERS', {
        userId: newId(),
        email,
        role,
        projects: [],
        lastLogin: nowIso(),
      });
    }

    const token = signToken({ userId: user.userId, email: user.email, role: user.role });
    res.status(200).json({ token, user: publicUser(user) });
  })
);

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

function publicUser(u) {
  return { userId: u.userId, email: u.email, role: u.role, projects: u.projects, lastLogin: u.lastLogin };
}

export default router;
