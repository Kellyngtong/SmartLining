import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useRef, useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import '../styles/global.css';

interface QueueInfo {
  queue: {
    id_cola: number;
    nombre: string;
    descripcion: string;
    activa: boolean;
  };
  stats: {
    totalEnEspera: number;
    totalEnAtencion: number;
    turnoActual: { id_turno: number; numero: string } | null;
  };
  userInfo: {
    turnoId: number;
    numeroDeTurno: string;
    clienteNombre: string;
    estado: string;
    miPosicion: number;
    tiempoEstimadoMinutos: number;
  } | null;
}

export default function TicketConfirmationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const qrRef = useRef<HTMLDivElement>(null);

  const state = (location.state as any) || {};
  const { ticketId, queueId, queueName, clientName } = state;

  const [queueInfo, setQueueInfo] = useState<QueueInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar información de la cola cada 3 segundos
  useEffect(() => {
    const loadQueueInfo = async () => {
      try {
        setError(null);
        const response = await apiClient.getQueueInfo(parseInt(queueId), parseInt(ticketId));
        if (response.data) {
          setQueueInfo(response.data as QueueInfo);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error loading queue info:', err);
        setError('Error al cargar información de la cola');
        setLoading(false);
      }
    };

    loadQueueInfo();
    const interval = setInterval(loadQueueInfo, 3000); // Actualizar cada 3 segundos

    return () => clearInterval(interval);
  }, [queueId, ticketId]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQR = () => {
    if (qrRef.current) {
      const canvas = qrRef.current.querySelector('svg') as SVGElement;
      if (canvas) {
        const svgData = new XMLSerializer().serializeToString(canvas);
        const canvas2d = document.createElement('canvas');
        const ctx = canvas2d.getContext('2d')!;
        const img = new Image();
        img.onload = () => {
          canvas2d.width = img.width;
          canvas2d.height = img.height;
          ctx.drawImage(img, 0, 0);
          const link = document.createElement('a');
          link.href = canvas2d.toDataURL('image/png');
          link.download = `ticket-${ticketId}.png`;
          link.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
      }
    }
  };

  const miPosicion = queueInfo?.userInfo?.miPosicion ?? '-';
  const tiempoEstimado = queueInfo?.userInfo?.tiempoEstimadoMinutos ?? '-';
  const turnoActual = queueInfo?.stats?.turnoActual?.numero ?? 'N/A';
  const totalEnEspera = queueInfo?.stats?.totalEnEspera ?? 0;

  return (
    <div style={styles.container}>
      <div style={styles.ticketCard}>
        <div style={styles.header}>
          <h1 style={styles.title}>📱 SmartLining</h1>
          <p style={styles.subtitle}>Tu Turno Confirmado</p>
        </div>

        <div style={styles.confirmationContent}>
          <div style={styles.ticketNumber}>
            <p style={styles.label}>Tu número de turno</p>
            <p style={styles.number}>{ticketId}</p>
          </div>

          {/* Real-time queue status */}
          <div style={styles.statusContainer}>
            <div style={styles.statusCard}>
              <div style={styles.statusItem}>
                <span style={styles.statusLabel}>📊 Tu Posición en Cola</span>
                <span style={styles.statusValue}>{miPosicion}</span>
              </div>
              <div style={styles.separator}></div>
              <div style={styles.statusItem}>
                <span style={styles.statusLabel}>⏱️ Tiempo Estimado</span>
                <span style={{ ...styles.statusValue, color: '#ff9800' }}>
                  {loading ? '...' : typeof tiempoEstimado === 'number' ? `${tiempoEstimado} min` : '-'}
                </span>
              </div>
            </div>

            <div style={styles.statusCard}>
              <div style={styles.statusItem}>
                <span style={styles.statusLabel}>🎫 Turno Actual</span>
                <span style={styles.statusValue}>{turnoActual}</span>
              </div>
              <div style={styles.separator}></div>
              <div style={styles.statusItem}>
                <span style={styles.statusLabel}>👥 En Espera</span>
                <span style={styles.statusValue}>{totalEnEspera}</span>
              </div>
            </div>
          </div>

          <div style={styles.queueDetails}>
            <div style={styles.detail}>
              <span style={styles.detailLabel}>Cola:</span>
              <span style={styles.detailValue}>{queueName || 'Cola ' + queueId}</span>
            </div>
            <div style={styles.detail}>
              <span style={styles.detailLabel}>Nombre:</span>
              <span style={styles.detailValue}>{clientName}</span>
            </div>
            <div style={styles.detail}>
              <span style={styles.detailLabel}>Estado:</span>
              <span style={styles.detailValue}>
                🟢 {queueInfo?.userInfo?.estado === 'EN_ESPERA' ? 'En Espera' : queueInfo?.userInfo?.estado || 'Pendiente'}
              </span>
            </div>
            <div style={styles.detail}>
              <span style={styles.detailLabel}>Hora:</span>
              <span style={styles.detailValue}>{new Date().toLocaleTimeString('es-ES')}</span>
            </div>
          </div>

          <div style={styles.qrContainer} ref={qrRef}>
            <p style={styles.qrLabel}>Código QR del Turno</p>
            <QRCodeSVG
              value={JSON.stringify({
                ticketId,
                queueId,
                clientName,
              })}
              size={200}
              level="H"
              includeMargin
            />
          </div>

          <div style={styles.instructions}>
            <h3 style={styles.instructionsTitle}>📋 Instrucciones</h3>
            <ol style={styles.instructionsList}>
              <li>Espera a que sea llamado tu turno (número {ticketId})</li>
              <li>Cuando sea tu turno, se mostrará en la pantalla de espera</li>
              <li>Acércate al mostrador indicado en la cola</li>
              <li>Puedes guardar este QR o capturar pantalla para acceso rápido</li>
            </ol>
          </div>

          <div style={styles.buttonGroup}>
            <button onClick={handlePrint} style={styles.button}>
              🖨️ Imprimir
            </button>
            <button onClick={handleDownloadQR} style={styles.button}>
              ⬇️ Descargar QR
            </button>
          </div>

          <button onClick={() => navigate('/')} style={styles.secondaryButton}>
            ← Volver al inicio
          </button>
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Número de confirmación: {ticketId}
          </p>
          <p style={styles.footerText}>
            Hora de registro: {new Date().toLocaleString('es-ES')}
          </p>
          <p style={styles.footerText}>
            {loading && '⏳ Actualizando información...'}
            {error && `⚠️ ${error}`}
          </p>
          <p style={{ ...styles.footerText, marginTop: '15px', fontSize: '12px' }}>
            SmartLining © 2026 - Gestión de Colas Virtuales
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
  ticketCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
    maxWidth: '600px',
    width: '100%',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
    color: 'white',
    padding: '30px',
    textAlign: 'center' as const,
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    margin: '0 0 5px 0',
  },
  subtitle: {
    fontSize: '16px',
    margin: 0,
    opacity: 0.9,
  },
  confirmationContent: {
    padding: '40px 30px',
  },
  ticketNumber: {
    backgroundColor: '#e8f4f8',
    padding: '25px',
    borderRadius: '8px',
    marginBottom: '30px',
    textAlign: 'center' as const,
    borderLeft: '4px solid #007bff',
  },
  label: {
    color: '#666',
    fontSize: '14px',
    margin: '0 0 10px 0',
  },
  number: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#007bff',
    margin: 0,
  },
  statusContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '30px',
  },
  statusCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: '15px',
    border: '1px solid #e0e0e0',
  },
  statusItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textAlign: 'center' as const,
  },
  statusLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#666',
    marginBottom: '8px',
  },
  statusValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#007bff',
  },
  separator: {
    height: '1px',
    backgroundColor: '#e0e0e0',
    margin: '12px 0',
  },
  queueDetails: {
    marginBottom: '30px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  detail: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #eee',
  },
  detailLabel: {
    fontWeight: 'bold',
    color: '#333',
  },
  detailValue: {
    color: '#666',
  },
  qrContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '30px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    marginBottom: '30px',
  },
  qrLabel: {
    marginBottom: '15px',
    color: '#333',
    fontWeight: 'bold',
  },
  instructions: {
    marginBottom: '30px',
    padding: '20px',
    backgroundColor: '#e8f5e9',
    borderRadius: '8px',
    borderLeft: '4px solid #4caf50',
  },
  instructionsTitle: {
    marginTop: 0,
    marginBottom: '15px',
    color: '#2e7d32',
  },
  instructionsList: {
    marginBottom: 0,
    color: '#2e7d32',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px',
  },
  button: {
    flex: 1,
    padding: '12px',
    fontSize: '14px',
    fontWeight: 'bold',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
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
  },
  footer: {
    borderTop: '1px solid #eee',
    padding: '20px 30px',
    backgroundColor: '#f8f9fa',
  },
  footerText: {
    textAlign: 'center' as const,
    color: '#999',
    fontSize: '12px',
    margin: '8px 0',
  },
};
