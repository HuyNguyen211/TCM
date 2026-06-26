import { Router } from 'express';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/error.js';
import { createTaskSchema, updateTaskSchema } from '../validators/task.schema.js';
import { list, findById, create, update, remove } from '../db/index.js';
import { newId, nowIso } from '../utils/id.js';
import { genTestcasesSchema } from '../validators/ai.schema.js';
import { genTestcases, isConfigured as aiConfigured } from '../services/aiTestcases.js';
import subtasksRouter from './subtasks.routes.js';

const router = Router({ mergeParams: true });

/** GET /api/projects/:projectId/tasks -> tasks with subtask + test-case counts. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const tasks = (await list('TASKS')).filter((t) => t.projectId === projectId);
    const subtasks = (await list('SUBTASKS')).filter((s) => s.projectId === projectId);
    const testCases = (await list('TESTCASES')).filter((tc) => tc.projectId === projectId);

    const withCounts = tasks.map((t) => ({
      ...t,
      subtaskCount: subtasks.filter((s) => s.taskId === t.taskId).length,
      testCaseCount: testCases.filter((tc) => tc.taskId === t.taskId).length,
    }));
    res.json({ tasks: withCounts, total: withCounts.length });
  })
);

/** POST /api/projects/:projectId/tasks */
router.post(
  '/',
  validateBody(createTaskSchema),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const project = await findById('PROJECTS', projectId);
    if (!project) return res.status(404).json({ error: 'NotFound', message: 'Project not found' });

    const now = nowIso();
    const task = await create('TASKS', {
      taskId: newId(),
      projectId,
      taskName: req.body.taskName,
      description: req.body.description || '',
      status: req.body.status,
      assignee: req.body.assignee || '',
      jiraKey: req.body.jiraKey || '',
      confluenceUrl: req.body.confluenceUrl || '',
      figmaUrl: req.body.figmaUrl || '',
      createdDate: now,
      lastModified: now,
    });
    res.status(201).json(task);
  })
);

/** GET /api/projects/:projectId/tasks/:taskId */
router.get(
  '/:taskId',
  asyncHandler(async (req, res) => {
    const task = await findById('TASKS', req.params.taskId);
    if (!task || task.projectId !== req.params.projectId) {
      return res.status(404).json({ error: 'NotFound', message: 'Task not found' });
    }
    res.json(task);
  })
);

/** PUT /api/projects/:projectId/tasks/:taskId */
router.put(
  '/:taskId',
  validateBody(updateTaskSchema),
  asyncHandler(async (req, res) => {
    const existing = await findById('TASKS', req.params.taskId);
    if (!existing || existing.projectId !== req.params.projectId) {
      return res.status(404).json({ error: 'NotFound', message: 'Task not found' });
    }
    const updated = await update('TASKS', req.params.taskId, { ...req.body, lastModified: nowIso() });
    res.json(updated);
  })
);

/** DELETE /api/projects/:projectId/tasks/:taskId -> cascade delete subtasks + test cases. */
router.delete(
  '/:taskId',
  asyncHandler(async (req, res) => {
    const { projectId, taskId } = req.params;
    const existing = await findById('TASKS', taskId);
    if (!existing || existing.projectId !== projectId) {
      return res.status(404).json({ error: 'NotFound', message: 'Task not found' });
    }

    // Cascade: test cases under the task, then subtasks, then the task itself.
    const testCases = (await list('TESTCASES')).filter((tc) => tc.taskId === taskId);
    for (const tc of testCases) await remove('TESTCASES', tc.testCaseId);
    const subtasks = (await list('SUBTASKS')).filter((s) => s.taskId === taskId);
    for (const s of subtasks) await remove('SUBTASKS', s.subtaskId);
    await remove('TASKS', taskId);

    res.json({ taskId, deleted: true, removedSubtasks: subtasks.length, removedTestCases: testCases.length });
  })
);

/**
 * POST /api/projects/:projectId/tasks/:taskId/gen-testcases
 * AI-generates a PREVIEW list of test cases from the task's linked docs (not saved).
 */
router.post(
  '/:taskId/gen-testcases',
  validateBody(genTestcasesSchema),
  asyncHandler(async (req, res) => {
    if (!aiConfigured()) {
      return res.status(400).json({ error: 'NotConfigured', message: 'AI chưa cấu hình — thêm ANTHROPIC_API_KEY hoặc ANTHROPIC_AUTH_TOKEN vào backend/.env' });
    }
    const task = await findById('TASKS', req.params.taskId);
    if (!task || task.projectId !== req.params.projectId) {
      return res.status(404).json({ error: 'NotFound', message: 'Task not found' });
    }
    const result = await genTestcases(task, req.body);
    res.json(result);
  })
);

// Subtasks nested under a task.
router.use('/:taskId/subtasks', subtasksRouter);

export default router;
