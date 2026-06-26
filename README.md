# TCM — Test Case Management

A full-stack Test Case Management app with **precise FE → API → Google-Sheet field mapping**.

- **Frontend:** React 18 + Vite + Tailwind + React Hook Form + TanStack Query
- **Backend:** Node + Express + zod + JWT, with a pluggable database adapter
- **Database:** Google Sheets (`DB_MODE=sheets`) **or** zero-setup mock store (`DB_MODE=mock`, default)

```
React (Vercel)  ⇄  Express API (Render/Railway)  ⇄  Google Sheets  (or local JSON in mock mode)
```

---

## Quickstart (under 2 minutes, no Google account)

```bash
# 1. Backend (mock mode is the default)
cd backend
npm install
npm run seed        # loads sample projects / test cases / executions
npm run dev         # API on http://localhost:4000

# 2. Frontend (in a second terminal)
cd frontend
npm install
npm run dev         # app on http://localhost:5173
```

Open <http://localhost:5173>, sign in with **`demo@firegroup.io`** (or `tester@firegroup.io`),
and you'll see the seeded "E-commerce Platform" project.

> Switch to real Google Sheets anytime by following [docs/GOOGLE-SHEETS-SETUP.md](docs/GOOGLE-SHEETS-SETUP.md)
> and setting `DB_MODE=sheets` — no code changes.

---

## What works (Phase 1 + 2)

- ✅ Projects: list, filter, paginate, create, edit (live `totalCases` / `passRate`)
- ✅ Test cases: list with module/priority/status filters + search, create/edit with a
  dynamic **steps table** and **tag chips**, soft-delete (→ `DEPRECATED`), versioning
- ✅ Execution: Pass/Fail/Blocked/Skip with **conditional required failure reason**,
  duration, notes, evidence URLs; full execution history per test case
- ✅ Dashboard + Reports: KPIs, status breakdown, by-module rollup (accurate aggregations)
- ✅ Validation everywhere (zod on the API, React Hook Form on the UI)
- ✅ Mock ⇄ Google Sheets via one env flag

## Scaffolded for Phase 3 (extension points, not built)

Chart.js trend/pie charts (data already returned by `/reports`), real file upload
(Cloudinary/Imgur) replacing URL paste, CSV/PDF export, advanced/fuzzy search. These are
marked in the Reports view and noted in the code.

---

## Project layout

```
test-case-management/
├── backend/    # Express API — see backend/src
├── frontend/   # React app — see frontend/src
└── docs/
    ├── FE-BE-MAPPING.md        # ⭐ the field-mapping contract
    ├── GOOGLE-SHEETS-SETUP.md  # service account + sheet provisioning
    └── DEPLOYMENT.md           # Vercel + Render/Railway
```

## Key files

| Concern | File |
|---|---|
| Column order (source of truth) | `backend/src/db/schema.js` |
| Object ⇄ row mapping | `backend/src/utils/mappers.js` |
| Mock / Sheets adapters | `backend/src/db/{mockAdapter,sheetsAdapter}.js` |
| Validation rules | `backend/src/validators/*` |
| API routes | `backend/src/routes/*` |
| API client + JWT | `frontend/src/lib/api.js` |
| Server-state hooks | `frontend/src/hooks/*` |

## Default config

| | Backend | Frontend |
|---|---|---|
| Port | `4000` | `5173` |
| Env template | `backend/.env.example` | `frontend/.env.example` |

See [docs/FE-BE-MAPPING.md](docs/FE-BE-MAPPING.md) for the complete API contract.
