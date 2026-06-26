import { Router } from 'express';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/error.js';
import { createSubtaskSchema, updateSubtaskSchema } from '../validators/subtask.schema.js';
import { list, findById, create, update, remove } from '../db/index.js';
import { newId, nowIso } from '../utils/id.js';
import { genTestcasesSchema } from '../validators/ai.schema.js';
import { genTestcases, isConfigured as aiConfigured } from '../services/aiTestcases.js';

// mergeParams: projectId + taskId from parent routers.
const router = Router({ mergeParams: true });

/** GET /api/projects/:projectId/tasks/:taskId/subtasks -> subtasks with test-case counts. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const subtasks = (await list('SUBTASKS')).filter((s) => s.taskId === taskId);
    const testCases = await list('TESTCASES');
    const withCounts = subtasks.map((s) => ({
      ...s,
      testCaseCount: testCases.filter((tc) => tc.subtaskId === s.subtaskId).length,
    }));
    res.json({ subtasks: withCounts, total: withCounts.length });
  })
);

/** POST /api/projects/:projectId/tasks/:taskId/subtasks */
router.post(
  '/',
  validateBody(createSubtaskSchema),
  asyncHandler(async (req, res) => {
    const { projectId, taskId } = req.params;
    const task = await findById('TASKS', taskId);
    if (!task || task.projectId !== projectId) {
      return res.status(404).json({ error: 'NotFound', message: 'Task not found' });
    }
    const now = nowIso();
    const subtask = await create('SUBTASKS', {
      subtaskId: newId(),
      taskId,
      projectId,
      subtaskName: req.body.subtaskName,
      description: req.body.description || '',
      status: req.body.status,
      assignee: req.body.assignee || '',
      jiraKey: req.body.jiraKey || '',
      confluenceUrl: req.body.confluenceUrl || '',
      figmaUrl: req.body.figmaUrl || '',
      createdDate: now,
      lastModified: now,
    });
    res.status(201).json(subtask);
  })
);

/** GET single subtask */
router.get(
  '/:subtaskId',
  asyncHandler(async (req, res) => {
    const subtask = await findById('SUBTASKS', req.params.subtaskId);
    if (!subtask || subtask.taskId !== req.params.taskId) {
      return res.status(404).json({ error: 'NotFound', message: 'Subtask not found' });
    }
    res.json(subtask);
  })
);

/** PUT subtask */
router.put(
  '/:subtaskId',
  validateBody(updateSubtaskSchema),
  asyncHandler(async (req, res) => {
    const existing = await findById('SUBTASKS', req.params.subtaskId);
    if (!existing || existing.taskId !== req.params.taskId) {
      return res.status(404).json({ error: 'NotFound', message: 'Subtask not found' });
    }
    const updated = await update('SUBTASKS', req.params.subtaskId, { ...req.body, lastModified: nowIso() });
    res.json(updated);
  })
);

/** DELETE subtask -> cascade delete its test cases. */
router.delete(
  '/:subtaskId',
  asyncHandler(async (req, res) => {
    const { taskId, subtaskId } = req.params;
    const existing = await findById('SUBTASKS', subtaskId);
    if (!existing || existing.taskId !== taskId) {
      return res.status(404).json({ error: 'NotFound', message: 'Subtask not found' });
    }
    const testCases = (await list('TESTCASES')).filter((tc) => tc.subtaskId === subtaskId);
    for (const tc of testCases) await remove('TESTCASES', tc.testCaseId);
    await remove('SUBTASKS', subtaskId);
    res.json({ subtaskId, deleted: true, removedTestCases: testCases.length });
  })
);

/** POST /.../subtasks/:subtaskId/gen-testcases -> AI preview list from the subtask's docs. */
router.post(
  '/:subtaskId/gen-testcases',
  validateBody(genTestcasesSchema),
  asyncHandler(async (req, res) => {
    if (!aiConfigured()) {
      return res.status(400).json({ error: 'NotConfigured', message: 'AI chưa cấu hình — thêm ANTHROPIC_API_KEY hoặc ANTHROPIC_AUTH_TOKEN vào backend/.env' });
    }
    const subtask = await findById('SUBTASKS', req.params.subtaskId);
    if (!subtask || subtask.taskId !== req.params.taskId) {
      return res.status(404).json({ error: 'NotFound', message: 'Subtask not found' });
    }
    const result = await genTestcases(subtask, req.body);
    res.json(result);
  })
);

export default router;
