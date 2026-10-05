import React, { useState } from 'react';
import { CalendarDays, Plus, Phone, Trash2, Users, Search, Copy, History } from 'lucide-react';
import { Reserva } from '../../types';
import { apiClient } from '../../services/api';
import { useRestaurantStore } from '../../store/restaurant.store';
import '../../styles/restaurant.css';

const TRANSICIONES: Record<string, string[]> = {
  PENDIENTE: ['CONFIRMADA', 'CANCELADA'],
  CONFIRMADA: ['CHECKED_IN', 'CANCELADA', 'COMPLETADA'],
  CHECKED_IN: ['SENTADA', 'NO_SHOW', 'COMPLETADA'],
  SENTADA: ['COMPLETADA', 'NO_SHOW'],
  COMPLETADA: [],
  CANCELADA: [],
  NO_SHOW: [],
};

const COLORES: Record<string, string> = {
  PENDIENTE: '#64748b',
  CONFIRMADA: '#2563eb',
  CHECKED_IN: '#0d9488',
  SENTADA: '#16a34a',
  COMPLETADA: '#1e293b',
  CANCELADA: '#dc2626',
  NO_SHOW: '#ea580c',
};

interface ReservasTabProps {
  reservas: Reserva[];
  fecha: string;
  zonas: { id_zona: number; nombre: string }[];
  onFechaChange: (fecha: string) => void;
  onChangeEstado: (id: number, estado: string) => Promise<void>;
  onDelete: (reserva: Reserva) => void;
}

const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const ReservasTab: React.FC<ReservasTabProps> = ({ reservas, fecha, zonas, onFechaChange, onChangeEstado, onDelete }) => {
  const [creando, setCreando] = useState(false);
  const [check, setCheck] = useState(false);
  const [form, setForm] = useState({
    cliente_nombre: '',
    cliente_telefono: '',
    fecha: hoyLocal(),
    hora_inicio: '20:00',
    num_comensales: 2,
    origen: 'TELEFONO',
    auto_asignar: true,
  });
  const [checkForm, setCheckForm] = useState({ fecha: fecha || hoyLocal(), hora: '20:00', comensales: 2 });
  const [disponibilidad, setDisponibilidad] = useState<{ hayDisponibilidad: boolean; opciones: any[]; hora_inicio: string; hora_fin_prevista: string } | null>(null);
  const [colapsado, setColapsado] = useState<string | null>(null);
  const [historial, setHistorial] = useState<Record<number, any>>({});
  const [cargandoHistorial, setCargandoHistorial] = useState<number | null>(null);

  const colaId = useRestaurantStore.getState().colaId;

  const hoy = hoyLocal();

  const ordenadas = [...reservas].sort((a, b) => (a.hora_inicio_str || a.hora_inicio).localeCompare(b.hora_inicio_str || b.hora_inicio));

  const handleCrear = async () => {
    if (!form.cliente_nombre.trim() || !form.fecha || !form.hora_inicio) return;
    const ok = await useRestaurantStore.getState().crearReserva({
      id_cola: colaId,
      cliente_nombre: form.cliente_nombre,
      cliente_telefono: form.cliente_telefono,
      fecha: form.fecha,
      hora_inicio: form.hora_inicio,
      num_comensales: form.num_comensales,
      origen: form.origen,
      auto_asignar: form.auto_asignar,
    });
    if (ok) {
      setCreando(false);
      setForm({ ...form, cliente_nombre: '', cliente_telefono: '' });
    }
  };

  const handleCheck = async () => {
    if (!colaId) return;
    try {
      const res = await apiClient.getDisponibilidad(colaId, {
        fecha: checkForm.fecha,
        hora: checkForm.hora,
        comensales: checkForm.comensales,
      });
      setDisponibilidad(res.data);
    } catch (e) {
      setDisponibilidad(null);
    }
  };

  const fmtFecha = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const zonaNombre = (id: number | null): string => {
    if (!id) return '—';
    return zonas.find(z => z.id_zona === id)?.nombre || `Zona ${id}`;
  };

  const copiarEnlace = (r: Reserva) => {
    if (!r.token_publico) return;
    navigator.clipboard.writeText(`${window.location.origin}/restaurante/mi-reserva/${r.token_publico}`);
    alert('Enlace de autogestión copiado. Compártelo con el cliente por WhatsApp o SMS.');
  };

  const cargarHistorial = async (r: Reserva) => {
    if (!r.cliente_telefono || !colaId) return;
    if (historial[r.id_reserva]) return;
    setCargandoHistorial(r.id_reserva);
    try {
      const res = await apiClient.getClienteHistorial(colaId, r.cliente_telefono);
      setHistorial(h => ({ ...h, [r.id_reserva]: res.data }));
    } catch (e) {
      // sin historial
    } finally {
      setCargandoHistorial(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CalendarDays size={16} />
          <input
            type="date"
            value={fecha}
            onChange={e => { onFechaChange(e.target.value); setCheckForm({ ...checkForm, fecha: e.target.value }); }}
            style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>
        <button className="btn-restaurant" onClick={() => setCreando(c => !c)}>
          <Plus size={16} style={{ marginRight: 6 }} /> Nueva reserva
        </button>
        <button className="btn-ghost-rest" onClick={() => setCheck(c => !c)}>
          <Search size={16} style={{ marginRight: 6 }} /> Consultar disponibilidad
        </button>
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginLeft: 'auto' }}>
          {ordenadas.length} reserva(s)
        </span>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>
        Gestión completa: crear, editar, filtrar y consultar disponibilidad. Para la operativa del día por mesa, usa Agenda.
      </p>

      {creando && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 12 }}>Nueva reserva</h4>
          <div className="mesa-form">
            <label>Cliente *
              <input value={form.cliente_nombre} onChange={e => setForm({ ...form, cliente_nombre: e.target.value })} />
            </label>
            <label>Teléfono
              <input value={form.cliente_telefono} onChange={e => setForm({ ...form, cliente_telefono: e.target.value })} />
            </label>
            <label>Fecha *
              <input type="date" value={form.fecha} min={hoy} onChange={e => setForm({ ...form, fecha: e.target.value })} />
            </label>
            <label>Hora *
              <input type="time" value={form.hora_inicio} onChange={e => setForm({ ...form, hora_inicio: e.target.value })} />
            </label>
            <label>Comensales *
              <input type="number" min={1} value={form.num_comensales} onChange={e => setForm({ ...form, num_comensales: parseInt(e.target.value, 10) || 1 })} />
            </label>
            <label>Origen
              <select value={form.origen} onChange={e => setForm({ ...form, origen: e.target.value })} style={{ padding: 10 }}>
                {['TELEFONO', 'WEB', 'APP', 'WALK_IN', 'WHATSAPP', 'OTRO'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <label className="full-width" style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={form.auto_asignar} onChange={e => setForm({ ...form, auto_asignar: e.target.checked })} />
              Auto-asignar mesa al crear (si es hoy)
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-restaurant yellow" onClick={handleCrear} disabled={!form.cliente_nombre.trim()}>Crear reserva</button>
            <button className="btn-ghost-rest" onClick={() => setCreando(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {check && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 12 }}>Disponibilidad de mesas</h4>
          <div className="mesa-form">
            <label>Fecha
              <input type="date" value={checkForm.fecha} min={hoy} onChange={e => setCheckForm({ ...checkForm, fecha: e.target.value })} />
            </label>
            <label>Hora
              <input type="time" value={checkForm.hora} onChange={e => setCheckForm({ ...checkForm, hora: e.target.value })} />
            </label>
            <label>Comensales
              <input type="number" min={1} value={checkForm.comensales} onChange={e => setCheckForm({ ...checkForm, comensales: parseInt(e.target.value, 10) || 1 })} />
            </label>
          </div>
          <button className="btn-restaurant" onClick={handleCheck}>Consultar</button>
          {disponibilidad && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                {disponibilidad.hayDisponibilidad
                  ? `${disponibilidad.opciones.length} opción(es) · ${disponibilidad.hora_inicio} → ${disponibilidad.hora_fin_prevista}`
                  : 'Sin disponibilidad en esa ventana'}
              </div>
              <div className="cola-espera-list">
                {disponibilidad.opciones.slice(0, 8).map((o: any) => (
                  <div key={o.mesaPrincipal} className="cola-espera-item">
                    <div>
                      <strong>Mesa{Array.isArray(o.mesas) && o.mesas.length > 1 ? `s ${o.mesas.map((m: any) => m.numero).join(' + ')}` : ` ${o.mesas[0]?.numero ?? o.mesaPrincipal}`}</strong>
                      <span style={{ color: 'var(--color-text-secondary)', marginLeft: 8 }}>
                        {o.capacidad} plazas{o.zonaNombre ? ` · ${o.zonaNombre}` : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{o.motivo}</span>
                      <span style={{ fontWeight: 700, color: o.score > 0.6 ? '#16a34a' : '#d97706' }}>{Math.round(o.score * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {ordenadas.length === 0 ? (
        <div className="cola-espera-card" style={{ textAlign: 'center', color: '#999' }}>
          No hay reservas para esta fecha
        </div>
      ) : (
        <div className="cola-espera-card">
          <div className="cola-espera-list">
            {ordenadas.map(r => (
              <div key={r.id_reserva} className="cola-espera-item" style={{ flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <span className="turno-posicion">{r.hora_inicio_str || r.hora_inicio}</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {r.cliente_nombre}
                      <span
                        style={{
                          marginLeft: 10,
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 8px',
                          borderRadius: 20,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#fff',
                          background: COLORES[r.estado] || '#64748b',
                        }}
                      >
                        {r.estado}
                      </span>
                    </div>
                    <div className="turno-comensales">
                      <Users size={14} /> {r.num_comensales} pers.
                      {r.cliente_telefono && <span><Phone size={13} /> {r.cliente_telefono}</span>}
                      <span>{fmtFecha(r.fecha)}</span>
                      <span>{r.origen}</span>
                      {r.preferencia_zona && <span>Zona: {zonaNombre(r.preferencia_zona)}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {TRANSICIONES[r.estado]?.length > 0 && (
                    <select
                      value=""
                      onChange={e => { if (e.target.value) onChangeEstado(r.id_reserva, e.target.value); }}
                      style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 8 }}
                    >
                      <option value="">Cambiar estado...</option>
                      {TRANSICIONES[r.estado].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                  <button className="btn-ghost-rest" style={{ color: '#64748b' }} onClick={() => setColapsado(colapsado === String(r.id_reserva) ? null : String(r.id_reserva))}>
                    Detalles
                  </button>
                  {r.token_publico && (
                    <button className="btn-ghost-rest" style={{ color: '#2563eb' }} onClick={() => copiarEnlace(r)} title="Copiar enlace de autogestión para el cliente">
                      <Copy size={14} />
                    </button>
                  )}
                  <button className="btn-ghost-rest" style={{ color: '#b91c1c' }} onClick={() => onDelete(r)}>
                    <Trash2 size={14} />
                  </button>
                </div>
                {colapsado === String(r.id_reserva) && (
                  <div style={{ width: '100%', marginTop: 8, padding: '10px 12px', background: '#fafafa', borderRadius: 8, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                    {r.notas ? `Notas: ${r.notas} · ` : ''}Registrada el {fmtFecha(r.created_at)}{r.cliente_email ? ` · ${r.cliente_email}` : ''}
                    {r.preferencia_mesa ? ` · Mesa preferida: ${r.preferencia_mesa}` : ''}
                    {r.cliente_telefono && (
                      <div style={{ marginTop: 8 }}>
                        <button
                          className="btn-ghost-rest"
                          style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          onClick={() => cargarHistorial(r)}
                          disabled={cargandoHistorial === r.id_reserva}
                        >
                          <History size={13} /> {cargandoHistorial === r.id_reserva ? 'Cargando…' : 'Ver historial del cliente'}
                        </button>
                        {historial[r.id_reserva] && (
                          <div style={{ marginTop: 8, padding: '8px 10px', background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8 }}>
                            <strong>{historial[r.id_reserva].total} reserva(s)</strong>
                            {' · '}No-shows: <strong style={{ color: (historial[r.id_reserva].tasa_no_show ?? 0) > 20 ? '#dc2626' : '#15803d' }}>{historial[r.id_reserva].tasa_no_show}%</strong>
                            {Object.entries(historial[r.id_reserva].por_estado || {}).map(([e, n]) => (
                              <span key={e} style={{ marginLeft: 8 }}>{e}: {n as number}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservasTab;