import { lazy, Suspense, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProject } from '../hooks/useProjects.js';
import { projectStatusBadge } from '../lib/constants.js';
import Badge from '../components/common/Badge.jsx';
import { ErrorState } from '../components/common/States.jsx';
import { ProjectViewSkeleton, ReportSkeleton } from '../components/common/Skeleton.jsx';
import TaskList from '../components/tasks/TaskList.jsx';

// Reports pull in Chart.js — only load that chunk when the Reports tab opens.
const ReportDashboard = lazy(() => import('../components/reports/ReportDashboard.jsx'));

export default function ProjectView() {
  const { projectId } = useParams();
  const { data: project, isLoading, isError } = useProject(projectId);
  const [tab, setTab] = useState('tasks');

  if (isLoading) return <ProjectViewSkeleton />;
  if (isError || !project) return <ErrorState message="Project not found." />;

  return (
    <div className="space-y-5">
      <div>
        <Link to="/" className="text-sm text-brand-700 hover:underline">← All projects</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{project.projectName}</h1>
          <Badge className={projectStatusBadge[project.status]}>{project.status}</Badge>
        </div>
        {project.description && <p className="mt-1 text-sm text-gray-500">{project.description}</p>}
        <div className="mt-2 flex gap-4 text-sm text-gray-600">
          <span><strong className="tabular-nums">{project.totalCases}</strong> cases</span>
          <span><strong className="tabular-nums">{project.passRate}%</strong> pass rate</span>
          <span className="text-gray-400">Owner: {project.ownerEmail}</span>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        <TabButton active={tab === 'tasks'} onClick={() => setTab('tasks')}>Tasks</TabButton>
        <TabButton active={tab === 'reports'} onClick={() => setTab('reports')}>Reports</TabButton>
      </div>

      {tab === 'tasks' ? (
        <TaskList projectId={projectId} />
      ) : (
        <Suspense fallback={<ReportSkeleton />}>
          <ReportDashboard projectId={projectId} />
        </Suspense>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
        active ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}
