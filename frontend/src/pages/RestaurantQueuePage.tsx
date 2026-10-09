import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Minus, Plus, AlertTriangle, User, ArrowLeft } from 'lucide-react';
import { useRestaurantStore } from '../store/restaurant.store';
import { apiClient } from '../services/api';
import '../styles/restaurant.css';

const RestaurantQueuePage: React.FC = () => {
  const { colaId } = useParams<{ colaId: string }>();
  const navigate = useNavigate();
  const fetchCola = useRestaurantStore(s => s.fetchCola);
  const stats = useRestaurantStore(s => s.stats);

  const [numComensales, setNumComensales] = useState(2);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [colaNombre, setColaNombre] = useState('Restaurante');
  const [capacidadMax, setCapacidadMax] = useState(0);

  const emailOk = email.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  useEffect(() => {
    document.title = 'Entrar en la cola — SmartLining';
    return () => {
      document.title = 'SmartLining';
    };
  }, []);

  useEffect(() => {
    if (colaId) {
      const id = parseInt(colaId, 10);
      if (!isNaN(id)) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        fetchCola(id);
        // Obtener el nombre de la cola
        apiClient.getQueueById(id).then(res => {
          const data = res.data as any;
          if (data?.nombre) setColaNombre(data.nombre);
        }).catch(() => {});
        // Capacidad máxima vía endpoint público (funciona sin login;
        // cola-activa requiere auth y falla en anónimo)
        apiClient.getPublicRestaurante(id).then(res => {
          const data = res.data as any;
          if (data?.capacidad_maxima) setCapacidadMax(data.capacidad_maxima);
        }).catch(() => {});
      }
    }
  }, [colaId, fetchCola]);

  const handleSubmit = async () => {
    if (!colaId) return;
    const id = parseInt(colaId, 10);
    setLoading(true);
    setError(null);

    try {
      // Crear un cliente con un nombre amigable (opcional). Si no se aporta,
      // usamos "Grupo" sin sufijos técnicos para mantener identificadores claros.
      const nombreAmigable = (nombre && nombre.trim()) || 'Grupo';
      const clientResponse = await apiClient.createCliente({
        nombre: nombreAmigable,
        ...(email.trim() ? { email: email.trim() } : {}),
      });
      const clienteId = (clientResponse.data as { id_cliente: number }).id_cliente;

      // Crear el turno de restaurante con el número de comensales
      const res = await apiClient.createTurnoRestaurante({
        id_cola: id,
        id_cliente: clienteId,
        num_comensales: numComensales,
      });

      if (res && (res as any).data?.turno) {
        const turno = (res as any).data.turno;
        navigate(`/restaurante/ticket/${turno.id_turno}`);
      } else {
        setError('No se pudo registrar el turno');
      }
    } catch (e) {
      setError('Error al registrar. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const maxCap = stats?.maxCapacidadRestaurante || capacidadMax || 0;

  return (
    <div className="restaurant-container">
      <div className="restaurant-hero">
        <h1>{colaNombre}</h1>
        <p>Introduce el número de personas de tu grupo para entrar en la cola. Te asignaremos una mesa cuando esté disponible.</p>
      </div>

      <div className="comensales-form">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <Users size={22} style={{ color: 'var(--sl-amber)' }} />
          <h2 style={{ margin: 0 }}>¿Cuántos sois?</h2>
        </div>

        <div className="comensales-nombre" style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', textAlign: 'left', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>
            Nombre del grupo (opcional)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--color-border)', borderRadius: 10, padding: '0 12px', background: '#fff' }}>
            <User size={18} style={{ color: 'var(--color-text-secondary)' }} />
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej.: García, Aniversario, Grupo 5…"
              maxLength={80}
              style={{ width: '100%', border: 'none', outline: 'none', padding: '12px 0', background: 'transparent', fontSize: '1rem' }}
            />
          </div>
        </div>

        <div className="comensales-nombre" style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', textAlign: 'left', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>
            Correo electrónico (opcional, para avisarte cuando tu mesa esté lista)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${email.trim() && !emailOk ? '#fca5a5' : 'var(--color-border)'}`, borderRadius: 10, padding: '0 12px', background: '#fff' }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              maxLength={150}
              style={{ width: '100%', border: 'none', outline: 'none', padding: '12px 0', background: 'transparent', fontSize: '1rem' }}
            />
          </div>
          {email.trim() && !emailOk && (
            <p role="alert" style={{ color: '#b91c1c', fontSize: '0.8rem', margin: '4px 0 0', textAlign: 'left' }}>
              Revisa el formato del correo
            </p>
          )}
        </div>

        <div className="comensales-stepper">
          <button type="button" onClick={() => setNumComensales(Math.max(1, numComensales - 1))} aria-label="Quitar un comensal">
            <Minus />
          </button>
          <input
            type="number"
            className="stepper-value"
            value={numComensales}
            min={1}
            onChange={e => setNumComensales(Math.max(1, parseInt(e.target.value) || 1))}
            style={{ fontSize: '2.5rem', fontWeight: 700, width: 90, textAlign: 'center', border: 'none', background: 'transparent' }}
          />
          <button type="button" onClick={() => setNumComensales(numComensales + 1)} aria-label="Añadir un comensal">
            <Plus />
          </button>
        </div>

        <p className="comensales-hint">personas en tu grupo</p>

        {maxCap > 0 && numComensales > maxCap && (
          <div className="gran-grupo-alert" style={{ textAlign: 'left', marginTop: 16 }}>
            <AlertTriangle size={18} style={{ color: '#f97316' }} />
            <span>
              Tu grupo de {numComensales} supera la capacidad de una sola mesa ({maxCap}). El camarero te ayudará a sentaros.
            </span>
          </div>
        )}

        {error && <p role="alert" style={{ color: '#b91c1c', marginTop: 12 }}>{error}</p>}

        <button
          className="btn-restaurant yellow"
          style={{ width: '100%', padding: '14px', fontSize: '1.1rem', marginTop: 16 }}
          onClick={handleSubmit}
          disabled={loading || !emailOk}
        >
          {loading ? <span className="spinner-rest" role="status" aria-label="Registrando" /> : 'Entrar en la cola'}
        </button>
      </div>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button
          className="btn-ghost-rest"
          onClick={() => navigate('/restaurante')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.9rem' }}
        >
          <ArrowLeft size={16} /> Volver al inicio
        </button>
      </div>
    </div>
  );
};

export default RestaurantQueuePage;
