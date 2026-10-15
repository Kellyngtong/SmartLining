import React, { useState } from 'react';
import { Plus, Phone, Trash2, Users, Search, Copy, History } from 'lucide-react';
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

interface ReservasTabProps {
  reservasActuales: Reserva[];
  reservasHistorial: Reserva[];
  zonas: { id_zona: number; nombre: string }[];
  onChangeEstado: (id: number, estado: string) => Promise<void>;
  onDelete: (reserva: Reserva) => void;
}

const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const ReservasTab: React.FC<ReservasTabProps> = ({ reservasActuales, reservasHistorial, zonas, onChangeEstado, onDelete }) => {
  const [creando, setCreando] = useState(false);
  const [vista, setVista] = useState<'actual' | 'historial'>('actual');
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
  const [checkForm, setCheckForm] = useState({ fecha: hoyLocal(), hora: '20:00', comensales: 2 });
  const [disponibilidad, setDisponibilidad] = useState<{ hayDisponibilidad: boolean; opciones: any[]; hora_inicio: string; hora_fin_prevista: string } | null>(null);
  const [colapsado, setColapsado] = useState<string | null>(null);
  const [historial, setHistorial] = useState<Record<number, any>>({});
  const [cargandoHistorial, setCargandoHistorial] = useState<number | null>(null);

  const colaId = useRestaurantStore.getState().colaId;

  const hoy = hoyLocal();

  // El backend ya devuelve cada vista ordenada (actual: asc, historial: desc)
  const reservas = vista === 'actual' ? reservasActuales : reservasHistorial;
  const ordenadas = reservas;

  const cambiarVista = (v: 'actual' | 'historial') => {
    setVista(v);
    const st = useRestaurantStore.getState();
    if (st.colaId) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      v === 'actual' ? st.fetchReservasActuales(st.colaId) : st.fetchReservasHistorial(st.colaId);
    }
  };

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
      <div className="rest-toolbar">
        <div className="vista-toggle flat" role="tablist" aria-label="Ver reservas actuales o historial">
          <button className={vista === 'actual' ? 'active' : ''} onClick={() => cambiarVista('actual')}>Actuales</button>
          <button className={vista === 'historial' ? 'active' : ''} onClick={() => cambiarVista('historial')}>Historial</button>
        </div>
        <button className="btn-restaurant" onClick={() => setCreando(c => !c)}>
          <Plus size={16} className="icon-gap" /> Nueva reserva
        </button>
        <button className="btn-ghost-rest" onClick={() => setCheck(c => !c)}>
          <Search size={16} className="icon-gap" /> Consultar disponibilidad
        </button>
        <span className="rest-count">
          {ordenadas.length} reserva(s)
        </span>
      </div>
      <p className="rest-hint">
        {vista === 'actual'
          ? 'En curso, ordenadas de más próxima a más lejana. Para la operativa del día por mesa, usa Agenda.'
          : 'Finalizadas (completadas, canceladas, no presentadas), de más reciente a más antigua.'}
      </p>

      {creando && (
        <div className="panel mb-16">
          <h4>Nueva reserva</h4>
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
              <select value={form.origen} onChange={e => setForm({ ...form, origen: e.target.value })}>
                {['TELEFONO', 'WEB', 'APP', 'WALK_IN', 'WHATSAPP', 'OTRO'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <label className="full-width check-row">
              <input type="checkbox" checked={form.auto_asignar} onChange={e => setForm({ ...form, auto_asignar: e.target.checked })} />
              Auto-asignar mesa al crear (si es hoy)
            </label>
          </div>
          <div className="rest-actions-row">
            <button className="btn-restaurant yellow" onClick={handleCrear} disabled={!form.cliente_nombre.trim()}>Crear reserva</button>
            <button className="btn-ghost-rest" onClick={() => setCreando(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {check && (
        <div className="panel mb-16">
          <h4>Disponibilidad de mesas</h4>
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
            <div className="disp-result">
              <div className="disp-title">
                {disponibilidad.hayDisponibilidad
                  ? `${disponibilidad.opciones.length} opción(es) · ${disponibilidad.hora_inicio} → ${disponibilidad.hora_fin_prevista}`
                  : 'Sin disponibilidad en esa ventana'}
              </div>
              <div className="cola-espera-list">
                {disponibilidad.opciones.slice(0, 8).map((o: any) => (
                  <div key={o.mesaPrincipal} className="cola-espera-item">
                    <div>
                      <strong>Mesa{Array.isArray(o.mesas) && o.mesas.length > 1 ? `s ${o.mesas.map((m: any) => m.numero).join(' + ')}` : ` ${o.mesas[0]?.numero ?? o.mesaPrincipal}`}</strong>
                      <span className="reserva-meta">
                        {o.capacidad} plazas{o.zonaNombre ? ` · ${o.zonaNombre}` : ''}
                      </span>
                    </div>
                    <div className="reserva-actions">
                      <span className="reserva-motivo">{o.motivo}</span>
                      <span className={`reserva-score ${o.score > 0.6 ? 't-ok' : 't-warn'}`}>{Math.round(o.score * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {ordenadas.length === 0 ? (
        <div className="cola-espera-card rest-empty">
          {vista === 'actual' ? 'No hay reservas en curso' : 'El historial está vacío'}
        </div>
      ) : (
        <div className="cola-espera-card">
          <div className="cola-espera-list">
            {ordenadas.map(r => (
              <div key={r.id_reserva} className="cola-espera-item wrap">
                <div className="reserva-row-main">
                  <span className="turno-posicion">{r.hora_inicio_str || r.hora_inicio}</span>
                  <div>
                    <div className="chip-nombre">
                      {r.cliente_nombre}
                      <span className={`rest-badge est-${r.estado}`}>
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
                <div className="reserva-actions">
                  {TRANSICIONES[r.estado]?.length > 0 && (
                    <select
                      value=""
                      onChange={e => { if (e.target.value) onChangeEstado(r.id_reserva, e.target.value); }}
                      className="reserva-select"
                    >
                      <option value="">Cambiar estado...</option>
                      {TRANSICIONES[r.estado].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                  <button className="btn-ghost-rest muted" onClick={() => setColapsado(colapsado === String(r.id_reserva) ? null : String(r.id_reserva))}>
                    Detalles
                  </button>
                  {r.token_publico && (
                    <button className="btn-ghost-rest info" onClick={() => copiarEnlace(r)} title="Copiar enlace de autogestión para el cliente">
                      <Copy size={14} />
                    </button>
                  )}
                  <button className="btn-ghost-rest danger" onClick={() => onDelete(r)}>
                    <Trash2 size={14} />
                  </button>
                </div>
                {colapsado === String(r.id_reserva) && (
                  <div className="rest-detalle-box">
                    {r.notas ? `Notas: ${r.notas} · ` : ''}Registrada el {fmtFecha(r.created_at)}{r.cliente_email ? ` · ${r.cliente_email}` : ''}
                    {r.preferencia_mesa ? ` · Mesa preferida: ${r.preferencia_mesa}` : ''}
                    {r.cliente_telefono && (
                      <div className="crm-box">
                        <button
                          className="btn-ghost-rest"
                          onClick={() => cargarHistorial(r)}
                          disabled={cargandoHistorial === r.id_reserva}
                        >
                          <History size={13} /> {cargandoHistorial === r.id_reserva ? 'Cargando…' : 'Ver historial del cliente'}
                        </button>
                        {historial[r.id_reserva] && (
                          <div className="crm-detail">
                            <strong>{historial[r.id_reserva].total} reserva(s)</strong>
                            {' · '}No-shows: <strong className={(historial[r.id_reserva].tasa_no_show ?? 0) > 20 ? 't-bad' : 't-ok'}>{historial[r.id_reserva].tasa_no_show}%</strong>
                            {Object.entries(historial[r.id_reserva].por_estado || {}).map(([e, n]) => (
                              <span key={e} className="crm-estado">{e}: {n as number}</span>
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
