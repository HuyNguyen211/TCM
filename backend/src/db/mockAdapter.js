/**
 * mockAdapter.js — in-memory store persisted to data/<SHEET>.json.
 *
 * Implements the same low-level interface as sheetsAdapter:
 *   init()                        -> ensure storage exists (+ header row)
 *   getRows(sheetName)            -> array of row-arrays (EXCLUDING header)
 *   append(sheetName, rowArray)   -> { rowIndex }   (1-based sheet row, incl. header)
 *   updateRow(sheetName, rowIndex, rowArray)
 *
 * Storage format mirrors a real sheet: row 0 is the header, data rows follow.
 * Inspecting data/TESTCASES.json proves the exact column layout.
 */
import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import { SHEET_NAMES, headerRow } from './schema.js';

const dataDir = path.resolve(process.cwd(), env.DATA_DIR);

function filePath(sheetName) {
  return path.join(dataDir, `${sheetName}.json`);
}

function load(sheetName) {
  const fp = filePath(sheetName);
  if (!fs.existsSync(fp)) {
    return [headerRow(sheetName)];
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, 'utf8'));
    return Array.isArray(parsed) && parsed.length ? parsed : [headerRow(sheetName)];
  } catch {
    return [headerRow(sheetName)];
  }
}

function save(sheetName, rows) {
  fs.writeFileSync(filePath(sheetName), JSON.stringify(rows, null, 2), 'utf8');
}

export const mockAdapter = {
  async init() {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    for (const sheetName of SHEET_NAMES) {
      if (!fs.existsSync(filePath(sheetName))) {
        save(sheetName, [headerRow(sheetName)]);
      }
    }
  },

  async getRows(sheetName) {
    const rows = load(sheetName);
    return rows.slice(1); // drop header
  },

  async append(sheetName, rowArray) {
    const rows = load(sheetName);
    rows.push(rowArray);
    save(sheetName, rows);
    return { rowIndex: rows.length }; // 1-based, header included
  },

  async updateRow(sheetName, rowIndex, rowArray) {
    const rows = load(sheetName);
    const idx = rowIndex - 1; // rowIndex is 1-based including header
    if (idx < 0 || idx >= rows.length) throw new Error(`Row ${rowIndex} out of range in ${sheetName}`);
    rows[idx] = rowArray;
    save(sheetName, rows);
    return { rowIndex };
  },

  async deleteRow(sheetName, rowIndex) {
    const rows = load(sheetName);
    const idx = rowIndex - 1; // 1-based including header
    if (idx < 1 || idx >= rows.length) throw new Error(`Row ${rowIndex} out of range in ${sheetName}`);
    rows.splice(idx, 1);
    save(sheetName, rows);
    return { deleted: true };
  },
};
