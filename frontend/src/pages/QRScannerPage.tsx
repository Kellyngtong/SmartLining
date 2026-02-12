import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import '../styles/global.css';

export default function QRScannerPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scannedData, setScannedData] = useState<string | null>(null);

  useEffect(() => {
    if (!scanning) return;

    // Solicitar acceso a la cámara
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          startScanning();
        }
      })
      .catch(err => {
        setError('No se pudo acceder a la cámara. Asegúrate de permitir el acceso.');
        console.error(err);
      });

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [scanning]);

  const startScanning = () => {
    const scanInterval = setInterval(() => {
      if (videoRef.current && canvasRef.current) {
        const context = canvasRef.current.getContext('2d');
        if (context) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          context.drawImage(videoRef.current, 0, 0);

          const imageData = context.getImageData(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );

          const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

          if (qrCode) {
            setScannedData(qrCode.data);
            setScanning(false);
            clearInterval(scanInterval);
            handleQRScanned(qrCode.data);
          }
        }
      }
    }, 100);
  };

  const handleQRScanned = (qrData: string) => {
    // El QR debería contener el ID de la cola
    // Formato esperado: { queueId: "1" } o solo el ID
    try {
      // Intentar parsear como JSON
      const data = JSON.parse(qrData);
      navigate('/queue-registration', { state: { queueId: data.queueId || data.id } });
    } catch {
      // Si no es JSON, asumir que es directamente el ID
      navigate('/queue-registration', { state: { queueId: qrData } });
    }
  };

  const handleManualEntry = () => {
    const queueId = prompt('Ingresa el ID de la cola:');
    if (queueId) {
      navigate('/queue-registration', { state: { queueId } });
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>📱 SmartLining</h1>
        <p style={styles.subtitle}>Escanea el código QR para unirte a la cola</p>

        {error ? (
          <div style={styles.error}>
            <p>⚠️ {error}</p>
            <button
              onClick={() => {
                setError(null);
                setScanning(true);
              }}
              style={styles.button}
            >
              Intentar de nuevo
            </button>
          </div>
        ) : (
          <>
            {scanning ? (
              <div style={styles.scannerContainer}>
                <video
                  ref={videoRef}
                  style={styles.video}
                  playsInline
                  autoPlay
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div style={styles.scannerOverlay}>
                  <div style={styles.scannerFrame} />
                </div>
                <p style={styles.hint}>Apunta tu cámara al código QR</p>
              </div>
            ) : scannedData ? (
              <div style={styles.success}>
                <p>✅ Código QR escaneado exitosamente</p>
                <p>Redirigiendo...</p>
              </div>
            ) : null}

            <button
              onClick={handleManualEntry}
              style={styles.secondaryButton}
            >
              Ingresar ID manualmente
            </button>
          </>
        )}

        <div style={styles.footer}>
          <p style={styles.footerText}>
            ¿Necesitas ayuda? Contacta al personal disponible
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
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '10px',
    textAlign: 'center' as const,
    color: '#333',
  },
  subtitle: {
    fontSize: '16px',
    textAlign: 'center' as const,
    color: '#666',
    marginBottom: '30px',
  },
  scannerContainer: {
    position: 'relative' as const,
    marginBottom: '30px',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: 'auto',
    display: 'block',
  },
  scannerOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none' as const,
  },
  scannerFrame: {
    width: '250px',
    height: '250px',
    border: '3px solid #007bff',
    borderRadius: '8px',
    backgroundColor: 'rgba(0,123,255,0.1)',
  },
  hint: {
    textAlign: 'center' as const,
    marginTop: '15px',
    color: '#666',
    fontSize: '14px',
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
    marginTop: '15px',
  },
  error: {
    backgroundColor: '#ffebee',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  success: {
    backgroundColor: '#e8f5e9',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center' as const,
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
