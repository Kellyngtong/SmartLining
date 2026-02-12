import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { useQueueStore } from '../store/queue.store';
import { apiClient } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';

interface Turno {
  id_turno: number;
  numero_turno: string;
  estado: string;
  fecha_creacion: string;
  id_cola: number;
}

export function QueueListPage() {
  const { user, logout } = useAuthStore();
  const { queues, fetchQueues, isLoading: queuesLoading } = useQueueStore();
  const [selectedQueueId, setSelectedQueueId] = useState<number | null>(null);
  const [turno, setTurno] = useState<Turno | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQueues();
  }, [fetchQueues]);

  const handleRegisterQueue = async (queueId: number) => {
    setLoading(true);
    setError(null);
    
    try {
      // Crear un turno en la cola
      const response = await apiClient.createTicket({
        id_cola: queueId,
        id_cliente: undefined,
        estado: 'PENDIENTE',
      });

      if (response.data) {
        setTurno(response.data as any);
        setSelectedQueueId(queueId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al registrarse en la cola';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div style={styles.container}>Acceso denegado</div>;
  }

  // Si ya tiene un turno, mostrar el QR
  if (turno) {
    const queueName = queues.find(q => q.id_cola === selectedQueueId)?.nombre || 'Cola';
    
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>SmartLining - Tu Turno</h1>
          <div style={styles.userInfo}>
            <span>{user.nombre}</span>
            <button onClick={logout} style={styles.logoutBtn}>
              Cerrar Sesión
            </button>
          </div>
        </header>

        <main style={styles.main}>
          <div style={styles.qrContainer}>
            <h2>¡Te has registrado exitosamente!</h2>
            <p style={styles.queueName}>Cola: <strong>{queueName}</strong></p>
            <p style={styles.ticketNumber}>Tu número de turno: <strong>{turno.numero_turno}</strong></p>
            
            <div style={styles.qrBox}>
              <QRCodeSVG 
                value={JSON.stringify({
                  id_turno: turno.id_turno,
                  numero_turno: turno.numero_turno,
                  cola: queueName,
                  fecha: new Date().toLocaleString('es-ES')
                })}
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>

            <p style={styles.qrInfo}>Presenta este QR en la oficina o espera tu turno</p>
            <p style={styles.estado}>Estado: <strong style={{ color: '#ff9800' }}>{turno.estado.toUpperCase()}</strong></p>
            
            <button 
              onClick={() => {
                setTurno(null);
                setSelectedQueueId(null);
              }}
              style={styles.backBtn}
            >
              ← Volver a Colas
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Mostrar lista de colas
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>SmartLining - Colas Disponibles</h1>
        <div style={styles.userInfo}>
          <span>{user.nombre}</span>
          <button onClick={logout} style={styles.logoutBtn}>
            Cerrar Sesión
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.section}>
          <h2>Elige una cola para registrarte</h2>

          {queuesLoading ? (
            <p>Cargando colas...</p>
          ) : error ? (
            <div style={styles.errorBox}>
              <p style={{ color: '#d32f2f' }}>Error: {error}</p>
            </div>
          ) : queues.length > 0 ? (
            <div style={styles.gridContainer}>
              {queues.map(queue => (
                <div key={queue.id_cola} style={styles.card}>
                  <h3>{queue.nombre}</h3>
                  <p>{queue.descripcion || 'Sin descripción'}</p>
                  <p style={styles.status}>
                    {queue.activa ? (
                      <span style={{ color: '#4caf50' }}>● Activa</span>
                    ) : (
                      <span style={{ color: '#d32f2f' }}>● Inactiva</span>
                    )}
                  </p>
                  
                  <button
                    onClick={() => handleRegisterQueue(queue.id_cola)}
                    disabled={!queue.activa || loading}
                    style={{
                      ...styles.registerBtn,
                      ...((!queue.activa || loading) ? styles.registerBtnDisabled : {})
                    }}
                  >
                    {loading ? 'Registrando...' : 'Obtener Turno'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p>No hay colas disponibles</p>
          )}
        </section>
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196f3',
    color: 'white',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '28px',
  },
  userInfo: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center',
  },
  logoutBtn: {
    backgroundColor: '#d32f2f',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  main: {
    padding: '40px 20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  section: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    marginTop: '20px',
  },
  card: {
    backgroundColor: '#fafafa',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
  } as React.CSSProperties,
  status: {
    fontSize: '14px',
    marginBottom: '15px',
  },
  registerBtn: {
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    width: '100%',
    fontWeight: 'bold',
  } as React.CSSProperties,
  registerBtnDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
  qrContainer: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    textAlign: 'center' as const,
  },
  queueName: {
    fontSize: '18px',
    color: '#666',
    marginBottom: '10px',
  },
  ticketNumber: {
    fontSize: '24px',
    color: '#2196f3',
    fontWeight: 'bold',
    marginBottom: '30px',
  },
  qrBox: {
    display: 'flex',
    justifyContent: 'center',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  qrInfo: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '15px',
  },
  estado: {
    fontSize: '16px',
    marginBottom: '30px',
  },
  backBtn: {
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  } as React.CSSProperties,
  errorBox: {
    backgroundColor: '#ffebee',
    border: '1px solid #ffcdd2',
    padding: '15px',
    borderRadius: '4px',
    marginTop: '20px',
  },
};
