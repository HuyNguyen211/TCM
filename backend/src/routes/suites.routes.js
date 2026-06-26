import { Router } from 'express';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/error.js';
import { createSuiteSchema } from '../validators/suite.schema.js';
import { list, findById, create } from '../db/index.js';
import { newId } from '../utils/id.js';

const router = Router({ mergeParams: true });

/** GET /api/projects/:projectId/suites -> list suites for a project. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const suites = (await list('TESTSUITES')).filter((s) => s.projectId === projectId);
    res.json({ suites, total: suites.length });
  })
);

/** POST /api/projects/:projectId/suites -> create a suite. */
router.post(
  '/',
  validateBody(createSuiteSchema),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const project = await findById('PROJECTS', projectId);
    if (!project) return res.status(404).json({ error: 'NotFound', message: 'Project not found' });

    const suite = await create('TESTSUITES', {
      suiteId: newId(),
      projectId,
      suiteName: req.body.suiteName,
      testCaseIds: req.body.testCaseIds || [],
    });
    res.status(201).json(suite);
  })
);

export default router;
