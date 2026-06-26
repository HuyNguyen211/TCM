import { z } from 'zod';

// ---- Shared enums (mirror the spec exactly) ----
export const PROJECT_STATUS = ['active', 'paused', 'archived'];
export const MODULES = ['UI', 'API', 'DB', 'Performance', 'Security'];
export const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
export const TESTCASE_STATUS = ['DRAFT', 'ACTIVE', 'DEPRECATED'];
export const EXECUTION_STATUS = ['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED'];
export const TASK_STATUS = ['To Do', 'In Progress', 'Done'];

// ---- Pagination + filters (query strings -> coerced) ----
export const paginationSchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const projectListQuery = paginationSchema.extend({
  status: z.enum(PROJECT_STATUS).optional(),
  projectId: z.string().optional(),
});

export const testCaseListQuery = paginationSchema.extend({
  module: z.enum(MODULES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  status: z.enum(TESTCASE_STATUS).optional(),
  search: z.string().trim().optional(),
  // Hierarchy scoping. taskId filters to a task; subtaskId filters within it where
  // the sentinel 'none' means "attached directly to the task (no subtask)".
  taskId: z.string().optional(),
  subtaskId: z.string().optional(),
});

export const reportsQuery = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  groupBy: z.enum(['module', 'priority', 'status']).default('module'),
});
