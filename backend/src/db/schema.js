/**
 * schema.js — THE SINGLE SOURCE OF TRUTH for the FE → API → Google-Sheet mapping.
 *
 * Each sheet declares its columns in EXACT spreadsheet order (A, B, C, ...).
 * `key`  = the internal/object field name used by the repository + API layer.
 * `type` = how the value is serialized to / parsed from a flat sheet cell.
 *
 * Types:
 *   string   — stored verbatim
 *   int      — integer, parsed with parseInt
 *   float    — number, parsed with parseFloat
 *   csv      — JS array <-> "a,b,c" string   (used for tags, evidenceUrls, projectIds...)
 *   datetime — ISO timestamp string (stored verbatim, just documents intent)
 *
 * NOTE on the one deliberate API-vs-column NAME mismatch in the spec:
 *   Execution API field `executionStatus`  <->  internal/column key `status`.
 *   That translation happens in routes/executions.routes.js (documented there + in docs/FE-BE-MAPPING.md).
 *   Everything below uses the COLUMN/internal name.
 */

export const SHEETS = {
  PROJECTS: {
    name: 'PROJECTS',
    idKey: 'projectId',
    columns: [
      { col: 'A', key: 'projectId', type: 'string' },
      { col: 'B', key: 'projectName', type: 'string' },
      { col: 'C', key: 'description', type: 'string' },
      { col: 'D', key: 'ownerEmail', type: 'string' },
      { col: 'E', key: 'status', type: 'string' },
      { col: 'F', key: 'totalCases', type: 'int' },
      { col: 'G', key: 'passRate', type: 'float' },
      { col: 'H', key: 'createdDate', type: 'datetime' },
    ],
  },

  TESTCASES: {
    name: 'TESTCASES',
    idKey: 'testCaseId',
    columns: [
      { col: 'A', key: 'testCaseId', type: 'string' },
      { col: 'B', key: 'projectId', type: 'string' },
      { col: 'C', key: 'testCaseName', type: 'string' },
      { col: 'D', key: 'module', type: 'string' },
      { col: 'E', key: 'priority', type: 'string' },
      { col: 'F', key: 'status', type: 'string' },
      { col: 'G', key: 'assignedTo', type: 'string' },
      { col: 'H', key: 'tags', type: 'csv' }, // array <-> "smoke,regression"
      { col: 'I', key: 'stepsJSON', type: 'string' }, // JSON string stored verbatim
      { col: 'J', key: 'version', type: 'int' },
      { col: 'K', key: 'createdDate', type: 'datetime' },
      { col: 'L', key: 'lastModified', type: 'datetime' },
      // Hierarchy refs (Project -> Task -> Subtask -> TestCase).
      { col: 'M', key: 'taskId', type: 'string' }, // owning task (required)
      { col: 'N', key: 'subtaskId', type: 'string' }, // owning subtask ('' = attached directly to task)
    ],
  },

  TASKS: {
    name: 'TASKS',
    idKey: 'taskId',
    columns: [
      { col: 'A', key: 'taskId', type: 'string' },
      { col: 'B', key: 'projectId', type: 'string' },
      { col: 'C', key: 'taskName', type: 'string' },
      { col: 'D', key: 'description', type: 'string' },
      { col: 'E', key: 'status', type: 'string' }, // To Do | In Progress | Done
      { col: 'F', key: 'assignee', type: 'string' },
      { col: 'G', key: 'jiraKey', type: 'string' }, // placeholder for future Jira sync
      { col: 'H', key: 'createdDate', type: 'datetime' },
      { col: 'I', key: 'lastModified', type: 'datetime' },
      { col: 'J', key: 'confluenceUrl', type: 'string' }, // link to Confluence doc
      { col: 'K', key: 'figmaUrl', type: 'string' }, // link to Figma design
    ],
  },

  SUBTASKS: {
    name: 'SUBTASKS',
    idKey: 'subtaskId',
    columns: [
      { col: 'A', key: 'subtaskId', type: 'string' },
      { col: 'B', key: 'taskId', type: 'string' },
      { col: 'C', key: 'projectId', type: 'string' },
      { col: 'D', key: 'subtaskName', type: 'string' },
      { col: 'E', key: 'description', type: 'string' },
      { col: 'F', key: 'status', type: 'string' },
      { col: 'G', key: 'assignee', type: 'string' },
      { col: 'H', key: 'jiraKey', type: 'string' },
      { col: 'I', key: 'createdDate', type: 'datetime' },
      { col: 'J', key: 'lastModified', type: 'datetime' },
      { col: 'K', key: 'confluenceUrl', type: 'string' },
      { col: 'L', key: 'figmaUrl', type: 'string' },
    ],
  },

  EXECUTIONS: {
    name: 'EXECUTIONS',
    idKey: 'executionId',
    columns: [
      { col: 'A', key: 'executionId', type: 'string' },
      { col: 'B', key: 'testCaseId', type: 'string' },
      { col: 'C', key: 'executedBy', type: 'string' },
      { col: 'D', key: 'executionDate', type: 'datetime' },
      { col: 'E', key: 'status', type: 'string' }, // <- API field is `executionStatus`
      { col: 'F', key: 'failureReason', type: 'string' },
      { col: 'G', key: 'notes', type: 'string' },
      { col: 'H', key: 'duration', type: 'int' }, // seconds
      { col: 'I', key: 'evidenceUrls', type: 'csv' }, // array <-> csv
    ],
  },

  USERS: {
    name: 'USERS',
    idKey: 'userId',
    columns: [
      { col: 'A', key: 'userId', type: 'string' },
      { col: 'B', key: 'email', type: 'string' },
      { col: 'C', key: 'role', type: 'string' },
      { col: 'D', key: 'projects', type: 'csv' }, // array of projectIds
      { col: 'E', key: 'lastLogin', type: 'datetime' },
    ],
  },

  TESTSUITES: {
    name: 'TESTSUITES',
    idKey: 'suiteId',
    columns: [
      { col: 'A', key: 'suiteId', type: 'string' },
      { col: 'B', key: 'projectId', type: 'string' },
      { col: 'C', key: 'suiteName', type: 'string' },
      { col: 'D', key: 'testCaseIds', type: 'csv' },
    ],
  },
};

/** Ordered list of sheet names — used by setup script. */
export const SHEET_NAMES = Object.values(SHEETS).map((s) => s.name);

/** Header row (column keys in order) for a given sheet — written to row 1 of each sheet. */
export function headerRow(sheetName) {
  return SHEETS[sheetName].columns.map((c) => c.key);
}

/** Last column letter for a sheet (e.g. 'L' for TESTCASES) — used to build A1 ranges. */
export function lastColumn(sheetName) {
  const cols = SHEETS[sheetName].columns;
  return cols[cols.length - 1].col;
}
