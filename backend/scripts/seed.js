/**
 * seed.js — loads sample data through the repository layer.
 * Hierarchy: Project -> Task -> Subtask(optional) -> TestCase -> Execution.
 * Works in BOTH mock and sheets mode. Idempotent: skips if the sample project exists.
 *
 * Usage: npm run seed   (or: npm run reseed to wipe + reload in mock mode)
 */
import { initDb, list, create, update } from '../src/db/index.js';
import { newId, nowIso } from '../src/utils/id.js';
import { projectRollup } from '../src/services/aggregate.js';

const OWNER = 'demo@firegroup.io';
const TESTER = 'tester@firegroup.io';

async function main() {
  await initDb();

  const projects = await list('PROJECTS');
  if (projects.some((p) => p.projectName === 'E-commerce Platform')) {
    console.log('[seed] sample data already present — skipping. (use `npm run reseed` to rebuild)');
    return;
  }

  // --- Users ---
  await create('USERS', { userId: newId(), email: OWNER, role: 'lead', projects: [], lastLogin: nowIso() });
  await create('USERS', { userId: newId(), email: TESTER, role: 'tester', projects: [], lastLogin: nowIso() });

  // --- Project ---
  const ecomId = newId();
  await create('PROJECTS', {
    projectId: ecomId,
    projectName: 'E-commerce Platform',
    description: 'Full-stack checkout, cart, and catalog test cases.',
    ownerEmail: OWNER,
    status: 'active',
    totalCases: 0,
    passRate: 0,
    createdDate: nowIso(),
  });

  // --- helpers ---
  const mkTask = (over) => create('TASKS', {
    taskId: newId(), projectId: ecomId, taskName: 'Task', description: '',
    status: 'To Do', assignee: TESTER, jiraKey: '', createdDate: nowIso(), lastModified: nowIso(), ...over,
  });
  const mkSubtask = (taskId, over) => create('SUBTASKS', {
    subtaskId: newId(), taskId, projectId: ecomId, subtaskName: 'Subtask', description: '',
    status: 'To Do', assignee: TESTER, jiraKey: '', createdDate: nowIso(), lastModified: nowIso(), ...over,
  });
  const mkTc = (over) => create('TESTCASES', {
    testCaseId: newId(), projectId: ecomId, testCaseName: 'TC', module: 'UI', priority: 'MEDIUM',
    status: 'ACTIVE', assignedTo: TESTER, tags: [], stepsJSON: '[]', version: 1,
    createdDate: nowIso(), lastModified: nowIso(), taskId: '', subtaskId: '', ...over,
  });

  // === Task 1: Authentication ===
  const taskAuth = await mkTask({
    taskName: 'Authentication', description: 'Login, OAuth, sessions.', status: 'In Progress', jiraKey: 'ECOM-12',
    confluenceUrl: 'https://confluence.example.com/display/ECOM/Authentication',
    figmaUrl: 'https://figma.com/file/abc/Auth-Flow',
  });

  // Direct test case under the task (no subtask)
  const tc1 = await mkTc({
    testCaseName: 'TC_001_Login', module: 'UI', priority: 'HIGH', tags: ['smoke', 'regression'],
    taskId: taskAuth.taskId, subtaskId: '',
    stepsJSON: JSON.stringify([
      { step: 1, action: 'Enter username & password', expected: 'Fields populated' },
      { step: 2, action: 'Click Login', expected: 'Redirect to dashboard' },
    ]),
  });

  // Subtask + its test case
  const subOAuth = await mkSubtask(taskAuth.taskId, { subtaskName: 'Google OAuth login', status: 'In Progress', jiraKey: 'ECOM-12-1' });
  const tc2 = await mkTc({
    testCaseName: 'TC_002_Google_OAuth', module: 'UI', priority: 'CRITICAL', tags: ['oauth'],
    taskId: taskAuth.taskId, subtaskId: subOAuth.subtaskId,
    stepsJSON: JSON.stringify([
      { step: 1, action: 'Click "Sign in with Google"', expected: 'Google consent screen' },
      { step: 2, action: 'Approve', expected: 'Logged in, redirected back' },
    ]),
  });

  // === Task 2: Cart & Checkout ===
  const taskCart = await mkTask({ taskName: 'Cart & Checkout', description: 'Cart ops + checkout API.', status: 'To Do', jiraKey: 'ECOM-20' });

  const subCart = await mkSubtask(taskCart.taskId, { subtaskName: 'Add to cart', jiraKey: 'ECOM-20-1' });
  const tc3 = await mkTc({
    testCaseName: 'TC_003_Add_To_Cart', module: 'UI', priority: 'CRITICAL', tags: ['smoke', 'cart'],
    taskId: taskCart.taskId, subtaskId: subCart.subtaskId,
    stepsJSON: JSON.stringify([
      { step: 1, action: 'Open product page', expected: 'Product details visible' },
      { step: 2, action: 'Click Add to Cart', expected: 'Cart count increments' },
    ]),
  });

  await mkTc({
    testCaseName: 'TC_004_Checkout_API', module: 'API', priority: 'HIGH', tags: ['regression', 'api'],
    taskId: taskCart.taskId, subtaskId: '',
    stepsJSON: JSON.stringify([
      { step: 1, action: 'POST /checkout with valid cart', expected: '200 + orderId returned' },
    ]),
  });

  // --- Executions ---
  await create('EXECUTIONS', {
    executionId: newId(), testCaseId: tc1.testCaseId, executedBy: TESTER,
    executionDate: nowIso(), status: 'PASSED', failureReason: '', notes: 'Chrome 120', duration: 45, evidenceUrls: [],
  });
  await create('EXECUTIONS', {
    executionId: newId(), testCaseId: tc2.testCaseId, executedBy: TESTER,
    executionDate: nowIso(), status: 'FAILED', failureReason: 'Consent screen times out on staging',
    notes: 'Repro 2/3 attempts', duration: 60, evidenceUrls: ['https://imgur.com/example-shot'],
  });
  await create('EXECUTIONS', {
    executionId: newId(), testCaseId: tc3.testCaseId, executedBy: OWNER,
    executionDate: nowIso(), status: 'PASSED', failureReason: '', notes: '', duration: 20, evidenceUrls: [],
  });

  // --- Project 2 (empty) ---
  await create('PROJECTS', {
    projectId: newId(), projectName: 'Mobile App', description: 'iOS/Android smoke + regression suite.',
    ownerEmail: OWNER, status: 'paused', totalCases: 0, passRate: 0, createdDate: nowIso(),
  });

  const m = await projectRollup(ecomId);
  await update('PROJECTS', ecomId, { totalCases: m.totalCases, passRate: m.passRate });

  console.log('[seed] done. Login with', OWNER, 'or', TESTER);
  console.log('[seed] E-commerce Platform -> Tasks: Authentication (1 subtask), Cart & Checkout (1 subtask)');
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
