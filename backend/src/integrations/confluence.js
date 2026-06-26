/**
 * confluence.js — read a Confluence Cloud page's text for AI context.
 * Reuses the Atlassian credentials (same site + API token, Basic auth).
 * Base URL is ATLASSIAN_BASE_URL + '/wiki'.
 */
import { env } from '../config/env.js';

export const isConfigured = () =>
  Boolean(env.ATLASSIAN_BASE_URL && env.ATLASSIAN_EMAIL && env.ATLASSIAN_API_TOKEN);

const base = () => `${env.ATLASSIAN_BASE_URL.replace(/\/$/, '')}/wiki`;
function authHeader() {
  return `Basic ${Buffer.from(`${env.ATLASSIAN_EMAIL}:${env.ATLASSIAN_API_TOKEN}`).toString('base64')}`;
}

function stripHtml(html) {
  return String(html)
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

/** Resolve a Confluence page id from a full page URL or a /wiki/x/<tiny> short link. */
async function resolvePageId(url) {
  let m = String(url).match(/\/pages\/(\d+)/);
  if (m) return m[1];
  // Tiny link (/wiki/x/...) — follow the redirect to the canonical page URL.
  const res = await fetch(url, { method: 'GET', headers: { Authorization: authHeader() }, redirect: 'manual' });
  const loc = res.headers.get('location');
  if (loc) {
    m = String(loc).match(/\/pages\/(\d+)/);
    if (m) return m[1];
  }
  throw new Error('Could not resolve Confluence page id from URL');
}

export const confluence = {
  isConfigured,
  async getPageContent(url) {
    if (!isConfigured()) throw Object.assign(new Error('Confluence not configured'), { status: 400 });
    const id = await resolvePageId(url);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      const res = await fetch(`${base()}/rest/api/content/${id}?expand=body.storage`, {
        headers: { Authorization: authHeader(), Accept: 'application/json' },
        signal: ctrl.signal,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(`Confluence: HTTP ${res.status}`);
      return { title: body?.title || '', text: stripHtml(body?.body?.storage?.value || '') };
    } finally {
      clearTimeout(timer);
    }
  },
};
