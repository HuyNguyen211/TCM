import { useState } from 'react';
import { useIntegrationStatus, fetchJiraIssue, fetchFigmaFile } from '../hooks/useIntegrations.js';
import { Spinner } from '../components/common/States.jsx';
import Badge from '../components/common/Badge.jsx';
import { apiErrorMessage } from '../lib/api.js';

function StatusBadge({ s }) {
  if (!s) return null;
  if (!s.configured) return <Badge className="bg-slate-100 text-slate-500">Chưa cấu hình</Badge>;
  if (s.ok) return <Badge className="bg-green-100 text-green-800">Đã kết nối</Badge>;
  return <Badge className="bg-red-100 text-red-800">Lỗi kết nối</Badge>;
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
      {disabled && <p className="mt-1 text-xs text-gray-400">Cấu hình credentials để dùng.</p>}
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
          <p className="text-sm text-gray-500">Kết nối Atlassian (Jira) & Figma cho các function tương lai.</p>
        </div>
        <button className="btn-secondary" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? 'Đang kiểm tra…' : '↻ Test lại'}
        </button>
      </div>

      {isLoading && <Spinner label="Kiểm tra kết nối…" />}
      {isError && <p className="field-error">Không gọi được /api/integrations/status</p>}

      {data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ServiceCard
            title="Atlassian (Jira)"
            hint="REST API · cấu hình ATLASSIAN_* trong backend/.env"
            status={data.atlassian}
          >
            <LiveTest
              label="Lấy thử Jira issue"
              placeholder="ECOM-12"
              disabled={!data.atlassian?.configured}
              onRun={fetchJiraIssue}
            />
          </ServiceCard>

          <ServiceCard
            title="Figma"
            hint="REST API · cấu hình FIGMA_TOKEN trong backend/.env"
            status={data.figma}
          >
            <LiveTest
              label="Lấy thử Figma file (key hoặc URL)"
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
          <p className="mt-1 text-xs text-gray-400">cấu hình ANTHROPIC_API_KEY (hoặc ANTHROPIC_AUTH_TOKEN) trong backend/.env</p>
          {data.ai?.configured
            ? <p className="mt-2 text-sm text-gray-600">Model: <strong>{data.ai.model}</strong> · Auth: <strong>{data.ai.authMode === 'oauth' ? 'OAuth token' : 'API key'}</strong> — dùng ở nút “Gen Testcase with AI”.</p>
            : <p className="mt-2 text-sm text-gray-500">{data.ai?.message}</p>}
        </div>
      )}

      <div className="card border-dashed p-4 text-sm text-gray-500">
        <p className="font-medium text-gray-700">Cách cấu hình</p>
        <p className="mt-1">Thêm token vào <code>backend/.env</code> rồi restart backend. Xem chi tiết ở <code>docs/INTEGRATIONS.md</code>. MCP cho Claude Code cấu hình ở <code>.mcp.json</code>.</p>
      </div>
    </div>
  );
}
