import React, { useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { Zona } from '../../types';
import '../../styles/restaurant.css';

const TIPOS_ZONA = ['SALA', 'TERRAZA', 'BARRA', 'VIP', 'EXTERIOR', 'PRIVADO'];

interface ZonasTabProps {
  zonas: Zona[];
  mesasSinZona: { id_mesa: number; numero: number }[];
  onCrear: (data: { nombre: string; tipo?: string; orden?: number; activa?: boolean }) => Promise<boolean>;
  onEditar: (id: number, data: { nombre?: string; tipo?: string; orden?: number; activa?: boolean }) => Promise<boolean>;
  onEliminar: (zona: Zona) => void;
  onAsignarMesas: (id: number, mesa_ids: number[]) => Promise<boolean>;
}

const ZonasTab: React.FC<ZonasTabProps> = ({ zonas, mesasSinZona, onCrear, onEditar, onEliminar, onAsignarMesas }) => {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('SALA');
  const [editando, setEditando] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [asignando, setAsignando] = useState<number | null>(null);
  const [selMesas, setSelMesas] = useState<number[]>([]);

  const handleCrear = async () => {
    if (!nombre.trim()) return;
    const ok = await onCrear({ nombre, tipo });
    if (ok) {
      setNombre('');
      setTipo('SALA');
    }
  };

  const comenzarAsignacion = (z: Zona) => {
    setAsignando(z.id_zona);
    setSelMesas((z.mesas || []).map(m => m.id_mesa));
  };

  const guardarAsignacion = async () => {
    if (asignando == null) return;
    const ok = await onAsignarMesas(asignando, selMesas);
    if (ok) setAsignando(null);
  };

  const toggleMesa = (id: number) => {
    setSelMesas(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  return (
    <div>
      <div className="panel" style={{ marginBottom: 16 }}>
        <h4 style={{ marginBottom: 12 }}>Nueva zona</h4>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            placeholder="Nombre de la zona (ej: Terraza)"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, flex: 1, minWidth: 200 }}
          />
          <select
            value={tipo}
            onChange={e => setTipo(e.target.value)}
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          >
            {TIPOS_ZONA.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="btn-restaurant yellow" onClick={handleCrear} disabled={!nombre.trim()}>
            <Plus size={16} style={{ marginRight: 6 }} /> Crear zona
          </button>
        </div>
      </div>

      {zonas.length === 0 ? (
        <div className="cola-espera-card" style={{ textAlign: 'center', color: '#999' }}>
          No hay zonas configuradas
        </div>
      ) : (
        <div className="cola-espera-list">
          {zonas.map(z => {
            const expandido = asignando === z.id_zona;
            const mesasDeZona = z.mesas || [];
            const candidatas = expandido
              ? [...zonas.filter(zo => zo.id_zona !== z.id_zona).flatMap(zo => (zo.mesas || []).map(m => ({ id_mesa: m.id_mesa, numero: m.numero, origen: zo.nombre }))), ...mesasSinZona.map(m => ({ ...m, origen: null as string | null }))]
                  .filter((m, i, arr) => arr.findIndex(x => x.id_mesa === m.id_mesa) === i)
                  .sort((a, b) => a.numero - b.numero)
              : [];
            return (
              <div key={z.id_zona} className="cola-espera-card" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{z.nombre}</span>
                    <span style={{ background: 'var(--sl-yellow)', color: 'var(--sl-black)', borderRadius: 8, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {z.tipo || 'SALA'}
                    </span>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>{mesasDeZona.length} mesa(s)</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-ghost-rest" style={{ padding: '6px 12px' }} onClick={() => comenzarAsignacion(z)}>
                      Organizar mesas
                    </button>
                    <button
                      className="btn-ghost-rest"
                      style={{ padding: '6px 12px' }}
                      onClick={() => { setEditando(z.id_zona); setEditNombre(z.nombre); }}
                    >
                      Renombrar
                    </button>
                    <button className="btn-ghost-rest" style={{ color: '#b91c1c', padding: '6px 12px' }} onClick={() => onEliminar(z)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {editando === z.id_zona && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <input
                      value={editNombre}
                      onChange={e => setEditNombre(e.target.value)}
                      style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, flex: 1 }}
                    />
                    <button
                      className="btn-restaurant yellow"
                      onClick={async () => {
                        const ok = await onEditar(z.id_zona, { nombre: editNombre, tipo: z.tipo || undefined, orden: z.orden ?? undefined, activa: z.activa });
                        if (ok) setEditando(null);
                      }}
                      disabled={!editNombre.trim()}
                    >
                      <Save size={14} /> Renombrar
                    </button>
                    <button className="btn-ghost-rest" onClick={() => setEditando(null)}>Cancelar</button>
                  </div>
                )}

                {mesasDeZona.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    {[...mesasDeZona].sort((a, b) => a.numero - b.numero).map(m => (
                      <span key={m.id_mesa} style={{ background: '#f1f5f9', border: '1px solid var(--color-border)', borderRadius: 8, padding: '4px 10px', fontSize: '0.85rem', fontWeight: 600 }}>
                        Mesa {m.numero}
                      </span>
                    ))}
                  </div>
                )}

                {expandido && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                    <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.9rem' }}>Selecciona las mesas de la zona:</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxHeight: 200, overflowY: 'auto' }}>
                      {[...mesasDeZona.map(m => ({ id_mesa: m.id_mesa, numero: m.numero, origen: z.nombre })), ...candidatas]
                        .filter((m, i, arr) => arr.findIndex(x => x.id_mesa === m.id_mesa) === i)
                        .sort((a, b) => a.numero - b.numero)
                        .map(m => (
                          <button
                            key={m.id_mesa}
                            onClick={() => toggleMesa(m.id_mesa)}
                            aria-pressed={selMesas.includes(m.id_mesa)}
                            title={m.origen ? `Actualmente en: ${m.origen}` : 'Sin zona asignada'}
                            style={{
                              border: selMesas.includes(m.id_mesa) ? '2px solid var(--sl-black)' : '1px solid var(--color-border)',
                              background: selMesas.includes(m.id_mesa) ? 'var(--sl-yellow)' : '#fff',
                              color: 'var(--sl-black)',
                              borderRadius: 8,
                              padding: '5px 12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Mesa {m.numero}{m.origen && m.origen !== z.nombre ? ` (${m.origen})` : ''}
                          </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button className="btn-restaurant yellow" onClick={guardarAsignacion}>Guardar ({selMesas.length} mesas)</button>
                      <button className="btn-ghost-rest" onClick={() => setAsignando(null)}>Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ZonasTab;