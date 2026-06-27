import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTestCase } from '../hooks/useTestCases.js';
import { useExecutions } from '../hooks/useExecutions.js';
import { useCan } from '../hooks/useCan.js';
import { priorityBadge, tcStatusBadge, execStatusBadge } from '../lib/constants.js';
import Badge from '../components/common/Badge.jsx';
import { Spinner, ErrorState } from '../components/common/States.jsx';
import TestCaseForm from '../components/testcases/TestCaseForm.jsx';
import ExecutionForm from '../components/execution/ExecutionForm.jsx';

export default function TestCaseDetail() {
  const { projectId, testCaseId } = useParams();
  const { data: tc, isLoading, isError } = useTestCase(projectId, testCaseId);
  const { data: execData } = useExecutions(projectId, testCaseId);
  const { writeContent } = useCan();
  const [editOpen, setEditOpen] = useState(false);
  const [execOpen, setExecOpen] = useState(false);

  if (isLoading) return <Spinner />;
  if (isError || !tc) return <ErrorState message="Test case not found." />;

  const executions = execData?.executions || [];
  const latestResult = tc.latestResult || executions[0]?.status || '';

  return (
    <div className="space-y-5">
      <div>
        <Link to={`/projects/${projectId}`} className="text-sm text-brand-700 hover:underline">← Back to project</Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{tc.testCaseName}</h1>
            <Badge className={priorityBadge[tc.priority]}>{tc.priority}</Badge>
            <Badge className={tcStatusBadge[tc.status]}>{tc.status}</Badge>
            <span className="badge bg-gray-100 text-gray-600" title="Version (tăng mỗi lần sửa)">v{tc.version}</span>
          </div>
          {writeContent && (
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => setEditOpen(true)}>Edit</button>
              <button className="btn-primary" onClick={() => setExecOpen(true)}>Record Execution</button>
            </div>
          )}
        </div>

        {/* Latest execution result — updated via "Record Execution", not editable directly. */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Kết quả gần nhất:</span>
          {latestResult
            ? <Badge className={execStatusBadge[latestResult]}>{latestResult}</Badge>
            : <Badge className="bg-slate-100 text-slate-500">Chưa chạy</Badge>}
          <span className="text-xs text-gray-400">— bấm “Record Execution” để ghi kết quả mới (Pass / Fail / Blocked / Skip).</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
          <span>Module: <strong>{tc.module}</strong></span>
          <span>Assigned: <strong>{tc.assignedTo || '—'}</strong></span>
          <div className="flex gap-1">{(tc.tags || []).map((t) => <Badge key={t} className="bg-gray-100 text-gray-600">{t}</Badge>)}</div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Steps</h3>
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr><th className="w-12 py-1">#</th><th className="py-1">Action</th><th className="py-1">Expected Result</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(tc.steps || []).map((s) => (
              <tr key={s.step}>
                <td className="py-2 text-gray-400">{s.step}</td>
                <td className="py-2 pr-4">{s.action}</td>
                <td className="py-2">{s.expected}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Execution History ({executions.length})</h3>
        {executions.length === 0 ? (
          <p className="text-sm text-gray-400">No executions yet. Click “Record Execution” to add one.</p>
        ) : (
          <div className="space-y-3">
            {executions.map((ex) => (
              <div key={ex.executionId} className="rounded-md border border-gray-100 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className={execStatusBadge[ex.status]}>{ex.status}</Badge>
                    <span className="text-sm text-gray-600">{ex.executedBy}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(ex.executionDate).toLocaleString()} · {ex.duration}s
                  </span>
                </div>
                {ex.failureReason && <p className="mt-2 text-sm text-red-700"><strong>Failure:</strong> {ex.failureReason}</p>}
                {ex.notes && <p className="mt-1 text-sm text-gray-600">{ex.notes}</p>}
                {ex.evidenceUrls?.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {ex.evidenceUrls.map((u) => (
                      <a key={u} href={u} target="_blank" rel="noreferrer" className="text-xs text-brand-700 underline">
                        evidence ↗
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <TestCaseForm open={editOpen} onClose={() => setEditOpen(false)} projectId={projectId} testCase={tc} />
      <ExecutionForm
        open={execOpen}
        onClose={() => setExecOpen(false)}
        projectId={projectId}
        testCaseId={testCaseId}
        testCaseName={tc.testCaseName}
      />
    </div>
  );
}
