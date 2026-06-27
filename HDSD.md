# HƯỚNG DẪN SỬ DỤNG — TCM (Test Case Management)

Tài liệu này hướng dẫn **sử dụng & demo** sản phẩm TCM cho khách hàng. Phần dành cho lập trình viên (mapping field, deploy…) xem ở [README.md](README.md) và thư mục [docs/](docs/).

> **TCM là gì?** Một ứng dụng quản lý ca kiểm thử (test case) đầy đủ: tổ chức công việc theo phân cấp **Dự án → Task → Sub-task → Test Case → Lần thực thi**, ghi nhận kết quả Pass/Fail/Blocked/Skip, dựng báo cáo & biểu đồ tỉ lệ pass, phân quyền 4 vai trò, tích hợp Jira/Confluence/Figma và **sinh test case tự động bằng AI (Claude)**.

---

## 1. Mô hình dữ liệu (cần nắm trước khi demo)

```
Dự án (Project)
└── Task                     ← gắn Jira key, link Confluence, link Figma
    ├── Sub-task             ← chia nhỏ task (tuỳ chọn)
    │   └── Test Case        ← ca kiểm thử + các bước (steps)
    │       └── Execution    ← lần chạy: Pass / Fail / Blocked / Skip
    └── Test Case            ← test case có thể gắn trực tiếp vào Task (không cần sub-task)
```

- **Tỉ lệ pass (`passRate`) và tổng số case (`totalCases`) luôn được tính lại theo dữ liệu thật**, không lấy số cũ.
- Một test case lấy **kết quả mới nhất** (theo ngày thực thi) làm trạng thái hiện tại. Case chưa có lần chạy nào = **Chưa chạy (PENDING)**.

---

## 2. Khởi chạy để Demo

Có 2 chế độ dữ liệu, chuyển đổi bằng 1 biến môi trường `DB_MODE` trong [backend/.env](backend/.env):

| Chế độ | `DB_MODE` | Dữ liệu nằm ở | Khi nào dùng |
|---|---|---|---|
| **Mock (khuyến nghị khi demo)** | `mock` | File JSON local `backend/data/*.json` | Tự chứa, không cần mạng/credential — an toàn nhất khi trình diễn |
| **Google Sheets** | `sheets` | Google Sheet `1aDw5VQE…` | Khi muốn khoe tích hợp Sheets thật |

> Bộ dữ liệu demo trong tài liệu này **đã được nạp sẵn vào CẢ HAI** chế độ.

### Các bước chạy

```bash
# Terminal 1 — Backend (API: http://localhost:4000)
cd backend
npm install
npm run dev

# Terminal 2 — Frontend (App: http://localhost:5173)
cd frontend
npm install
npm run dev
```

Mở **http://localhost:5173** → đăng nhập → vào dự án **"E-commerce Platform"**.

### Tài khoản demo (mặc định khi seed)

| Email | Vai trò | Mật khẩu |
|---|---|---|
| `demo@firegroup.io` | **lead** (gần như toàn quyền) | `password123` |
| `tester@firegroup.io` | **tester** | `password123` |

> Có thể **Đăng ký (Sign up)** tài khoản mới ngay trên màn hình login (chỉ tạo được vai trò `tester`/`viewer`). Cần đổi mật khẩu? Dùng `npm run set:password` trong `backend/`. Tạo user mới (kể cả admin) bằng `npm run create:user`.

---

## 3. Vai trò & phân quyền

| Vai trò | Quyền |
|---|---|
| **viewer** | Chỉ xem mọi thứ |
| **tester** | + Tạo/sửa Task, Sub-task, Test Case, ghi nhận kết quả thực thi |
| **lead** | + Tạo/sửa Dự án, quản lý đội tester của mình (Team) |
| **admin** | + Quản lý toàn bộ người dùng (Admin → Users) |

Khi đăng nhập bằng vai trò thấp hơn, các nút thao tác (tạo/sửa/xoá) sẽ tự ẩn — tiện để demo phân quyền.

---

## 4. Hướng dẫn theo từng màn hình

### 4.1. Dashboard — danh sách dự án
- Hiển thị các dự án kèm **tổng số case** và **tỉ lệ pass**; lọc theo trạng thái (`active`/`paused`/`archived`), tìm kiếm, phân trang.
- Nút **+ New Project** (lead/admin): tạo dự án mới.
- Bấm vào một dự án để mở **Trang dự án**.

### 4.2. Trang dự án (Project View)
- **Báo cáo & biểu đồ** ở đầu trang: KPI (tổng case, đã chạy, chưa chạy, % pass, % fail), biểu đồ tỉ lệ pass theo ngày, phân bố trạng thái (pie), và **thống kê theo Module**.
- **Cây Task / Sub-task**: liệt kê các task; mỗi task có badge trạng thái (To Do / In Progress / Done), **Jira key**, và link Confluence/Figma nếu có.
- Bấm vào Task → **Task Detail**.

### 4.3. Task / Sub-task Detail
- Xem & sửa thông tin task, danh sách sub-task và danh sách test case trực thuộc.
- Khu **Liên kết tài nguyên**: Jira / Confluence / Figma.
- Nút **✨ Gen Testcase with AI** (xem mục 4.6).

### 4.4. Test Case
Mỗi test case gồm:
- **Tên**, **Module** (`UI / API / DB / Performance / Security`), **Priority** (`CRITICAL / HIGH / MEDIUM / LOW`), **Status** (`DRAFT / ACTIVE / DEPRECATED`).
- **Tags** (chip): smoke, regression, negative, api, payment…
- **Bảng các bước (Steps)**: mỗi bước gồm *Hành động* và *Kết quả mong đợi* — thêm/bớt động.
- Xoá test case là **soft-delete** (chuyển `DEPRECATED`), không mất dữ liệu.

### 4.5. Ghi nhận kết quả thực thi (Execution)
- Trên trang Test Case, bấm **Record Execution / Ghi kết quả**.
- Chọn 1 trong: **Pass ✅ / Fail ❌ / Blocked ⚠️ / Skip ⏭️**.
- Nếu **Fail** → **bắt buộc nhập lý do thất bại** (validate ở cả UI lẫn API).
- Có thể nhập thời lượng (giây), ghi chú, link bằng chứng (evidence URL).
- Toàn bộ **lịch sử thực thi** được lưu theo từng test case.

### 4.6. Sinh Test Case bằng AI ✨ (điểm nhấn khi demo)
- Tại Task/Sub-task, bấm **Gen Testcase with AI**.
- AI (Claude) đọc **tên + mô tả** của task, và nếu có thì đọc thêm **Jira / Confluence / Figma** đã liên kết → đề xuất danh sách test case.
- Bạn **xem trước (preview)** và **chọn case nào muốn tạo** — không tự lưu bừa.
- Yêu cầu: đã cấu hình `ANTHROPIC_API_KEY` trong [backend/.env](backend/.env) (đang để model `claude-sonnet-4-6`).

> **Lưu ý khi demo AI:** các task mẫu E-commerce dùng link Confluence/Figma _ví dụ_ (`example.com`) nên có thể hiện cảnh báo "không đọc được nguồn" — **AI vẫn sinh được** từ tên + mô tả task (đã viết chi tiết bằng tiếng Việt). Muốn khoe tích hợp đọc nguồn thật, hãy dùng task có **link Jira/Confluence/Figma thật**.

### 4.7. Team Management (lead) & Admin → Users (admin)
- **Team** (lead): gán/bỏ tester vào đội mình quản lý.
- **Admin → Users** (admin): tạo/sửa user, đổi vai trò, reset mật khẩu.

### 4.8. Integrations
- Trang **Integrations** kiểm tra trạng thái kết nối Jira/Confluence/Figma và cấu hình token.

---

## 5. Bộ dữ liệu mẫu — Dự án "E-commerce Platform"

Bộ data đã được làm phong phú để demo: **8 Task**, **11 Sub-task**, **55 Test Case** (ở chế độ mock), trải đều mọi module, mức ưu tiên, trạng thái và kết quả. Gợi ý các điểm "ăn tiền" khi trình bày:

| Task | Trạng thái | Jira | Điểm nhấn khi demo |
|---|---|---|---|
| **Authentication** | In Progress | ECOM-12 | Có case **Fail** (đăng nhập sai trả 500) & **Blocked** (session timeout) |
| **Cart & Checkout** | To Do | ECOM-20 | Case **Fail** cập nhật số lượng, **Blocked** thanh toán Stripe |
| **Product Catalog & Search** | Done | ECOM-30 | Có sub-task Search & PDP; case **Fail** bộ lọc danh mục |
| **Payment & Refund** | In Progress | ECOM-40 | **3-D Secure Fail**, **timeout Blocked**, hoàn tiền 1 phần **Fail** |
| **Order Management & Shipping** | In Progress | ECOM-50 | Tính thuế đơn quốc tế **Fail**; có case **Chưa chạy** |
| **Admin Dashboard** | To Do | ECOM-60 | Demo **phân quyền RBAC**; import CSV **Blocked**; xuất Excel **Skip** |
| **Performance & Reliability** | In Progress | ECOM-70 | Module **Performance**: load test 1000 user **Fail** (P95 > 3s) |
| **Mobile Responsive** | Done | ECOM-80 | Module **Mobile**: 3 case Pass trên màn hình 375px |

**Module xuất hiện trong data:** UI, API, DB, Security, Performance, Mobile.
**Kết quả xuất hiện:** Pass ✅, Fail ❌, Blocked ⚠️, Skip ⏭️, và Chưa chạy (PENDING) → đủ để biểu đồ pie/trend trông sinh động. Các lần thực thi được rải trong ~5 ngày gần nhất nên **biểu đồ tỉ lệ pass theo ngày** có nhiều điểm.

---

## 6. Kịch bản Demo gợi ý (~7 phút)

1. **Đăng nhập** `demo@firegroup.io` / `password123` → vào **Dashboard**, chỉ vào tỉ lệ pass của "E-commerce Platform".
2. Mở dự án → khoe **báo cáo & biểu đồ** (KPI, pie, trend, thống kê theo module).
3. Vào **Task "Payment & Refund"** → mở case `TC_Payment_3DSecure` (Fail) → xem **lịch sử thực thi** và **lý do thất bại**.
4. **Ghi nhận một kết quả mới**: chọn case `Chưa chạy` (vd `TC_Refund_InvoicePDF`) → bấm Pass → quay lại thấy **biểu đồ cập nhật ngay**.
5. **Tạo nhanh 1 test case** với bảng Steps + tag chip để khoe form nhập liệu.
6. **✨ Gen Testcase with AI** trên một task → preview danh sách AI đề xuất → chọn vài case để tạo.
7. **Phân quyền**: đăng xuất, đăng nhập lại bằng `tester@firegroup.io` (hoặc tạo tài khoản `viewer`) → cho khách thấy nút tạo/sửa tự ẩn.

---

## 7. Nạp lại / quản trị dữ liệu mẫu

Chạy trong thư mục `backend/`:

| Lệnh | Tác dụng |
|---|---|
| `npm run seed` | Nạp dữ liệu gốc (chỉ chạy nếu chưa có dự án mẫu) |
| `npm run seed:more` | Thêm bộ test case mở rộng cho Authentication & Cart |
| `npm run seed:demo` | **Thêm bộ data demo phong phú trong tài liệu này** (6 task + sub-task + ~37 case) |
| `npm run reseed` | Xoá sạch & nạp lại (chỉ chế độ mock) |

Đặc điểm `seed:demo`:
- **Idempotent**: chạy lại sẽ tự bỏ qua nếu data đã có (không nhân đôi).
- **Chạy được cả 2 chế độ** — tự tôn trọng `DB_MODE`:
  ```bash
  DB_MODE=mock  npm run seed:demo                          # ghi JSON local
  DB_MODE=sheets SEED_THROTTLE_MS=1300 npm run seed:demo   # ghi Google Sheets (giãn ghi để không vượt hạn mức)
  ```

> File script: [backend/scripts/seedDemo.js](backend/scripts/seedDemo.js).

---

## 8. Bảng giá trị tham chiếu (enum)

| Nhóm | Giá trị hợp lệ |
|---|---|
| Module | `UI`, `API`, `DB`, `Performance`, `Security` _(data demo bổ sung thêm `Mobile`)_ |
| Priority | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` |
| Trạng thái Test Case | `DRAFT`, `ACTIVE`, `DEPRECATED` |
| Kết quả thực thi | `PASSED`, `FAILED`, `BLOCKED`, `SKIPPED` |
| Trạng thái Task/Sub-task | `To Do`, `In Progress`, `Done` |
| Trạng thái Dự án | `active`, `paused`, `archived` |
| Vai trò | `admin`, `lead`, `tester`, `viewer` |

---

## 9. Xử lý sự cố thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| Đăng nhập báo sai mật khẩu | Mật khẩu seed mặc định là `password123`; hoặc chạy `npm run set:password` |
| Không thấy dữ liệu vừa nạp | Kiểm tra `DB_MODE` trong [backend/.env](backend/.env) — mock và sheets là **2 kho tách biệt** |
| Gen AI báo lỗi/không chạy | Thiếu `ANTHROPIC_API_KEY` trong `backend/.env`, hoặc token hết hạn |
| Gen AI cảnh báo "không đọc được nguồn" | Link Confluence/Figma mẫu là `example.com`; dùng link thật hoặc cứ để AI sinh từ tên+mô tả |
| Ghi Google Sheets bị lỗi quota/429 | Chạy lại `seed:demo` với `SEED_THROTTLE_MS=1500` để giãn nhịp ghi |
| Frontend không gọi được API | Đảm bảo backend chạy ở `:4000` và `VITE_API_URL=/api` (Vite tự proxy sang 4000) |

---

*Cập nhật: 27/06/2026 · Dự án mẫu: E-commerce Platform.*
