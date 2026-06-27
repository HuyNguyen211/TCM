/**
 * translateData.js — ONE-OFF migration that rewrites the Vietnamese demo data
 * already stored in the DB into English, in place. Needed because the seed
 * scripts were translated AFTER this data had been seeded, so existing rows in
 * Google Sheets / the local mock JSON still hold the old Vietnamese strings.
 *
 * Goes through the repository layer, so it honours DB_MODE (mock | sheets):
 *   DB_MODE=mock   node scripts/translateData.js     # fixes backend/data/*.json
 *   DB_MODE=sheets node scripts/translateData.js     # fixes the Google Sheet
 *
 * Strategy: an exact-match phrase dictionary (Vietnamese -> English) is applied to
 * the only free-text fields in the demo data — TASK/SUBTASK descriptions, TESTCASE
 * step actions/expected (inside stepsJSON), and EXECUTION failureReason/notes. Rows
 * whose text isn't Vietnamese (base seed data, the user's own "Content Hub" task)
 * never match a key, so they're left untouched.
 *
 * Safe to re-run: English strings aren't dictionary keys, so a second pass is a no-op.
 * Any Vietnamese string with NO mapping is logged at the end so nothing slips through.
 *
 * Sheets safety: each changed row is one write; set SEED_THROTTLE_MS to space writes
 * out under the Google Sheets quota (defaults to 1200ms in sheets mode). Writes are
 * retried on transient 429/5xx errors.
 */
import { initDb, list, update } from '../src/db/index.js';

const THROTTLE_MS = parseInt(
  process.env.SEED_THROTTLE_MS || (process.env.DB_MODE === 'sheets' ? '1200' : '0'),
  10
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Detect any leftover Vietnamese so we can report unmapped strings.
const VI_RE =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;

// Vietnamese -> English. Keys are EXACT full field values (descriptions, step
// action/expected, failureReason, notes) as stored in the DB.
const DICT = {
  // --- TASK descriptions ---
  'Tìm kiếm, bộ lọc, sắp xếp và trang chi tiết sản phẩm.': 'Search, filters, sorting and the product detail page.',
  'Cổng thanh toán, 3-D Secure và quy trình hoàn tiền.': 'Payment gateway, 3-D Secure and the refund process.',
  'Đặt đơn, huỷ đơn, theo dõi vận chuyển và tính phí ship.': 'Placing orders, cancelling orders, shipment tracking and shipping fee calculation.',
  'Quản lý kho, phân quyền và báo cáo doanh số.': 'Inventory management, access control and sales reporting.',
  'Kiểm thử hiệu năng và chịu tải các luồng quan trọng.': 'Performance and load testing of the critical flows.',
  'Trải nghiệm responsive trên thiết bị di động.': 'Responsive experience on mobile devices.',

  // --- EXECUTION failureReason ---
  'Trả về 500 thay vì 401 khi sai mật khẩu': 'Returns 500 instead of 401 on a wrong password',
  'API trả 200 dù giỏ hàng rỗng': 'API returns 200 even when the cart is empty',
  'Tổng tiền không cập nhật khi đổi số lượng': 'The total does not update when the quantity changes',
  'Bộ lọc danh mục bị reset khi chuyển trang': 'Category filter is reset when changing pages',
  'Redirect 3-D Secure trả về trang trắng': '3-D Secure redirect returns a blank page',
  'Hoàn tiền 1 phần làm sai tổng đơn còn lại': 'Partial refund miscalculates the remaining order total',
  'Thuế nhập khẩu tính sai cho đơn quốc tế': 'Import tax is calculated incorrectly for international orders',
  'P95 latency vượt 3s khi 1000 user đồng thời': 'P95 latency exceeds 3s with 1000 concurrent users',

  // --- EXECUTION notes ---
  'Chưa cấu hình được session timeout trên staging': 'Could not configure session timeout on staging',
  'Hoãn kiểm thử sang sprint sau': 'Testing deferred to a later sprint',
  'Sandbox Stripe đang lỗi, chưa test được': 'Stripe sandbox is down, cannot test yet',
  'Cổng thanh toán sandbox đang bảo trì': 'Payment gateway sandbox is under maintenance',
  'Chưa có file CSV mẫu từ team Backend': 'No sample CSV file from the Backend team yet',
  'Hoãn sang sprint sau': 'Deferred to a later sprint',

  // --- TESTCASE steps: action / expected ---
  'Nhập sai mật khẩu rồi đăng nhập': 'Enter a wrong password and log in',
  'Báo lỗi "Sai thông tin đăng nhập" (401)': 'Show the "Invalid credentials" error (401)',
  'Tick "Remember me" và đăng nhập': 'Tick "Remember me" and log in',
  'Đóng/mở lại trình duyệt vẫn còn phiên': 'The session persists after closing/reopening the browser',
  'Để idle 30 phút': 'Stay idle for 30 minutes',
  'Tự đăng xuất, bắt đăng nhập lại': 'Auto logout, forcing a re-login',
  'Bấm Logout': 'Click Logout',
  'Về trang login và xoá session': 'Return to the login page and clear the session',
  'Bấm "Quên mật khẩu", nhập email': 'Click "Forgot password", enter email',
  'Nhận email reset': 'Receive the reset email',
  'Đặt mật khẩu mới': 'Set a new password',
  'Đăng nhập được bằng mật khẩu mới': 'Able to log in with the new password',
  'Đăng nhập Google bằng tài khoản mới': 'Log in with Google using a new account',
  'Tự tạo user + vào dashboard': 'Auto-creates the user + lands on the dashboard',
  'Huỷ ở màn hình consent của Google': 'Cancel at the Google consent screen',
  'Quay lại trang login, không tạo session': 'Return to the login page, no session created',
  'POST /checkout với giỏ rỗng': 'POST /checkout with an empty cart',
  'Trả 400 + thông báo giỏ trống': 'Returns 400 + an empty-cart message',
  'Áp mã giảm giá hợp lệ': 'Apply a valid discount code',
  'Tổng tiền giảm đúng phần trăm': 'The total is reduced by the correct percentage',
  'Thanh toán bằng thẻ bị từ chối': 'Pay with a declined card',
  'Hiện lỗi, không tạo đơn': 'Show an error, no order created',
  'Đặt hàng thành công': 'Place an order successfully',
  'Nhận được email xác nhận đơn': 'Receive the order confirmation email',
  'Bấm xoá sản phẩm khỏi giỏ': 'Click to remove a product from the cart',
  'Giỏ cập nhật, tổng tiền giảm': 'The cart updates and the total decreases',
  'Tăng số lượng sản phẩm lên 3': 'Increase the product quantity to 3',
  'Tổng tiền nhân đúng': 'The total multiplies correctly',
  'Thêm hàng, đăng xuất rồi đăng nhập lại': 'Add items, log out then log back in',
  'Giỏ hàng vẫn còn sản phẩm': 'The cart still contains the products',
  'Nhập từ khoá "áo thun" và bấm tìm': 'Enter the keyword "t-shirt" and click search',
  'Hiện danh sách sản phẩm khớp từ khoá': 'A list of products matching the keyword is shown',
  'Tìm từ khoá không tồn tại "xyzzy123"': 'Search for a non-existent keyword "xyzzy123"',
  'Hiện trạng thái "Không tìm thấy sản phẩm"': 'Show the "No products found" empty state',
  'Trả 200 + đúng 20 item của trang 2 + tổng số': 'Returns 200 + exactly 20 items from page 2 + total count',
  'Lọc giá 100k–300k': 'Filter price 100k–300k',
  'Chỉ hiện sản phẩm trong khoảng giá': 'Only products within the price range are shown',
  'Chọn danh mục "Giày", chuyển sang trang 2': 'Select the "Shoes" category, then go to page 2',
  'Bộ lọc danh mục vẫn được giữ': 'The category filter is preserved',
  'Sắp xếp theo "Giá tăng dần"': 'Sort by "Price: low to high"',
  'Danh sách sắp đúng thứ tự giá': 'The list is ordered correctly by price',
  'Mở trang chi tiết 1 sản phẩm': 'Open the detail page of a product',
  'Hiện đủ tên, giá, ảnh, mô tả, nút mua': 'Shows name, price, images, description and the buy button',
  'Mở sản phẩm đã hết hàng': 'Open an out-of-stock product',
  'Nút "Thêm vào giỏ" bị vô hiệu + nhãn "Hết hàng"': 'The "Add to cart" button is disabled + an "Out of stock" label',
  'Bấm vào ảnh thu nhỏ trong gallery': 'Click a thumbnail in the gallery',
  'Ảnh lớn đổi tương ứng': 'The main image changes accordingly',
  'Thanh toán bằng thẻ Visa hợp lệ': 'Pay with a valid Visa card',
  '200 + đơn chuyển "Đã thanh toán"': '200 + order moves to "Paid"',
  'Chọn PayPal, đăng nhập sandbox và xác nhận': 'Choose PayPal, log into the sandbox and confirm',
  'Quay về site với trạng thái thành công': 'Returns to the site with a success status',
  'Chọn "Thanh toán khi nhận hàng" (COD)': 'Choose "Cash on delivery" (COD)',
  'Đặt đơn thành công, trạng thái "Chờ thu tiền"': 'Order placed successfully, status "Awaiting payment"',
  'Thanh toán thẻ yêu cầu xác thực 3-D Secure': 'Pay with a card that requires 3-D Secure authentication',
  'Hiện màn OTP và xác thực thành công': 'The OTP screen appears and authentication succeeds',
  'Giả lập cổng thanh toán timeout': 'Simulate a payment gateway timeout',
  'Đơn về trạng thái "Thanh toán lỗi", không trừ tiền': 'Order moves to "Payment failed" status, no money is charged',
  'Hoàn tiền toàn bộ 1 đơn đã thanh toán': 'Fully refund a paid order',
  '200 + đơn chuyển "Đã hoàn tiền", đúng số tiền': '200 + order moves to "Refunded", correct amount',
  'Hoàn tiền 1 phần (1/3 sản phẩm)': 'Partially refund (1 of 3 items)',
  'Tổng đơn còn lại tính đúng': 'The remaining order total is calculated correctly',
  'Tải hoá đơn PDF sau khi hoàn tiền': 'Download the PDF invoice after a refund',
  'PDF hiển thị đúng số tiền đã hoàn': 'The PDF shows the correct refunded amount',
  'Thêm hàng → checkout → thanh toán': 'Add items → checkout → pay',
  'Tạo đơn thành công + sinh orderId': 'Order created successfully + orderId generated',
  'Huỷ đơn khi chưa giao': 'Cancel an order before it ships',
  'Đơn chuyển "Đã huỷ", hoàn kho': 'Order moves to "Cancelled", stock is restored',
  'Mở "Đơn hàng của tôi", chuyển trang': 'Open "My orders", change pages',
  'Phân trang hoạt động, hiện đúng đơn': 'Pagination works and shows the correct orders',
  'Theo dõi đơn đang giao': 'Track an order in transit',
  'Hiện đúng mốc trạng thái vận chuyển': 'The correct shipping status milestones are shown',
  'Nhập mã vận đơn không hợp lệ': 'Enter an invalid tracking number',
  'Báo lỗi "Không tìm thấy đơn"': 'Show the "Order not found" error',
  'Tính phí ship nội thành theo cân nặng': 'Calculate domestic shipping fee by weight',
  'Trả phí đúng bảng giá': 'Returns the correct fee per the rate table',
  'Tính phí + thuế cho đơn quốc tế': 'Calculate fee + tax for an international order',
  'Phí ship và thuế nhập khẩu tính đúng': 'Shipping fee and import tax are calculated correctly',
  'Đơn > 500k': 'Order > 500k',
  'Được miễn phí vận chuyển': 'Qualifies for free shipping',
  'Đăng nhập bằng tài khoản "viewer" rồi mở trang Admin': 'Log in with a "viewer" account and open the Admin page',
  'Bị chặn 403, không vào được': 'Blocked with 403, cannot enter',
  'Cập nhật tồn kho 1 sản phẩm': 'Update the stock of a product',
  'DB lưu đúng số lượng mới': 'The DB stores the correct new quantity',
  'Tồn kho xuống dưới ngưỡng': 'Stock drops below the threshold',
  'Hiện cảnh báo "Sắp hết hàng"': 'Show a "Low stock" warning',
  'Import 10.000 dòng sản phẩm từ CSV': 'Import 10,000 product rows from CSV',
  'Xử lý xong < 60s, không lỗi': 'Finishes in < 60s, no errors',
  'Mở báo cáo doanh số theo ngày': 'Open the daily sales report',
  'Biểu đồ hiện đúng số liệu': 'The chart shows the correct figures',
  'Xuất báo cáo ra Excel': 'Export the report to Excel',
  'File .xlsx tải về đúng dữ liệu': 'The downloaded .xlsx file has the correct data',
  'Đo TTFB trang chủ': 'Measure homepage TTFB',
  'TTFB < 500ms ở điều kiện bình thường': 'TTFB < 500ms under normal conditions',
  'Chạy 1000 virtual user vào luồng checkout': 'Run 1000 virtual users through the checkout flow',
  'P95 latency < 3s, lỗi < 1%': 'P95 latency < 3s, errors < 1%',
  'Stress test API tìm kiếm': 'Stress test the search API',
  'Không sập, suy giảm hiệu năng có kiểm soát': 'Does not crash, degrades gracefully',
  'Thực hiện checkout trên màn 375px': 'Complete checkout on a 375px screen',
  'Luồng hoàn tất, không vỡ layout': 'The flow completes without breaking the layout',
  'Mở giỏ hàng trên điện thoại': 'Open the cart on a phone',
  'Hiển thị gọn, thao tác được mọi nút': 'Displays compactly, every button is usable',
  'Bấm menu hamburger trên mobile': 'Tap the hamburger menu on mobile',
  'Menu trượt ra, điều hướng đúng': 'The menu slides out and navigates correctly',
};

const unmapped = new Set();

/** Translate one full field value; record any unmapped Vietnamese. */
function tr(s) {
  if (s == null || s === '') return s;
  if (Object.prototype.hasOwnProperty.call(DICT, s)) return DICT[s];
  if (VI_RE.test(s)) unmapped.add(s);
  return s;
}

async function withRetry(label, fn, attempts = 5) {
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
      console.warn(`[translateData] ${label} -> ${code}, retry in ${backoff}ms`);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

async function main() {
  await initDb();
  let changed = 0;

  // --- TASKS / SUBTASKS: description ---
  for (const sheet of ['TASKS', 'SUBTASKS']) {
    const idKey = sheet === 'TASKS' ? 'taskId' : 'subtaskId';
    for (const r of await list(sheet)) {
      const description = tr(r.description);
      if (description !== r.description) {
        await withRetry(`${sheet} ${r[idKey]}`, () => update(sheet, r[idKey], { description }));
        changed += 1;
        if (THROTTLE_MS) await sleep(THROTTLE_MS);
      }
    }
  }

  // --- TESTCASES: each step's action + expected (inside stepsJSON) ---
  for (const tc of await list('TESTCASES')) {
    let steps;
    try {
      steps = JSON.parse(tc.stepsJSON || '[]');
    } catch {
      continue; // malformed — leave as-is
    }
    if (!Array.isArray(steps)) continue;

    let stepChanged = false;
    const newSteps = steps.map((st) => {
      const action = tr(st.action);
      const expected = tr(st.expected);
      if (action !== st.action || expected !== st.expected) stepChanged = true;
      return { ...st, action, expected };
    });
    if (stepChanged) {
      await withRetry(`TESTCASE ${tc.testCaseId}`, () =>
        update('TESTCASES', tc.testCaseId, { stepsJSON: JSON.stringify(newSteps) })
      );
      changed += 1;
      if (THROTTLE_MS) await sleep(THROTTLE_MS);
    }
  }

  // --- EXECUTIONS: failureReason + notes ---
  for (const e of await list('EXECUTIONS')) {
    const failureReason = tr(e.failureReason);
    const notes = tr(e.notes);
    if (failureReason !== e.failureReason || notes !== e.notes) {
      await withRetry(`EXECUTION ${e.executionId}`, () =>
        update('EXECUTIONS', e.executionId, { failureReason, notes })
      );
      changed += 1;
      if (THROTTLE_MS) await sleep(THROTTLE_MS);
    }
  }

  console.log(`[translateData] DB_MODE=${process.env.DB_MODE || 'mock'} — updated ${changed} record(s).`);
  if (unmapped.size > 0) {
    console.warn(`[translateData] WARNING: ${unmapped.size} Vietnamese string(s) had no mapping and were left unchanged:`);
    for (const s of unmapped) console.warn(`  • ${s}`);
  } else {
    console.log('[translateData] No unmapped Vietnamese strings remain. ✅');
  }
}

main().catch((e) => {
  console.error('[translateData] failed:', e);
  process.exit(1);
});
