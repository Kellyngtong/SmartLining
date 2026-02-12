import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import '../styles/global.css';

interface Queue {
  id_cola: number;
  nombre: string;
  descripcion?: string;
  activa: boolean;
}

export default function QueueRegistrationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queueId = (location.state as any)?.queueId;

  const [queue, setQueue] = useState<Queue | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<number | null>(null);

  useEffect(() => {
    if (!queueId) {
      setError('No se especificó una cola');
      setLoading(false);
      return;
    }

    // Cargar información de la cola
    fetchQueueInfo();
  }, [queueId]);

  const fetchQueueInfo = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getQueueById(parseInt(queueId));
      if (response.data) {
        setQueue(response.data as Queue);
      }
    } catch (err) {
      setError('No se encontró la cola especificada');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim()) {
      setError('El nombre es requerido');
      return;
    }

    try {
      setRegistering(true);
      setError(null);

      // Crear un cliente
      const clientResponse = await apiClient.createCliente({
        nombre: clientName,
        email: clientEmail || undefined,
      });

      if (!clientResponse.data) {
        throw new Error('Error al crear cliente');
      }

      const clienteId = (clientResponse.data as any).id_cliente;

      // Crear un turno para el cliente en esta cola
      const ticketResponse = await apiClient.createTicket({
        id_cola: parseInt(queueId),
        id_cliente: clienteId,
        estado: 'PENDIENTE',
      });

      if (ticketResponse.data) {
        const ticketData = ticketResponse.data as any;
        setTicketId(ticketData.id_turno);
        
        // Redirigir a página de confirmación
        setTimeout(() => {
          navigate('/ticket-confirmation', {
            state: {
              ticketId: ticketData.id_turno,
              queueId,
              queueName: queue?.nombre,
              clientName,
            },
          });
        }, 1500);
      }
    } catch (err) {
      setError((err instanceof Error ? err.message : 'Error al registrarse en la cola'));
      console.error(err);
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={{ textAlign: 'center' }}>⏳ Cargando información de la cola...</p>
        </div>
      </div>
    );
  }

  if (!queue) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.error}>
            <p>❌ {error || 'Cola no encontrada'}</p>
            <button onClick={() => navigate('/')} style={styles.button}>
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>📋 Registro en cola</h1>

        <div style={styles.queueInfo}>
          <h2 style={styles.queueName}>{queue.nombre}</h2>
          {queue.descripcion && (
            <p style={styles.queueDescription}>{queue.descripcion}</p>
          )}
          <p style={styles.queueStatus}>
            {queue.activa ? '🟢 Cola activa' : '🔴 Cola inactiva'}
          </p>
        </div>

        {ticketId ? (
          <div style={styles.success}>
            <p style={{ fontSize: '20px', marginBottom: '10px' }}>✅ ¡Registrado exitosamente!</p>
            <p>Tu número de turno es: <strong>{ticketId}</strong></p>
            <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
              Redirigiendo a tu ticket...
            </p>
          </div>
        ) : (
          <form onSubmit={handleRegister} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nombre *</label>
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="Tu nombre completo"
                style={styles.input}
                disabled={registering}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Email (opcional)</label>
              <input
                type="email"
                value={clientEmail}
                onChange={e => setClientEmail(e.target.value)}
                placeholder="tu@email.com"
                style={styles.input}
                disabled={registering}
              />
            </div>

            {error && (
              <div style={styles.errorBox}>
                <p>⚠️ {error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={registering}
              style={{
                ...styles.button,
                opacity: registering ? 0.6 : 1,
              }}
            >
              {registering ? '⏳ Registrando...' : '✅ Registrarse en la cola'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              disabled={registering}
              style={styles.secondaryButton}
            >
              Cancelar
            </button>
          </form>
        )}

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Tu información será guardada solo para este registro
          </p>
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
    padding: '40px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    maxWidth: '500px',
    width: '100%',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '30px',
    textAlign: 'center' as const,
    color: '#333',
  },
  queueInfo: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '30px',
    borderLeft: '4px solid #007bff',
  },
  queueName: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  },
  queueDescription: {
    color: '#666',
    fontSize: '14px',
    marginBottom: '10px',
  },
  queueStatus: {
    fontSize: '13px',
    color: '#666',
  },
  form: {
    marginBottom: '20px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 'bold',
    color: '#333',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
  },
  button: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '10px',
  },
  secondaryButton: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    backgroundColor: '#f0f0f0',
    color: '#333',
    border: '1px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '10px',
  },
  error: {
    backgroundColor: '#ffebee',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center' as const,
  },
  errorBox: {
    backgroundColor: '#fff3cd',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '15px',
    color: '#856404',
    fontSize: '14px',
  },
  success: {
    backgroundColor: '#e8f5e9',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center' as const,
    color: '#2e7d32',
  },
  footer: {
    marginTop: '30px',
    paddingTop: '20px',
    borderTop: '1px solid #eee',
  },
  footerText: {
    textAlign: 'center' as const,
    color: '#999',
    fontSize: '13px',
  },
};
