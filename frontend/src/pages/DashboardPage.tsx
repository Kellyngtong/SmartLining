import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { useQueueStore } from '../store/queue.store';
import ServiceTimeWidget from '../components/ServiceTimeWidget';
import { apiClient } from '../services/api';

/**
 * DashboardPage component - main admin dashboard showing queues and KPIs
 * This page is protected and only accessible to authenticated users. It displays a list of queues,
 * key performance indicators (KPIs) like total pending tickets and average service time, and allows
 * admins to select a queue to see more detailed stats and trends.
 */
export function DashboardPage() {
  const { user, logout } = useAuthStore();
  const { queues, fetchQueues, isLoading: queuesLoading } = useQueueStore();
  const [totalPending, setTotalPending] = useState<number | null>(null);
  const [avgServiceMin, setAvgServiceMin] = useState<number | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<any | null>(null);
  const [queueStats, setQueueStats] = useState<any | null>(null);
  const [trendPeriod, setTrendPeriod] = useState<number>(7);
  const [loadingQueueStats, setLoadingQueueStats] = useState<boolean>(false);

  const isToday = (d?: any) => {
    if (!d) return false;
    const value = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return false;
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  };

  const normalizeTrend = (payload: any) => {
    // Return an array of { label, value } for better tooltips
    const series = payload?.data?.series ?? payload?.series ?? payload?.data ?? payload ?? [];
    if (!Array.isArray(series)) return [];
    return series.map((item: any) => {
      const v = item.avgMinutes ?? item.value ?? item.y ?? null;
      const label = item.date ?? item.x ?? item.label ?? null;
      return { label: label ? String(label) : null, value: v == null ? 0 : Number(v) };
    });
  };

  const selectQueueAndLoad = async (q: any, period?: number) => {
    setSelectedQueue(q);
    setLoadingQueueStats(true);
    try {
      // tickets for queue
      const ticketsResp: any = await apiClient.getQueueTickets(q.id_cola, 1, 1000);
      const tickets = (ticketsResp?.data ?? ticketsResp) || [];

      // compute counts (try multiple possible field names)
      const items = Array.isArray(tickets?.data)
        ? tickets.data
        : Array.isArray(tickets)
          ? tickets
          : [];
      const today = items.filter((t: any) =>
        isToday(
          t.fecha_hora_creacion ??
            t.fecha_hora_creacion ??
            t.created_at ??
            t.createdAt ??
            t.fecha_creacion ??
            t.fecha
        )
      );
      const enteredToday = today.length;
      const attended = items.filter((t: any) => {
        const s = (t.estado ?? t.status ?? '').toString().toLowerCase();
        return s.includes('atend') || s.includes('served') || s.includes('finaliz');
      }).length;
      const waiting = items.filter((t: any) => {
        const s = (t.estado ?? t.status ?? '').toString().toLowerCase();
        return s.includes('esper') || s.includes('wait');
      }).length;

      // service time trend
      const usedPeriod = period ?? trendPeriod;
      const stResp: any = await apiClient.getServiceTimeTrend(q.id_cola, usedPeriod);
      const stPayload = stResp?.data ?? stResp ?? {};
      const trend = normalizeTrend(stPayload);
      // compute estimated average from series if provided
      const rawSeries = stPayload?.series ?? stPayload?.data ?? [];
      const vals = Array.isArray(rawSeries)
        ? rawSeries.map((s: any) => s.avgMinutes).filter((v: any) => v != null)
        : [];
      const estimated =
        vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null;

      setQueueStats({ enteredToday, attended, waiting, trend, estimated });
      console.log('Loaded queue stats', {
        queueId: q.id_cola,
        enteredToday,
        attended,
        waiting,
        estimated,
        trend,
      });
    } catch (e) {
      setQueueStats(null);
    } finally {
      setLoadingQueueStats(false);
    }
  };

  useEffect(() => {
    fetchQueues();
  }, [fetchQueues]);

  // Load KPIs
  useEffect(() => {
    let mounted = true;
    const loadKpis = async () => {
      try {
        // total pending across all queues
        const resp: any = await apiClient.getTickets(1, 1000, 'EN_ESPERA');
        const pendingList = (resp?.data ?? resp) as any;
        const items = pendingList?.data ?? pendingList ?? [];
        if (mounted) setTotalPending(items.length);

        // avg service time for first queue (fallback)
        const qId = queues && queues.length > 0 ? queues[0].id_cola : undefined;
        if (qId) {
          const st: any = await apiClient.getServiceTimeTrend(qId, 30);
          const payload: any = st?.data ?? st;
          // compute average from returned series if API doesn't provide `average`
          const series = payload?.series ?? payload?.data?.series ?? [];
          const vals = Array.isArray(series)
            ? series.map((s: any) => s.avgMinutes).filter((v: any) => v != null)
            : [];
          const avg =
            vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null;
          if (mounted) setAvgServiceMin(avg ?? null);
        } else {
          if (mounted) setAvgServiceMin(null);
        }
      } catch (e) {
        // ignore failures but keep UI usable
      }
    };
    loadKpis();
  }, [queues]);

  // Auto-select first queue when queues load
  useEffect(() => {
    if (!selectedQueue && queues && queues.length > 0) {
      selectQueueAndLoad(queues[0]);
    }
  }, [queues]);

  if (!user) {
    return <div>Acceso denegado</div>;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <img
          src="/assets/logo.jpg"
          alt="Logo"
          style={{ width: 54, height: 54, marginRight: 12, borderRadius: 14 }}
        />
        <h1 style={styles.title}>Admin Dashboard</h1>
        <div style={styles.userInfo}>
          <span>{user.nombre}</span>
          <button onClick={() => (window.location.href = '/admin/qr')} style={styles.secondaryBtn}>
            Generador QR
          </button>
          <button onClick={logout} style={styles.logoutBtn}>
            Cerrar Sesión
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <section style={{ ...styles.section, paddingBottom: 24 }}>
          <h2>Resumen</h2>
          <div style={styles.kpiRow}>
            <div style={styles.kpiCard}>
              <div style={styles.kpiLabel}>Colas activas</div>
              <div style={styles.kpiValue}>{queues?.length ?? '—'}</div>
            </div>

            <div style={styles.kpiCard}>
              <div style={styles.kpiLabel}>Turnos en espera</div>
              <div style={styles.kpiValue}>{totalPending ?? '—'}</div>
            </div>

            <div style={styles.kpiCard}>
              <div style={styles.kpiLabel}>Tiempo medio (min)</div>
              <div style={styles.kpiValue}>
                {avgServiceMin ? Number(avgServiceMin).toFixed(1) : '—'}
              </div>
            </div>
          </div>

          <h3 style={{ marginTop: 18 }}>Colas Disponibles</h3>

          {queuesLoading ? (
            <p>Cargando colas...</p>
          ) : queues.length > 0 ? (
            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 16, marginTop: 12 }}
            >
              <div style={styles.gridContainer}>
                {queues.map((queue: any) => {
                  const selected = selectedQueue?.id_cola === queue.id_cola;
                  return (
                    <div
                      key={queue.id_cola}
                      onClick={() => selectQueueAndLoad(queue)}
                      role="button"
                      style={{
                        ...styles.card,
                        cursor: 'pointer',
                        border: selected ? `2px solid var(--sl-yellow)` : styles.card.border,
                        boxShadow: selected ? '0 6px 20px rgba(255,215,0,0.12)' : undefined,
                        transform: selected ? 'translateY(-2px)' : undefined,
                      }}
                    >
                      <h3 style={{ color: selected ? 'var(--sl-black)' : 'inherit' }}>
                        {queue.nombre}
                      </h3>
                      <p>{queue.descripcion || 'Sin descripción'}</p>
                      <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        Estado: {queue.activa ? 'Activa' : 'Inactiva'}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div style={{ padding: 12 }}>
                {selectedQueue ? (
                  <div
                    style={{
                      background: 'var(--color-bg)',
                      padding: 12,
                      borderRadius: 8,
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <h3 style={{ marginTop: 0 }}>{selectedQueue.nombre}</h3>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                      <div
                        style={{
                          flex: 1,
                          padding: 12,
                          background: 'white',
                          borderRadius: 8,
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          Estimado espera (min)
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700 }}>
                          {queueStats?.estimated ? Number(queueStats.estimated).toFixed(1) : '—'}
                        </div>
                      </div>
                      <div
                        style={{
                          flex: 1,
                          padding: 12,
                          background: 'white',
                          borderRadius: 8,
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          Entradas hoy (QR)
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700 }}>
                          {queueStats?.enteredToday ?? '—'}
                        </div>
                      </div>
                      <div
                        style={{
                          flex: 1,
                          padding: 12,
                          background: 'white',
                          borderRadius: 8,
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          Atendidos
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700 }}>
                          {queueStats?.attended ?? '—'}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
                        height: '3rem',
                      }}
                    >
                      <div style={{ color: 'var(--color-text-secondary)' }}>
                        Últimos {trendPeriod} días
                      </div>
                      <div>
                        <button
                          className="btn-secondary"
                          onClick={() => {
                            if (trendPeriod === 7) return;
                            setTrendPeriod(7);
                            if (selectedQueue) selectQueueAndLoad(selectedQueue, 7);
                          }}
                          style={{
                            marginRight: 8,
                            border: trendPeriod === 7 ? '2px solid var(--sl-yellow)' : undefined,
                          }}
                        >
                          7d
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => {
                            if (trendPeriod === 30) return;
                            setTrendPeriod(30);
                            if (selectedQueue) selectQueueAndLoad(selectedQueue, 30);
                          }}
                          style={{
                            border: trendPeriod === 30 ? '2px solid var(--sl-yellow)' : undefined,
                          }}
                        >
                          30d
                        </button>
                      </div>
                    </div>

                    <div style={{ height: 120, background: 'white', padding: 8, borderRadius: 8 }}>
                      {loadingQueueStats ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                          }}
                          className="spinner"
                        />
                      ) : (
                        <TrendChart data={queueStats?.trend ?? []} />
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: 12, color: 'var(--color-text-secondary)' }}>
                    Selecciona una cola para ver KPIs
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p>No hay colas disponibles</p>
          )}

          <div style={{ marginTop: 18 }}>
            <ServiceTimeWidget colaId={queues.length > 0 ? queues[0].id_cola : 1} days={14} />
          </div>
        </section>
      </main>
    </div>
  );
}

function TrendChart({ data }: { data: { label: string | null; value: number }[] }) {
  if (!data || data.length === 0) {
    return <div style={{ color: 'var(--color-text-secondary)', padding: 12 }}>No hay datos</div>;
  }
  const w = Math.max(200, data.length * 12);
  const h = 80;
  const max = Math.max(...data.map(d => d.value));
  if (!max || max <= 0) {
    return <div style={{ color: 'var(--color-text-secondary)', padding: 12 }}>No hay datos</div>;
  }
  const barWidth = Math.max(6, Math.floor(w / data.length) - 4);

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [svgWidth, setSvgWidth] = useState<number | null>(null);

  const maxLeft = svgWidth ? Math.max(svgWidth - 140, 8) : undefined;
  const leftPx = tooltipPos
    ? typeof maxLeft === 'number'
      ? Math.min(tooltipPos.x + 8, maxLeft)
      : tooltipPos.x + 8
    : 0;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%' }}
      >
        {data.map((d, i) => {
          const v = d.value;
          const barH = (v / max) * (h - 10);
          const x = i * (barWidth + 4) + 6;
          const y = h - barH;
          const fill = i === data.length - 1 ? 'var(--sl-yellow)' : 'rgba(26,26,26,0.12)';
          return (
            <g
              key={i}
              onMouseEnter={(e: any) => {
                const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
                setSvgWidth(rect.width);
                setHoverIndex(i);
                setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              }}
              onMouseMove={(e: any) => {
                const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
                // keep svgWidth updated in case of resize
                setSvgWidth(rect.width);
                setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              }}
              onMouseLeave={() => {
                setHoverIndex(null);
                setTooltipPos(null);
              }}
            >
              <rect x={x} y={y} width={barWidth} height={barH} rx={3} fill={fill} />
            </g>
          );
        })}
      </svg>

      {hoverIndex !== null && tooltipPos && (
        <div
          style={{
            position: 'absolute',
            left: `${leftPx}px`,
            top: `${Math.max(tooltipPos.y - 28, 4)}px`,
            pointerEvents: 'none',
            background: 'rgba(0,0,0,0.85)',
            color: 'white',
            padding: '6px 8px',
            borderRadius: 6,
            fontSize: 12,
            whiteSpace: 'nowrap',
            zIndex: 20,
            maxWidth: 140,
          }}
        >
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>
            {data[hoverIndex].label ?? `#${hoverIndex + 1}`}
          </div>
          <div style={{ fontWeight: 700 }}>{String(data[hoverIndex].value)}</div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'var(--sl-black)',
    color: 'white',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    alignSelf: 'flex-start',
  },
  userInfo: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  logoutBtn: {
    padding: '8px 16px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  secondaryBtn: {
    padding: '8px 16px',
    backgroundColor: 'rgba(255,255,255,0.12)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  main: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  kpiRow: {
    display: 'flex',
    gap: 12,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  kpiCard: {
    minWidth: 180,
    flex: '1 1 180px',
    background: 'linear-gradient(90deg, rgba(255,179,0,0.04), rgba(250,250,250,0.6))',
    border: '1px solid rgba(255,179,0,0.08)',
    padding: 14,
    borderRadius: 8,
    boxShadow: 'var(--shadow-soft)',
    backgroundColor: 'var(--color-bg)',
  },
  kpiLabel: { fontSize: 13, color: 'var(--color-text-secondary)' },
  kpiValue: { fontSize: 28, fontWeight: 800, color: 'var(--sl-yellow)' },
  section: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '16px',
    marginTop: '16px',
  },
  card: {
    padding: '16px',
    backgroundColor: '#f9f9f9',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
};
