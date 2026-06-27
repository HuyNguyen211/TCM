import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTestCases, useDeleteTestCase } from '../../hooks/useTestCases.js';
import { useCan } from '../../hooks/useCan.js';
import { MODULES, PRIORITIES, TESTCASE_STATUS, priorityBadge, tcStatusBadge, execStatusBadge } from '../../lib/constants.js';
import Badge from '../common/Badge.jsx';
import { Spinner, ErrorState, EmptyState } from '../common/States.jsx';
import TestCaseForm from './TestCaseForm.jsx';

const PAGE = 25;

/**
 * Scoped test-case list.
 *   - At a Task detail: pass only taskId  -> shows test cases attached DIRECTLY to the task.
 *   - At a Subtask detail: pass taskId + subtaskId -> shows that subtask's test cases.
 */
export default function TestCaseList({ projectId, taskId, subtaskId }) {
  const [filters, setFilters] = useState({ module: '', priority: '', status: '', search: '' });
  const [skip, setSkip] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // subtaskId undefined => 'none' (direct task-level); otherwise the exact subtask.
  const subtaskScope = subtaskId || 'none';

  const params = {
    skip,
    limit: PAGE,
    taskId,
    subtaskId: subtaskScope,
    ...(filters.module ? { module: filters.module } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search ? { search: filters.search } : {}),
  };
  const { writeContent } = useCan();
  const { data, isLoading, isError } = useTestCases(projectId, params);
  const delMut = useDeleteTestCase(projectId);

  const setFilter = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setSkip(0); };
  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (tc) => { setEditing(tc); setFormOpen(true); };

  const onDelete = (tc) => {
    if (window.confirm(`Deprecate "${tc.testCaseName}"? It will be soft-deleted (status DEPRECATED).`)) {
      delMut.mutate(tc.testCaseId);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[12rem]">
          <label className="label">Search</label>
          <input
            className="input"
            placeholder="Name or tag…"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
          />
        </div>
        <Select label="Module" value={filters.module} onChange={(v) => setFilter('module', v)} options={MODULES} />
        <Select label="Priority" value={filters.priority} onChange={(v) => setFilter('priority', v)} options={PRIORITIES} />
        <Select label="Status" value={filters.status} onChange={(v) => setFilter('status', v)} options={TESTCASE_STATUS} />
        {writeContent && <button className="btn-primary" onClick={openCreate}>+ New Test Case</button>}
      </div>

      {isLoading && <Spinner />}
      {isError && <ErrorState message="Failed to load test cases." />}

      {data && data.testCases.length === 0 && (
        <EmptyState title="No test cases match" hint="Adjust filters or create a new test case." />
      )}

      {data && data.testCases.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Module</th>
                <th className="px-4 py-2">Priority</th>
                <th className="px-4 py-2" title="Trạng thái vòng đời test case">TC Status</th>
                <th className="px-4 py-2" title="Kết quả lần chạy gần nhất">Result</th>
                <th className="px-4 py-2">Tags</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.testCases.map((tc) => (
                <tr key={tc.testCaseId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link to={`/projects/${projectId}/testcases/${tc.testCaseId}`} className="font-medium text-brand-700 hover:underline">
                        {tc.testCaseName}
                      </Link>
                      <span className="badge bg-gray-100 text-gray-500" title="Version (tăng mỗi lần sửa)">v{tc.version}</span>
                    </div>
                    <p className="text-xs text-gray-400">{tc.steps?.length || 0} step(s)</p>
                  </td>
                  <td className="px-4 py-3">{tc.module}</td>
                  <td className="px-4 py-3"><Badge className={priorityBadge[tc.priority]}>{tc.priority}</Badge></td>
                  <td className="px-4 py-3"><Badge className={tcStatusBadge[tc.status]}>{tc.status}</Badge></td>
                  <td className="px-4 py-3">
                    {tc.latestResult
                      ? <Badge className={execStatusBadge[tc.latestResult]}>{tc.latestResult}</Badge>
                      : <Badge className="bg-slate-100 text-slate-500">Chưa chạy</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(tc.tags || []).map((t) => <Badge key={t} className="bg-gray-100 text-gray-600">{t}</Badge>)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {writeContent && <button className="btn-secondary py-1" onClick={() => openEdit(tc)}>Edit</button>}
                      {writeContent && tc.status !== 'DEPRECATED' && (
                        <button className="btn-secondary py-1 text-red-600" onClick={() => onDelete(tc)}>Deprecate</button>
                      )}
                      {!writeContent && <span className="text-xs text-gray-400">View only</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > PAGE && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{data.total} total</span>
          <div className="flex gap-2">
            <button className="btn-secondary py-1" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - PAGE))}>Prev</button>
            <button className="btn-secondary py-1" disabled={skip + PAGE >= data.total} onClick={() => setSkip(skip + PAGE)}>Next</button>
          </div>
        </div>
      )}

      <TestCaseForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        projectId={projectId}
        taskId={taskId}
        subtaskId={subtaskId || ''}
        testCase={editing}
      />
    </section>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input w-auto" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
