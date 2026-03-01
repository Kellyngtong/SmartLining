import { useEffect, useState, useMemo, useRef } from 'react';
import { apiClient } from '../services/api';
import { useNavigate } from 'react-router-dom';
import '../styles/employee.css';

export default function OperatorPage() {
  const [queues, setQueues] = useState<any[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<number | null>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [calledTicket, setCalledTicket] = useState<any | null>(null);
  const [nextTicketId, setNextTicketId] = useState<number | null>(null);
  const [serviceAvg, setServiceAvg] = useState<number | null>(null);
  const navigate = useNavigate();
  const [animateCalled, setAnimateCalled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const loadQueues = async () => {
      try {
        const resp = await apiClient.getActiveQueues(1, 100);
        const payload: any = resp?.data ?? resp;
        const items = payload?.data ?? payload ?? [];
        setQueues(items);
        if (items.length > 0 && !selectedQueue) setSelectedQueue(items[0].id_cola);
      } catch (e) {
        console.error('Failed loading queues', e);
      }
    };
    loadQueues();
  }, []);

  // Poll pending tickets
  useEffect(() => {
    if (!selectedQueue) return;
    let mounted = true;

    const loadPending = async () => {
      try {
        setLoading(true);
        const resp = await apiClient.getTickets(1, 200, 'EN_ESPERA', selectedQueue);
        const payload: any = resp?.data ?? resp;
        const items = payload?.data ?? payload ?? [];
        if (mounted) {
          setPending(items);
          setNextTicketId(items.length > 0 ? items[0].id_turno : null);
        }
      } catch (e) {
        console.error('Error loading tickets', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadPending();
    const id = setInterval(loadPending, 3000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [selectedQueue]);

  useEffect(() => {
    if (!selectedQueue) return;
    const loadServiceAvg = async () => {
      try {
        const resp = await apiClient.getServiceTimeTrend(selectedQueue, 30);
        const payload: any = resp?.data ?? resp;
        // Backend returns { data: { series: [{date, avgMinutes}] } }
        // Try multiple shapes for compatibility
        let avg: number | null = null;
        if (typeof payload?.average === 'number') {
          avg = payload.average;
        } else {
          const series = payload?.series ?? payload?.data?.series ?? [];
          const nums = series
            .filter((s: any) => s && typeof s.avgMinutes === 'number')
            .map((s: any) => s.avgMinutes as number);
          if (nums.length > 0) {
            const sum = nums.reduce((a: number, b: number) => a + b, 0);
            avg = Math.round((sum / nums.length) * 10) / 10;
          }
        }
        setServiceAvg(avg || null);
      } catch (e) {
        // ignore
      }
    };
    loadServiceAvg();
  }, [selectedQueue]);

  // Play butcher-style beep sequence and animate when a ticket is called
  useEffect(() => {
    if (!calledTicket) return;

    setAnimateCalled(true);

    const playSequence = async (count = 3) => {
      try {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        const ctx: AudioContext = new AudioCtx();
        audioCtxRef.current = ctx;

        const playBeep = (freq: number, dur = 120) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'square';
          o.frequency.value = freq;
          g.gain.value = 0.0008;
          o.connect(g);
          g.connect(ctx.destination);
          const now = ctx.currentTime;
          o.start(now);
          g.gain.setValueAtTime(g.gain.value, now);
          g.gain.exponentialRampToValueAtTime(0.0001, now + dur / 1000);
          o.stop(now + dur / 1000 + 0.02);
        };

        for (let i = 0; i < count; i++) {
          setTimeout(() => playBeep(1200 - i * 150, 120), i * 240);
        }

        // close context after last beep
        setTimeout(
          () => {
            try {
              ctx.close();
              audioCtxRef.current = null;
            } catch (e) {
              // ignore
            }
          },
          count * 240 + 300
        );
      } catch (e) {
        // fallback: try using Audio element (not provided)
        console.warn('AudioContext not available', e);
      }
    };

    playSequence(3);

    const t = setTimeout(() => setAnimateCalled(false), 1400);
    return () => clearTimeout(t);
  }, [calledTicket]);

  const handleCallNext = async () => {
    if (!selectedQueue) return;
    setLoading(true);
    try {
      const resp: any = await apiClient.callNext(selectedQueue);
      // backend may return { data: { turno, totals } } or just the turno
      const payload = resp?.data ?? resp;
      const ticket = payload?.turno ?? payload;
      if (ticket) {
        setCalledTicket(ticket);
        // refresh pending
        const r = await apiClient.getTickets(1, 200, 'EN_ESPERA', selectedQueue);
        const payload: any = r?.data ?? r;
        const refreshed = payload?.data ?? payload ?? [];
        setPending(refreshed);
        setNextTicketId(refreshed.length > 0 ? refreshed[0].id_turno : null);
      } else {
        alert('No hay turnos en espera');
      }
    } catch (e) {
      console.error('callNext error', e);
      alert('Error al llamar siguiente');
    } finally {
      setLoading(false);
    }
  };

  const totalPending = useMemo(() => pending.length, [pending]);

  return (
    <div className="employee-root">
      <header className="employee-header">
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ color: 'var(--sl-gold)', fontWeight: 800 }}>
            SmartLining — Panel Empleado
          </div>
          <div style={{ color: '#fff' }}>Operador</div>
        </div>
      </header>

      <div className="employee-container">
        <aside className="employee-card">
          <div style={{ marginBottom: 8 }}>
            <label className="muted">Seleccionar cola</label>
            <select
              className="queue-select"
              value={selectedQueue ?? ''}
              onChange={e => setSelectedQueue(Number(e.target.value) || null)}
            >
              {queues.map(q => (
                <option key={q.id_cola} value={q.id_cola}>
                  {q.nombre}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <div className="kpi">
              Pendientes <span>{totalPending}</span>
            </div>
            <div className="employee-card">
              <div style={{ fontSize: 12, color: '#666' }}>Tiempo medio (min)</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>
                {serviceAvg ? serviceAvg.toFixed(1) : '—'}
              </div>
            </div>
            <div className="employee-card">
              <div style={{ fontSize: 12, color: '#666' }}>Última llamada</div>
              <div style={{ fontSize: 16 }}>
                {calledTicket ? `#${calledTicket.numero_turno}` : '—'}
              </div>
            </div>
          </div>
        </aside>

        <main className="employee-card">
          {/* Current ticket highlighted */}
          {calledTicket && (
            <div className="current-ticket">
              <div className="current-ticket-inner">
                <div className="current-label">TURNO ACTUAL</div>
                <div className="current-number">#{calledTicket.numero_turno}</div>
                <div className="current-meta">
                  Cliente {calledTicket.id_cliente} · Cola {calledTicket.id_cola}
                </div>
              </div>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <h3 style={{ margin: 0 }}>Turnos en espera</h3>
            <button
              className="call-next-btn"
              onClick={handleCallNext}
              disabled={!selectedQueue || loading}
            >
              {loading ? 'Procesando...' : 'LLAMAR SIGUIENTE'}
            </button>
          </div>

          <div className="ticket-list">
            {pending.length === 0 && <p className="muted">No hay turnos en espera</p>}
            {pending.map((t: any, idx: number) => (
              <div
                key={t.id_turno}
                className={`ticket-item ${calledTicket?.id_turno === t.id_turno ? 'called' : ''} ${
                  idx === 0 ? 'next' : ''
                }`}
              >
                <div>
                  <div className="ticket-number">#{t.numero_turno}</div>
                  <div className="ticket-meta">
                    Cliente {t.id_cliente} · {new Date(t.fecha_hora_creacion).toLocaleTimeString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => {
                      try {
                        const base =
                          (import.meta as any).env.VITE_APP_URL || window.location.origin;
                        const cleanBase = String(base).replace(/\/$/, '');
                        window.location.href = `${cleanBase}/ticket-confirmation?ticketId=${t.id_turno}`;
                      } catch (e) {
                        navigate('/ticket-confirmation', { state: { ticketId: t.id_turno } });
                      }
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--sl-amber)',
                      cursor: 'pointer',
                    }}
                  >
                    Ver
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>

        <section className="employee-card">
          <div className="detail-title">Detalle del turno</div>
          {calledTicket ? (
            <div style={{ marginTop: 12 }}>
              <p>
                <strong>Turno:</strong> #{calledTicket.numero_turno}
              </p>
              <p>
                <strong>Cliente:</strong> {calledTicket.id_cliente}
              </p>
              <p>
                <strong>Cola:</strong> {calledTicket.id_cola}
              </p>
              <p>
                <strong>Estado:</strong> {calledTicket.estado}
              </p>
            </div>
          ) : (
            <p className="muted">Llama a un turno para ver detalles aquí</p>
          )}
        </section>
      </div>
    </div>
  );
}
