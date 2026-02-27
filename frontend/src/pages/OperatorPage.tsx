import { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function OperatorPage() {
  const [queues, setQueues] = useState<any[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<number | null>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const resp = await apiClient.getActiveQueues(1, 50);
      const payload: any = resp?.data;
      // payload may be a paginated object { data: [...] } or an array directly
      const items = payload?.data ?? payload ?? [];
      setQueues(items);
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedQueue) return;
    let cancelled = false;
    const loadPending = async () => {
      setLoading(true);
      try {
        const resp = await apiClient.getTickets(1, 100, 'EN_ESPERA', selectedQueue);
        if (!cancelled) {
          const payload: any = resp?.data;
          const items = payload?.data ?? payload ?? [];
          setPending(items);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPending();
    const id = setInterval(loadPending, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [selectedQueue]);

  const handleCallNext = async () => {
    if (!selectedQueue) return;
    setLoading(true);
    try {
      const resp = await apiClient.callNext(selectedQueue);
      if (resp && resp.data) {
        // refresh pending list
        const refresh = await apiClient.getTickets(1, 100, 'EN_ESPERA', selectedQueue);
        const refreshed: any = refresh?.data;
        setPending(refreshed?.data ?? refreshed ?? []);
        // navigate to display called ticket detail (defensive any casts)
        const ticket: any = resp.data;
        navigate('/ticket-confirmation', {
          state: {
            ticketId: ticket.id_turno || ticket.id,
            queueId: ticket.id_cola,
            queueName: ticket.nombre || ticket.id_cola,
            clientName: ticket.id_cliente,
          },
        });
      }
    } catch (e) {
      console.error('Call next failed', e);
      alert('No pending tickets or error calling next');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Operator Console</h2>
      <div style={{ marginBottom: 12 }}>
        <label>Cola: </label>
        <select value={selectedQueue ?? ''} onChange={(e) => setSelectedQueue(Number(e.target.value) || null)}>
          <option value="">-- Select queue --</option>
          {queues.map((q) => (
            <option key={q.id_cola} value={q.id_cola}>
              {q.nombre}
            </option>
          ))}
        </select>
        <button onClick={handleCallNext} disabled={!selectedQueue || loading} style={{ marginLeft: 12 }}>
          {loading ? 'Processing...' : 'Call Next'}
        </button>
      </div>

      <section>
        <h3>Pending ({pending.length})</h3>
        {loading && <p>Loading...</p>}
        {pending.length === 0 && <p>No pending tickets</p>}
        <ul>
          {pending.map((t: any) => (
            <li key={t.id_turno}>
              #{t.numero_turno} — Cliente {t.id_cliente} — {new Date(t.fecha_hora_creacion).toLocaleTimeString()}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
