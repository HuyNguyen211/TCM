/**
 * seedMore.js — APPEND a richer set of test cases (with varied results) to the
 * existing "E-commerce Platform" project. Non-destructive + idempotent.
 *
 * Spread: PASSED / FAILED / BLOCKED / SKIPPED + a few "Chưa chạy" (no execution),
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
    stepsJSON: steps(['Nhập sai mật khẩu rồi đăng nhập', 'Báo lỗi "Sai thông tin đăng nhập" (401)']),
    result: 'FAILED', failureReason: 'Trả về 500 thay vì 401 khi sai mật khẩu', daysAgo: 1, duration: 25 });
  await tc({ name: 'TC_Login_RememberMe', module: 'UI', priority: 'MEDIUM', tags: ['smoke'], taskId: auth.taskId,
    stepsJSON: steps(['Tick "Remember me" và đăng nhập', 'Đóng/mở lại trình duyệt vẫn còn phiên']),
    result: 'PASSED', daysAgo: 1, duration: 40 });
  await tc({ name: 'TC_Session_Timeout', module: 'Security', priority: 'HIGH', tags: ['security'], taskId: auth.taskId,
    stepsJSON: steps(['Để idle 30 phút', 'Tự đăng xuất, bắt đăng nhập lại']),
    result: 'BLOCKED', notes: 'Chưa cấu hình được session timeout trên staging', daysAgo: 2, duration: 0 });
  await tc({ name: 'TC_Logout', module: 'UI', priority: 'LOW', tags: ['smoke'], taskId: auth.taskId,
    stepsJSON: steps(['Bấm Logout', 'Về trang login và xoá session']),
    result: 'PASSED', daysAgo: 0, duration: 10 });
  await tc({ name: 'TC_Password_Reset', module: 'UI', priority: 'MEDIUM', tags: ['regression'], taskId: auth.taskId,
    stepsJSON: steps(['Bấm "Quên mật khẩu", nhập email', 'Nhận email reset'], ['Đặt mật khẩu mới', 'Đăng nhập được bằng mật khẩu mới']) }); // Chưa chạy

  // ===== Subtask: Google OAuth login =====
  if (oauth) {
    await tc({ name: 'TC_OAuth_NewUser', module: 'UI', priority: 'HIGH', tags: ['oauth'], taskId: auth.taskId, subtaskId: oauth.subtaskId,
      stepsJSON: steps(['Đăng nhập Google bằng tài khoản mới', 'Tự tạo user + vào dashboard']),
      result: 'PASSED', daysAgo: 1, duration: 35 });
    await tc({ name: 'TC_OAuth_Cancel', module: 'UI', priority: 'MEDIUM', tags: ['oauth', 'negative'], taskId: auth.taskId, subtaskId: oauth.subtaskId,
      stepsJSON: steps(['Huỷ ở màn hình consent của Google', 'Quay lại trang login, không tạo session']),
      result: 'SKIPPED', notes: 'Hoãn kiểm thử sang sprint sau', daysAgo: 0, duration: 0 });
  }

  // ===== Task: Cart & Checkout (direct) =====
  await tc({ name: 'TC_Checkout_EmptyCart', module: 'API', priority: 'MEDIUM', tags: ['api', 'negative'], taskId: cart.taskId,
    stepsJSON: steps(['POST /checkout với giỏ rỗng', 'Trả 400 + thông báo giỏ trống']),
    result: 'FAILED', failureReason: 'API trả 200 dù giỏ hàng rỗng', daysAgo: 2, duration: 12 });
  await tc({ name: 'TC_Checkout_Discount', module: 'API', priority: 'HIGH', tags: ['api', 'regression'], taskId: cart.taskId,
    stepsJSON: steps(['Áp mã giảm giá hợp lệ', 'Tổng tiền giảm đúng phần trăm']),
    result: 'PASSED', daysAgo: 1, duration: 18 });
  await tc({ name: 'TC_Payment_Decline', module: 'API', priority: 'CRITICAL', tags: ['payment'], taskId: cart.taskId,
    stepsJSON: steps(['Thanh toán bằng thẻ bị từ chối', 'Hiện lỗi, không tạo đơn']),
    result: 'BLOCKED', notes: 'Sandbox Stripe đang lỗi, chưa test được', daysAgo: 3, duration: 0 });
  await tc({ name: 'TC_Order_Confirmation_Email', module: 'UI', priority: 'LOW', tags: ['email'], taskId: cart.taskId,
    stepsJSON: steps(['Đặt hàng thành công', 'Nhận được email xác nhận đơn']) }); // Chưa chạy

  // ===== Subtask: Add to cart =====
  if (addToCart) {
    await tc({ name: 'TC_RemoveFromCart', module: 'UI', priority: 'MEDIUM', tags: ['cart'], taskId: cart.taskId, subtaskId: addToCart.subtaskId,
      stepsJSON: steps(['Bấm xoá sản phẩm khỏi giỏ', 'Giỏ cập nhật, tổng tiền giảm']),
      result: 'PASSED', daysAgo: 0, duration: 15 });
    await tc({ name: 'TC_Cart_QuantityUpdate', module: 'UI', priority: 'MEDIUM', tags: ['cart'], taskId: cart.taskId, subtaskId: addToCart.subtaskId,
      stepsJSON: steps(['Tăng số lượng sản phẩm lên 3', 'Tổng tiền nhân đúng']),
      result: 'FAILED', failureReason: 'Tổng tiền không cập nhật khi đổi số lượng', daysAgo: 1, duration: 20 });
    await tc({ name: 'TC_Cart_Persistence', module: 'DB', priority: 'HIGH', tags: ['cart', 'db'], taskId: cart.taskId, subtaskId: addToCart.subtaskId,
      stepsJSON: steps(['Thêm hàng, đăng xuất rồi đăng nhập lại', 'Giỏ hàng vẫn còn sản phẩm']) }); // Chưa chạy
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
