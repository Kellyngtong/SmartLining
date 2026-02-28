import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '../services/api';
import { useAuthStore } from '../store/auth.store';
import '../styles/global.css';
import { Button } from '@/components/Button';

interface Queue {
  id_cola: number;
  nombre: string;
  descripcion: string;
  activa: boolean;
}
/**
 * AdminQRPage component - allows administrators to generate QR codes for their queues
 * Admins can create, edit, and delete queues, and generate QR codes that clients can scan to join the queue.
 * This page is protected and only accessible to users with the ADMINISTRADOR role.
 */

export default function AdminQRPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null);
  const [qrSize, setQrSize] = useState(256);
  const [format, setFormat] = useState<'url' | 'json'>('url');

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

  // Form state for CRUD
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [processing, setProcessing] = useState(false);

  const refreshQueues = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getQueues();
      if (response.data && Array.isArray(response.data)) {
        setQueues(response.data as Queue[]);
        if (response.data.length > 0) setSelectedQueue(response.data[0]);
      }
    } catch (e) {
      console.error('Error refreshing queues', e);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (q: Queue) => {
    setSelectedQueue(q);
    setFormName(q.nombre);
    setFormDesc(q.descripcion);
    setFormActive(Boolean(q.activa));
  };

  const handleCreate = async () => {
    setProcessing(true);
    try {
      await apiClient.createQueue(formName || 'Nueva Cola', formDesc || '', formActive);
      await refreshQueues();
      setFormName('');
      setFormDesc('');
      setFormActive(true);
      alert('Cola creada');
    } catch (e) {
      console.error(e);
      alert('Error creando cola');
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!selectedQueue) return;
    setProcessing(true);
    try {
      await apiClient.updateQueue(selectedQueue.id_cola, formName, formDesc, formActive);
      await refreshQueues();
      alert('Cola actualizada');
    } catch (e) {
      console.error(e);
      alert('Error actualizando cola');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedQueue) return;
    if (!window.confirm(`Eliminar cola "${selectedQueue.nombre}" ?`)) return;
    setProcessing(true);
    try {
      await apiClient.deleteQueue(selectedQueue.id_cola);
      await refreshQueues();
      alert('Cola eliminada');
    } catch (e) {
      console.error(e);
      alert('Error eliminando cola');
    } finally {
      setProcessing(false);
    }
  };

  const getQueueUrl = (queueId: number) => {
    const baseUrl = (import.meta.env.VITE_APP_URL as string) || window.location.origin;
    return `${baseUrl}/join-queue/${queueId}`;
  };

  const getQueuePayload = (queue: Queue) => {
    const baseUrl = (import.meta.env.VITE_APP_URL as string) || window.location.origin;
    const url = `${baseUrl}/join-queue/${queue.id_cola}`;
    const clientName = `cliente-${Date.now()}`;
    // ticketid unknown at generation time; set to null
    return {
      ticketid: null,
      queueid: queue.id_cola,
      clienteName: clientName,
      url,
    };
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
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div>
            <h1 style={styles.title}>Generador de Códigos QR</h1>
            <p style={styles.subtitle}>
              Genera códigos QR para que los clientes se unan a tus colas
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            style={{ backgroundColor: 'black' }}
          >
            Volver al Dashboard
          </Button>
          <Button onClick={refreshQueues}>Actualizar colas</Button>
        </div>
      </header>

      <div style={styles.content}>
        {/* Selector de cola */}
        <div style={styles.selectorSection}>
          <h2 style={styles.sectionTitle}>Selecciona una Cola</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0.5, marginBottom: '2rem' }}>
            <input
              placeholder="Nombre"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              style={{ marginRight: 8 }}
            />
            <input
              placeholder="Descripción"
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              style={{ marginRight: 8 }}
            />
            <label style={{ marginRight: 8 }}>
              Activa
              <input
                type="checkbox"
                checked={formActive}
                onChange={e => setFormActive(e.target.checked)}
                style={{ marginLeft: 6 }}
              />
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Button onClick={handleCreate} disabled={processing}>
                Crear
              </Button>
              <Button onClick={handleSave} disabled={processing || !selectedQueue}>
                Guardar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={processing || !selectedQueue}
              >
                Eliminar
              </Button>
            </div>
          </div>
          <div style={styles.queueGrid}>
            {queues.map(queue => (
              <div
                key={queue.id_cola}
                style={{
                  ...styles.queueCard,
                  ...(selectedQueue?.id_cola === queue.id_cola ? styles.queueCardSelected : {}),
                }}
                onClick={() => startEdit(queue)}
              >
                <h3 style={styles.queueName}>{queue.nombre}</h3>
                <p style={styles.queueDesc}>{queue.descripcion}</p>
                <p style={styles.queueStatus}>{queue.activa ? '🟢 Activa' : '⛔ Inactiva'}</p>
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
                {(() => {
                  const payload =
                    format === 'json'
                      ? JSON.stringify(getQueuePayload(selectedQueue))
                      : getQueueUrl(selectedQueue.id_cola);
                  return (
                    <QRCodeSVG
                      value={payload}
                      size={qrSize}
                      level="H"
                      includeMargin
                      fgColor="#000000"
                      bgColor="#ffffff"
                    />
                  );
                })()}
              </div>

              <div style={styles.qrInfo}>
                <h3>{selectedQueue.nombre}</h3>
                <p style={styles.qrUrl}>
                  {format === 'json'
                    ? JSON.stringify(getQueuePayload(selectedQueue))
                    : getQueueUrl(selectedQueue.id_cola)}
                </p>

                <div style={styles.controls}>
                  <label style={styles.sizeLabel}>
                    Formato:
                    <select
                      value={format}
                      onChange={e => setFormat(e.target.value as any)}
                      style={{ marginLeft: 8 }}
                    >
                      <option value="url">URL (abre la página)</option>
                      <option value="json">JSON (incluye URL)</option>
                    </select>
                  </label>
                  <label style={{ ...styles.sizeLabel, marginTop: 8 }}>
                    Tamaño del QR:
                    <input
                      type="range"
                      min="150"
                      max="700"
                      step="10"
                      value={qrSize}
                      onChange={e => setQrSize(parseInt(e.target.value))}
                      style={styles.sizeSlider}
                    />
                    <span>{qrSize}px</span>
                  </label>
                </div>

                <div style={styles.buttonGroup}>
                  <Button onClick={() => handleDownloadQR(selectedQueue)}>⬇️ Descargar QR</Button>
                  <Button onClick={() => handlePrintQR()}>🖨️ Imprimir</Button>
                  <Button
                    onClick={() => {
                      const payload =
                        format === 'json'
                          ? JSON.stringify(getQueuePayload(selectedQueue))
                          : getQueueUrl(selectedQueue.id_cola);
                      navigator.clipboard.writeText(payload);
                      alert('Contenido copiado al portapapeles');
                    }}
                  >
                    📋 Copiar contenido
                  </Button>
                </div>

                <div style={styles.instructions}>
                  <h4>📋 Instrucciones</h4>
                  <ol>
                    <li>Descarga o imprime el código QR</li>
                    <li>Coloca el QR en un lugar visible en tu establecimiento</li>
                    <li>Los clientes escanean el QR con sus teléfonos</li>
                    <li>
                      Si el QR es de tipo <strong>URL</strong>, el escáner abrirá la página de
                      registro en el frontend y se generará automáticamente el cliente y el turno.
                    </li>
                    <li>
                      Si el QR es de tipo <strong>JSON</strong>, contiene un objeto con{' '}
                      <code>queueid</code>, <code>clienteName</code> y una propiedad{' '}
                      <code>url</code> que apunta a la página de registro; algunos escáneres
                      mostrarán el JSON, otros permitirán abrir la URL incluida.
                    </li>
                    <li>
                      Tras registrarse verán su número de turno y tiempo estimado y el sistema
                      comenzará a rastrear su avance.
                    </li>
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--color-border)',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    margin: 0,
    color: 'var(--sl-black)',
  },
  subtitle: {
    margin: 0,
    color: 'var(--color-text-secondary)',
    fontSize: 14,
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
    borderColor: '#ffd700',
    backgroundColor: '#fff6c230',
    boxShadow: '0 2px 8px #fff6c230',
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
    backgroundColor: '#ffd700',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  instructions: {
    marginTop: '15px',
    padding: '15px',
    background: '#fff6c230',
    border: '2px solid #ffd700',
    borderRadius: '4px',
  },
};
