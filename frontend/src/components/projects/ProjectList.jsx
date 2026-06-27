import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjects } from '../../hooks/useProjects.js';
import { useCan } from '../../hooks/useCan.js';
import { PROJECT_STATUS, projectStatusBadge } from '../../lib/constants.js';
import Badge from '../common/Badge.jsx';
import { Spinner, ErrorState, EmptyState } from '../common/States.jsx';
import ProjectForm from './ProjectForm.jsx';

const PAGE = 20;

export default function ProjectList() {
  const [status, setStatus] = useState('');
  const [skip, setSkip] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { manageProjects } = useCan();
  const params = { skip, limit: PAGE, ...(status ? { status } : {}) };
  const { data, isLoading, isError } = useProjects(params);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (p) => { setEditing(p); setFormOpen(true); };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Status</label>
          <select
            className="input w-auto py-1"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setSkip(0); }}
          >
            <option value="">All</option>
            {PROJECT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {manageProjects && <button className="btn-primary" onClick={openCreate}>+ New Project</button>}
      </div>

      {isLoading && <Spinner />}
      {isError && <ErrorState message="Failed to load projects." />}

      {data && data.projects.length === 0 && (
        <EmptyState
          title="No projects yet"
          hint={manageProjects ? 'Create your first project to start adding test cases.' : 'No projects to show yet.'}
          action={manageProjects ? <button className="btn-primary" onClick={openCreate}>+ New Project</button> : null}
        />
      )}

      {data && data.projects.length > 0 && (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2">Project</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Cases</th>
                <th className="px-4 py-2 text-right">Pass rate</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.projects.map((p) => (
                <tr key={p.projectId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/projects/${p.projectId}`} className="font-medium text-brand-700 hover:underline">
                      {p.projectName}
                    </Link>
                    {p.description && <p className="text-xs text-gray-500 line-clamp-1">{p.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={projectStatusBadge[p.status]}>{p.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.totalCases}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.passRate}%</td>
                  <td className="px-4 py-3 text-right">
                    {manageProjects && <button className="btn-secondary py-1" onClick={() => openEdit(p)}>Edit</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > PAGE && (
        <Pagination skip={skip} limit={PAGE} total={data.total} onChange={setSkip} />
      )}

      <ProjectForm open={formOpen} onClose={() => setFormOpen(false)} project={editing} />
    </section>
  );
}

function Pagination({ skip, limit, total, onChange }) {
  const page = Math.floor(skip / limit) + 1;
  const pages = Math.ceil(total / limit);
  return (
    <div className="flex items-center justify-between text-sm text-gray-600">
      <span>Page {page} of {pages} · {total} total</span>
      <div className="flex gap-2">
        <button className="btn-secondary py-1" disabled={skip === 0} onClick={() => onChange(Math.max(0, skip - limit))}>Prev</button>
        <button className="btn-secondary py-1" disabled={skip + limit >= total} onClick={() => onChange(skip + limit)}>Next</button>
      </div>
    </div>
  );
}
