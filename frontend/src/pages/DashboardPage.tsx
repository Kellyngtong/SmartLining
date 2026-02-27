import { useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';
import { useQueueStore } from '../store/queue.store';
import ServiceTimeWidget from '../components/ServiceTimeWidget';

export function DashboardPage() {
  const { user, logout } = useAuthStore();
  const { queues, fetchQueues, isLoading: queuesLoading } = useQueueStore();

  useEffect(() => {
    fetchQueues();
  }, [fetchQueues]);

  if (!user) {
    return <div>Acceso denegado</div>;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>SmartLining Dashboard</h1>
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
        <section style={styles.section}>
          <h2>Colas Disponibles</h2>

          {queuesLoading ? (
            <p>Cargando colas...</p>
          ) : queues.length > 0 ? (
            <div style={styles.gridContainer}>
              {queues.map(queue => (
                <div key={queue.id_cola} style={styles.card}>
                  <h3>{queue.nombre}</h3>
                  <p>{queue.descripcion || 'Sin descripción'}</p>
                  <p style={{ fontSize: '12px', color: '#666' }}>
                    Estado: {queue.activa ? 'Activa' : 'Inactiva'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p>No hay colas disponibles</p>
          )}
        </section>

        <section style={{ ...styles.section, display: 'flex', gap: 16 }}>
          <ServiceTimeWidget colaId={queues.length > 0 ? queues[0].id_cola : 1} days={14} />
        </section>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '24px',
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
