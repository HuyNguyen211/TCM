/**
 * figma.js — minimal Figma REST client for the TCM backend.
 *
 * Auth: a personal access token via the `X-Figma-Token` header. Create one at
 *   Figma → Settings → Security → Personal access tokens
 * Config (backend/.env): FIGMA_TOKEN
 *
 * Runtime path the APP uses (not MCP). Future functions (e.g. previewing the
 * figmaUrl attached to a task) build on these helpers.
 */
import { env } from '../config/env.js';

export const isConfigured = () => Boolean(env.FIGMA_TOKEN);

async function call(path) {
  if (!isConfigured()) throw Object.assign(new Error('Figma not configured'), { status: 400 });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`https://api.figma.com${path}`, {
      headers: { 'X-Figma-Token': env.FIGMA_TOKEN },
      signal: ctrl.signal,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw Object.assign(new Error(`Figma: ${body?.err || `HTTP ${res.status}`}`), { status: res.status });
    }
    return body;
  } catch (err) {
    if (err.name === 'AbortError') throw Object.assign(new Error('Figma request timed out'), { status: 504 });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Extract a Figma file key from a full URL or return the input if it's already a key. */
export function fileKeyFromUrl(input) {
  const m = String(input).match(/(?:file|design)\/([A-Za-z0-9]+)/);
  return m ? m[1] : input;
}

export const figma = {
  isConfigured,

  /** Verify token -> current user. */
  async ping() {
    const me = await call('/v1/me');
    return { id: me.id, email: me.email, handle: me.handle };
  },

  /** Fetch lightweight file metadata by key (depth=1, no full node tree). */
  async getFile(keyOrUrl) {
    const key = fileKeyFromUrl(keyOrUrl);
    const f = await call(`/v1/files/${encodeURIComponent(key)}?depth=1`);
    return { key, name: f.name, lastModified: f.lastModified, version: f.version };
  },

  /** Collect the design's text layers + frame names for AI context (bounded). */
  async getDesignText(keyOrUrl) {
    const key = fileKeyFromUrl(keyOrUrl);
    const f = await call(`/v1/files/${encodeURIComponent(key)}?depth=4`);
    const texts = [];
    const frames = [];
    const walk = (n) => {
      if (!n || texts.length > 400) return;
      if (n.type === 'TEXT' && n.characters) texts.push(n.characters.trim());
      if ((n.type === 'FRAME' || n.type === 'CANVAS') && n.name) frames.push(n.name);
      if (Array.isArray(n.children)) n.children.forEach(walk);
    };
    walk(f.document);
    return {
      name: f.name,
      frames: [...new Set(frames)].slice(0, 50),
      texts: texts.filter(Boolean).slice(0, 300),
    };
  },
};
