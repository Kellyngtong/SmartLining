import { useEffect, useState, useMemo } from 'react';
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
        const avg = payload?.average ?? null;
        setServiceAvg(avg || null);
      } catch (e) {
        // ignore
      }
    };
    loadServiceAvg();
  }, [selectedQueue]);

  const handleCallNext = async () => {
    if (!selectedQueue) return;
    setLoading(true);
    try {
      const resp: any = await apiClient.callNext(selectedQueue);
      const ticket = resp?.data ?? resp;
      if (ticket) {
        setCalledTicket(ticket);
        // refresh pending
        const r = await apiClient.getTickets(1, 200, 'EN_ESPERA', selectedQueue);
        const payload: any = r?.data ?? r;
          const refreshed = payload?.data ?? payload ?? [];
          setPending(refreshed);
          setNextTicketId(refreshed.length > 0 ? refreshed[0].id_turno : null);
        // navigate to ticket confirmation view for operator if needed
        navigate('/ticket-confirmation', { state: { ticketId: ticket.id_turno || ticket.id } });
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
                <div className="current-meta">Cliente {calledTicket.id_cliente} · Cola {calledTicket.id_cola}</div>
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
                      navigate('/ticket-confirmation', { state: { ticketId: t.id_turno } });
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
