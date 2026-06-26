/**
 * reset.js — wipe the mock data store (data/*.json), then seed fresh.
 * Mock mode only. For real Sheets, clear tabs manually or re-run setup:sheets.
 *
 * Usage: npm run reseed
 */
import fs from 'fs';
import path from 'path';
import { env, isSheets } from '../src/config/env.js';

if (isSheets()) {
  console.error('[reset] refusing to run in sheets mode (would not touch your spreadsheet). Aborting.');
  process.exit(1);
}

const dataDir = path.resolve(process.cwd(), env.DATA_DIR);
if (fs.existsSync(dataDir)) {
  for (const f of fs.readdirSync(dataDir)) {
    if (f.endsWith('.json')) fs.rmSync(path.join(dataDir, f));
  }
  console.log('[reset] cleared', dataDir);
}

// Re-run the seed in the same process.
await import('./seed.js');
