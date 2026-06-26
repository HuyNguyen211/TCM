# Google Sheets Setup Guide

The backend ships in **mock mode** (no Google account needed). Follow this guide only
when you want to use a **real Google Spreadsheet** as the database (`DB_MODE=sheets`).

---

## 1. Create the spreadsheet

1. Go to <https://sheets.google.com> and create a blank spreadsheet (e.g. "TCM Database").
2. Copy its **Spreadsheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/`**`<THIS_IS_THE_ID>`**`/edit`
3. You don't need to create tabs manually — `npm run setup:sheets` does that.

## 2. Create a Google Cloud service account

1. Open <https://console.cloud.google.com/> and create (or pick) a project.
2. **APIs & Services → Library →** enable **Google Sheets API**.
3. **APIs & Services → Credentials → Create credentials → Service account.**
   - Name it (e.g. `tcm-sheets`), click through, no extra roles required.
4. Open the service account → **Keys → Add key → Create new key → JSON**. A `.json`
   file downloads. Keep it secret (it's git-ignored as `service-account*.json`).
5. Note the service-account **email** (looks like `tcm-sheets@<project>.iam.gserviceaccount.com`).

## 3. Share the spreadsheet with the service account

In the spreadsheet, click **Share** and add the service-account **email** as an **Editor**.
> This is the step people forget — without it every API call returns `403`.

## 4. Configure the backend

In `backend/.env`:

```ini
DB_MODE=sheets
SHEET_ID=<your spreadsheet id>

# Option A — point to the downloaded key file:
GOOGLE_APPLICATION_CREDENTIALS=C:/path/to/service-account.json

# Option B — paste the raw JSON on one line instead (good for Railway/Render):
# GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...", ...}
```

Use **one** of Option A or B.

## 5. Provision the 5 tabs + headers

```bash
cd backend
npm run setup:sheets
```

This creates any missing tabs (`PROJECTS`, `TESTCASES`, `EXECUTIONS`, `USERS`, `TESTSUITES`)
and writes the header row (row 1) to each — exactly the column order in
[FE-BE-MAPPING.md](./FE-BE-MAPPING.md).

## 6. (Optional) load sample data

```bash
npm run seed   # works in sheets mode too; idempotent
```

## 7. Run

```bash
npm run dev
```

The API behaves identically to mock mode; rows now land in your live spreadsheet.

---

## Sheet layout reference (headers written to row 1)

| Sheet | A | B | C | D | E | F | G | H | I | J | K | L |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| PROJECTS | projectId | projectName | description | ownerEmail | status | totalCases | passRate | createdDate | | | | |
| TESTCASES | testCaseId | projectId | testCaseName | module | priority | status | assignedTo | tags | stepsJSON | version | createdDate | lastModified |
| EXECUTIONS | executionId | testCaseId | executedBy | executionDate | status | failureReason | notes | duration | evidenceUrls | | | |
| USERS | userId | email | role | projects | lastLogin | | | | | | | |
| TESTSUITES | suiteId | projectId | suiteName | testCaseIds | | | | | | | | |

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `403 The caller does not have permission` | Spreadsheet not shared with the service-account email (step 3). |
| `missing tabs: ...` on startup | Run `npm run setup:sheets`. |
| `SHEET_ID is required` | Set `SHEET_ID` in `.env`. |
| `error:0909006C` / PEM errors | The `private_key` newlines got mangled — prefer Option A (file) or keep `\n` escaped in the JSON. |
