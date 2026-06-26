import { Router } from 'express';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/error.js';
import { createExecutionSchema } from '../validators/execution.schema.js';
import { list, findById, create, update } from '../db/index.js';
import { newId, nowIso } from '../utils/id.js';
import { projectRollup } from '../services/aggregate.js';

// mergeParams: projectId + testCaseId from parent routers.
const router = Router({ mergeParams: true });

/**
 * POST /api/projects/:projectId/testcases/:testCaseId/execute
 * NOTE the field mapping: API `executionStatus` -> column E `status`.
 */
router.post(
  '/execute',
  validateBody(createExecutionSchema),
  asyncHandler(async (req, res) => {
    const { projectId, testCaseId } = req.params;
    const tc = await findById('TESTCASES', testCaseId);
    if (!tc || tc.projectId !== projectId) {
      return res.status(404).json({ error: 'NotFound', message: 'Test case not found' });
    }

    const execution = await create('EXECUTIONS', {
      executionId: newId(),
      testCaseId,
      executedBy: req.user.email,
      executionDate: nowIso(),
      status: req.body.executionStatus, // <-- API name -> column name
      failureReason: req.body.failureReason || '',
      notes: req.body.notes || '',
      duration: req.body.duration || 0,
      evidenceUrls: req.body.evidenceUrls || [],
    });

    // Keep the project's stored pass rate fresh (also computed on read).
    try {
      const m = await projectRollup(projectId);
      await update('PROJECTS', projectId, { totalCases: m.totalCases, passRate: m.passRate });
    } catch {
      /* non-fatal */
    }

    res.status(201).json({ executionId: execution.executionId });
  })
);

/** GET /api/projects/:projectId/testcases/:testCaseId/executions -> history (newest first). */
router.get(
  '/executions',
  asyncHandler(async (req, res) => {
    const { testCaseId } = req.params;
    const executions = (await list('EXECUTIONS'))
      .filter((ex) => ex.testCaseId === testCaseId)
      .sort((a, b) => (a.executionDate < b.executionDate ? 1 : -1));
    res.json({ executions, total: executions.length });
  })
);

export default router;
