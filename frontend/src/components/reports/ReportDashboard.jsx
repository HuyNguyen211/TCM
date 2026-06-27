import { useReport } from '../../hooks/useReports.js';
import { execStatusBadge } from '../../lib/constants.js';
import Badge from '../common/Badge.jsx';
import { ErrorState } from '../common/States.jsx';
import { ReportSkeleton } from '../common/Skeleton.jsx';
import PassRateTrend from './PassRateTrend.jsx';

function Kpi({ label, value, suffix = '', tone = 'text-gray-900' }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone}`}>{value}{suffix}</p>
    </div>
  );
}

/** Simple CSS bar so statusPie is meaningful before Chart.js (Phase 3) lands. */
function StatusBars({ pie }) {
  const total = pie.reduce((s, x) => s + x.count, 0) || 1;
  return (
    <div className="space-y-2">
      {pie.map((x) => (
        <div key={x.status} className="flex items-center gap-2 text-sm">
          <span className="w-20 shrink-0"><Badge className={execStatusBadge[x.status]}>{x.status}</Badge></span>
          <div className="h-3 flex-1 overflow-hidden rounded bg-gray-100">
            <div className="h-full bg-brand-500" style={{ width: `${(x.count / total) * 100}%` }} />
          </div>
          <span className="w-8 text-right tabular-nums text-gray-600">{x.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function ReportDashboard({ projectId }) {
  const { data, isLoading, isError } = useReport(projectId, { groupBy: 'module' });

  if (isLoading) return <ReportSkeleton />;
  if (isError) return <ErrorState message="Failed to load reports." />;
  if (!data) return null;

  const { metrics, chartData } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Kpi label="Total cases" value={metrics.totalCases} />
        <Kpi label="Executed" value={metrics.executed} />
        <Kpi label="Pending" value={metrics.pending} />
        <Kpi label="Pass rate" value={metrics.passRate} suffix="%" tone="text-green-600" />
        <Kpi label="Fail rate" value={metrics.failRate} suffix="%" tone="text-red-600" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Latest status breakdown</h3>
          <StatusBars pie={chartData.statusPie} />
        </div>

        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">By module</h3>
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-500">
              <tr><th className="py-1">Module</th><th className="py-1 text-right">Cases</th><th className="py-1 text-right">Pass %</th></tr>
            </thead>
            <tbody>
              {chartData.byGroup.map((g) => (
                <tr key={g.key} className="border-t border-gray-100">
                  <td className="py-1.5">{g.key}</td>
                  <td className="py-1.5 text-right tabular-nums">{g.totalCases}</td>
                  <td className="py-1.5 text-right tabular-nums">{g.passRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PassRateTrend points={chartData.passTrend} projectId={projectId} />
    </div>
  );
}
