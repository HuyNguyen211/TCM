/**
 * sheetsAdapter.js — real Google Sheets backend via googleapis.
 *
 * Same low-level interface as mockAdapter:
 *   init() / getRows() / append() / updateRow()
 *
 * Auth: a Google service account. Provide EITHER
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
 * OR
 *   GOOGLE_SERVICE_ACCOUNT_KEY='{...raw json...}'
 * and share the target spreadsheet (SHEET_ID) with the service-account email.
 *
 * Row indices are 1-based and include the header row (row 1), matching A1 notation.
 */
import { google } from 'googleapis';
import { env } from '../config/env.js';
import { SHEET_NAMES, headerRow, lastColumn } from './schema.js';

let sheetsApi = null;

function getAuth() {
  const scopes = ['https://www.googleapis.com/auth/spreadsheets'];
  if (env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    const credentials = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_KEY);
    return new google.auth.GoogleAuth({ credentials, scopes });
  }
  // Falls back to GOOGLE_APPLICATION_CREDENTIALS file path (ADC).
  return new google.auth.GoogleAuth({ scopes });
}

async function client() {
  if (sheetsApi) return sheetsApi;
  const auth = getAuth();
  sheetsApi = google.sheets({ version: 'v4', auth });
  return sheetsApi;
}

function assertConfigured() {
  if (!env.SHEET_ID) throw new Error('SHEET_ID is required when DB_MODE=sheets');
  if (!env.GOOGLE_SERVICE_ACCOUNT_KEY && !env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('Provide GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS when DB_MODE=sheets');
  }
}

export const sheetsAdapter = {
  async init() {
    assertConfigured();
    const api = await client();
    // Verify each sheet/tab exists and has a header row. Creation of tabs is
    // handled by scripts/setupSheets.js; here we only sanity-check connectivity.
    const meta = await api.spreadsheets.get({ spreadsheetId: env.SHEET_ID });
    const existing = (meta.data.sheets || []).map((s) => s.properties.title);
    const missing = SHEET_NAMES.filter((n) => !existing.includes(n));
    if (missing.length) {
      throw new Error(
        `Spreadsheet is missing tabs: ${missing.join(', ')}. Run "npm run setup:sheets" first.`
      );
    }
  },

  async getRows(sheetName) {
    assertConfigured();
    const api = await client();
    const range = `${sheetName}!A2:${lastColumn(sheetName)}`;
    const res = await api.spreadsheets.values.get({
      spreadsheetId: env.SHEET_ID,
      range,
    });
    return res.data.values || [];
  },

  async append(sheetName, rowArray) {
    assertConfigured();
    const api = await client();
    const range = `${sheetName}!A1`;
    const res = await api.spreadsheets.values.append({
      spreadsheetId: env.SHEET_ID,
      range,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [rowArray] },
    });
    // updatedRange looks like "TESTCASES!A5:L5" -> extract the start row number.
    const updatedRange = res.data.updates?.updatedRange || '';
    const match = updatedRange.match(/![A-Z]+(\d+):/);
    const rowIndex = match ? parseInt(match[1], 10) : null;
    return { rowIndex };
  },

  async updateRow(sheetName, rowIndex, rowArray) {
    assertConfigured();
    const api = await client();
    const range = `${sheetName}!A${rowIndex}:${lastColumn(sheetName)}${rowIndex}`;
    await api.spreadsheets.values.update({
      spreadsheetId: env.SHEET_ID,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: [rowArray] },
    });
    return { rowIndex };
  },

  async deleteRow(sheetName, rowIndex) {
    assertConfigured();
    const api = await client();
    const sheetId = await sheetIdByTitle(api, sheetName);
    await api.spreadsheets.batchUpdate({
      spreadsheetId: env.SHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: { sheetId, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex },
            },
          },
        ],
      },
    });
    return { deleted: true };
  },

  // Exposed for setupSheets.js
  _client: client,
  _headerRow: headerRow,
};

// Cache numeric sheet (tab) ids, needed for row-deletion batchUpdate.
const sheetIdCache = new Map();
async function sheetIdByTitle(api, title) {
  if (sheetIdCache.has(title)) return sheetIdCache.get(title);
  const meta = await api.spreadsheets.get({ spreadsheetId: env.SHEET_ID });
  for (const s of meta.data.sheets || []) {
    sheetIdCache.set(s.properties.title, s.properties.sheetId);
  }
  if (!sheetIdCache.has(title)) throw new Error(`Sheet tab not found: ${title}`);
  return sheetIdCache.get(title);
}
