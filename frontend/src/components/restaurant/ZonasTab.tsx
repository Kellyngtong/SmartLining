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
      <div className="panel mb-16">
        <h4>Nueva zona</h4>
        <div className="zona-form-row">
          <input
            placeholder="Nombre de la zona (ej: Terraza)"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
          />
          <select
            value={tipo}
            onChange={e => setTipo(e.target.value)}
          >
            {TIPOS_ZONA.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="btn-restaurant yellow btn-inline" onClick={handleCrear} disabled={!nombre.trim()}>
            <Plus size={16} /> Crear zona
          </button>
        </div>
      </div>

      {zonas.length === 0 ? (
        <div className="cola-espera-card rest-empty">
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
              <div key={z.id_zona} className="cola-espera-card zona-card">
                <div className="zona-head">
                  <div className="zona-head-left">
                    <span className="zona-nombre">{z.nombre}</span>
                    <span className="zona-tipo-badge">
                      {z.tipo || 'SALA'}
                    </span>
                    <span className="zona-count">{mesasDeZona.length} mesa(s)</span>
                  </div>
                  <div className="zona-actions">
                    <button className="btn-ghost-rest" onClick={() => comenzarAsignacion(z)}>
                      Organizar mesas
                    </button>
                    <button
                      className="btn-ghost-rest"
                      onClick={() => { setEditando(z.id_zona); setEditNombre(z.nombre); }}
                    >
                      Renombrar
                    </button>
                    <button className="btn-ghost-rest danger" onClick={() => onEliminar(z)} aria-label={`Eliminar zona ${z.nombre}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {editando === z.id_zona && (
                  <div className="zona-edit-row">
                    <input
                      value={editNombre}
                      onChange={e => setEditNombre(e.target.value)}
                      aria-label="Nuevo nombre de la zona"
                    />
                    <button
                      className="btn-restaurant yellow btn-inline"
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
                  <div className="zona-tags">
                    {[...mesasDeZona].sort((a, b) => a.numero - b.numero).map(m => (
                      <span key={m.id_mesa} className="zona-mesa-tag">
                        Mesa {m.numero}
                      </span>
                    ))}
                  </div>
                )}

                {expandido && (
                  <div className="zona-expand-box">
                    <div className="zona-expand-title">Selecciona las mesas de la zona:</div>
                    <div className="zona-picker">
                      {[...mesasDeZona.map(m => ({ id_mesa: m.id_mesa, numero: m.numero, origen: z.nombre })), ...candidatas]
                        .filter((m, i, arr) => arr.findIndex(x => x.id_mesa === m.id_mesa) === i)
                        .sort((a, b) => a.numero - b.numero)
                        .map(m => (
                          <button
                            key={m.id_mesa}
                            onClick={() => toggleMesa(m.id_mesa)}
                            aria-pressed={selMesas.includes(m.id_mesa)}
                            title={m.origen ? `Actualmente en: ${m.origen}` : 'Sin zona asignada'}
                            className={`zona-chip${selMesas.includes(m.id_mesa) ? ' selected' : ''}`}
                          >
                            Mesa {m.numero}{m.origen && m.origen !== z.nombre ? ` (${m.origen})` : ''}
                          </button>
                        ))}
                    </div>
                    <div className="rest-actions-row mt-12">
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
