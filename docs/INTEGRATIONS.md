# Integrations — Atlassian (Jira) & Figma

There are **two independent layers**. Don't confuse them:

| Layer | Who uses it | When | Config |
|---|---|---|---|
| **MCP** (`.mcp.json`) | **Claude Code** (this dev tool) | While you develop | `.mcp.json` in repo root |
| **REST integration** (backend) | **The TCM app** at runtime | In production / when the app calls Jira/Figma | `backend/.env` tokens |

The Jira-sync / Figma-preview *features of the app* run on the **REST layer**. MCP only helps Claude assist you while coding.

---

## A. MCP for Claude Code (`.mcp.json`)

The repo ships a `.mcp.json` declaring two MCP servers:

```json
{
  "mcpServers": {
    "atlassian": { "type": "sse",  "url": "https://mcp.atlassian.com/v1/sse" },
    "figma":     { "type": "http", "url": "http://127.0.0.1:3845/mcp" }
  }
}
```

**Atlassian (Remote MCP Server)** — OAuth based.
1. Open this project in Claude Code → it detects `.mcp.json` and asks to enable the servers → approve.
2. Run `/mcp` in Claude Code → select **atlassian** → **Authenticate** → a browser opens for Atlassian OAuth.
3. Verify: `/mcp` shows `atlassian — connected`. Ask Claude e.g. "list my Jira projects".

**Figma (Dev Mode MCP Server)** — local, runs from the Figma desktop app.
1. Install/open the **Figma desktop app**, open any file.
2. Enable **Preferences → Enable Dev Mode MCP Server** (requires a Dev/Full seat). It serves `http://127.0.0.1:3845/mcp`.
3. In Claude Code run `/mcp` → **figma** should connect. If your Figma version still uses the old SSE endpoint, change the url in `.mcp.json` to `http://127.0.0.1:3845/sse` and set `"type": "sse"`.

> Tip (CLI alternative): `claude mcp add --transport sse atlassian https://mcp.atlassian.com/v1/sse`

---

## B. REST integration for the app (`backend/.env`)

This is what lets the running app talk to Jira/Figma. Add to `backend/.env`:

```ini
# Atlassian (Jira) Cloud
ATLASSIAN_BASE_URL=https://your-site.atlassian.net
ATLASSIAN_EMAIL=you@firegroup.io
ATLASSIAN_API_TOKEN=<token>     # https://id.atlassian.com/manage-profile/security/api-tokens

# Figma
FIGMA_TOKEN=<personal-access-token>   # Figma → Settings → Security → Personal access tokens
```

Restart the backend. No tokens? The app still runs — integrations just report `configured: false`.

### Endpoints (all require the normal JWT auth header)

| Method & path | Purpose |
|---|---|
| `GET /api/integrations/status` | Connectivity of both services (used by the **Integrations** page) |
| `GET /api/integrations/jira/:issueKey` | Fetch a Jira issue, e.g. `/api/integrations/jira/ECOM-12` |
| `GET /api/integrations/figma/:fileKey` | Fetch Figma file metadata (accepts a file key or full URL) |

`GET /status` shape:
```json
{
  "atlassian": { "configured": true, "ok": true, "user": { "name": "...", "email": "..." } },
  "figma":     { "configured": false, "ok": false, "message": "Not configured — add credentials to backend/.env" }
}
```

### Test the connection
1. UI: log in → header **Integrations** → see green/red status, or type a Jira key / Figma URL to fetch live.
2. CLI:
   ```bash
   TOKEN=... # from POST /api/auth/login
   curl -s http://localhost:4000/api/integrations/status -H "Authorization: Bearer $TOKEN"
   ```

### Code map (foundation for future functions)
- `backend/src/integrations/atlassian.js` — `ping()`, `getIssue(key)`
- `backend/src/integrations/figma.js` — `ping()`, `getFile(keyOrUrl)`, `fileKeyFromUrl()`
- `backend/src/routes/integrations.routes.js` — the endpoints above

To build the future **task ↔ Jira sync**, extend `atlassian.js` (create/update issue) and call it from the tasks routes using each task's `jiraKey`. For **Figma preview**, use the task/subtask `figmaUrl` with `figma.getFile()`.

---

## C. AI — "Gen Testcase with AI" (Claude)

Powers the **✨ Gen Testcase with AI** button on Task/Subtask detail. The backend reads the
entity's linked docs (Jira issue, Confluence page, Figma text) and asks **Claude
(`claude-opus-4-8`)** to draft test cases; the UI previews them and you pick which to save.

> **Claude Team (claude.ai) ≠ Anthropic API.** A Team/Pro subscription does not by itself grant
> API access — API calls are billed separately via the Console org. Enable API access there.

Configure **one** of these in `backend/.env` (the API key wins if both are set), then restart the backend:

```ini
# Option A (recommended for a server) — never expires until revoked
ANTHROPIC_API_KEY=sk-ant-...            # https://console.anthropic.com/settings/keys

# Option B — OAuth Bearer token (short-lived, must be re-pasted when it expires)
#   ant auth login
#   ant auth print-credentials --access-token
ANTHROPIC_AUTH_TOKEN=...

ANTHROPIC_MODEL=claude-opus-4-8         # optional override
```

The backend sends the `anthropic-beta: oauth-2025-04-20` header automatically when using a token.
`GET /api/integrations/status` reports `ai: { configured, ok, model, authMode: "api_key"|"oauth" }`.

Endpoints (require JWT): `POST /api/projects/:projectId/tasks/:taskId/gen-testcases` and the
subtask variant. Body: `{ sources: ["jira"|"confluence"|"figma"], count?, instructions? }` →
returns `{ testCases[], used[], warnings[] }` (nothing saved).

Code map: `backend/src/services/aiGen.js` (Claude call, structured output) ·
`aiTestcases.js` (builds context from sources) · `integrations/confluence.js` ·
`integrations/{atlassian,figma}.js` (`getIssueContext` / `getDesignText`).
