/**
 * seedMore.js — APPEND a richer set of test cases (with varied results) to the
 * existing "E-commerce Platform" project. Non-destructive + idempotent.
 *
 * Spread: PASSED / FAILED / BLOCKED / SKIPPED + a few "Not run" (no execution),
 * across modules, priorities, tasks and subtasks. Executions are dated over the
 * last few days so the pass-rate trend has multiple points.
 *
 * Usage: npm run seed:more
 */
import { initDb, list, create, update } from '../src/db/index.js';
import { newId, nowIso } from '../src/utils/id.js';
import { projectRollup } from '../src/services/aggregate.js';

const TESTER = 'tester@firegroup.io';
const OWNER = 'demo@firegroup.io';
const daysAgoIso = (d) => new Date(Date.now() - d * 86400000).toISOString();
const steps = (...pairs) => JSON.stringify(pairs.map((p, i) => ({ step: i + 1, action: p[0], expected: p[1] })));

async function main() {
  await initDb();

  const proj = (await list('PROJECTS')).find((p) => p.projectName === 'E-commerce Platform');
  if (!proj) {
    console.error('[seedMore] "E-commerce Platform" not found. Run `npm run seed` first.');
    process.exit(1);
  }
  const projectId = proj.projectId;

  const tasks = (await list('TASKS')).filter((t) => t.projectId === projectId);
  const subtasks = (await list('SUBTASKS')).filter((s) => s.projectId === projectId);
  const taskBy = (n) => tasks.find((t) => t.taskName === n);
  const subBy = (n) => subtasks.find((s) => s.subtaskName === n);

  const auth = taskBy('Authentication');
  const cart = taskBy('Cart & Checkout');
  const oauth = subBy('Google OAuth login');
  const addToCart = subBy('Add to cart');
  if (!auth || !cart) {
    console.error('[seedMore] Expected seed tasks missing. Run `npm run reseed` first.');
    process.exit(1);
  }

  const existing = (await list('TESTCASES')).filter((tc) => tc.projectId === projectId);
  if (existing.some((tc) => tc.testCaseName === 'TC_Login_InvalidPassword')) {
    console.log('[seedMore] extra test cases already present — skipping.');
    return;
  }

  let created = 0;
  let execs = 0;
  async function tc(o) {
    const t = await create('TESTCASES', {
      testCaseId: newId(),
      projectId,
      testCaseName: o.name,
      module: o.module || 'UI',
      priority: o.priority || 'MEDIUM',
      status: o.status || 'ACTIVE',
      assignedTo: TESTER,
      tags: o.tags || [],
      stepsJSON: o.stepsJSON,
      version: 1,
      createdDate: nowIso(),
      lastModified: nowIso(),
      taskId: o.taskId,
      subtaskId: o.subtaskId || '',
    });
    created += 1;
    if (o.result) {
      await create('EXECUTIONS', {
        executionId: newId(),
        testCaseId: t.testCaseId,
        executedBy: o.executedBy || TESTER,
        executionDate: daysAgoIso(o.daysAgo ?? 0),
        status: o.result,
        failureReason: o.failureReason || '',
        notes: o.notes || '',
        duration: o.duration ?? 30,
        evidenceUrls: o.evidenceUrls || [],
      });
      execs += 1;
    }
    return t;
  }

  // ===== Task: Authentication (direct) =====
  await tc({ name: 'TC_Login_InvalidPassword', module: 'UI', priority: 'HIGH', tags: ['regression', 'negative'], taskId: auth.taskId,
    stepsJSON: steps(['Enter a wrong password and log in', 'Show the "Invalid credentials" error (401)']),
    result: 'FAILED', failureReason: 'Returns 500 instead of 401 on a wrong password', daysAgo: 1, duration: 25 });
  await tc({ name: 'TC_Login_RememberMe', module: 'UI', priority: 'MEDIUM', tags: ['smoke'], taskId: auth.taskId,
    stepsJSON: steps(['Tick "Remember me" and log in', 'The session persists after closing/reopening the browser']),
    result: 'PASSED', daysAgo: 1, duration: 40 });
  await tc({ name: 'TC_Session_Timeout', module: 'Security', priority: 'HIGH', tags: ['security'], taskId: auth.taskId,
    stepsJSON: steps(['Stay idle for 30 minutes', 'Auto logout, forcing a re-login']),
    result: 'BLOCKED', notes: 'Could not configure session timeout on staging', daysAgo: 2, duration: 0 });
  await tc({ name: 'TC_Logout', module: 'UI', priority: 'LOW', tags: ['smoke'], taskId: auth.taskId,
    stepsJSON: steps(['Click Logout', 'Return to the login page and clear the session']),
    result: 'PASSED', daysAgo: 0, duration: 10 });
  await tc({ name: 'TC_Password_Reset', module: 'UI', priority: 'MEDIUM', tags: ['regression'], taskId: auth.taskId,
    stepsJSON: steps(['Click "Forgot password", enter email', 'Receive the reset email'], ['Set a new password', 'Able to log in with the new password']) }); // Not run

  // ===== Subtask: Google OAuth login =====
  if (oauth) {
    await tc({ name: 'TC_OAuth_NewUser', module: 'UI', priority: 'HIGH', tags: ['oauth'], taskId: auth.taskId, subtaskId: oauth.subtaskId,
      stepsJSON: steps(['Log in with Google using a new account', 'Auto-creates the user + lands on the dashboard']),
      result: 'PASSED', daysAgo: 1, duration: 35 });
    await tc({ name: 'TC_OAuth_Cancel', module: 'UI', priority: 'MEDIUM', tags: ['oauth', 'negative'], taskId: auth.taskId, subtaskId: oauth.subtaskId,
      stepsJSON: steps(['Cancel at the Google consent screen', 'Return to the login page, no session created']),
      result: 'SKIPPED', notes: 'Testing deferred to a later sprint', daysAgo: 0, duration: 0 });
  }

  // ===== Task: Cart & Checkout (direct) =====
  await tc({ name: 'TC_Checkout_EmptyCart', module: 'API', priority: 'MEDIUM', tags: ['api', 'negative'], taskId: cart.taskId,
    stepsJSON: steps(['POST /checkout with an empty cart', 'Returns 400 + an empty-cart message']),
    result: 'FAILED', failureReason: 'API returns 200 even when the cart is empty', daysAgo: 2, duration: 12 });
  await tc({ name: 'TC_Checkout_Discount', module: 'API', priority: 'HIGH', tags: ['api', 'regression'], taskId: cart.taskId,
    stepsJSON: steps(['Apply a valid discount code', 'The total is reduced by the correct percentage']),
    result: 'PASSED', daysAgo: 1, duration: 18 });
  await tc({ name: 'TC_Payment_Decline', module: 'API', priority: 'CRITICAL', tags: ['payment'], taskId: cart.taskId,
    stepsJSON: steps(['Pay with a declined card', 'Show an error, no order created']),
    result: 'BLOCKED', notes: 'Stripe sandbox is down, cannot test yet', daysAgo: 3, duration: 0 });
  await tc({ name: 'TC_Order_Confirmation_Email', module: 'UI', priority: 'LOW', tags: ['email'], taskId: cart.taskId,
    stepsJSON: steps(['Place an order successfully', 'Receive the order confirmation email']) }); // Not run

  // ===== Subtask: Add to cart =====
  if (addToCart) {
    await tc({ name: 'TC_RemoveFromCart', module: 'UI', priority: 'MEDIUM', tags: ['cart'], taskId: cart.taskId, subtaskId: addToCart.subtaskId,
      stepsJSON: steps(['Click to remove a product from the cart', 'The cart updates and the total decreases']),
      result: 'PASSED', daysAgo: 0, duration: 15 });
    await tc({ name: 'TC_Cart_QuantityUpdate', module: 'UI', priority: 'MEDIUM', tags: ['cart'], taskId: cart.taskId, subtaskId: addToCart.subtaskId,
      stepsJSON: steps(['Increase the product quantity to 3', 'The total multiplies correctly']),
      result: 'FAILED', failureReason: 'The total does not update when the quantity changes', daysAgo: 1, duration: 20 });
    await tc({ name: 'TC_Cart_Persistence', module: 'DB', priority: 'HIGH', tags: ['cart', 'db'], taskId: cart.taskId, subtaskId: addToCart.subtaskId,
      stepsJSON: steps(['Add items, log out then log back in', 'The cart still contains the products']) }); // Not run
  }

  const m = await projectRollup(projectId);
  await update('PROJECTS', projectId, { totalCases: m.totalCases, passRate: m.passRate });
  console.log(`[seedMore] +${created} test cases, +${execs} executions on "E-commerce Platform".`);
  console.log(`[seedMore] now: ${m.totalCases} cases | executed ${m.executed} | pending ${m.pending} | pass ${m.passRate}% | fail ${m.failRate}%`);
}

main().catch((e) => {
  console.error('[seedMore] failed:', e);
  process.exit(1);
});
