import { Router } from 'express';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { requireWriteRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { createTestCaseSchema, updateTestCaseSchema } from '../validators/testcase.schema.js';
import { testCaseListQuery } from '../validators/common.schema.js';
import { list, findById, create, update } from '../db/index.js';
import { newId, nowIso } from '../utils/id.js';
import { projectRollup } from '../services/aggregate.js';
import { latestExecutionByTestCase } from '../utils/metrics.js';
import executionsRouter from './executions.routes.js';

// mergeParams so :projectId from the parent router is available here.
const router = Router({ mergeParams: true });

// Reads open to all; create/edit/deprecate/execute require tester or higher.
router.use(requireWriteRole('tester', 'lead', 'admin'));

/** Re-number steps sequentially (1..n) and return a compact JSON string for col I. */
function normalizeStepsJSON(stepsJSON) {
  const parsed = JSON.parse(stepsJSON);
  const renumbered = parsed.map((s, i) => ({
    step: i + 1,
    action: s.action,
    expected: s.expected,
  }));
  return JSON.stringify(renumbered);
}

/** Attach a parsed `steps` array alongside the raw stepsJSON for FE convenience. */
function withParsedSteps(tc) {
  let steps = [];
  try {
    steps = JSON.parse(tc.stepsJSON || '[]');
  } catch {
    steps = [];
  }
  return { ...tc, steps };
}

/** Best-effort refresh of the project's stored totalCases/passRate (non-fatal). */
async function refreshProjectMetrics(projectId) {
  try {
    const m = await projectRollup(projectId);
    await update('PROJECTS', projectId, { totalCases: m.totalCases, passRate: m.passRate });
  } catch {
    /* metrics are also computed on read; ignore write-back failures */
  }
}

/** GET /api/projects/:projectId/testcases?module=&priority=&status=&search=&skip=&limit= */
router.get(
  '/',
  validateQuery(testCaseListQuery),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { module, priority, status, search, skip, limit, taskId, subtaskId } = req.validatedQuery;

    let testCases = (await list('TESTCASES')).filter((tc) => tc.projectId === projectId);
    if (taskId) testCases = testCases.filter((tc) => tc.taskId === taskId);
    // subtaskId='none' -> attached directly to the task (no subtask); else exact match.
    if (subtaskId === 'none') testCases = testCases.filter((tc) => !tc.subtaskId);
    else if (subtaskId) testCases = testCases.filter((tc) => tc.subtaskId === subtaskId);
    if (module) testCases = testCases.filter((tc) => tc.module === module);
    if (priority) testCases = testCases.filter((tc) => tc.priority === priority);
    if (status) testCases = testCases.filter((tc) => tc.status === status);
    if (search) {
      const q = search.toLowerCase();
      testCases = testCases.filter(
        (tc) =>
          tc.testCaseName.toLowerCase().includes(q) ||
          (tc.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }

    const total = testCases.length;
    // Attach the latest execution result per test case ('' = never run).
    const latest = latestExecutionByTestCase(await list('EXECUTIONS'));
    const page = testCases.slice(skip, skip + limit).map((tc) => ({
      ...withParsedSteps(tc),
      latestResult: latest.get(tc.testCaseId)?.status || '',
    }));
    res.json({ testCases: page, total });
  })
);

/** POST /api/projects/:projectId/testcases -> create (version starts at 1). */
router.post(
  '/',
  validateBody(createTestCaseSchema),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const project = await findById('PROJECTS', projectId);
    if (!project) return res.status(404).json({ error: 'NotFound', message: 'Project not found' });

    // A test case must belong to a task; subtask is optional but must be under that task.
    const task = await findById('TASKS', req.body.taskId);
    if (!task || task.projectId !== projectId) {
      return res.status(400).json({ error: 'ValidationError', fields: { taskId: 'Task not found in this project' } });
    }
    if (req.body.subtaskId) {
      const subtask = await findById('SUBTASKS', req.body.subtaskId);
      if (!subtask || subtask.taskId !== req.body.taskId) {
        return res.status(400).json({ error: 'ValidationError', fields: { subtaskId: 'Subtask not found under this task' } });
      }
    }

    const now = nowIso();
    const tc = await create('TESTCASES', {
      testCaseId: newId(),
      projectId,
      testCaseName: req.body.testCaseName,
      module: req.body.module,
      priority: req.body.priority,
      status: req.body.status,
      assignedTo: req.body.assignedTo || '',
      tags: req.body.tags || [],
      stepsJSON: normalizeStepsJSON(req.body.stepsJSON),
      version: 1,
      createdDate: now,
      lastModified: now,
      taskId: req.body.taskId,
      subtaskId: req.body.subtaskId || '',
    });

    await refreshProjectMetrics(projectId);
    res.status(201).json({ testCaseId: tc.testCaseId, version: tc.version, ...withParsedSteps(tc) });
  })
);

/** GET /api/projects/:projectId/testcases/:testCaseId -> single (parsed steps). */
router.get(
  '/:testCaseId',
  asyncHandler(async (req, res) => {
    const tc = await findById('TESTCASES', req.params.testCaseId);
    if (!tc || tc.projectId !== req.params.projectId) {
      return res.status(404).json({ error: 'NotFound', message: 'Test case not found' });
    }
    const latest = latestExecutionByTestCase(await list('EXECUTIONS'));
    res.json({ ...withParsedSteps(tc), latestResult: latest.get(tc.testCaseId)?.status || '' });
  })
);

/** PUT /api/projects/:projectId/testcases/:testCaseId -> update; version++ , lastModified. */
router.put(
  '/:testCaseId',
  validateBody(updateTestCaseSchema),
  asyncHandler(async (req, res) => {
    const existing = await findById('TESTCASES', req.params.testCaseId);
    if (!existing || existing.projectId !== req.params.projectId) {
      return res.status(404).json({ error: 'NotFound', message: 'Test case not found' });
    }

    const patch = { ...req.body, version: existing.version + 1, lastModified: nowIso() };
    if (req.body.stepsJSON) patch.stepsJSON = normalizeStepsJSON(req.body.stepsJSON);

    const updated = await update('TESTCASES', req.params.testCaseId, patch);
    await refreshProjectMetrics(req.params.projectId);
    res.json(withParsedSteps(updated));
  })
);

/** DELETE -> soft delete (status = DEPRECATED). */
router.delete(
  '/:testCaseId',
  asyncHandler(async (req, res) => {
    const existing = await findById('TESTCASES', req.params.testCaseId);
    if (!existing || existing.projectId !== req.params.projectId) {
      return res.status(404).json({ error: 'NotFound', message: 'Test case not found' });
    }
    const updated = await update('TESTCASES', req.params.testCaseId, {
      status: 'DEPRECATED',
      lastModified: nowIso(),
    });
    await refreshProjectMetrics(req.params.projectId);
    res.json({ testCaseId: updated.testCaseId, status: updated.status });
  })
);

// Executions: POST /:testCaseId/execute, GET /:testCaseId/executions
router.use('/:testCaseId', executionsRouter);

export default router;
