import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '../services/api';
import { useAuthStore } from '../store/auth.store';
import '../styles/global.css';

interface Queue {
  id_cola: number;
  nombre: string;
  descripcion: string;
  activa: boolean;
}

export default function AdminQRPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null);
  const [qrSize, setQrSize] = useState(256);

  // Verificar que el usuario es admin
  useEffect(() => {
    if (user && user.rol !== 'ADMINISTRADOR') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Cargar colas
  useEffect(() => {
    const loadQueues = async () => {
      try {
        const response = await apiClient.getQueues();
        if (response.data && Array.isArray(response.data)) {
          setQueues(response.data as Queue[]);
          if (response.data.length > 0) {
            setSelectedQueue(response.data[0]);
          }
        }
        setLoading(false);
      } catch (err) {
        console.error('Error loading queues:', err);
        setLoading(false);
      }
    };

    loadQueues();
  }, []);

  const getQueueUrl = (queueId: number) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/join-queue/${queueId}`;
  };

  const handlePrintQR = () => {
    window.print();
  };

  const handleDownloadQR = (queue: Queue) => {
    const element = document.getElementById(`qr-${queue.id_cola}`);
    if (element) {
      const svg = element.querySelector('svg') as SVGElement;
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          const link = document.createElement('a');
          link.href = canvas.toDataURL('image/png');
          link.download = `qr-${queue.nombre.replace(/\s+/g, '-')}.png`;
          link.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
      }
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingCard}>
          <p>Cargando colas...</p>
        </div>
      </div>
    );
  }

  if (queues.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingCard}>
          <p>No hay colas disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🎯 Generador de Códigos QR</h1>
        <p style={styles.subtitle}>Genera códigos QR para que los clientes se unan a tus colas</p>
      </div>

      <div style={styles.content}>
        {/* Selector de cola */}
        <div style={styles.selectorSection}>
          <h2 style={styles.sectionTitle}>Selecciona una Cola</h2>
          <div style={styles.queueGrid}>
            {queues.map((queue) => (
              <div
                key={queue.id_cola}
                style={{
                  ...styles.queueCard,
                  ...(selectedQueue?.id_cola === queue.id_cola
                    ? styles.queueCardSelected
                    : {}),
                }}
                onClick={() => setSelectedQueue(queue)}
              >
                <h3 style={styles.queueName}>{queue.nombre}</h3>
                <p style={styles.queueDesc}>{queue.descripcion}</p>
                <p style={styles.queueStatus}>
                  {queue.activa ? '🟢 Activa' : '⛔ Inactiva'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Vista del QR */}
        {selectedQueue && (
          <div style={styles.qrSection}>
            <h2 style={styles.sectionTitle}>Código QR</h2>

            <div style={styles.qrCard}>
              <div style={styles.qrDisplay} id={`qr-${selectedQueue.id_cola}`}>
                <QRCodeSVG
                  value={getQueueUrl(selectedQueue.id_cola)}
                  size={qrSize}
                  level="H"
                  includeMargin
                  fgColor="#000000"
                  bgColor="#ffffff"
                />
              </div>

              <div style={styles.qrInfo}>
                <h3>{selectedQueue.nombre}</h3>
                <p style={styles.qrUrl}>{getQueueUrl(selectedQueue.id_cola)}</p>

                <div style={styles.controls}>
                  <label style={styles.sizeLabel}>
                    Tamaño del QR:
                    <input
                      type="range"
                      min="100"
                      max="500"
                      step="10"
                      value={qrSize}
                      onChange={(e) => setQrSize(parseInt(e.target.value))}
                      style={styles.sizeSlider}
                    />
                    <span>{qrSize}px</span>
                  </label>
                </div>

                <div style={styles.buttonGroup}>
                  <button
                    onClick={() => handleDownloadQR(selectedQueue)}
                    style={styles.button}
                  >
                    ⬇️ Descargar QR
                  </button>
                  <button
                    onClick={() => handlePrintQR()}
                    style={styles.button}
                  >
                    🖨️ Imprimir
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(getQueueUrl(selectedQueue.id_cola));
                      alert('URL copiada al portapapeles');
                    }}
                    style={styles.button}
                  >
                    📋 Copiar URL
                  </button>
                </div>

                <div style={styles.instructions}>
                  <h4>📋 Instrucciones</h4>
                  <ol>
                    <li>Descarga o imprime el código QR</li>
                    <li>Coloca el QR en un lugar visible en tu establecimiento</li>
                    <li>Los clientes escanean el QR con sus teléfonos</li>
                    <li>Se registran automáticamente en la cola</li>
                    <li>Ven su número de turno y tiempo estimado</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: 'Arial, sans-serif',
  },
  loadingCard: {
    padding: '40px',
    textAlign: 'center' as const,
    backgroundColor: 'white',
    borderRadius: '8px',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '40px',
    paddingBottom: '20px',
    borderBottom: '2px solid #007bff',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
    color: '#333',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: 0,
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '40px',
  },
  selectorSection: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginTop: 0,
    marginBottom: '15px',
    color: '#333',
  },
  queueGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  queueCard: {
    padding: '15px',
    backgroundColor: 'white',
    border: '2px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  queueCardSelected: {
    borderColor: '#007bff',
    backgroundColor: '#e8f4f8',
    boxShadow: '0 2px 8px rgba(0, 123, 255, 0.2)',
  },
  queueName: {
    margin: '0 0 5px 0',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
  },
  queueDesc: {
    margin: '0 0 5px 0',
    fontSize: '13px',
    color: '#666',
  },
  queueStatus: {
    margin: 0,
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#28a745',
  },
  qrSection: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  qrCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  qrDisplay: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  qrInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  qrUrl: {
    backgroundColor: '#f0f0f0',
    padding: '10px',
    borderRadius: '4px',
    fontSize: '12px',
    wordBreak: 'break-all' as const,
    margin: 0,
    color: '#666',
  },
  controls: {
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  sizeLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  sizeSlider: {
    flex: 1,
    minWidth: '100px',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  button: {
    padding: '10px',
    fontSize: '14px',
    fontWeight: 'bold',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  instructions: {
    marginTop: '15px',
    padding: '15px',
    backgroundColor: '#e8f5e9',
    borderLeft: '4px solid #4caf50',
    borderRadius: '4px',
  },
};
