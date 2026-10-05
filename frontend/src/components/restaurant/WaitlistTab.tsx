import React, { useState } from 'react';
import { Users, Plus, Trash2, Bell, UserCheck, AlertCircle, XCircle } from 'lucide-react';
import { WaitlistEntry } from '../../types';
import { useRestaurantStore } from '../../store/restaurant.store';
import '../../styles/restaurant.css';

const COLORES: Record<string, string> = {
  ESPERANDO: '#64748b',
  NOTIFICADO: '#2563eb',
  ASIGNADO: '#0d9488',
  SENTADO: '#16a34a',
  CANCELADO: '#dc2626',
  NO_SHOW: '#ea580c',
};

interface WaitlistTabProps {
  entries: WaitlistEntry[];
  onChangeEstado: (id: number, estado: string) => Promise<void>;
  onDelete: (entry: WaitlistEntry) => void;
}

const WaitlistTab: React.FC<WaitlistTabProps> = ({ entries, onChangeEstado, onDelete }) => {
  const [creando, setCreando] = useState(false);
  const [verTodas, setVerTodas] = useState(false);
  const [form, setForm] = useState({
    cliente_nombre: '',
    cliente_telefono: '',
    num_comensales: 2,
    prioridad: 0,
    notas: '',
    auto_asignar: true,
  });

  const colaId = useRestaurantStore.getState().colaId;

  const cambiarFiltro = (todas: boolean) => {
    setVerTodas(todas);
    const st = useRestaurantStore.getState();
    st.setWaitlistFiltro(todas ? {} : { activas: true });
    if (st.colaId) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      st.fetchWaitlist(st.colaId, todas ? {} : { activas: true });
    }
  };

  const handleCrear = async () => {
    if (!form.cliente_nombre.trim()) return;
    const ok = await useRestaurantStore.getState().crearWaitlist({
      id_cola: colaId,
      cliente_nombre: form.cliente_nombre,
      cliente_telefono: form.cliente_telefono || undefined,
      num_comensales: form.num_comensales,
      prioridad: form.prioridad,
      notas: form.notas || undefined,
      auto_asignar: form.auto_asignar,
    });
    if (ok) {
      setCreando(false);
      setForm({ cliente_nombre: '', cliente_telefono: '', num_comensales: 2, prioridad: 0, notas: '', auto_asignar: true });
    }
  };

  const ordenadas = [...entries].sort((a, b) => (b.prioridad - a.prioridad) || new Date(a.hora_llegada).getTime() - new Date(b.hora_llegada).getTime());

  const fmtLlegada = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        <button className="btn-restaurant" onClick={() => setCreando(c => !c)}>
          <Plus size={16} style={{ marginRight: 6 }} /> Añadir a la cola
        </button>
        <div className="vista-toggle" style={{ marginBottom: 0 }}>
          <button className={!verTodas ? 'active' : ''} onClick={() => cambiarFiltro(false)}>En espera</button>
          <button className={verTodas ? 'active' : ''} onClick={() => cambiarFiltro(true)}>Todas</button>
        </div>
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginLeft: 'auto' }}>
          {entries.length} grupo(s)
        </span>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>
        Lista manual con prioridad y preferencias. Los grupos que entran por QR aparecen en
        la pestaña Sala → Cola de comensales.
      </p>

      {creando && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 12 }}>Nuevo grupo en la cola</h4>
          <div className="mesa-form">
            <label>Cliente *
              <input value={form.cliente_nombre} onChange={e => setForm({ ...form, cliente_nombre: e.target.value })} />
            </label>
            <label>Teléfono
              <input value={form.cliente_telefono} onChange={e => setForm({ ...form, cliente_telefono: e.target.value })} />
            </label>
            <label>Comensales *
              <input type="number" min={1} value={form.num_comensales} onChange={e => setForm({ ...form, num_comensales: parseInt(e.target.value, 10) || 1 })} />
            </label>
            <label>Prioridad <span title="Mayor número = se atiende antes. 0 = orden de llegada." style={{ cursor: 'help', textDecoration: 'underline dotted' }}>(?)</span>
              <input type="number" min={0} value={form.prioridad} onChange={e => setForm({ ...form, prioridad: parseInt(e.target.value, 10) || 0 })} />
            </label>
            <label className="full-width">Notas
              <input value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} />
            </label>
            <label className="full-width" style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={form.auto_asignar} onChange={e => setForm({ ...form, auto_asignar: e.target.checked })} />
              Auto-asignar mesa inmediatamente si hay disponible
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-restaurant yellow" onClick={handleCrear} disabled={!form.cliente_nombre.trim()}>Añadir</button>
            <button className="btn-ghost-rest" onClick={() => setCreando(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {ordenadas.length === 0 ? (
        <div className="cola-espera-card" style={{ textAlign: 'center', color: '#999' }}>
          {verTodas
            ? 'No hay registros en la lista de espera'
            : 'No hay grupos esperando ahora. Usa «Todas» para ver el historial o «Añadir a la cola» para registrar uno.'}
        </div>
      ) : (
        <div className="cola-espera-card">
          <div className="cola-espera-list">
            {ordenadas.map(e => (
              <div key={e.id_waitlist} className="cola-espera-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <span className="turno-posicion">{fmtLlegada(e.hora_llegada)}</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {e.cliente_nombre}
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
                          background: COLORES[e.estado] || '#64748b',
                        }}
                      >
                        {e.estado}
                      </span>
                    </div>
                    <div className="turno-comensales">
                      <Users size={14} /> {e.num_comensales} pers.
                      {e.cliente_telefono && <span>{e.cliente_telefono}</span>}
                      {e.prioridad > 0 && <span style={{ fontWeight: 700, color: '#d97706' }}>P{e.prioridad}</span>}
                      {e.tiempo_estimado_min != null && e.tiempo_estimado_min > 0 && <span>ETA ~{e.tiempo_estimado_min} min</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {e.estado === 'ESPERANDO' && (
                    <button className="btn-restaurant" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => onChangeEstado(e.id_waitlist, 'NOTIFICADO')} title="Notificar" aria-label={`Notificar a ${e.cliente_nombre}`}>
                      <Bell size={14} />
                    </button>
                  )}
                  {e.estado === 'NOTIFICADO' && (
                    <button className="btn-restaurant yellow" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => onChangeEstado(e.id_waitlist, 'SENTADO')} title="Sentar" aria-label={`Sentar a ${e.cliente_nombre}`}>
                      <UserCheck size={14} />
                    </button>
                  )}
                  {(e.estado === 'ESPERANDO' || e.estado === 'NOTIFICADO') && (
                    <>
                      <button className="btn-ghost-rest" style={{ color: '#ea580c', padding: '5px 10px' }} onClick={() => onChangeEstado(e.id_waitlist, 'NO_SHOW')} title="No presentado" aria-label={`Marcar no presentado a ${e.cliente_nombre}`}>
                        <AlertCircle size={14} />
                      </button>
                      <button className="btn-ghost-rest" style={{ color: '#dc2626', padding: '5px 10px' }} onClick={() => onChangeEstado(e.id_waitlist, 'CANCELADO')} title="Cancelar" aria-label={`Cancelar la espera de ${e.cliente_nombre}`}>
                        <XCircle size={14} />
                      </button>
                    </>
                  )}
                  {e.estado !== 'SENTADO' && e.estado !== 'ASIGNADO' && (
                    <button className="btn-ghost-rest" style={{ color: '#b91c1c', padding: '5px 10px' }} onClick={() => onDelete(e)} title="Eliminar" aria-label={`Eliminar a ${e.cliente_nombre} de la cola`}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WaitlistTab;