import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CalendarDays, CheckCircle, XCircle, Pencil, ArrowLeft, Users, Clock, StickyNote } from 'lucide-react';
import { apiClient } from '../services/api';
import '../styles/restaurant.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface MiReserva {
  id_reserva: number;
  id_cola: number;
  cliente_nombre: string;
  cliente_telefono: string | null;
  fecha: string;
  hora_inicio: string;
  num_comensales: number;
  estado: string;
  notas: string | null;
  cola?: { id_cola: number; nombre: string };
}

const fmtFecha = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const fmtHora = (v: string) => {
  const d = new Date(v);
  if (!isNaN(d.getTime())) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return v.slice(11, 16);
};

const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const MiReservaPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [reserva, setReserva] = useState<MiReserva | null>(null);
  const [flags, setFlags] = useState({ puede_confirmar: false, puede_modificar: false, puede_cancelar: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accion, setAccion] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ fecha: '', hora_inicio: '', num_comensales: 2 });

  useEffect(() => {
    document.title = 'Mi reserva — SmartLining';
    return () => {
      document.title = 'SmartLining';
    };
  }, []);

  const cargar = async () => {
    if (!token) return;
    try {
      const res = await apiClient.getPublicMiReserva(token);
      const data = res.data as any;
      setReserva(data.reserva);
      setFlags({
        puede_confirmar: !!data.puede_confirmar,
        puede_modificar: !!data.puede_modificar,
        puede_cancelar: !!data.puede_cancelar,
      });
      setError(null);
    } catch (e) {
      setError('No se encontró la reserva. Revisa el enlace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Tiempo real: refrescar al cambiar el estado desde el restaurante
  useEffect(() => {
    if (!reserva) return;
    const es = new EventSource(`${API_BASE_URL}/events?queueId=${reserva.id_cola}`);
    const refrescar = () => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      cargar();
    };
    ['RESERVA_ESTADO', 'RESERVA_CREADA', 'RESERVA_ELIMINADA'].forEach(ev => es.addEventListener(ev, refrescar));
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reserva?.id_cola]);

  const empezarEdicion = () => {
    if (!reserva) return;
    const d = new Date(reserva.fecha);
    setForm({
      fecha: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      hora_inicio: fmtHora(reserva.hora_inicio),
      num_comensales: reserva.num_comensales,
    });
    setEditando(true);
  };

  const doAccion = async (fn: () => Promise<any>, okMsg: string) => {
    if (!token) return;
    setAccion(true);
    setMensaje(null);
    try {
      await fn();
      await cargar();
      setEditando(false);
      setMensaje(okMsg);
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Operación fallida. Inténtalo de nuevo.';
      setMensaje(msg);
    } finally {
      setAccion(false);
    }
  };

  if (loading) {
    return (
      <div className="restaurant-container">
        <div style={{ textAlign: 'center', padding: 60 }}>
          <span className="spinner-rest" role="status" aria-label="Cargando" />
        </div>
      </div>
    );
  }

  if (error || !reserva) {
    return (
      <div className="restaurant-container">
        <div className="restaurant-hero">
          <h1>Mi reserva</h1>
        </div>
        <div className="ticket-status">
          <p role="alert" style={{ color: '#b91c1c' }}>{error || 'Reserva no encontrada'}</p>
          <button className="btn-restaurant yellow" style={{ marginTop: 16 }} onClick={() => navigate('/restaurante')}>
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="restaurant-container">
      <div className="restaurant-hero">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CalendarDays size={26} />
          Mi reserva
        </h1>
        <p>{reserva.cola?.nombre || 'Tu reserva'}</p>
      </div>

      <div className="ticket-status" style={{ textAlign: 'left', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0 }}>{reserva.cliente_nombre}</h3>
          <span
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#fff',
              background:
                reserva.estado === 'PENDIENTE' ? '#64748b'
                : reserva.estado === 'CONFIRMADA' ? '#2563eb'
                : reserva.estado === 'CHECKED_IN' ? '#0d9488'
                : reserva.estado === 'SENTADA' ? '#16a34a'
                : reserva.estado === 'COMPLETADA' ? '#1e293b'
                : '#dc2626',
            }}
          >
            {reserva.estado}
          </span>
        </div>

        <div style={{ marginTop: 16, fontSize: '1rem', color: 'var(--color-text-secondary)' }}>
          <div><Users size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />{reserva.num_comensales} personas</div>
          <div style={{ marginTop: 6 }}><Clock size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />{fmtFecha(reserva.fecha)} a las {fmtHora(reserva.hora_inicio)}</div>
          {reserva.notas && <div style={{ marginTop: 6 }}><StickyNote size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />{reserva.notas}</div>}
        </div>

        {mensaje && (
          <p role={mensaje.includes('fallida') || mensaje.includes('Solo') ? 'alert' : 'status'} style={{ marginTop: 12, color: '#15803d' }}>
            {mensaje}
          </p>
        )}

        {!editando && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
            {flags.puede_confirmar && (
              <button
                className="btn-restaurant yellow"
                disabled={accion}
                onClick={() => doAccion(() => apiClient.confirmarMiReserva(token!), '¡Asistencia confirmada! Te esperamos.')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <CheckCircle size={16} /> Confirmo asistencia
              </button>
            )}
            {flags.puede_modificar && (
              <button className="btn-ghost-rest" disabled={accion} onClick={empezarEdicion} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Pencil size={16} /> Modificar
              </button>
            )}
            {flags.puede_cancelar && (
              <button
                className="btn-ghost-rest"
                disabled={accion}
                style={{ color: '#b91c1c', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                onClick={() => {
                  if (window.confirm('¿Cancelar esta reserva?')) {
                    void doAccion(() => apiClient.cancelarMiReserva(token!), 'Reserva cancelada.');
                  }
                }}
              >
                <XCircle size={16} /> Cancelar
              </button>
            )}
          </div>
        )}

        {editando && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
            <h4 style={{ margin: '0 0 12px' }}>Modificar reserva</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label htmlFor="mi-fecha" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>Fecha</label>
                <input
                  id="mi-fecha"
                  type="date"
                  value={form.fecha}
                  min={hoyLocal()}
                  onChange={e => setForm({ ...form, fecha: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: 10 }}
                />
              </div>
              <div>
                <label htmlFor="mi-hora" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>Hora</label>
                <input
                  id="mi-hora"
                  type="time"
                  value={form.hora_inicio}
                  onChange={e => setForm({ ...form, hora_inicio: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: 10 }}
                />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="mi-comensales" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>Comensales</label>
              <input
                id="mi-comensales"
                type="number"
                min={1}
                max={20}
                value={form.num_comensales}
                onChange={e => setForm({ ...form, num_comensales: Math.max(1, parseInt(e.target.value) || 1) })}
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: 10 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-restaurant yellow"
                disabled={accion}
                onClick={() => doAccion(() => apiClient.updateMiReserva(token!, form), 'Reserva actualizada.')}
              >
                Guardar cambios
              </button>
              <button className="btn-ghost-rest" onClick={() => setEditando(false)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center' }}>
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

export default MiReservaPage;
