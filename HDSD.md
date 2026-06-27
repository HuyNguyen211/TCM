# USER GUIDE — TCM (Test Case Management)

This document explains how to **use & demo** the TCM product for customers. For developer-facing material (field mapping, deployment, etc.) see [README.md](README.md) and the [docs/](docs/) folder.

> **What is TCM?** A full-featured test case management application: it organizes work in the hierarchy **Project → Task → Sub-task → Test Case → Execution**, records Pass/Fail/Blocked/Skip results, builds reports & pass-rate charts, supports 4 permission roles, integrates with Jira/Confluence/Figma, and **generates test cases automatically with AI (Claude)**.

---

## 1. Data model (worth understanding before the demo)

```
Project
└── Task                     ← carries a Jira key, Confluence link, Figma link
    ├── Sub-task             ← breaks a task down (optional)
    │   └── Test Case        ← a test case + its steps
    │       └── Execution    ← a run: Pass / Fail / Blocked / Skip
    └── Test Case            ← a test case can attach directly to a Task (no sub-task needed)
```

- **The pass rate (`passRate`) and total case count (`totalCases`) are always recomputed from live data**, never taken from stale values.
- A test case uses its **latest result** (by execution date) as its current status. A case with no runs yet = **Not run (PENDING)**.

---

## 2. Running the Demo

There are 2 data modes, switched with a single `DB_MODE` environment variable in [backend/.env](backend/.env):

| Mode | `DB_MODE` | Where data lives | When to use |
|---|---|---|---|
| **Mock (recommended for demos)** | `mock` | Local JSON files `backend/data/*.json` | Self-contained, no network/credentials needed — the safest option when presenting |
| **Google Sheets** | `sheets` | Google Sheet `1aDw5VQE…` | When you want to show the real Sheets integration |

> The demo dataset in this document **has been pre-loaded into BOTH** modes.

### Steps to run

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

Open **http://localhost:5173** → log in → open the **"E-commerce Platform"** project.

### Demo accounts (defaults from seeding)

| Email | Role | Password |
|---|---|---|
| `demo@firegroup.io` | **lead** (near-full access) | `password123` |
| `tester@firegroup.io` | **tester** | `password123` |

> You can **Sign up** for a new account right on the login screen (only `tester`/`viewer` roles can be self-created). Need to change a password? Use `npm run set:password` in `backend/`. Create a new user (including an admin) with `npm run create:user`.

---

## 3. Roles & permissions

| Role | Permissions |
|---|---|
| **viewer** | View everything only |
| **tester** | + Create/edit Tasks, Sub-tasks, Test Cases, and record execution results |
| **lead** | + Create/edit Projects, manage their own tester team (Team) |
| **admin** | + Manage all users (Admin → Users) |

When logged in with a lower role, the action buttons (create/edit/delete) hide automatically — handy for demoing the permission model.

---

## 4. Guide by screen

### 4.1. Dashboard — project list
- Shows projects with their **total case count** and **pass rate**; filter by status (`active`/`paused`/`archived`), search, and paginate.
- **+ New Project** button (lead/admin): create a new project.
- Click a project to open the **Project View**.

### 4.2. Project View
- **Reports & charts** at the top of the page: KPIs (total cases, executed, not run, % pass, % fail), a daily pass-rate chart, a status distribution (pie), and **per-Module statistics**.
- **Task / Sub-task tree**: lists the tasks; each task has a status badge (To Do / In Progress / Done), a **Jira key**, and Confluence/Figma links if present.
- Click a Task → **Task Detail**.

### 4.3. Task / Sub-task Detail
- View & edit task details, the sub-task list, and the list of test cases that belong to it.
- A **Resource Links** section: Jira / Confluence / Figma.
- The **✨ Gen Testcase with AI** button (see section 4.6).

### 4.4. Test Case
Each test case includes:
- **Name**, **Module** (`UI / API / DB / Performance / Security`), **Priority** (`CRITICAL / HIGH / MEDIUM / LOW`), **Status** (`DRAFT / ACTIVE / DEPRECATED`).
- **Tags** (chips): smoke, regression, negative, api, payment, etc.
- **Steps table**: each step has an *Action* and an *Expected result* — add/remove rows dynamically.
- Deleting a test case is a **soft delete** (it moves to `DEPRECATED`); no data is lost.

### 4.5. Recording an execution result (Execution)
- On the Test Case page, click **Record Execution**.
- Choose one of: **Pass ✅ / Fail ❌ / Blocked ⚠️ / Skip ⏭️**.
- If **Fail** → a **failure reason is required** (validated on both the UI and the API).
- You can enter a duration (seconds), notes, and evidence URLs.
- The full **execution history** is stored per test case.

### 4.6. Generating Test Cases with AI ✨ (the demo highlight)
- On a Task/Sub-task, click **Gen Testcase with AI**.
- The AI (Claude) reads the task's **name + description** and, if present, also reads the linked **Jira / Confluence / Figma** → and proposes a list of test cases.
- You get a **preview** and **choose which cases to create** — nothing is saved blindly.
- Requirement: `ANTHROPIC_API_KEY` configured in [backend/.env](backend/.env) (currently set to the `claude-sonnet-4-6` model).

> **Note when demoing AI:** the sample E-commerce tasks use _example_ Confluence/Figma links (`example.com`), so you may see a "could not read source" warning — **the AI can still generate** from the task name + description (written in detail). To show real source-reading integration, use a task with **real Jira/Confluence/Figma links**.

### 4.7. Team Management (lead) & Admin → Users (admin)
- **Team** (lead): assign/remove testers from the team they manage.
- **Admin → Users** (admin): create/edit users, change roles, reset passwords.

### 4.8. Integrations
- The **Integrations** page checks the connection status of Jira/Confluence/Figma and configures tokens.

---

## 5. Sample dataset — the "E-commerce Platform" project

The dataset has been enriched for demos: **8 Tasks**, **11 Sub-tasks**, **55 Test Cases** (in mock mode), spread evenly across every module, priority, status, and result. Suggested "money shots" when presenting:

| Task | Status | Jira | Demo highlight |
|---|---|---|---|
| **Authentication** | In Progress | ECOM-12 | Has a **Fail** case (bad login returns 500) & a **Blocked** case (session timeout) |
| **Cart & Checkout** | To Do | ECOM-20 | A **Fail** case on quantity update, a **Blocked** Stripe payment |
| **Product Catalog & Search** | Done | ECOM-30 | Has Search & PDP sub-tasks; a **Fail** case on the category filter |
| **Payment & Refund** | In Progress | ECOM-40 | **3-D Secure Fail**, **timeout Blocked**, partial refund **Fail** |
| **Order Management & Shipping** | In Progress | ECOM-50 | International-order tax **Fail**; has a **Not run** case |
| **Admin Dashboard** | To Do | ECOM-60 | Demos **RBAC permissions**; CSV import **Blocked**; Excel export **Skip** |
| **Performance & Reliability** | In Progress | ECOM-70 | **Performance** module: 1000-user load test **Fail** (P95 > 3s) |
| **Mobile Responsive** | Done | ECOM-80 | **Mobile** module: 3 Pass cases on a 375px screen |

**Modules present in the data:** UI, API, DB, Security, Performance, Mobile.
**Results present:** Pass ✅, Fail ❌, Blocked ⚠️, Skip ⏭️, and Not run (PENDING) → enough to make the pie/trend charts look lively. Executions are spread over the last ~5 days, so the **daily pass-rate chart** has multiple data points.

---

## 6. Suggested demo script (~7 minutes)

1. **Log in** as `demo@firegroup.io` / `password123` → go to the **Dashboard** and point out the pass rate of "E-commerce Platform".
2. Open the project → show the **reports & charts** (KPIs, pie, trend, per-module stats).
3. Open the **"Payment & Refund" Task** → open case `TC_Payment_3DSecure` (Fail) → review its **execution history** and **failure reason**.
4. **Record a new result**: pick a `Not run` case (e.g. `TC_Refund_InvoicePDF`) → click Pass → go back and see the **charts update immediately**.
5. **Quickly create a test case** with a Steps table + tag chips to show off the input form.
6. **✨ Gen Testcase with AI** on a task → preview the AI's suggested list → select a few cases to create.
7. **Permissions**: log out, log back in as `tester@firegroup.io` (or create a `viewer` account) → show the customer how the create/edit buttons hide automatically.

---

## 7. Reloading / managing the sample data

Run inside the `backend/` folder:

| Command | Effect |
|---|---|
| `npm run seed` | Load the base data (only runs if the sample project doesn't exist yet) |
| `npm run seed:more` | Add the extended test-case set for Authentication & Cart |
| `npm run seed:demo` | **Add the rich demo dataset described in this document** (6 tasks + sub-tasks + ~37 cases) |
| `npm run reseed` | Wipe & reload (mock mode only) |

Characteristics of `seed:demo`:
- **Idempotent**: re-running skips automatically if the data already exists (no duplication).
- **Works in both modes** — it respects `DB_MODE`:
  ```bash
  DB_MODE=mock  npm run seed:demo                          # write to local JSON
  DB_MODE=sheets SEED_THROTTLE_MS=1300 npm run seed:demo   # write to Google Sheets (throttled to stay under the quota)
  ```

> Script file: [backend/scripts/seedDemo.js](backend/scripts/seedDemo.js).

---

## 8. Reference values (enums)

| Group | Valid values |
|---|---|
| Module | `UI`, `API`, `DB`, `Performance`, `Security` _(the demo data adds `Mobile`)_ |
| Priority | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` |
| Test Case status | `DRAFT`, `ACTIVE`, `DEPRECATED` |
| Execution result | `PASSED`, `FAILED`, `BLOCKED`, `SKIPPED` |
| Task/Sub-task status | `To Do`, `In Progress`, `Done` |
| Project status | `active`, `paused`, `archived` |
| Role | `admin`, `lead`, `tester`, `viewer` |

---

## 9. Common troubleshooting

| Symptom | How to fix |
|---|---|
| Login reports a wrong password | The default seeded password is `password123`; or run `npm run set:password` |
| Don't see the data you just loaded | Check `DB_MODE` in [backend/.env](backend/.env) — mock and sheets are **two separate stores** |
| AI Gen errors out / won't run | Missing `ANTHROPIC_API_KEY` in `backend/.env`, or the token has expired |
| AI Gen warns "could not read source" | The sample Confluence/Figma links are `example.com`; use real links, or just let the AI generate from the name + description |
| Google Sheets write fails with quota/429 | Re-run `seed:demo` with `SEED_THROTTLE_MS=1500` to throttle the writes |
| Frontend can't reach the API | Make sure the backend is running on `:4000` and `VITE_API_URL=/api` (Vite proxies to 4000 automatically) |

---

*Updated: 2026-06-27 · Sample project: E-commerce Platform.*
