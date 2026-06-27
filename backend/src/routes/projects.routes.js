import { Router } from 'express';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { createProjectSchema, updateProjectSchema } from '../validators/project.schema.js';
import { projectListQuery } from '../validators/common.schema.js';
import { list, findById, create, update } from '../db/index.js';
import { newId, nowIso } from '../utils/id.js';
import { projectRollup } from '../services/aggregate.js';

import testCasesRouter from './testcases.routes.js';
import reportsRouter from './reports.routes.js';
import suitesRouter from './suites.routes.js';
import tasksRouter from './tasks.routes.js';

const router = Router();

/** GET /api/projects?status=&skip=&limit= -> { projects[], total } (totalCases/passRate computed) */
router.get(
  '/',
  validateQuery(projectListQuery),
  asyncHandler(async (req, res) => {
    const { status, projectId, skip, limit } = req.validatedQuery;
    let projects = await list('PROJECTS');
    if (status) projects = projects.filter((p) => p.status === status);
    if (projectId) projects = projects.filter((p) => p.projectId === projectId);

    const total = projects.length;
    const page = projects.slice(skip, skip + limit);

    // Compute live rollups so totalCases / passRate are never stale.
    const withMetrics = await Promise.all(
      page.map(async (p) => {
        const m = await projectRollup(p.projectId);
        return { ...p, totalCases: m.totalCases, passRate: m.passRate };
      })
    );

    res.json({ projects: withMetrics, total });
  })
);

/** POST /api/projects -> create. (lead/admin only) */
router.post(
  '/',
  requireRole('lead', 'admin'),
  validateBody(createProjectSchema),
  asyncHandler(async (req, res) => {
    const { projectName, description, status } = req.body;
    const project = await create('PROJECTS', {
      projectId: newId(),
      projectName,
      description,
      ownerEmail: req.user.email,
      status,
      totalCases: 0,
      passRate: 0,
      createdDate: nowIso(),
    });
    res.status(201).json(project);
  })
);

/** GET /api/projects/:projectId -> single project with live metrics. */
router.get(
  '/:projectId',
  asyncHandler(async (req, res) => {
    const project = await findById('PROJECTS', req.params.projectId);
    if (!project) return res.status(404).json({ error: 'NotFound', message: 'Project not found' });
    const m = await projectRollup(project.projectId);
    res.json({ ...project, totalCases: m.totalCases, passRate: m.passRate });
  })
);

/** PUT /api/projects/:projectId -> edit name/description/status. (lead/admin only) */
router.put(
  '/:projectId',
  requireRole('lead', 'admin'),
  validateBody(updateProjectSchema),
  asyncHandler(async (req, res) => {
    const updated = await update('PROJECTS', req.params.projectId, req.body);
    if (!updated) return res.status(404).json({ error: 'NotFound', message: 'Project not found' });
    res.json(updated);
  })
);

// Nested resources
router.use('/:projectId/tasks', tasksRouter);
router.use('/:projectId/testcases', testCasesRouter);
router.use('/:projectId/reports', reportsRouter);
router.use('/:projectId/suites', suitesRouter);

export default router;
