import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  // 'mock' (default, zero-setup) | 'sheets' (real Google Sheets)
  DB_MODE: (process.env.DB_MODE || 'mock').toLowerCase(),
  JWT_SECRET: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

  // Google Sheets (only required when DB_MODE=sheets)
  SHEET_ID: process.env.SHEET_ID || '',
  // Path to a service-account JSON key file ...
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
  // ...OR the raw JSON of the key (handy on Railway/Render where files are awkward).
  GOOGLE_SERVICE_ACCOUNT_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '',

  // Where the mock adapter persists its JSON files.
  DATA_DIR: process.env.DATA_DIR || 'data',

  // ---- Integrations (optional; for future Jira/Figma functions) ----
  ATLASSIAN_BASE_URL: process.env.ATLASSIAN_BASE_URL || '', // e.g. https://your-site.atlassian.net
  ATLASSIAN_EMAIL: process.env.ATLASSIAN_EMAIL || '',
  ATLASSIAN_API_TOKEN: process.env.ATLASSIAN_API_TOKEN || '',
  FIGMA_TOKEN: process.env.FIGMA_TOKEN || '',

  // ---- AI (Claude) — for "Gen Testcase with AI" ----
  // Use ONE of: ANTHROPIC_API_KEY (recommended for a server) or ANTHROPIC_AUTH_TOKEN
  // (OAuth Bearer from `ant auth login` — short-lived, must be refreshed). Key wins if both set.
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN || '',
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8',
};

export const isSheets = () => env.DB_MODE === 'sheets';
