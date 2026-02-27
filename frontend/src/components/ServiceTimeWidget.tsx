import { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function ServiceTimeWidget({ colaId = 1, days = 14 }: { colaId?: number; days?: number }) {
  const [series, setSeries] = useState<Array<{ date: string; avgMinutes: number | null }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const resp = await apiClient.getServiceTimeTrend(colaId, days);
        // resp.data typing can be generic; cast to any for runtime check
        const payload: any = resp?.data;
        if (!cancelled && payload && payload.series) {
          setSeries(payload.series);
        }
      } catch (e) {
        console.error('Failed to load service time trend', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [colaId, days]);

  const labels = series.map((s) => s.date);
  const data = {
    labels,
    datasets: [
      {
        label: 'Avg. Service Time (min)',
        data: series.map((s) => (s.avgMinutes === null ? null : s.avgMinutes)),
        fill: false,
        borderColor: '#007bff',
        backgroundColor: '#007bff',
        tension: 0.2,
        spanGaps: true,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      x: { display: true, ticks: { maxTicksLimit: 7 } },
      y: { display: true },
    },
  };

  return (
    <div style={{ background: 'white', padding: 12, borderRadius: 8, border: '1px solid #eee', maxWidth: 640 }}>
      <h4 style={{ margin: '0 0 8px 0' }}>Avg. Service Time (min) — last {days} days</h4>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div style={{ height: 200 }}>
          <Line options={options} data={data} />
        </div>
      )}
    </div>
  );
}
