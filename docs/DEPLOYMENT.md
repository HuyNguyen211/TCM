# Deployment Guide

Frontend → **Vercel**. Backend → **Render** (or Railway). Database → **Google Sheets**.

```
Vercel (React/Vite)  ──HTTPS──>  Render (Express API)  ──Sheets API──>  Google Spreadsheet
```

---

## 0. Prerequisites

- A real Google Spreadsheet + service account (see [GOOGLE-SHEETS-SETUP.md](./GOOGLE-SHEETS-SETUP.md)).
- The repo pushed to GitHub.

## 1. Deploy the backend (Render)

1. **New → Web Service**, connect the repo, set **Root Directory** = `backend`.
   (A `render.yaml` blueprint is included if you prefer Blueprint deploys.)
2. Build command `npm install`, start command `npm start`, health check path `/api/health`.
3. **Environment variables:**

   | Key | Value |
   |---|---|
   | `DB_MODE` | `sheets` |
   | `JWT_SECRET` | a long random string |
   | `CORS_ORIGIN` | your Vercel URL, e.g. `https://tcm-app.vercel.app` |
   | `SHEET_ID` | your spreadsheet id |
   | `GOOGLE_SERVICE_ACCOUNT_KEY` | the **raw** service-account JSON (one line) |

   **Integration variables (optional)** — these power the **Integrations** page and
   the "Gen Testcase with AI" button. They live **only** in the Render environment
   (the local `backend/.env` is gitignored and never deployed). Leave any blank and
   that service shows **"Not configured"**. Add all/any of:

   | Key | Value |
   |---|---|
   | `ATLASSIAN_BASE_URL` | e.g. `https://your-site.atlassian.net` |
   | `ATLASSIAN_EMAIL` | the Atlassian account email |
   | `ATLASSIAN_API_TOKEN` | [API token](https://id.atlassian.com/manage-profile/security/api-tokens) |
   | `FIGMA_TOKEN` | Figma → Settings → Security → Personal access tokens |
   | `ANTHROPIC_API_KEY` | [Anthropic API key](https://console.anthropic.com/settings/keys) |
   | `ANTHROPIC_MODEL` | e.g. `claude-sonnet-4-6` (optional; has a default) |

   > **Server uses the API key**, not OAuth. `ANTHROPIC_AUTH_TOKEN` works locally but is
   > short-lived and **not auto-refreshed** — don't use it on a long-running server.
   > After adding/changing these, redeploy (or restart) and hit **"↻ Re-test"** on the
   > Integrations page; each should flip to **"Connected"**.

4. Deploy. Then **run once** against the prod spreadsheet (Render shell, or locally with prod env):
   - `npm run setup:sheets` — provision/refresh tabs + headers.
   - `npm run create:user <email> <password> admin "<Name>"` — bootstrap the first admin.
   - Optionally `npm run seed` for sample data.
   (If prod uses the **same** spreadsheet as your local dev, the tabs/admin already exist — skip these.)
5. Note the public URL, e.g. `https://tcm-backend.onrender.com`.

> Railway is equivalent: new project → deploy from repo → set root to `backend` → same env vars. A `Procfile` is included.

## 2. Deploy the frontend (Vercel)

1. **Add New → Project**, import the repo, set **Root Directory** = `frontend`.
   Framework preset: **Vite** (a `vercel.json` is included with SPA rewrites).
2. **Environment variable:**

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://tcm-backend.onrender.com/api` |

3. Deploy. Vercel serves the SPA; all routes rewrite to `index.html`.

## 3. CORS

The backend reads `CORS_ORIGIN` (comma-separated allowed origins). Set it to your exact
Vercel origin(s) in production — avoid `*` once deployed. Example:
`CORS_ORIGIN=https://tcm-app.vercel.app,https://tcm-app-git-main.vercel.app`.

## 4. Auth & roles

Auth is **email + password** (passwords hashed with scrypt — see `backend/src/utils/password.js`).
JWTs are signed with `JWT_SECRET`. Role-based access control (`requireRole` / `requireWriteRole`):

- `viewer` — read-only; blocked from every write.
- `tester` — + create/edit tasks, subtasks, test cases, executions.
- `lead` — + create/edit projects, manage a team of testers (`/api/team`).
- `admin` — + full user management (`/api/users`).

Public signup (`/api/auth/signup`) can only create `tester`/`viewer`; elevated roles are assigned
by an admin via the User Management page. Bootstrap the first admin from the CLI:
`npm run create:user <email> <password> admin "<Name>"`.

## 5. Production checklist

- [ ] `JWT_SECRET` is a strong random value (not the dev default). Changing it logs everyone out.
- [ ] `CORS_ORIGIN` pinned to the Vercel domain(s).
- [ ] Service-account JSON stored only in env vars, never committed.
- [ ] `npm run setup:sheets` run once against the prod spreadsheet.
- [ ] An admin account exists (`npm run create:user … admin`).
- [ ] Weak demo accounts (`password123`) removed or re-passworded before public exposure.
- [ ] `VITE_API_URL` points at the deployed backend `/api`.
- [ ] Health check green at `/api/health`.
- [ ] Integration tokens (`ATLASSIAN_*`, `FIGMA_TOKEN`, `ANTHROPIC_API_KEY`) set in the **Render** env if those features are needed — they are **not** read from `backend/.env` in prod.

## 6. Local development recap

```bash
# Terminal 1
cd backend && npm install && npm run seed && npm run dev   # http://localhost:4000

# Terminal 2
cd frontend && npm install && npm run dev                  # http://localhost:5173
```

The Vite dev server proxies `/api` → `http://localhost:4000`, so no FE env var is needed locally.
