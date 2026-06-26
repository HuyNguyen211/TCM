import { useProjects } from '../hooks/useProjects.js';
import ProjectList from '../components/projects/ProjectList.jsx';

function Kpi({ label, value, suffix = '' }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}{suffix}</p>
    </div>
  );
}

export default function Dashboard() {
  // Pull a wide page to compute global KPIs across all projects.
  const { data } = useProjects({ skip: 0, limit: 200 });
  const projects = data?.projects || [];

  const totalCases = projects.reduce((s, p) => s + (p.totalCases || 0), 0);
  const active = projects.filter((p) => p.status === 'active').length;
  const withCases = projects.filter((p) => p.totalCases > 0);
  const avgPass = withCases.length
    ? Math.round((withCases.reduce((s, p) => s + p.passRate, 0) / withCases.length) * 10) / 10
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-gray-500">Overview of all projects and test coverage.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Projects" value={projects.length} />
        <Kpi label="Active" value={active} />
        <Kpi label="Total cases" value={totalCases} />
        <Kpi label="Avg pass rate" value={avgPass} suffix="%" />
      </div>

      <ProjectList />
    </div>
  );
}
