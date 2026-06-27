/**
 * team.routes.js — a lead manages their group of testers.
 * Mounted behind requireAuth + requireRole('lead', 'admin'), so the caller is a
 * lead (or admin). Membership is stored as USERS.managerId = the lead's userId.
 * A tester belongs to at most one lead.
 */
import { Router } from 'express';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/error.js';
import { addTeamMemberSchema } from '../validators/team.schema.js';
import { list, findById, update } from '../db/index.js';
import { publicUser } from '../utils/publicUser.js';

const router = Router();

/**
 * GET /api/team
 * -> { members[]: testers I manage, available[]: unassigned testers I can add }
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const me = req.user.userId;
    const testers = (await list('USERS')).filter((u) => u.role === 'tester');
    const members = testers.filter((u) => u.managerId === me);
    const available = testers.filter((u) => !u.managerId);
    res.json({ members: members.map(publicUser), available: available.map(publicUser) });
  })
);

/** POST /api/team/members { userId } -> add an unassigned tester to my team. */
router.post(
  '/members',
  validateBody(addTeamMemberSchema),
  asyncHandler(async (req, res) => {
    const me = req.user.userId;
    const target = await findById('USERS', req.body.userId);
    if (!target) return res.status(404).json({ error: 'NotFound', message: 'User not found' });
    if (target.role !== 'tester') {
      return res.status(400).json({ error: 'BadRequest', message: 'Only testers can be added to a team' });
    }
    if (target.managerId && target.managerId !== me) {
      return res.status(409).json({ error: 'Conflict', message: "This tester is already on another lead's team" });
    }
    const updated = await update('USERS', target.userId, { managerId: me });
    res.status(201).json({ member: publicUser(updated) });
  })
);

/** DELETE /api/team/members/:userId -> remove a tester from my team. */
router.delete(
  '/members/:userId',
  asyncHandler(async (req, res) => {
    const me = req.user.userId;
    const target = await findById('USERS', req.params.userId);
    if (!target) return res.status(404).json({ error: 'NotFound', message: 'User not found' });
    if (target.managerId !== me) {
      return res.status(403).json({ error: 'Forbidden', message: 'This tester is not on your team' });
    }
    const updated = await update('USERS', target.userId, { managerId: '' });
    res.json({ removed: true, member: publicUser(updated) });
  })
);

export default router;
