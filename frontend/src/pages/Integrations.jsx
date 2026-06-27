import { useState } from 'react';
import { useIntegrationStatus, fetchJiraIssue, fetchFigmaFile } from '../hooks/useIntegrations.js';
import { SkeletonCards } from '../components/common/Skeleton.jsx';
import Badge from '../components/common/Badge.jsx';
import { apiErrorMessage } from '../lib/api.js';

function StatusBadge({ s }) {
  if (!s) return null;
  if (!s.configured) return <Badge className="bg-slate-100 text-slate-500">Not configured</Badge>;
  if (s.ok) return <Badge className="bg-green-100 text-green-800">Connected</Badge>;
  return <Badge className="bg-red-100 text-red-800">Connection error</Badge>;
}

function ServiceCard({ title, hint, status, children }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <StatusBadge s={status} />
      </div>
      <p className="mt-1 text-xs text-gray-400">{hint}</p>
      {status?.configured && status?.ok && status.user && (
        <p className="mt-2 text-sm text-gray-600">
          👤 {status.user.name || status.user.handle || status.user.email}
          {status.user.email ? ` · ${status.user.email}` : ''}
        </p>
      )}
      {status?.configured && !status?.ok && (
        <p className="mt-2 text-sm text-red-600">{status.error}</p>
      )}
      {!status?.configured && (
        <p className="mt-2 text-sm text-gray-500">{status.message}</p>
      )}
      <div className="mt-3 border-t border-gray-100 pt-3">{children}</div>
    </div>
  );
}

/** Small on-demand "live fetch" tester. */
function LiveTest({ label, placeholder, onRun, disabled }) {
  const [val, setVal] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setError(''); setResult(null); setLoading(true);
    try { setResult(await onRun(val.trim())); }
    catch (e) { setError(apiErrorMessage(e)); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-2">
        <input className="input" placeholder={placeholder} value={val} onChange={(e) => setVal(e.target.value)} disabled={disabled} />
        <button className="btn-secondary" onClick={run} disabled={disabled || !val.trim() || loading}>
          {loading ? '…' : 'Fetch'}
        </button>
      </div>
      {disabled && <p className="mt-1 text-xs text-gray-400">Configure credentials to use this.</p>}
      {error && <p className="field-error whitespace-pre-line">{error}</p>}
      {result && (
        <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-700">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function Integrations() {
  const { data, isLoading, isError, refetch, isFetching } = useIntegrationStatus();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-sm text-gray-500">Connect Atlassian (Jira) & Figma for upcoming features.</p>
        </div>
        <button className="btn-secondary" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? 'Checking…' : '↻ Re-test'}
        </button>
      </div>

      {isLoading && <SkeletonCards count={2} lines={4} cols={2} />}
      {isError && <p className="field-error">Could not reach /api/integrations/status</p>}

      {data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ServiceCard
            title="Atlassian (Jira)"
            hint="REST API · configure ATLASSIAN_* in backend/.env"
            status={data.atlassian}
          >
            <LiveTest
              label="Try fetching a Jira issue"
              placeholder="ECOM-12"
              disabled={!data.atlassian?.configured}
              onRun={fetchJiraIssue}
            />
          </ServiceCard>

          <ServiceCard
            title="Figma"
            hint="REST API · configure FIGMA_TOKEN in backend/.env"
            status={data.figma}
          >
            <LiveTest
              label="Try fetching a Figma file (key or URL)"
              placeholder="https://figma.com/file/abc/..."
              disabled={!data.figma?.configured}
              onRun={fetchFigmaFile}
            />
          </ServiceCard>
        </div>
      )}

      {data && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">AI (Claude) — Gen Testcase</h3>
            <StatusBadge s={data.ai} />
          </div>
          <p className="mt-1 text-xs text-gray-400">configure ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN) in backend/.env</p>
          {data.ai?.configured
            ? <p className="mt-2 text-sm text-gray-600">Model: <strong>{data.ai.model}</strong> · Auth: <strong>{data.ai.authMode === 'oauth' ? 'OAuth token' : 'API key'}</strong> — used by the “Gen Testcase with AI” button.</p>
            : <p className="mt-2 text-sm text-gray-500">{data.ai?.message}</p>}
        </div>
      )}

      <div className="card border-dashed p-4 text-sm text-gray-500">
        <p className="font-medium text-gray-700">How to configure</p>
        <p className="mt-1">Add tokens to <code>backend/.env</code>, then restart the backend. See details in <code>docs/INTEGRATIONS.md</code>. MCP for Claude Code is configured in <code>.mcp.json</code>.</p>
      </div>
    </div>
  );
}
