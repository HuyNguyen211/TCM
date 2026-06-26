# FE → API → Google-Sheet Field Mapping

This is the authoritative contract. The backend enforces it via zod validators
(`backend/src/validators/*`), column constants (`backend/src/db/schema.js`), and
mappers (`backend/src/utils/mappers.js`). The frontend forms produce exactly these API fields.

**Mapping types:** `string` verbatim · `int`/`float` numeric · `csv` JS array ⇄ `"a,b,c"` · `datetime` ISO string.

---

## 1. PROJECTS sheet

| FE Field (form) | API Field | Sheet Col | Type | Validation | Notes |
|---|---|---|---|---|---|
| Project Name | `projectName` | B | string | required, max 100 | |
| Description | `description` | C | string | optional, max 500 | |
| Status | `status` | E | enum | `active\|paused\|archived` (default `active`) | |
| — (auth user) | `ownerEmail` | D | string | from JWT | set server-side on create |
| — (auto) | `projectId` | A | string | uuid v4 | generated on create |
| — (auto) | `createdDate` | H | datetime | ISO | `new Date().toISOString()` |
| — (computed) | `totalCases` | F | int | — | **computed on read** from TESTCASES; stored value refreshed best-effort |
| — (computed) | `passRate` | G | float | — | **computed on read** from latest EXECUTIONS |

## 2. TESTCASES sheet

| FE Field (form) | API Field | Sheet Col | Type | Validation | Notes |
|---|---|---|---|---|---|
| Test Case Name | `testCaseName` | C | string | required, max 200 | |
| Module | `module` | D | enum | `UI\|API\|DB\|Performance\|Security` | |
| Priority (radio) | `priority` | E | enum | `CRITICAL\|HIGH\|MEDIUM\|LOW` (default `MEDIUM`) | |
| Status | `status` | F | enum | `DRAFT\|ACTIVE\|DEPRECATED` (default `DRAFT`) | soft-delete sets `DEPRECATED` |
| Assigned To | `assignedTo` | G | string | optional, email or empty | |
| Tags (chips) | `tags` | H | **csv** | array of strings | `['smoke','regression']` → `"smoke,regression"` |
| Steps (table) | `stepsJSON` | I | string | JSON array, **min 1 step**, each `{action, expected}` | sent as a **stringified** array; backend re-numbers `step` 1..n |
| — (auto) | `testCaseId` | A | string | uuid v4 | |
| — (context) | `projectId` | B | string | from URL | |
| — (auto) | `version` | J | int | starts at 1 | **increments on every PUT** |
| — (auto) | `createdDate` | K | datetime | ISO | |
| — (auto) | `lastModified` | L | datetime | ISO | updated on every PUT |
| — (context) | `taskId` | M | string | required | owning Task (from scope) |
| — (context) | `subtaskId` | N | string | optional | owning Subtask; `''` = directly under the Task |

> **Read convenience:** `GET` responses also include a parsed `steps` array alongside the raw `stepsJSON` string.

> **Hierarchy:** Project → Task → Subtask (optional) → Test Case. A test case always has a
> `taskId`; `subtaskId` is empty when attached directly to the task. List filter:
> `?taskId=<id>&subtaskId=none` → direct task-level; `&subtaskId=<id>` → that subtask.

## 2b. TASKS sheet

| FE Field | API Field | Sheet Col | Type | Validation |
|---|---|---|---|---|
| Task Name | `taskName` | C | string | required, max 200 |
| Description | `description` | D | string | optional, max 1000 |
| Status | `status` | E | enum | `To Do\|In Progress\|Done` (default `To Do`) |
| Assignee | `assignee` | F | string | optional, email |
| Jira Key / Link | `jiraKey` | G | string | optional — placeholder for future Jira sync |
| Confluence URL | `confluenceUrl` | J | string | optional, valid URL |
| Figma URL | `figmaUrl` | K | string | optional, valid URL |
| — auto | `taskId` A · `projectId` B · `createdDate` H · `lastModified` I | | | |

Endpoints: `GET/POST /api/projects/:projectId/tasks`, `GET/PUT/DELETE /…/tasks/:taskId`
(DELETE cascades to its subtasks + test cases). List adds `subtaskCount`, `testCaseCount`.

## 2c. SUBTASKS sheet

| FE Field | API Field | Sheet Col | Type | Validation |
|---|---|---|---|---|
| Subtask Name | `subtaskName` | D | string | required, max 200 |
| Description | `description` | E | string | optional, max 1000 |
| Status | `status` | F | enum | `To Do\|In Progress\|Done` |
| Assignee | `assignee` | G | string | optional, email |
| Jira Key / Link | `jiraKey` | H | string | optional |
| Confluence URL | `confluenceUrl` | K | string | optional, valid URL |
| Figma URL | `figmaUrl` | L | string | optional, valid URL |
| — auto | `subtaskId` A · `taskId` B · `projectId` C · `createdDate` I · `lastModified` J | | | |

> **Test-case result:** GET list + single responses include `latestResult` = the most
> recent execution's status (`PASSED|FAILED|BLOCKED|SKIPPED`), or `''` when never run
> (shown as "Chưa chạy"). It's derived from EXECUTIONS — set only via *Record Execution*,
> never edited directly. `version` (col J) is the edit count, unrelated to result.

Endpoints: `GET/POST /api/projects/:projectId/tasks/:taskId/subtasks`,
`GET/PUT/DELETE /…/subtasks/:subtaskId` (DELETE cascades to its test cases).

## 3. EXECUTIONS sheet

| FE Field (form) | API Field | Sheet Col | Type | Validation | Notes |
|---|---|---|---|---|---|
| Result (radio) | `executionStatus` | E (`status`) | enum | `PASSED\|FAILED\|BLOCKED\|SKIPPED` | ⚠️ **API name ≠ column name** (`executionStatus` → `status`) |
| Failure Reason | `failureReason` | F | string | **required iff `executionStatus==='FAILED'`** | conditional field (shown only on FAIL) |
| Notes | `notes` | G | string | optional | |
| Duration (s) | `duration` | H | int | ≥ 0, seconds | |
| Evidence URLs | `evidenceUrls` | I | **csv** | array of valid URLs | paste links (Phase 3 = real upload) |
| — (auto) | `executionId` | A | string | uuid v4 | |
| — (context) | `testCaseId` | B | string | from URL | |
| — (auth user) | `executedBy` | C | string | from JWT | |
| — (auto) | `executionDate` | D | datetime | ISO | |

## 4. USERS sheet

| API Field | Sheet Col | Type | Notes |
|---|---|---|---|
| `userId` | A | string | uuid v4 |
| `email` | B | string | login identity |
| `role` | C | string | `admin\|lead\|tester\|viewer` (default `tester`) |
| `projects` | D | csv | array of projectIds |
| `lastLogin` | E | datetime | updated on each login |

## 5. TESTSUITES sheet

| FE/API Field | Sheet Col | Type | Validation |
|---|---|---|---|
| `suiteId` | A | string | uuid v4 |
| `projectId` | B | string | from URL |
| `suiteName` | C | string | required, max 150 |
| `testCaseIds` | D | csv | array of testCaseIds |

---

## API endpoint summary

| Method & path | Body / Query | Returns |
|---|---|---|
| `POST /api/auth/login` | `{email, role?}` | `{token, user}` |
| `GET /api/auth/me` | — | `{user}` |
| `GET /api/projects` | `?status&projectId&skip&limit` | `{projects[], total}` |
| `POST /api/projects` | `{projectName, description?, status?}` | created project |
| `GET /api/projects/:projectId` | — | project (live metrics) |
| `PUT /api/projects/:projectId` | partial project | updated project |
| `GET /api/projects/:projectId/testcases` | `?module&priority&status&search&skip&limit` | `{testCases[], total}` |
| `POST /api/projects/:projectId/testcases` | test-case body | `{testCaseId, version, ...}` |
| `GET /api/projects/:projectId/testcases/:id` | — | test case (+ parsed `steps`) |
| `PUT /api/projects/:projectId/testcases/:id` | partial | updated (version++) |
| `DELETE /api/projects/:projectId/testcases/:id` | — | `{testCaseId, status:'DEPRECATED'}` |
| `POST /api/projects/:projectId/testcases/:id/execute` | execution body | `{executionId}` |
| `GET /api/projects/:projectId/testcases/:id/executions` | — | `{executions[], total}` |
| `GET /api/projects/:projectId/reports` | `?dateFrom&dateTo&groupBy` | `{metrics, chartData}` |
| `GET/POST /api/projects/:projectId/suites` | suite body | suites |

**Validation errors** return `400 { error: "ValidationError", fields: { <field>: <message> } }`.
**Auth errors** return `401 { error: "Unauthorized", message }`.
