/**
 * setupSheets.js — one-time provisioning for a REAL Google Spreadsheet.
 * Creates any missing tabs (PROJECTS, TESTCASES, EXECUTIONS, USERS, TESTSUITES)
 * and writes the header row to row 1 of each.
 *
 * Prereqs (see docs/GOOGLE-SHEETS-SETUP.md):
 *   - DB_MODE=sheets
 *   - SHEET_ID set to your spreadsheet id
 *   - GOOGLE_SERVICE_ACCOUNT_KEY (raw json) or GOOGLE_APPLICATION_CREDENTIALS (file path)
 *   - the spreadsheet shared (Editor) with the service-account email
 *
 * Usage: npm run setup:sheets
 */
import { google } from 'googleapis';
import { env } from '../src/config/env.js';
import { SHEET_NAMES, headerRow, lastColumn } from '../src/db/schema.js';

if (env.DB_MODE !== 'sheets') {
  console.error('[setup] DB_MODE must be "sheets" to run this script. Current:', env.DB_MODE);
  process.exit(1);
}
if (!env.SHEET_ID) {
  console.error('[setup] SHEET_ID is required.');
  process.exit(1);
}

function getAuth() {
  const scopes = ['https://www.googleapis.com/auth/spreadsheets'];
  if (env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return new google.auth.GoogleAuth({ credentials: JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_KEY), scopes });
  }
  return new google.auth.GoogleAuth({ scopes });
}

async function main() {
  const api = google.sheets({ version: 'v4', auth: getAuth() });

  const meta = await api.spreadsheets.get({ spreadsheetId: env.SHEET_ID });
  const existing = (meta.data.sheets || []).map((s) => s.properties.title);

  const toCreate = SHEET_NAMES.filter((n) => !existing.includes(n));
  if (toCreate.length) {
    await api.spreadsheets.batchUpdate({
      spreadsheetId: env.SHEET_ID,
      requestBody: {
        requests: toCreate.map((title) => ({ addSheet: { properties: { title } } })),
      },
    });
    console.log('[setup] created tabs:', toCreate.join(', '));
  } else {
    console.log('[setup] all tabs already exist.');
  }

  // Write header rows.
  for (const name of SHEET_NAMES) {
    await api.spreadsheets.values.update({
      spreadsheetId: env.SHEET_ID,
      range: `${name}!A1:${lastColumn(name)}1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headerRow(name)] },
    });
  }
  console.log('[setup] header rows written for all sheets. Done.');
}

main().catch((err) => {
  console.error('[setup] failed:', err?.message || err);
  process.exit(1);
});
