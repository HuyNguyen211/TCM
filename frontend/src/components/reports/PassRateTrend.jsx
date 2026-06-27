import { useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { EmptyState } from '../common/States.jsx';
import { downloadCsv, exportChartPdf } from '../../lib/exporters.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const BRAND = '#4f46e5'; // brand-600
const BRAND_FILL = 'rgba(99, 102, 241, 0.12)'; // brand-500 @ 12%

const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (ctx) => `Pass rate: ${ctx.parsed.y}%` } },
  },
  scales: {
    y: {
      min: 0,
      max: 100,
      ticks: { stepSize: 25, callback: (v) => `${v}%` },
      grid: { color: 'rgba(0,0,0,0.05)' },
    },
    x: {
      grid: { display: false },
      ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
    },
  },
};

/**
 * Pass-rate trend line chart with CSV / PDF export.
 * @param {{points: {date: string, rate: number}[], projectId: string}} props
 */
export default function PassRateTrend({ points = [], projectId }) {
  const chartRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const hasData = points.length > 0;

  const data = {
    labels: points.map((p) => p.date),
    datasets: [
      {
        label: 'Pass rate',
        data: points.map((p) => p.rate),
        borderColor: BRAND,
        backgroundColor: BRAND_FILL,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: BRAND,
      },
    ],
  };

  const fileStamp = new Date().toISOString().slice(0, 10);
  const baseName = `pass-rate-trend-${projectId}-${fileStamp}`;

  function handleExportCsv() {
    downloadCsv(
      `${baseName}.csv`,
      ['Date', 'Pass rate (%)'],
      points.map((p) => [p.date, p.rate])
    );
  }

  async function handleExportPdf() {
    const chart = chartRef.current;
    setExporting(true);
    try {
      const imageDataUrl = chart ? chart.toBase64Image('image/png', 1) : null;
      const imageAspect = chart && chart.width ? chart.height / chart.width : 0.4;
      const range = `${points[0].date} → ${points[points.length - 1].date}`;
      await exportChartPdf({
        filename: `${baseName}.pdf`,
        title: 'Pass-rate trend',
        subtitle: `Project ${projectId} · ${range} · generated ${fileStamp}`,
        imageDataUrl,
        imageAspect,
        columns: ['Date', 'Pass rate (%)'],
        rows: points.map((p) => [p.date, `${p.rate}%`]),
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Pass-rate trend</h3>
        <span className="text-xs text-gray-400">{points.length} day(s)</span>
      </div>

      {hasData ? (
        <>
          <div className="mt-3 h-64">
            <Line ref={chartRef} data={data} options={CHART_OPTIONS} />
          </div>
          <div className="mt-4 flex gap-2">
            <button className="btn-secondary" onClick={handleExportCsv}>
              Export CSV
            </button>
            <button className="btn-secondary" onClick={handleExportPdf} disabled={exporting}>
              {exporting ? 'Exporting…' : 'Export PDF'}
            </button>
          </div>
        </>
      ) : (
        <div className="mt-3">
          <EmptyState
            title="No executions yet"
            hint="The pass-rate trend appears once test cases have been executed."
          />
        </div>
      )}
    </div>
  );
}
