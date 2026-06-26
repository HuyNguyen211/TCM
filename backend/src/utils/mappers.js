/**
 * mappers.js — converts between the internal object shape and a flat sheet row (array).
 *
 * toRow(sheetName, obj)  -> ["uuid", "name", ...]   (order matches schema columns A,B,C...)
 * fromRow(sheetName, row) -> { key: value, ... }     (typed, parsed)
 *
 * This is the ONLY place that knows how a JS value becomes a cell and back.
 * Routes/adapters stay dumb. This guarantees "form submit -> exact sheet row".
 */
import { SHEETS } from '../db/schema.js';

function valueToCell(value, type) {
  if (value === undefined || value === null) return '';
  switch (type) {
    case 'csv':
      return Array.isArray(value) ? value.join(',') : String(value);
    case 'int':
    case 'float':
      return String(value);
    case 'datetime':
    case 'string':
    default:
      return String(value);
  }
}

function cellToValue(cell, type) {
  const raw = cell === undefined || cell === null ? '' : String(cell);
  switch (type) {
    case 'csv':
      return raw === '' ? [] : raw.split(',').map((s) => s.trim()).filter(Boolean);
    case 'int': {
      if (raw === '') return 0;
      const n = parseInt(raw, 10);
      return Number.isNaN(n) ? 0 : n;
    }
    case 'float': {
      if (raw === '') return 0;
      const n = parseFloat(raw);
      return Number.isNaN(n) ? 0 : n;
    }
    case 'datetime':
    case 'string':
    default:
      return raw;
  }
}

/** Build a flat row array (in column order) from an internal object. */
export function toRow(sheetName, obj) {
  const { columns } = SHEETS[sheetName];
  return columns.map((c) => valueToCell(obj[c.key], c.type));
}

/** Parse a flat row array into a typed internal object. */
export function fromRow(sheetName, row) {
  const { columns } = SHEETS[sheetName];
  const out = {};
  columns.forEach((c, i) => {
    out[c.key] = cellToValue(row[i], c.type);
  });
  return out;
}
