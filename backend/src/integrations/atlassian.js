/**
 * atlassian.js — minimal Atlassian Cloud (Jira) REST client for the TCM backend.
 *
 * Auth: API token via Basic auth (email:token, base64). Create a token at
 *   https://id.atlassian.com/manage-profile/security/api-tokens
 * Config (backend/.env): ATLASSIAN_BASE_URL, ATLASSIAN_EMAIL, ATLASSIAN_API_TOKEN
 *
 * This is the runtime path the APP uses (not MCP). Future functions (e.g. syncing
 * a TCM task's jiraKey to a Jira issue) build on these helpers.
 */
import { env } from '../config/env.js';

export const isConfigured = () =>
  Boolean(env.ATLASSIAN_BASE_URL && env.ATLASSIAN_EMAIL && env.ATLASSIAN_API_TOKEN);

function authHeader() {
  const raw = `${env.ATLASSIAN_EMAIL}:${env.ATLASSIAN_API_TOKEN}`;
  return `Basic ${Buffer.from(raw).toString('base64')}`;
}

async function call(path, opts = {}) {
  if (!isConfigured()) throw Object.assign(new Error('Atlassian not configured'), { status: 400 });
  const base = env.ATLASSIAN_BASE_URL.replace(/\/$/, '');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${base}${path}`, {
      ...opts,
      headers: { Authorization: authHeader(), Accept: 'application/json', ...(opts.headers || {}) },
      signal: ctrl.signal,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = body?.errorMessages?.join('; ') || body?.message || `HTTP ${res.status}`;
      throw Object.assign(new Error(`Atlassian: ${msg}`), { status: res.status });
    }
    return body;
  } catch (err) {
    if (err.name === 'AbortError') throw Object.assign(new Error('Atlassian request timed out'), { status: 504 });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Extract a Jira issue key (e.g. MADP-6557) from a key or a full browse URL. */
export function issueKeyFromInput(input) {
  const m = String(input).match(/[A-Za-z][A-Za-z0-9_]+-\d+/);
  return m ? m[0].toUpperCase() : String(input).trim();
}

export const atlassian = {
  isConfigured,

  /** Verify credentials -> current user. */
  async ping() {
    const me = await call('/rest/api/3/myself');
    return { accountId: me.accountId, email: me.emailAddress, name: me.displayName };
  },

  /** Fetch a Jira issue by key (e.g. ECOM-12) or a full browse URL. Foundation for future task<->Jira sync. */
  async getIssue(keyOrUrl) {
    const key = issueKeyFromInput(keyOrUrl);
    const i = await call(`/rest/api/3/issue/${encodeURIComponent(key)}?fields=summary,status,assignee`);
    return {
      key: i.key,
      summary: i.fields?.summary,
      status: i.fields?.status?.name,
      assignee: i.fields?.assignee?.displayName || null,
      url: `${env.ATLASSIAN_BASE_URL.replace(/\/$/, '')}/browse/${i.key}`,
    };
  },

  /** Richer fetch for AI context: summary + description flattened to plain text. */
  async getIssueContext(keyOrUrl) {
    const key = issueKeyFromInput(keyOrUrl);
    const i = await call(`/rest/api/3/issue/${encodeURIComponent(key)}?fields=summary,description,issuetype,priority`);
    return {
      key: i.key,
      summary: i.fields?.summary || '',
      issueType: i.fields?.issuetype?.name || '',
      priority: i.fields?.priority?.name || '',
      description: adfToText(i.fields?.description) || '',
    };
  },
};

/** Flatten Atlassian Document Format (ADF) JSON to plain text by collecting text nodes. */
export function adfToText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  let out = '';
  if (node.type === 'text' && node.text) out += node.text;
  if (node.type === 'hardBreak' || node.type === 'paragraph' || node.type === 'heading') out += '\n';
  if (Array.isArray(node.content)) out += node.content.map(adfToText).join('');
  if (node.type === 'listItem') out = `- ${out}`;
  return out;
}
