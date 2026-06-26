import { z } from 'zod';
import { MODULES, PRIORITIES, TESTCASE_STATUS } from './common.schema.js';

/**
 * A single test step. `step` (number) is optional on input — the API will
 * renumber sequentially when it stores them.
 */
const stepSchema = z.object({
  step: z.number().int().optional(),
  action: z.string().trim().min(1, 'Action is required'),
  expected: z.string().trim().min(1, 'Expected result is required'),
});

/**
 * stepsJSON arrives as a STRINGIFIED array (per the spec's API contract).
 * We refine-parse it: must be a JSON array with >= 1 valid step.
 */
const stepsJSONField = z.string().superRefine((val, ctx) => {
  let parsed;
  try {
    parsed = JSON.parse(val);
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'stepsJSON must be valid JSON' });
    return;
  }
  if (!Array.isArray(parsed) || parsed.length < 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At least one step is required' });
    return;
  }
  for (const s of parsed) {
    const r = stepSchema.safeParse(s);
    if (!r.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Each step needs an action and expected result' });
      return;
    }
  }
});

export const createTestCaseSchema = z.object({
  testCaseName: z.string().trim().min(1, 'Test case name is required').max(200, 'Max 200 characters'),
  module: z.enum(MODULES),
  priority: z.enum(PRIORITIES).default('MEDIUM'),
  status: z.enum(TESTCASE_STATUS).default('DRAFT'),
  assignedTo: z.string().trim().email('Must be a valid email').or(z.literal('')).optional().default(''),
  tags: z.array(z.string().trim()).optional().default([]),
  stepsJSON: stepsJSONField,
  // Hierarchy: a test case must belong to a task; subtaskId is optional ('' = directly under the task).
  taskId: z.string().min(1, 'taskId is required'),
  subtaskId: z.string().optional().default(''),
});

export const updateTestCaseSchema = z.object({
  testCaseName: z.string().trim().min(1).max(200).optional(),
  module: z.enum(MODULES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  status: z.enum(TESTCASE_STATUS).optional(),
  assignedTo: z.string().trim().email().or(z.literal('')).optional(),
  tags: z.array(z.string().trim()).optional(),
  stepsJSON: stepsJSONField.optional(),
});
