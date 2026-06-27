/**
 * users.routes.js — admin-only user management.
 * Mounted behind requireAuth + requireRole('admin') in server.js, so every
 * handler here can assume the caller is an authenticated admin.
 */
import { Router } from 'express';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/error.js';
import {
  adminCreateUserSchema,
  adminUpdateUserSchema,
  adminResetPasswordSchema,
} from '../validators/user.schema.js';
import { list, findById, create, update, remove } from '../db/index.js';
import { newId } from '../utils/id.js';
import { hashPassword } from '../utils/password.js';
import { publicUser } from '../utils/publicUser.js';

const router = Router();

/** GET /api/users -> { users[], total } (passwordHash stripped). */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const users = await list('USERS');
    res.json({ users: users.map(publicUser), total: users.length });
  })
);

/** POST /api/users -> create an account. */
router.post(
  '/',
  validateBody(adminCreateUserSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name, role } = req.body;
    const users = await list('USERS');
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(409).json({ error: 'Conflict', message: 'An account with this email already exists' });
    }
    const passwordHash = await hashPassword(password);
    const user = await create('USERS', {
      userId: newId(),
      email,
      role,
      projects: [],
      lastLogin: '',
      name,
      passwordHash,
    });
    res.status(201).json({ user: publicUser(user) });
  })
);

/** PATCH /api/users/:userId -> update name and/or role. */
router.patch(
  '/:userId',
  validateBody(adminUpdateUserSchema),
  asyncHandler(async (req, res) => {
    const target = await findById('USERS', req.params.userId);
    if (!target) return res.status(404).json({ error: 'NotFound', message: 'User not found' });

    // Guard: an admin can't demote themselves and risk locking everyone out.
    if (target.userId === req.user.userId && req.body.role && req.body.role !== 'admin') {
      return res.status(400).json({ error: 'BadRequest', message: 'You cannot change your own admin role' });
    }

    const updated = await update('USERS', req.params.userId, req.body);
    res.json({ user: publicUser(updated) });
  })
);

/** POST /api/users/:userId/password -> reset a user's password. */
router.post(
  '/:userId/password',
  validateBody(adminResetPasswordSchema),
  asyncHandler(async (req, res) => {
    const target = await findById('USERS', req.params.userId);
    if (!target) return res.status(404).json({ error: 'NotFound', message: 'User not found' });
    await update('USERS', req.params.userId, { passwordHash: await hashPassword(req.body.password) });
    res.json({ ok: true });
  })
);

/** DELETE /api/users/:userId -> remove an account. */
router.delete(
  '/:userId',
  asyncHandler(async (req, res) => {
    if (req.params.userId === req.user.userId) {
      return res.status(400).json({ error: 'BadRequest', message: 'You cannot delete your own account' });
    }
    const ok = await remove('USERS', req.params.userId);
    if (!ok) return res.status(404).json({ error: 'NotFound', message: 'User not found' });
    res.json({ deleted: true });
  })
);

export default router;
