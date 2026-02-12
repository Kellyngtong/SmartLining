import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import '../styles/global.css';

interface CreateClientResponse {
  id_cliente: number;
  nombre?: string;
  email?: string;
}

export default function JoinQueuePage() {
  const { queueId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queueName, setQueueName] = useState<string>('');

  useEffect(() => {
    const joinQueue = async () => {
      try {
        if (!queueId) {
          throw new Error('Invalid queue ID');
        }

        const parsedQueueId = parseInt(queueId);

        // 1. Obtener información de la cola
        const queueResponse = await apiClient.getQueueById(parsedQueueId);
        if (!queueResponse.data) {
          throw new Error('Cola no encontrada');
        }
        const queue = queueResponse.data as any;
        setQueueName(queue.nombre);

        // 2. Crear cliente automáticamente
        const clientResponse = await apiClient.createCliente({
          nombre: `Cliente-${Date.now()}`,
        });

        if (!clientResponse.data) {
          throw new Error('Error al crear cliente');
        }

        const clienteId = (clientResponse.data as CreateClientResponse).id_cliente;

        // 3. Crear turno para el cliente
        const ticketResponse = await apiClient.createTicket({
          id_cola: parsedQueueId,
          id_cliente: clienteId,
          estado: 'PENDIENTE',
        });

        if (!ticketResponse.data) {
          throw new Error('Error al crear turno');
        }

        const ticketData = ticketResponse.data as any;
        const ticketId = ticketData.id_turno;

        // 4. Redirigir a confirmación con todos los datos
        setLoading(false);
        navigate('/ticket-confirmation', {
          state: {
            ticketId,
            queueId: parsedQueueId,
            queueName: queue.nombre,
            clientName: `Cliente`,
          },
        });
      } catch (err) {
        console.error('Error joining queue:', err);
        setError(err instanceof Error ? err.message : 'Error al unirse a la cola');
        setLoading(false);
      }
    };

    joinQueue();
  }, [queueId, navigate]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>📱 SmartLining</h1>
          <p style={styles.subtitle}>Registrándote en la cola...</p>
        </div>

        <div style={styles.content}>
          {loading ? (
            <>
              <div style={styles.spinner}></div>
              <p style={styles.message}>Procesando tu registro...</p>
              {queueName && <p style={styles.queueName}>{queueName}</p>}
            </>
          ) : error ? (
            <>
              <p style={styles.error}>❌ {error}</p>
              <button
                onClick={() => navigate('/')}
                style={styles.button}
              >
                ← Volver al inicio
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
    maxWidth: '500px',
    width: '100%',
    overflow: 'hidden',
  },
  header: {
    background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
    color: 'white',
    padding: '40px 30px',
    textAlign: 'center' as const,
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
  },
  subtitle: {
    fontSize: '16px',
    margin: 0,
    opacity: 0.9,
  },
  content: {
    padding: '40px 30px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '20px',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #007bff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  message: {
    fontSize: '16px',
    color: '#666',
    margin: 0,
    textAlign: 'center' as const,
  },
  queueName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#007bff',
    margin: 0,
  },
  error: {
    fontSize: '16px',
    color: '#d32f2f',
    margin: 0,
    textAlign: 'center' as const,
  },
  button: {
    padding: '12px 30px',
    fontSize: '14px',
    fontWeight: 'bold',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

// Agregar animación
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
