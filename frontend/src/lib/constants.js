// Mirror the backend enums (validators/common.schema.js) exactly.
export const ROLES = ['admin', 'lead', 'tester', 'viewer']; // mirrors user.schema.js
// Self-service signup cannot grant elevated roles (mirrors auth.schema.js).
export const SIGNUP_ROLES = ['tester', 'viewer'];
export const roleBadge = {
  admin: 'bg-purple-100 text-purple-800',
  lead: 'bg-blue-100 text-blue-800',
  tester: 'bg-green-100 text-green-800',
  viewer: 'bg-gray-100 text-gray-700',
};
export const PROJECT_STATUS = ['active', 'paused', 'archived'];
export const MODULES = ['UI', 'API', 'DB', 'Performance', 'Security'];
export const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
export const TESTCASE_STATUS = ['DRAFT', 'ACTIVE', 'DEPRECATED'];
export const EXECUTION_STATUS = ['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED'];
export const TASK_STATUS = ['To Do', 'In Progress', 'Done'];

export const taskStatusBadge = {
  'To Do': 'bg-gray-100 text-gray-700',
  'In Progress': 'bg-blue-100 text-blue-800',
  Done: 'bg-green-100 text-green-800',
};

export const EXECUTION_LABELS = {
  PASSED: 'Pass ✅',
  FAILED: 'Fail ❌',
  BLOCKED: 'Blocked ⚠️',
  SKIPPED: 'Skip ⏭️',
};

export const priorityBadge = {
  CRITICAL: 'bg-red-100 text-red-800',
  HIGH: 'bg-orange-100 text-orange-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-gray-100 text-gray-700',
};

export const tcStatusBadge = {
  DRAFT: 'bg-gray-100 text-gray-700',
  ACTIVE: 'bg-green-100 text-green-800',
  DEPRECATED: 'bg-red-100 text-red-700',
};

export const projectStatusBadge = {
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  archived: 'bg-gray-200 text-gray-600',
};

export const execStatusBadge = {
  PASSED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  BLOCKED: 'bg-amber-100 text-amber-800',
  SKIPPED: 'bg-gray-100 text-gray-600',
  PENDING: 'bg-slate-100 text-slate-500',
};
