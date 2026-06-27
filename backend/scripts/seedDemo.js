/**
 * seedDemo.js — APPEND a rich, diverse demo dataset to the existing
 * "E-commerce Platform" project so the TCM product looks good in a live demo.
 *
 * Adds 6 new tasks (+ their subtasks) beyond the seeded Authentication /
 * Cart & Checkout, then a spread of test cases across modules
 * (UI / API / DB / Security / Performance / Mobile), priorities (CRITICAL..LOW),
 * task statuses (To Do / In Progress / Done) and execution results
 * (PASSED / FAILED / BLOCKED / SKIPPED + a few "Chưa chạy").
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
    description: 'Tìm kiếm, bộ lọc, sắp xếp và trang chi tiết sản phẩm.',
    status: 'Done',
    jiraKey: 'ECOM-30',
    confluenceUrl: 'https://confluence.example.com/display/ECOM/Catalog-Search',
    figmaUrl: 'https://figma.com/file/catalog/Search-and-PDP',
  });
  const subSearch = await mkSub(catalog.taskId, { name: 'Search & Filters', status: 'In Progress', jiraKey: 'ECOM-30-1' });
  const subPdp = await mkSub(catalog.taskId, { name: 'Product Detail Page', status: 'Done', jiraKey: 'ECOM-30-2' });

  await mkTc({ name: 'TC_Search_Keyword', module: 'UI', priority: 'HIGH', tags: ['smoke', 'search'], taskId: catalog.taskId,
    stepsJSON: steps(['Nhập từ khoá "áo thun" và bấm tìm', 'Hiện danh sách sản phẩm khớp từ khoá']),
    result: 'PASSED', daysAgo: 2, duration: 22 });
  await mkTc({ name: 'TC_Search_NoResults', module: 'UI', priority: 'MEDIUM', tags: ['search', 'negative'], taskId: catalog.taskId,
    stepsJSON: steps(['Tìm từ khoá không tồn tại "xyzzy123"', 'Hiện trạng thái "Không tìm thấy sản phẩm"']),
    result: 'PASSED', daysAgo: 2, duration: 15 });
  await mkTc({ name: 'TC_Search_API_Pagination', module: 'API', priority: 'HIGH', tags: ['api', 'search'], taskId: catalog.taskId,
    stepsJSON: steps(['GET /products?q=ao&page=2&size=20', 'Trả 200 + đúng 20 item của trang 2 + tổng số']),
    result: 'PASSED', daysAgo: 3, duration: 18 });
  await mkTc({ name: 'TC_Filter_ByPriceRange', module: 'UI', priority: 'MEDIUM', tags: ['search', 'regression'], taskId: catalog.taskId, subtaskId: subSearch.subtaskId,
    stepsJSON: steps(['Lọc giá 100k–300k', 'Chỉ hiện sản phẩm trong khoảng giá']),
    result: 'PASSED', daysAgo: 4, duration: 20 });
  await mkTc({ name: 'TC_Filter_ByCategory', module: 'UI', priority: 'MEDIUM', tags: ['search'], taskId: catalog.taskId, subtaskId: subSearch.subtaskId,
    stepsJSON: steps(['Chọn danh mục "Giày", chuyển sang trang 2', 'Bộ lọc danh mục vẫn được giữ']),
    result: 'FAILED', failureReason: 'Bộ lọc danh mục bị reset khi chuyển trang', daysAgo: 1, duration: 25 });
  await mkTc({ name: 'TC_Sort_ByPriceAsc', module: 'UI', priority: 'LOW', tags: ['search'], taskId: catalog.taskId, subtaskId: subSearch.subtaskId,
    stepsJSON: steps(['Sắp xếp theo "Giá tăng dần"', 'Danh sách sắp đúng thứ tự giá']),
    result: 'PASSED', daysAgo: 4, duration: 12 });
  await mkTc({ name: 'TC_ProductDetail_Display', module: 'UI', priority: 'HIGH', tags: ['smoke'], taskId: catalog.taskId, subtaskId: subPdp.subtaskId,
    stepsJSON: steps(['Mở trang chi tiết 1 sản phẩm', 'Hiện đủ tên, giá, ảnh, mô tả, nút mua']),
    result: 'PASSED', daysAgo: 3, duration: 16 });
  await mkTc({ name: 'TC_ProductDetail_OutOfStock', module: 'UI', priority: 'MEDIUM', tags: ['negative'], taskId: catalog.taskId, subtaskId: subPdp.subtaskId,
    stepsJSON: steps(['Mở sản phẩm đã hết hàng', 'Nút "Thêm vào giỏ" bị vô hiệu + nhãn "Hết hàng"']),
    result: 'PASSED', daysAgo: 5, duration: 14 });
  await mkTc({ name: 'TC_ProductImages_Gallery', module: 'UI', priority: 'LOW', tags: ['ui'], taskId: catalog.taskId, subtaskId: subPdp.subtaskId,
    stepsJSON: steps(['Bấm vào ảnh thu nhỏ trong gallery', 'Ảnh lớn đổi tương ứng']) }); // Chưa chạy

  // =====================================================================
  // Task B — Payment & Refund  (In Progress)
  // =====================================================================
  const payment = await mkTask({
    name: 'Payment & Refund',
    description: 'Cổng thanh toán, 3-D Secure và quy trình hoàn tiền.',
    status: 'In Progress',
    jiraKey: 'ECOM-40',
    confluenceUrl: 'https://confluence.example.com/display/ECOM/Payment-Refund',
  });
  const subPayMethods = await mkSub(payment.taskId, { name: 'Payment Methods', status: 'In Progress', jiraKey: 'ECOM-40-1' });
  const subRefund = await mkSub(payment.taskId, { name: 'Refund Processing', status: 'To Do', jiraKey: 'ECOM-40-2' });

  await mkTc({ name: 'TC_Payment_CreditCard', module: 'API', priority: 'CRITICAL', tags: ['payment', 'smoke'], taskId: payment.taskId,
    stepsJSON: steps(['Thanh toán bằng thẻ Visa hợp lệ', '200 + đơn chuyển "Đã thanh toán"']),
    result: 'PASSED', daysAgo: 1, duration: 28 });
  await mkTc({ name: 'TC_Payment_PayPal', module: 'API', priority: 'HIGH', tags: ['payment'], taskId: payment.taskId, subtaskId: subPayMethods.subtaskId,
    stepsJSON: steps(['Chọn PayPal, đăng nhập sandbox và xác nhận', 'Quay về site với trạng thái thành công']),
    result: 'PASSED', daysAgo: 2, duration: 30 });
  await mkTc({ name: 'TC_Payment_COD', module: 'UI', priority: 'MEDIUM', tags: ['payment'], taskId: payment.taskId, subtaskId: subPayMethods.subtaskId,
    stepsJSON: steps(['Chọn "Thanh toán khi nhận hàng" (COD)', 'Đặt đơn thành công, trạng thái "Chờ thu tiền"']),
    result: 'PASSED', daysAgo: 3, duration: 20 });
  await mkTc({ name: 'TC_Payment_3DSecure', module: 'Security', priority: 'HIGH', tags: ['payment', 'security'], taskId: payment.taskId, subtaskId: subPayMethods.subtaskId,
    stepsJSON: steps(['Thanh toán thẻ yêu cầu xác thực 3-D Secure', 'Hiện màn OTP và xác thực thành công']),
    result: 'FAILED', failureReason: 'Redirect 3-D Secure trả về trang trắng', daysAgo: 1, duration: 40 });
  await mkTc({ name: 'TC_Payment_Timeout', module: 'API', priority: 'HIGH', tags: ['payment', 'negative'], taskId: payment.taskId,
    stepsJSON: steps(['Giả lập cổng thanh toán timeout', 'Đơn về trạng thái "Thanh toán lỗi", không trừ tiền']),
    result: 'BLOCKED', notes: 'Cổng thanh toán sandbox đang bảo trì', daysAgo: 2, duration: 0 });
  await mkTc({ name: 'TC_Refund_FullAmount', module: 'API', priority: 'HIGH', tags: ['refund'], taskId: payment.taskId, subtaskId: subRefund.subtaskId,
    stepsJSON: steps(['Hoàn tiền toàn bộ 1 đơn đã thanh toán', '200 + đơn chuyển "Đã hoàn tiền", đúng số tiền']),
    result: 'PASSED', daysAgo: 4, duration: 22 });
  await mkTc({ name: 'TC_Refund_Partial', module: 'API', priority: 'MEDIUM', tags: ['refund'], taskId: payment.taskId, subtaskId: subRefund.subtaskId,
    stepsJSON: steps(['Hoàn tiền 1 phần (1/3 sản phẩm)', 'Tổng đơn còn lại tính đúng']),
    result: 'FAILED', failureReason: 'Hoàn tiền 1 phần làm sai tổng đơn còn lại', daysAgo: 2, duration: 26 });
  await mkTc({ name: 'TC_Refund_InvoicePDF', module: 'UI', priority: 'LOW', tags: ['refund'], taskId: payment.taskId, subtaskId: subRefund.subtaskId,
    stepsJSON: steps(['Tải hoá đơn PDF sau khi hoàn tiền', 'PDF hiển thị đúng số tiền đã hoàn']) }); // Chưa chạy

  // =====================================================================
  // Task C — Order Management & Shipping  (In Progress)
  // =====================================================================
  const orders = await mkTask({
    name: 'Order Management & Shipping',
    description: 'Đặt đơn, huỷ đơn, theo dõi vận chuyển và tính phí ship.',
    status: 'In Progress',
    jiraKey: 'ECOM-50',
  });
  const subTracking = await mkSub(orders.taskId, { name: 'Order Tracking', status: 'In Progress', jiraKey: 'ECOM-50-1' });
  const subShipping = await mkSub(orders.taskId, { name: 'Shipping Calculator', status: 'To Do', jiraKey: 'ECOM-50-2' });

  await mkTc({ name: 'TC_Order_PlaceOrder_E2E', module: 'API', priority: 'CRITICAL', tags: ['smoke', 'e2e'], taskId: orders.taskId,
    stepsJSON: steps(['Thêm hàng → checkout → thanh toán', 'Tạo đơn thành công + sinh orderId']),
    result: 'PASSED', daysAgo: 1, duration: 35 });
  await mkTc({ name: 'TC_Order_CancelBeforeShip', module: 'API', priority: 'HIGH', tags: ['regression'], taskId: orders.taskId,
    stepsJSON: steps(['Huỷ đơn khi chưa giao', 'Đơn chuyển "Đã huỷ", hoàn kho']),
    result: 'PASSED', daysAgo: 3, duration: 19 });
  await mkTc({ name: 'TC_Order_History_Pagination', module: 'UI', priority: 'LOW', tags: ['ui'], taskId: orders.taskId,
    stepsJSON: steps(['Mở "Đơn hàng của tôi", chuyển trang', 'Phân trang hoạt động, hiện đúng đơn']),
    result: 'PASSED', daysAgo: 5, duration: 13 });
  await mkTc({ name: 'TC_Order_Tracking_StatusUpdate', module: 'UI', priority: 'MEDIUM', tags: ['tracking'], taskId: orders.taskId, subtaskId: subTracking.subtaskId,
    stepsJSON: steps(['Theo dõi đơn đang giao', 'Hiện đúng mốc trạng thái vận chuyển']),
    result: 'PASSED', daysAgo: 2, duration: 17 });
  await mkTc({ name: 'TC_Order_Tracking_InvalidCode', module: 'UI', priority: 'MEDIUM', tags: ['tracking', 'negative'], taskId: orders.taskId, subtaskId: subTracking.subtaskId,
    stepsJSON: steps(['Nhập mã vận đơn không hợp lệ', 'Báo lỗi "Không tìm thấy đơn"']),
    result: 'PASSED', daysAgo: 4, duration: 11 });
  await mkTc({ name: 'TC_Shipping_Domestic_Calc', module: 'API', priority: 'MEDIUM', tags: ['shipping'], taskId: orders.taskId, subtaskId: subShipping.subtaskId,
    stepsJSON: steps(['Tính phí ship nội thành theo cân nặng', 'Trả phí đúng bảng giá']),
    result: 'PASSED', daysAgo: 3, duration: 16 });
  await mkTc({ name: 'TC_Shipping_International_Tax', module: 'API', priority: 'HIGH', tags: ['shipping'], taskId: orders.taskId, subtaskId: subShipping.subtaskId,
    stepsJSON: steps(['Tính phí + thuế cho đơn quốc tế', 'Phí ship và thuế nhập khẩu tính đúng']),
    result: 'FAILED', failureReason: 'Thuế nhập khẩu tính sai cho đơn quốc tế', daysAgo: 1, duration: 21 });
  await mkTc({ name: 'TC_Shipping_FreeOverThreshold', module: 'API', priority: 'LOW', tags: ['shipping'], taskId: orders.taskId, subtaskId: subShipping.subtaskId,
    stepsJSON: steps(['Đơn > 500k', 'Được miễn phí vận chuyển']) }); // Chưa chạy

  // =====================================================================
  // Task D — Admin Dashboard  (To Do)
  // =====================================================================
  const admin = await mkTask({
    name: 'Admin Dashboard',
    description: 'Quản lý kho, phân quyền và báo cáo doanh số.',
    status: 'To Do',
    jiraKey: 'ECOM-60',
    confluenceUrl: 'https://confluence.example.com/display/ECOM/Admin-Dashboard',
  });
  const subInventory = await mkSub(admin.taskId, { name: 'Inventory Management', status: 'To Do', jiraKey: 'ECOM-60-1' });
  const subReports = await mkSub(admin.taskId, { name: 'Sales Reports', status: 'To Do', jiraKey: 'ECOM-60-2' });

  await mkTc({ name: 'TC_Admin_RBAC_AccessControl', module: 'Security', priority: 'CRITICAL', tags: ['security', 'rbac'], taskId: admin.taskId,
    stepsJSON: steps(['Đăng nhập bằng tài khoản "viewer" rồi mở trang Admin', 'Bị chặn 403, không vào được']),
    result: 'PASSED', daysAgo: 2, duration: 24 });
  await mkTc({ name: 'TC_Inventory_UpdateStock', module: 'DB', priority: 'HIGH', tags: ['db', 'inventory'], taskId: admin.taskId, subtaskId: subInventory.subtaskId,
    stepsJSON: steps(['Cập nhật tồn kho 1 sản phẩm', 'DB lưu đúng số lượng mới']),
    result: 'PASSED', daysAgo: 3, duration: 18 });
  await mkTc({ name: 'TC_Inventory_LowStockAlert', module: 'UI', priority: 'MEDIUM', tags: ['inventory'], taskId: admin.taskId, subtaskId: subInventory.subtaskId,
    stepsJSON: steps(['Tồn kho xuống dưới ngưỡng', 'Hiện cảnh báo "Sắp hết hàng"']) }); // Chưa chạy
  await mkTc({ name: 'TC_Inventory_BulkImport_CSV', module: 'API', priority: 'HIGH', tags: ['performance', 'inventory'], taskId: admin.taskId, subtaskId: subInventory.subtaskId,
    stepsJSON: steps(['Import 10.000 dòng sản phẩm từ CSV', 'Xử lý xong < 60s, không lỗi']),
    result: 'BLOCKED', notes: 'Chưa có file CSV mẫu từ team Backend', daysAgo: 4, duration: 0 });
  await mkTc({ name: 'TC_Report_SalesByDay', module: 'UI', priority: 'MEDIUM', tags: ['report'], taskId: admin.taskId, subtaskId: subReports.subtaskId,
    stepsJSON: steps(['Mở báo cáo doanh số theo ngày', 'Biểu đồ hiện đúng số liệu']),
    result: 'PASSED', daysAgo: 1, duration: 20 });
  await mkTc({ name: 'TC_Report_ExportExcel', module: 'API', priority: 'LOW', tags: ['report'], taskId: admin.taskId, subtaskId: subReports.subtaskId,
    stepsJSON: steps(['Xuất báo cáo ra Excel', 'File .xlsx tải về đúng dữ liệu']),
    result: 'SKIPPED', notes: 'Hoãn sang sprint sau', daysAgo: 0, duration: 0 });

  // =====================================================================
  // Task E — Performance & Reliability  (In Progress)
  // =====================================================================
  const perf = await mkTask({
    name: 'Performance & Reliability',
    description: 'Kiểm thử hiệu năng và chịu tải các luồng quan trọng.',
    status: 'In Progress',
    jiraKey: 'ECOM-70',
  });
  const subLoad = await mkSub(perf.taskId, { name: 'Load & Stress Testing', status: 'In Progress', jiraKey: 'ECOM-70-1' });

  await mkTc({ name: 'TC_Perf_Homepage_TTFB', module: 'Performance', priority: 'HIGH', tags: ['performance'], taskId: perf.taskId,
    stepsJSON: steps(['Đo TTFB trang chủ', 'TTFB < 500ms ở điều kiện bình thường']),
    result: 'PASSED', daysAgo: 2, duration: 50 });
  await mkTc({ name: 'TC_Perf_Checkout_1000VUsers', module: 'Performance', priority: 'CRITICAL', tags: ['performance', 'load'], taskId: perf.taskId, subtaskId: subLoad.subtaskId,
    stepsJSON: steps(['Chạy 1000 virtual user vào luồng checkout', 'P95 latency < 3s, lỗi < 1%']),
    result: 'FAILED', failureReason: 'P95 latency vượt 3s khi 1000 user đồng thời', daysAgo: 1, duration: 120 });
  await mkTc({ name: 'TC_Perf_Search_StressTest', module: 'Performance', priority: 'HIGH', tags: ['performance', 'load'], taskId: perf.taskId, subtaskId: subLoad.subtaskId,
    stepsJSON: steps(['Stress test API tìm kiếm', 'Không sập, suy giảm hiệu năng có kiểm soát']) }); // Chưa chạy

  // =====================================================================
  // Task F — Mobile Responsive  (Done)
  // =====================================================================
  const mobile = await mkTask({
    name: 'Mobile Responsive',
    description: 'Trải nghiệm responsive trên thiết bị di động.',
    status: 'Done',
    jiraKey: 'ECOM-80',
    figmaUrl: 'https://figma.com/file/mobile/Responsive-Spec',
  });

  await mkTc({ name: 'TC_Mobile_Checkout_Flow', module: 'Mobile', priority: 'HIGH', tags: ['mobile', 'smoke'], taskId: mobile.taskId,
    stepsJSON: steps(['Thực hiện checkout trên màn 375px', 'Luồng hoàn tất, không vỡ layout']),
    result: 'PASSED', daysAgo: 3, duration: 28 });
  await mkTc({ name: 'TC_Mobile_Cart_Responsive', module: 'Mobile', priority: 'MEDIUM', tags: ['mobile'], taskId: mobile.taskId,
    stepsJSON: steps(['Mở giỏ hàng trên điện thoại', 'Hiển thị gọn, thao tác được mọi nút']),
    result: 'PASSED', daysAgo: 4, duration: 15 });
  await mkTc({ name: 'TC_Mobile_Menu_Hamburger', module: 'Mobile', priority: 'LOW', tags: ['mobile', 'ui'], taskId: mobile.taskId,
    stepsJSON: steps(['Bấm menu hamburger trên mobile', 'Menu trượt ra, điều hướng đúng']),
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
