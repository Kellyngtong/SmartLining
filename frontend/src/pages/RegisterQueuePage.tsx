import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';

export default function RegisterQueuePage() {
  const { queueId } = useParams();
  const navigate = useNavigate();
  const [queueName, setQueueName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!queueId) return;
      try {
        const resp = await apiClient.getQueueById(Number(queueId));
        const q: any = resp.data;
        setQueueName(q?.nombre || `Cola ${queueId}`);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [queueId]);

  const handleRegister = async () => {
    if (!queueId) return;
    setLoading(true);
    try {
      const generatedClientName = `Cliente-${Date.now()}`;
      const clientResp = await apiClient.createCliente({ nombre: generatedClientName });
      const clienteId = (clientResp.data as any).id_cliente;

      const ticketResp = await apiClient.createTicket({
        id_cola: Number(queueId),
        id_cliente: clienteId,
      });
      // After creation the server sets an HttpOnly cookie `turno_id`.
      // Request `/turnos/me` to retrieve the ticket details using that cookie.
      let ticketData: any = ticketResp.data;
      try {
        const meResp: any = await apiClient.getMyTicket();
        if (meResp?.data) {
          ticketData = meResp.data.turno ?? meResp.data;
        }
      } catch (e) {
        // If /me fails, we still proceed with returned createTicket data
        console.warn('Could not fetch /turnos/me after create, proceeding with create response', e);
      }

      // Send a lightweight evento to track registration (tipo EVENTO)
      try {
        const now = new Date().toISOString();
        await apiClient.createEvento(
          'EVENTO',
          `Registro cliente ${clienteId}`,
          `Registro en cola ${queueId}`,
          now,
          now
        );
      } catch (e) {
        // don't block user if analytics fails
        console.warn('Analytics event failed', e);
      }

      const stored = {
        ticketId: ticketData.id_turno || ticketData.id,
        queueId: Number(queueId),
        queueName,
        clientName: generatedClientName,
      };
      try {
        localStorage.setItem('smartlining_ticket', JSON.stringify(stored));
      } catch (e) {
        // ignore
      }

      navigate('/ticket-confirmation', { state: stored });
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Error registrando en la cola');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          maxWidth: 640,
          margin: '40px auto',
          background: 'white',
          padding: 24,
          borderRadius: 8,
        }}
      >
        <h2>Regístrate en la cola: {queueName}</h2>
        <p>Escanea el QR o pulsa el botón para registrarte y obtener tu turno.</p>

        <div style={{ marginTop: 16 }}>
          <button
            onClick={handleRegister}
            disabled={loading}
            style={{ padding: '10px 14px', borderRadius: 6 }}
          >
            {loading ? 'Registrando...' : 'Registrarme y ver mi turno'}
          </button>
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    </div>
  );
}
