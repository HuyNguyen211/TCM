/**
 * db/index.js — the repository layer every route uses.
 *
 * Selects the adapter from DB_MODE (mock | sheets), then exposes typed CRUD that
 * runs values through mappers.js. Routes never touch raw rows or A1 ranges.
 *
 * Row addressing: getRows() returns DATA rows only (header excluded). The Nth data
 * row (0-based) lives at sheet row N+2 (row 1 = header). We attach `_rowIndex` to
 * each returned object so updates can target the exact sheet row.
 */
import { env, isSheets } from '../config/env.js';
import { SHEETS } from './schema.js';
import { toRow, fromRow } from '../utils/mappers.js';
import { mockAdapter } from './mockAdapter.js';
import { sheetsAdapter } from './sheetsAdapter.js';

const adapter = isSheets() ? sheetsAdapter : mockAdapter;

export async function initDb() {
  await adapter.init();
  // eslint-disable-next-line no-console
  console.log(`[db] initialized in '${env.DB_MODE}' mode`);
}

/** Return all records of a sheet as typed objects (each carries a hidden _rowIndex). */
export async function list(sheetName) {
  const rows = await adapter.getRows(sheetName);
  return rows
    .map((row, i) => {
      // Skip fully-empty rows (can happen with trailing blanks in Sheets).
      if (!row || row.every((c) => c === '' || c === undefined || c === null)) return null;
      const obj = fromRow(sheetName, row);
      Object.defineProperty(obj, '_rowIndex', { value: i + 2, enumerable: false });
      return obj;
    })
    .filter(Boolean);
}

export async function findById(sheetName, id) {
  const { idKey } = SHEETS[sheetName];
  const all = await list(sheetName);
  return all.find((r) => r[idKey] === id) || null;
}

/** Append a new record. `obj` should already contain id + timestamps. */
export async function create(sheetName, obj) {
  await adapter.append(sheetName, toRow(sheetName, obj));
  return obj;
}

/** Patch an existing record by id; merges patch over current values. Returns merged object. */
export async function update(sheetName, id, patch) {
  const current = await findById(sheetName, id);
  if (!current) return null;
  const merged = { ...current, ...patch };
  await adapter.updateRow(sheetName, current._rowIndex, toRow(sheetName, merged));
  return merged;
}

/** Hard-delete a record by id. Returns true if a row was removed. */
export async function remove(sheetName, id) {
  const current = await findById(sheetName, id);
  if (!current) return false;
  await adapter.deleteRow(sheetName, current._rowIndex);
  return true;
}

/** Low-level escape hatch if a route ever needs it. */
export const raw = adapter;
