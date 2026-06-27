/**
 * seedDemo.js — APPEND a rich, diverse demo dataset to the existing
 * "E-commerce Platform" project so the TCM product looks good in a live demo.
 *
 * Adds 6 new tasks (+ their subtasks) beyond the seeded Authentication /
 * Cart & Checkout, then a spread of test cases across modules
 * (UI / API / DB / Security / Performance / Mobile), priorities (CRITICAL..LOW),
 * task statuses (To Do / In Progress / Done) and execution results
 * (PASSED / FAILED / BLOCKED / SKIPPED + a few "Not run").
 *
 * Executions are dated over the last ~5 days so the pass-rate trend chart has
 * multiple points. A handful of tasks carry Jira / Confluence / Figma links so
 * the integration badges light up.
 *
 * Works in BOTH mock and sheets mode (it goes through the repository layer, so
 * it honours whatever DB_MODE is set). Non-destructive + idempotent: it bails
 * out if its sentinel test case is already present.
 *
 * Sheets safety: set SEED_THROTTLE_MS (e.g. 1300) to space out writes and stay
 * under the Google Sheets write quota; each write is also retried on transient
 * errors (429 / 5xx).
 *
 * Usage:
 *   npm run seed:demo                         # honours .env DB_MODE
 *   DB_MODE=mock npm run seed:demo            # force local JSON
 *   DB_MODE=sheets SEED_THROTTLE_MS=1300 npm run seed:demo   # Google Sheets
 */
import { initDb, list, create, update } from '../src/db/index.js';
import { newId, nowIso } from '../src/utils/id.js';
import { projectRollup } from '../src/services/aggregate.js';

const TESTER = 'tester@firegroup.io';
const OWNER = 'demo@firegroup.io';

const THROTTLE_MS = parseInt(process.env.SEED_THROTTLE_MS || '0', 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const daysAgoIso = (d) => new Date(Date.now() - d * 86400000).toISOString();
const steps = (...pairs) =>
  JSON.stringify(pairs.map((p, i) => ({ step: i + 1, action: p[0], expected: p[1] })));

// Retry transient Google Sheets errors (rate limit / 5xx) with backoff.
async function withRetry(label, fn, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const code = err?.code || err?.response?.status;
      const transient = code === 429 || (code >= 500 && code < 600);
      if (!transient || i === attempts - 1) throw err;
      const backoff = 1500 * (i + 1);
      console.warn(`[seedDemo] ${label} -> ${code}, retry in ${backoff}ms`);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

async function main() {
  await initDb();

  const proj = (await list('PROJECTS')).find((p) => p.projectName === 'E-commerce Platform');
  if (!proj) {
    console.error('[seedDemo] "E-commerce Platform" not found. Run `npm run seed` first.');
    process.exit(1);
  }
  const projectId = proj.projectId;

  const existing = (await list('TESTCASES')).filter((tc) => tc.projectId === projectId);
  if (existing.some((tc) => tc.testCaseName === 'TC_Search_Keyword')) {
    console.log('[seedDemo] demo dataset already present — skipping. (nothing to do)');
    return;
  }

  let nTasks = 0;
  let nSubs = 0;
  let nTc = 0;
  let nExec = 0;

  // --- repository helpers (with throttle + retry) ---
  async function mkTask(o) {
    const t = {
      taskId: newId(),
      projectId,
      taskName: o.name,
      description: o.description || '',
      status: o.status || 'To Do',
      assignee: o.assignee || TESTER,
      jiraKey: o.jiraKey || '',
      createdDate: nowIso(),
      lastModified: nowIso(),
      confluenceUrl: o.confluenceUrl || '',
      figmaUrl: o.figmaUrl || '',
    };
    await withRetry(`task ${o.name}`, () => create('TASKS', t));
    nTasks += 1;
    if (THROTTLE_MS) await sleep(THROTTLE_MS);
    return t;
  }

  async function mkSub(taskId, o) {
    const s = {
      subtaskId: newId(),
      taskId,
      projectId,
      subtaskName: o.name,
      description: o.description || '',
      status: o.status || 'To Do',
      assignee: o.assignee || TESTER,
      jiraKey: o.jiraKey || '',
      createdDate: nowIso(),
      lastModified: nowIso(),
      confluenceUrl: o.confluenceUrl || '',
      figmaUrl: o.figmaUrl || '',
    };
    await withRetry(`subtask ${o.name}`, () => create('SUBTASKS', s));
    nSubs += 1;
    if (THROTTLE_MS) await sleep(THROTTLE_MS);
    return s;
  }

  async function mkTc(o) {
    const t = {
      testCaseId: newId(),
      projectId,
      testCaseName: o.name,
      module: o.module || 'UI',
      priority: o.priority || 'MEDIUM',
      status: o.status || 'ACTIVE',
      assignedTo: o.assignedTo || TESTER,
      tags: o.tags || [],
      stepsJSON: o.stepsJSON,
      version: 1,
      createdDate: nowIso(),
      lastModified: nowIso(),
      taskId: o.taskId,
      subtaskId: o.subtaskId || '',
    };
    await withRetry(`tc ${o.name}`, () => create('TESTCASES', t));
    nTc += 1;
    if (THROTTLE_MS) await sleep(THROTTLE_MS);

    if (o.result) {
      const ex = {
        executionId: newId(),
        testCaseId: t.testCaseId,
        executedBy: o.executedBy || TESTER,
        executionDate: daysAgoIso(o.daysAgo ?? 0),
        status: o.result,
        failureReason: o.failureReason || '',
        notes: o.notes || '',
        duration: o.duration ?? 30,
        evidenceUrls: o.evidenceUrls || [],
      };
      await withRetry(`exec ${o.name}`, () => create('EXECUTIONS', ex));
      nExec += 1;
      if (THROTTLE_MS) await sleep(THROTTLE_MS);
    }
    return t;
  }

  // =====================================================================
  // Task A — Product Catalog & Search  (Done)
  // =====================================================================
  const catalog = await mkTask({
    name: 'Product Catalog & Search',
    description: 'Search, filters, sorting and the product detail page.',
    status: 'Done',
    jiraKey: 'ECOM-30',
    confluenceUrl: 'https://confluence.example.com/display/ECOM/Catalog-Search',
    figmaUrl: 'https://figma.com/file/catalog/Search-and-PDP',
  });
  const subSearch = await mkSub(catalog.taskId, { name: 'Search & Filters', status: 'In Progress', jiraKey: 'ECOM-30-1' });
  const subPdp = await mkSub(catalog.taskId, { name: 'Product Detail Page', status: 'Done', jiraKey: 'ECOM-30-2' });

  await mkTc({ name: 'TC_Search_Keyword', module: 'UI', priority: 'HIGH', tags: ['smoke', 'search'], taskId: catalog.taskId,
    stepsJSON: steps(['Enter the keyword "t-shirt" and click search', 'A list of products matching the keyword is shown']),
    result: 'PASSED', daysAgo: 2, duration: 22 });
  await mkTc({ name: 'TC_Search_NoResults', module: 'UI', priority: 'MEDIUM', tags: ['search', 'negative'], taskId: catalog.taskId,
    stepsJSON: steps(['Search for a non-existent keyword "xyzzy123"', 'Show the "No products found" empty state']),
    result: 'PASSED', daysAgo: 2, duration: 15 });
  await mkTc({ name: 'TC_Search_API_Pagination', module: 'API', priority: 'HIGH', tags: ['api', 'search'], taskId: catalog.taskId,
    stepsJSON: steps(['GET /products?q=ao&page=2&size=20', 'Returns 200 + exactly 20 items from page 2 + total count']),
    result: 'PASSED', daysAgo: 3, duration: 18 });
  await mkTc({ name: 'TC_Filter_ByPriceRange', module: 'UI', priority: 'MEDIUM', tags: ['search', 'regression'], taskId: catalog.taskId, subtaskId: subSearch.subtaskId,
    stepsJSON: steps(['Filter price 100k–300k', 'Only products within the price range are shown']),
    result: 'PASSED', daysAgo: 4, duration: 20 });
  await mkTc({ name: 'TC_Filter_ByCategory', module: 'UI', priority: 'MEDIUM', tags: ['search'], taskId: catalog.taskId, subtaskId: subSearch.subtaskId,
    stepsJSON: steps(['Select the "Shoes" category, then go to page 2', 'The category filter is preserved']),
    result: 'FAILED', failureReason: 'Category filter is reset when changing pages', daysAgo: 1, duration: 25 });
  await mkTc({ name: 'TC_Sort_ByPriceAsc', module: 'UI', priority: 'LOW', tags: ['search'], taskId: catalog.taskId, subtaskId: subSearch.subtaskId,
    stepsJSON: steps(['Sort by "Price: low to high"', 'The list is ordered correctly by price']),
    result: 'PASSED', daysAgo: 4, duration: 12 });
  await mkTc({ name: 'TC_ProductDetail_Display', module: 'UI', priority: 'HIGH', tags: ['smoke'], taskId: catalog.taskId, subtaskId: subPdp.subtaskId,
    stepsJSON: steps(['Open the detail page of a product', 'Shows name, price, images, description and the buy button']),
    result: 'PASSED', daysAgo: 3, duration: 16 });
  await mkTc({ name: 'TC_ProductDetail_OutOfStock', module: 'UI', priority: 'MEDIUM', tags: ['negative'], taskId: catalog.taskId, subtaskId: subPdp.subtaskId,
    stepsJSON: steps(['Open an out-of-stock product', 'The "Add to cart" button is disabled + an "Out of stock" label']),
    result: 'PASSED', daysAgo: 5, duration: 14 });
  await mkTc({ name: 'TC_ProductImages_Gallery', module: 'UI', priority: 'LOW', tags: ['ui'], taskId: catalog.taskId, subtaskId: subPdp.subtaskId,
    stepsJSON: steps(['Click a thumbnail in the gallery', 'The main image changes accordingly']) }); // Not run

  // =====================================================================
  // Task B — Payment & Refund  (In Progress)
  // =====================================================================
  const payment = await mkTask({
    name: 'Payment & Refund',
    description: 'Payment gateway, 3-D Secure and the refund process.',
    status: 'In Progress',
    jiraKey: 'ECOM-40',
    confluenceUrl: 'https://confluence.example.com/display/ECOM/Payment-Refund',
  });
  const subPayMethods = await mkSub(payment.taskId, { name: 'Payment Methods', status: 'In Progress', jiraKey: 'ECOM-40-1' });
  const subRefund = await mkSub(payment.taskId, { name: 'Refund Processing', status: 'To Do', jiraKey: 'ECOM-40-2' });

  await mkTc({ name: 'TC_Payment_CreditCard', module: 'API', priority: 'CRITICAL', tags: ['payment', 'smoke'], taskId: payment.taskId,
    stepsJSON: steps(['Pay with a valid Visa card', '200 + order moves to "Paid"']),
    result: 'PASSED', daysAgo: 1, duration: 28 });
  await mkTc({ name: 'TC_Payment_PayPal', module: 'API', priority: 'HIGH', tags: ['payment'], taskId: payment.taskId, subtaskId: subPayMethods.subtaskId,
    stepsJSON: steps(['Choose PayPal, log into the sandbox and confirm', 'Returns to the site with a success status']),
    result: 'PASSED', daysAgo: 2, duration: 30 });
  await mkTc({ name: 'TC_Payment_COD', module: 'UI', priority: 'MEDIUM', tags: ['payment'], taskId: payment.taskId, subtaskId: subPayMethods.subtaskId,
    stepsJSON: steps(['Choose "Cash on delivery" (COD)', 'Order placed successfully, status "Awaiting payment"']),
    result: 'PASSED', daysAgo: 3, duration: 20 });
  await mkTc({ name: 'TC_Payment_3DSecure', module: 'Security', priority: 'HIGH', tags: ['payment', 'security'], taskId: payment.taskId, subtaskId: subPayMethods.subtaskId,
    stepsJSON: steps(['Pay with a card that requires 3-D Secure authentication', 'The OTP screen appears and authentication succeeds']),
    result: 'FAILED', failureReason: '3-D Secure redirect returns a blank page', daysAgo: 1, duration: 40 });
  await mkTc({ name: 'TC_Payment_Timeout', module: 'API', priority: 'HIGH', tags: ['payment', 'negative'], taskId: payment.taskId,
    stepsJSON: steps(['Simulate a payment gateway timeout', 'Order moves to "Payment failed" status, no money is charged']),
    result: 'BLOCKED', notes: 'Payment gateway sandbox is under maintenance', daysAgo: 2, duration: 0 });
  await mkTc({ name: 'TC_Refund_FullAmount', module: 'API', priority: 'HIGH', tags: ['refund'], taskId: payment.taskId, subtaskId: subRefund.subtaskId,
    stepsJSON: steps(['Fully refund a paid order', '200 + order moves to "Refunded", correct amount']),
    result: 'PASSED', daysAgo: 4, duration: 22 });
  await mkTc({ name: 'TC_Refund_Partial', module: 'API', priority: 'MEDIUM', tags: ['refund'], taskId: payment.taskId, subtaskId: subRefund.subtaskId,
    stepsJSON: steps(['Partially refund (1 of 3 items)', 'The remaining order total is calculated correctly']),
    result: 'FAILED', failureReason: 'Partial refund miscalculates the remaining order total', daysAgo: 2, duration: 26 });
  await mkTc({ name: 'TC_Refund_InvoicePDF', module: 'UI', priority: 'LOW', tags: ['refund'], taskId: payment.taskId, subtaskId: subRefund.subtaskId,
    stepsJSON: steps(['Download the PDF invoice after a refund', 'The PDF shows the correct refunded amount']) }); // Not run

  // =====================================================================
  // Task C — Order Management & Shipping  (In Progress)
  // =====================================================================
  const orders = await mkTask({
    name: 'Order Management & Shipping',
    description: 'Placing orders, cancelling orders, shipment tracking and shipping fee calculation.',
    status: 'In Progress',
    jiraKey: 'ECOM-50',
  });
  const subTracking = await mkSub(orders.taskId, { name: 'Order Tracking', status: 'In Progress', jiraKey: 'ECOM-50-1' });
  const subShipping = await mkSub(orders.taskId, { name: 'Shipping Calculator', status: 'To Do', jiraKey: 'ECOM-50-2' });

  await mkTc({ name: 'TC_Order_PlaceOrder_E2E', module: 'API', priority: 'CRITICAL', tags: ['smoke', 'e2e'], taskId: orders.taskId,
    stepsJSON: steps(['Add items → checkout → pay', 'Order created successfully + orderId generated']),
    result: 'PASSED', daysAgo: 1, duration: 35 });
  await mkTc({ name: 'TC_Order_CancelBeforeShip', module: 'API', priority: 'HIGH', tags: ['regression'], taskId: orders.taskId,
    stepsJSON: steps(['Cancel an order before it ships', 'Order moves to "Cancelled", stock is restored']),
    result: 'PASSED', daysAgo: 3, duration: 19 });
  await mkTc({ name: 'TC_Order_History_Pagination', module: 'UI', priority: 'LOW', tags: ['ui'], taskId: orders.taskId,
    stepsJSON: steps(['Open "My orders", change pages', 'Pagination works and shows the correct orders']),
    result: 'PASSED', daysAgo: 5, duration: 13 });
  await mkTc({ name: 'TC_Order_Tracking_StatusUpdate', module: 'UI', priority: 'MEDIUM', tags: ['tracking'], taskId: orders.taskId, subtaskId: subTracking.subtaskId,
    stepsJSON: steps(['Track an order in transit', 'The correct shipping status milestones are shown']),
    result: 'PASSED', daysAgo: 2, duration: 17 });
  await mkTc({ name: 'TC_Order_Tracking_InvalidCode', module: 'UI', priority: 'MEDIUM', tags: ['tracking', 'negative'], taskId: orders.taskId, subtaskId: subTracking.subtaskId,
    stepsJSON: steps(['Enter an invalid tracking number', 'Show the "Order not found" error']),
    result: 'PASSED', daysAgo: 4, duration: 11 });
  await mkTc({ name: 'TC_Shipping_Domestic_Calc', module: 'API', priority: 'MEDIUM', tags: ['shipping'], taskId: orders.taskId, subtaskId: subShipping.subtaskId,
    stepsJSON: steps(['Calculate domestic shipping fee by weight', 'Returns the correct fee per the rate table']),
    result: 'PASSED', daysAgo: 3, duration: 16 });
  await mkTc({ name: 'TC_Shipping_International_Tax', module: 'API', priority: 'HIGH', tags: ['shipping'], taskId: orders.taskId, subtaskId: subShipping.subtaskId,
    stepsJSON: steps(['Calculate fee + tax for an international order', 'Shipping fee and import tax are calculated correctly']),
    result: 'FAILED', failureReason: 'Import tax is calculated incorrectly for international orders', daysAgo: 1, duration: 21 });
  await mkTc({ name: 'TC_Shipping_FreeOverThreshold', module: 'API', priority: 'LOW', tags: ['shipping'], taskId: orders.taskId, subtaskId: subShipping.subtaskId,
    stepsJSON: steps(['Order > 500k', 'Qualifies for free shipping']) }); // Not run

  // =====================================================================
  // Task D — Admin Dashboard  (To Do)
  // =====================================================================
  const admin = await mkTask({
    name: 'Admin Dashboard',
    description: 'Inventory management, access control and sales reporting.',
    status: 'To Do',
    jiraKey: 'ECOM-60',
    confluenceUrl: 'https://confluence.example.com/display/ECOM/Admin-Dashboard',
  });
  const subInventory = await mkSub(admin.taskId, { name: 'Inventory Management', status: 'To Do', jiraKey: 'ECOM-60-1' });
  const subReports = await mkSub(admin.taskId, { name: 'Sales Reports', status: 'To Do', jiraKey: 'ECOM-60-2' });

  await mkTc({ name: 'TC_Admin_RBAC_AccessControl', module: 'Security', priority: 'CRITICAL', tags: ['security', 'rbac'], taskId: admin.taskId,
    stepsJSON: steps(['Log in with a "viewer" account and open the Admin page', 'Blocked with 403, cannot enter']),
    result: 'PASSED', daysAgo: 2, duration: 24 });
  await mkTc({ name: 'TC_Inventory_UpdateStock', module: 'DB', priority: 'HIGH', tags: ['db', 'inventory'], taskId: admin.taskId, subtaskId: subInventory.subtaskId,
    stepsJSON: steps(['Update the stock of a product', 'The DB stores the correct new quantity']),
    result: 'PASSED', daysAgo: 3, duration: 18 });
  await mkTc({ name: 'TC_Inventory_LowStockAlert', module: 'UI', priority: 'MEDIUM', tags: ['inventory'], taskId: admin.taskId, subtaskId: subInventory.subtaskId,
    stepsJSON: steps(['Stock drops below the threshold', 'Show a "Low stock" warning']) }); // Not run
  await mkTc({ name: 'TC_Inventory_BulkImport_CSV', module: 'API', priority: 'HIGH', tags: ['performance', 'inventory'], taskId: admin.taskId, subtaskId: subInventory.subtaskId,
    stepsJSON: steps(['Import 10,000 product rows from CSV', 'Finishes in < 60s, no errors']),
    result: 'BLOCKED', notes: 'No sample CSV file from the Backend team yet', daysAgo: 4, duration: 0 });
  await mkTc({ name: 'TC_Report_SalesByDay', module: 'UI', priority: 'MEDIUM', tags: ['report'], taskId: admin.taskId, subtaskId: subReports.subtaskId,
    stepsJSON: steps(['Open the daily sales report', 'The chart shows the correct figures']),
    result: 'PASSED', daysAgo: 1, duration: 20 });
  await mkTc({ name: 'TC_Report_ExportExcel', module: 'API', priority: 'LOW', tags: ['report'], taskId: admin.taskId, subtaskId: subReports.subtaskId,
    stepsJSON: steps(['Export the report to Excel', 'The downloaded .xlsx file has the correct data']),
    result: 'SKIPPED', notes: 'Deferred to a later sprint', daysAgo: 0, duration: 0 });

  // =====================================================================
  // Task E — Performance & Reliability  (In Progress)
  // =====================================================================
  const perf = await mkTask({
    name: 'Performance & Reliability',
    description: 'Performance and load testing of the critical flows.',
    status: 'In Progress',
    jiraKey: 'ECOM-70',
  });
  const subLoad = await mkSub(perf.taskId, { name: 'Load & Stress Testing', status: 'In Progress', jiraKey: 'ECOM-70-1' });

  await mkTc({ name: 'TC_Perf_Homepage_TTFB', module: 'Performance', priority: 'HIGH', tags: ['performance'], taskId: perf.taskId,
    stepsJSON: steps(['Measure homepage TTFB', 'TTFB < 500ms under normal conditions']),
    result: 'PASSED', daysAgo: 2, duration: 50 });
  await mkTc({ name: 'TC_Perf_Checkout_1000VUsers', module: 'Performance', priority: 'CRITICAL', tags: ['performance', 'load'], taskId: perf.taskId, subtaskId: subLoad.subtaskId,
    stepsJSON: steps(['Run 1000 virtual users through the checkout flow', 'P95 latency < 3s, errors < 1%']),
    result: 'FAILED', failureReason: 'P95 latency exceeds 3s with 1000 concurrent users', daysAgo: 1, duration: 120 });
  await mkTc({ name: 'TC_Perf_Search_StressTest', module: 'Performance', priority: 'HIGH', tags: ['performance', 'load'], taskId: perf.taskId, subtaskId: subLoad.subtaskId,
    stepsJSON: steps(['Stress test the search API', 'Does not crash, degrades gracefully']) }); // Not run

  // =====================================================================
  // Task F — Mobile Responsive  (Done)
  // =====================================================================
  const mobile = await mkTask({
    name: 'Mobile Responsive',
    description: 'Responsive experience on mobile devices.',
    status: 'Done',
    jiraKey: 'ECOM-80',
    figmaUrl: 'https://figma.com/file/mobile/Responsive-Spec',
  });

  await mkTc({ name: 'TC_Mobile_Checkout_Flow', module: 'Mobile', priority: 'HIGH', tags: ['mobile', 'smoke'], taskId: mobile.taskId,
    stepsJSON: steps(['Complete checkout on a 375px screen', 'The flow completes without breaking the layout']),
    result: 'PASSED', daysAgo: 3, duration: 28 });
  await mkTc({ name: 'TC_Mobile_Cart_Responsive', module: 'Mobile', priority: 'MEDIUM', tags: ['mobile'], taskId: mobile.taskId,
    stepsJSON: steps(['Open the cart on a phone', 'Displays compactly, every button is usable']),
    result: 'PASSED', daysAgo: 4, duration: 15 });
  await mkTc({ name: 'TC_Mobile_Menu_Hamburger', module: 'Mobile', priority: 'LOW', tags: ['mobile', 'ui'], taskId: mobile.taskId,
    stepsJSON: steps(['Tap the hamburger menu on mobile', 'The menu slides out and navigates correctly']),
    result: 'PASSED', daysAgo: 5, duration: 9 });

  // --- recompute project rollup so totalCases / passRate are fresh ---
  const m = await projectRollup(projectId);
  await withRetry('project rollup', () =>
    update('PROJECTS', projectId, { totalCases: m.totalCases, passRate: m.passRate })
  );

  console.log(`[seedDemo] DB_MODE=${process.env.DB_MODE || 'mock'} (throttle ${THROTTLE_MS}ms)`);
  console.log(`[seedDemo] +${nTasks} tasks, +${nSubs} subtasks, +${nTc} test cases, +${nExec} executions on "E-commerce Platform".`);
  console.log(`[seedDemo] now: ${m.totalCases} cases | executed ${m.executed} | pending ${m.pending} | pass ${m.passRate}% | fail ${m.failRate}%`);
}

main().catch((e) => {
  console.error('[seedDemo] failed:', e);
  process.exit(1);
});
