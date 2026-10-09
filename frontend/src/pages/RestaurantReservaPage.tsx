import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CalendarDays, Users, ArrowLeft, CheckCircle, Minus, Plus, Search, Copy, Clock } from 'lucide-react';
import { apiClient } from '../services/api';
import { Disponibilidad } from '../types';
import '../styles/restaurant.css';

interface Restaurant {
  id_cola: number;
  nombre: string;
  descripcion: string | null;
  duracion_estimada_comida_min: number;
  capacidad_maxima?: number;
  empresa: { id_empresa: number; nombre: string };
}

const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const sumarDias = (dias: number) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmtFechaCorta = (yyyyMmDd: string) => {
  const [y, m, d] = yyyyMmDd.split('-');
  return `${d}/${m}/${y}`;
};

const RestaurantReservaPage: React.FC = () => {
  const { colaId } = useParams<{ colaId: string }>();
  const navigate = useNavigate();
  const initialId = colaId ? parseInt(colaId, 10) : null;

  const [restaurantes, setRestaurantes] = useState<Restaurant[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(initialId);
  const [capacidadMax, setCapacidadMax] = useState(20);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);

  const [form, setForm] = useState({
    cliente_nombre: '',
    cliente_telefono: '',
    cliente_email: '',
    fecha: hoyLocal(),
    hora_inicio: '',
    num_comensales: 2,
  });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad | null>(null);
  const [slots, setSlots] = useState<{ hora: string; disponible: boolean }[]>([]);
  const [slotsAbierto, setSlotsAbierto] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [reservaConfirmada, setReservaConfirmada] = useState(false);
  const [miReservaUrl, setMiReservaUrl] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Reservar mesa — SmartLining';
    return () => {
      document.title = 'SmartLining';
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.getPublicRestaurantes();
        const data = (res.data as Restaurant[]) || [];
        setRestaurantes(data);
        if (initialId && data.some(r => r.id_cola === initialId)) {
          setSelectedId(initialId);
        } else if (data.length === 1) {
          // Con un solo restaurante, seleccionarlo directamente
          setSelectedId(data[0].id_cola);
        }
      } catch (e) {
        console.error('Error loading restaurants', e);
      } finally {
        setLoadingRestaurants(false);
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    load();
  }, [initialId]);

  // Capacidad máxima del restaurante seleccionado (para el stepper y avisos)
  useEffect(() => {
    if (!selectedId) return;
    setCapacidadMax(20);
    apiClient
      .getPublicRestaurante(selectedId)
      .then(res => {
        const data = res.data as Restaurant;
        if (data?.capacidad_maxima && data.capacidad_maxima > 0) {
          setCapacidadMax(data.capacidad_maxima);
        }
      })
      .catch(() => {});
  }, [selectedId]);

  const selected = restaurantes.find(r => r.id_cola === selectedId) || null;
  const maxComensales = Math.max(capacidadMax, 1);

  // Slots del día según horario + disponibilidad real
  useEffect(() => {
    if (!selectedId || !form.fecha || form.num_comensales < 1) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    apiClient
      .getPublicSlots(selectedId, { fecha: form.fecha, comensales: form.num_comensales })
      .then(res => {
        const data = res.data as any;
        setSlots(data?.slots || []);
        setSlotsAbierto(data?.abierto !== false);
        // Si el slot elegido ya no existe, limpiarlo
        if (form.hora_inicio && !(data?.slots || []).some((s: any) => s.hora === form.hora_inicio)) {
          setForm(f => ({ ...f, hora_inicio: '' }));
        }
      })
      .catch(() => {
        setSlots([]);
      })
      .finally(() => setLoadingSlots(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, form.fecha, form.num_comensales]);

  // Al cambiar el slot, la comprobación previa caduca
  useEffect(() => {
    setDisponibilidad(null);
  }, [form.hora_inicio]);

  const handleCheck = async () => {
    if (!selectedId) return;
    setChecking(true);
    setError(null);
    try {
      const res = await apiClient.getPublicDisponibilidad(selectedId, {
        fecha: form.fecha,
        hora: form.hora_inicio,
        comensales: form.num_comensales,
      });
      setDisponibilidad(res.data as Disponibilidad);
    } catch (e) {
      setDisponibilidad(null);
      setError('No se pudo comprobar la disponibilidad. Inténtalo de nuevo.');
    } finally {
      setChecking(false);
    }
  };

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.cliente_email.trim());

  const handleSubmit = async () => {
    if (!selectedId || !form.cliente_nombre.trim() || !form.fecha || !form.hora_inicio || !emailOk) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.createPublicReserva({
        id_cola: selectedId,
        cliente_nombre: form.cliente_nombre.trim(),
        cliente_telefono: form.cliente_telefono.trim() || null,
        cliente_email: form.cliente_email.trim(),
        fecha: form.fecha,
        hora_inicio: form.hora_inicio,
        num_comensales: form.num_comensales,
      });
      if (res.success) {
        const data = res.data as any;
        const url = data?.mi_reserva_url as string | undefined;
        setMiReservaUrl(url ? `${window.location.origin}${url}` : null);
        setReservaConfirmada((data?.reserva?.estado ?? 'CONFIRMADA') === 'CONFIRMADA');
        setSuccess(true);
      } else {
        setError('No se pudo crear la reserva');
      }
    } catch (e: any) {
      const backendMsg = e?.response?.data?.error as string | undefined;
      const alts = e?.response?.data?.alternativas as string[] | undefined;
      setError(
        backendMsg
          ? alts && alts.length > 0
            ? `${backendMsg}. Prueba: ${alts.join(', ')}`
            : backendMsg
          : 'Error al crear la reserva. Inténtalo de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loadingRestaurants) {
    return (
      <div className="restaurant-container">
        <div style={{ textAlign: 'center', padding: 60 }}>
          <span className="spinner-rest" role="status" aria-label="Cargando" />
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="restaurant-container">
        <div className="restaurant-hero">
          <h1>Reserva recibida</h1>
        </div>
        <div className="ticket-status" style={{ marginBottom: 24 }}>
          <CheckCircle size={56} style={{ color: '#22c55e', marginBottom: 12 }} />
          <div className="status-text">
            {reservaConfirmada ? '¡Mesa reservada!' : 'Tu reserva está en estado PENDIENTE'}
          </div>
          <p className="status-detail">
            {reservaConfirmada
              ? `${selected?.nombre || 'El restaurante'} te espera. Si surge cualquier cambio, avísanos desde tu enlace.`
              : `${selected?.nombre || 'El restaurante'} la revisará y te confirmará${
                  form.cliente_telefono ? ` en el ${form.cliente_telefono}` : ' lo antes posible'
                }.`}
          </p>
          <div style={{ marginTop: 20, fontSize: '0.95rem', color: 'var(--color-text-secondary)' }}>
            <strong>{form.num_comensales} personas</strong> · {fmtFechaCorta(form.fecha)} a las {form.hora_inicio}
          </div>
          {miReservaUrl && (
            <div style={{ marginTop: 20, padding: '14px', background: '#f8fafc', border: '1px solid var(--color-border)', borderRadius: 10 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8 }}>Gestiona tu reserva aquí:</div>
              <div style={{ fontSize: '0.8rem', wordBreak: 'break-all', color: 'var(--sl-amber)', marginBottom: 10 }}>{miReservaUrl}</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn-ghost-rest"
                  onClick={() => {
                    navigator.clipboard.writeText(miReservaUrl);
                    alert('Enlace copiado. Guárdalo para modificar o cancelar tu reserva.');
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
                >
                  <Copy size={14} /> Copiar enlace
                </button>
                <button
                  className="btn-restaurant"
                  onClick={() => navigate(miReservaUrl.replace(window.location.origin, ''))}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
                >
                  Ver mi reserva
                </button>
              </div>
            </div>
          )}
          <button
            className="btn-restaurant yellow"
            style={{ marginTop: 24, padding: '14px 28px' }}
            onClick={() => navigate('/restaurante')}
          >
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
          Reservar mesa
        </h1>
          <p>Completa los datos y tu mesa quedará reservada al instante.</p>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        {/* Selector de restaurante (multitenant) */}
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="restaurante-select" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>
            Restaurante
          </label>
          <select
            id="restaurante-select"
            value={selectedId ?? ''}
            onChange={e => setSelectedId(parseInt(e.target.value, 10) || null)}
            style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: 10, fontSize: '1rem', background: '#fff' }}
          >
            <option value="">Selecciona un restaurante…</option>
            {restaurantes.map(r => (
              <option key={r.id_cola} value={r.id_cola}>
                {r.nombre}{r.empresa ? ` — ${r.empresa.nombre}` : ''}
              </option>
            ))}
          </select>
        </div>

        {selected && (
          <div className="comensales-form" style={{ textAlign: 'left', marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 16px', textAlign: 'center' }}>{selected.nombre}</h3>

            <label htmlFor="reserva-nombre" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>
              Nombre del grupo *
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #ddd', borderRadius: 10, padding: '0 12px', background: '#fff', marginBottom: 14 }}>
              <input
                id="reserva-nombre"
                type="text"
                value={form.cliente_nombre}
                onChange={e => setForm({ ...form, cliente_nombre: e.target.value })}
                placeholder="Ej.: García, Aniversario, Grupo 5…"
                maxLength={80}
                style={{ width: '100%', border: 'none', outline: 'none', padding: '12px 0', background: 'transparent', fontSize: '1rem' }}
              />
            </div>

            <label htmlFor="reserva-telefono" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>
              Teléfono
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #ddd', borderRadius: 10, padding: '0 12px', background: '#fff', marginBottom: 14 }}>
              <input
                id="reserva-telefono"
                type="tel"
                value={form.cliente_telefono}
                onChange={e => setForm({ ...form, cliente_telefono: e.target.value })}
                placeholder="Ej.: 600 123 456"
                maxLength={20}
                style={{ width: '100%', border: 'none', outline: 'none', padding: '12px 0', background: 'transparent', fontSize: '1rem' }}
              />
            </div>

            <label htmlFor="reserva-email" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>
              Correo electrónico *
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #ddd', borderRadius: 10, padding: '0 12px', background: '#fff', marginBottom: 4 }}>
              <input
                id="reserva-email"
                type="email"
                value={form.cliente_email}
                onChange={e => setForm({ ...form, cliente_email: e.target.value })}
                placeholder="tucorreo@ejemplo.com"
                maxLength={150}
                style={{ width: '100%', border: 'none', outline: 'none', padding: '12px 0', background: 'transparent', fontSize: '1rem' }}
              />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0 0 14px' }}>
              Lo necesitamos para enviarte la confirmación y avisos de tu reserva.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label htmlFor="reserva-fecha" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                Fecha *
              </label>
              <input
                id="reserva-fecha"
                type="date"
                value={form.fecha}
                min={hoyLocal()}
                max={sumarDias(60)}
                onChange={e => setForm({ ...form, fecha: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: 10, fontSize: '1rem' }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <span id="slots-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                <Clock size={14} /> Hora * {loadingSlots && <span className="spinner-rest" role="status" aria-label="Cargando horarios" style={{ width: 14, height: 14 }} />}
              </span>
              {!loadingSlots && !slotsAbierto && (
                <p role="status" style={{ fontSize: '0.9rem', color: '#b91c1c' }}>Cerrado ese día. Elige otra fecha.</p>
              )}
              {!loadingSlots && slotsAbierto && slots.length === 0 && (
                <p role="status" style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>No hay horarios disponibles ese día.</p>
              )}
              <div role="group" aria-labelledby="slots-label" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {slots.map(s => {
                  const activo = form.hora_inicio === s.hora;
                  return (
                    <button
                      key={s.hora}
                      type="button"
                      disabled={!s.disponible}
                      aria-pressed={activo}
                      onClick={() => setForm({ ...form, hora_inicio: s.hora })}
                      title={s.disponible ? `Reservar a las ${s.hora}` : `${s.hora}: completo`}
                      style={{
                        border: activo ? '2px solid var(--sl-black)' : '1px solid var(--color-border)',
                        background: activo ? 'var(--sl-yellow)' : s.disponible ? '#fff' : '#f1f5f9',
                        color: s.disponible ? 'var(--sl-black)' : '#9ca3af',
                        borderRadius: 8,
                        padding: '8px 14px',
                        fontWeight: 700,
                        cursor: s.disponible ? 'pointer' : 'not-allowed',
                        textDecoration: s.disponible ? 'none' : 'line-through',
                      }}
                    >
                      {s.hora}
                    </button>
                  );
                })}
              </div>
            </div>

            <label htmlFor="reserva-comensales" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>
              <Users size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Comensales
            </label>
            <div className="comensales-stepper">
              <button type="button" onClick={() => setForm({ ...form, num_comensales: Math.max(1, form.num_comensales - 1) })} aria-label="Quitar un comensal">
                <Minus />
              </button>
              <input
                id="reserva-comensales"
                type="number"
                className="stepper-value"
                value={form.num_comensales}
                min={1}
                max={maxComensales}
                aria-label="Número de comensales"
                onChange={e => setForm({ ...form, num_comensales: Math.max(1, Math.min(maxComensales, parseInt(e.target.value) || 1)) })}
                style={{ fontSize: '2.5rem', fontWeight: 700, width: 90, textAlign: 'center', border: 'none', background: 'transparent' }}
              />
              <button type="button" onClick={() => setForm({ ...form, num_comensales: Math.min(maxComensales, form.num_comensales + 1) })} aria-label="Añadir un comensal">
                <Plus />
              </button>
            </div>
            <p className="comensales-hint">personas en tu grupo</p>

            {form.num_comensales >= maxComensales && (
              <div className="gran-grupo-alert" style={{ textAlign: 'left', marginTop: 12 }}>
                <span>
                  Tu grupo de {form.num_comensales} alcanza la capacidad máxima por mesa ({maxComensales}).
                  El restaurante te ayudará a organizaros.
                </span>
              </div>
            )}

            <button
              className="btn-ghost-rest"
              style={{ width: '100%', padding: '12px', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={handleCheck}
              disabled={checking}
            >
              <Search size={16} /> {checking ? 'Comprobando…' : 'Comprobar disponibilidad'}
            </button>

            {disponibilidad && (
              <div
                role="status"
                style={{
                  marginTop: 12,
                  padding: '12px 14px',
                  borderRadius: 10,
                  fontSize: '0.9rem',
                  background: disponibilidad.hayDisponibilidad ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${disponibilidad.hayDisponibilidad ? '#bbf7d0' : '#fecaca'}`,
                  color: disponibilidad.hayDisponibilidad ? '#15803d' : '#b91c1c',
                }}
              >
                {disponibilidad.hayDisponibilidad
                  ? `Hay mesa disponible (${disponibilidad.hora_inicio} → ${disponibilidad.hora_fin_prevista}). Puedes enviar tu solicitud.`
                  : 'En esa franja no hay mesa libre. Prueba con otra hora o fecha; aun así puedes enviar la solicitud y el restaurante la valorará.'}
              </div>
            )}

            {error && <p role="alert" style={{ color: '#b91c1c', marginTop: 8, textAlign: 'center' }}>{error}</p>}

            <button
              className="btn-restaurant yellow"
              style={{ width: '100%', padding: '14px', fontSize: '1.05rem', marginTop: 16 }}
              onClick={handleSubmit}
              disabled={loading || !form.cliente_nombre.trim() || !emailOk || !form.hora_inicio}
            >
              {loading ? <span className="spinner-rest" role="status" aria-label="Enviando" /> : 'Solicitar reserva'}
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button
            className="btn-ghost-rest"
            onClick={() => navigate('/restaurante')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.9rem' }}
          >
            <ArrowLeft size={16} /> Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestaurantReservaPage;
