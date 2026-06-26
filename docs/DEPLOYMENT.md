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

4. Deploy. Then **run once** from the Render shell (or locally pointing at prod env):
   `npm run setup:sheets` to provision tabs. Optionally `npm run seed`.
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

## 4. Auth note (dev → prod)

This build uses **dev JWT login** (email → token). Before exposing publicly, replace the
body of `POST /api/auth/login` (`backend/src/routes/auth.routes.js`) with Google OAuth token
verification. The `requireAuth` middleware and the entire FE auth flow stay unchanged —
only token *issuance* changes.

## 5. Production checklist

- [ ] `JWT_SECRET` is a strong random value (not the dev default).
- [ ] `CORS_ORIGIN` pinned to the Vercel domain(s).
- [ ] Service-account JSON stored only in env vars, never committed.
- [ ] `npm run setup:sheets` run once against the prod spreadsheet.
- [ ] `VITE_API_URL` points at the deployed backend `/api`.
- [ ] Health check green at `/api/health`.

## 6. Local development recap

```bash
# Terminal 1
cd backend && npm install && npm run seed && npm run dev   # http://localhost:4000

# Terminal 2
cd frontend && npm install && npm run dev                  # http://localhost:5173
```

The Vite dev server proxies `/api` → `http://localhost:4000`, so no FE env var is needed locally.
