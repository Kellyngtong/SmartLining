import React, { useState, useEffect, useRef } from 'react';
import { Link2, Minus, Plus } from 'lucide-react';
import { Mesa } from '../../models';
import '../../styles/restaurant.css';

interface JuntarMesasModalProps {
  mesas: Mesa[];
  preseleccionadaMesaId?: number | null;
  onJuntar: (mesaIds: number[]) => void;
  onAnadirSilla: (mesaId: number) => void;
  onQuitarSilla: (mesaId: number) => void;
  onSeparar: (mesaId: number) => void;
  onClose: () => void;
}

const JuntarMesasModal: React.FC<JuntarMesasModalProps> = ({
  mesas,
  preseleccionadaMesaId,
  onJuntar,
  onAnadirSilla,
  onQuitarSilla,
  onSeparar,
  onClose,
}) => {
  const [seleccionadas, setSeleccionadas] = useState<number[]>(
    preseleccionadaMesaId != null ? [preseleccionadaMesaId] : []
  );
  const cardRef = useRef<HTMLDivElement>(null);

  // Cerrar con Escape y llevar el foco al diálogo al abrir
  useEffect(() => {
    cardRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const mesasLibres = mesas.filter(m => m.isLibre());
  const mesasAgrupadas = mesas.filter(m => m.isAgrupada());
  const bloqueadas = mesas.filter(m => m.isOcupada() || m.isReservada());

  const toggle = (id: number) => {
    setSeleccionadas(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const capacidadTotal = mesasLibres
    .filter(m => seleccionadas.includes(m.id_mesa))
    .reduce((acc, m) => acc + m.getCapacidadEfectiva(), 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Juntar mesas o ajustar sillas"
        className="modal-card"
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: 8 }}>
          <Link2 size={18} style={{ verticalAlign: '-2px', marginRight: 6 }} />
          Juntar mesas / añadir sillas
        </h3>
        <p style={{ color: '#666', marginBottom: 16 }}>
          Selecciona 2 o más mesas libres para juntarlas, o ajusta las sillas extra de una mesa.
        </p>

        <div className="mesa-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', marginBottom: 12 }}>
          {mesasLibres.length === 0 && mesasAgrupadas.length === 0 ? (
            <p style={{ color: '#999', gridColumn: '1/-1' }}>No hay mesas disponibles.</p>
          ) : (
            <>
              {mesasLibres.map(mesa => (
                <div
                  key={mesa.id_mesa}
                  className={`mesa-card ${seleccionadas.includes(mesa.id_mesa) ? 'seleccionada' : 'libre'}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={seleccionadas.includes(mesa.id_mesa)}
                  aria-label={`Mesa ${mesa.numero}, capacidad ${mesa.getCapacidadEfectiva()}`}
                  style={seleccionadas.includes(mesa.id_mesa) ? { boxShadow: '0 0 0 3px var(--sl-yellow)' } : undefined}
                  onClick={() => toggle(mesa.id_mesa)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggle(mesa.id_mesa);
                    }
                  }}
                >
                  <div className="mesa-card-top">
                    <span className="mesa-numero" style={{ fontSize: '1.1rem' }}>Mesa {mesa.numero}</span>
                    <span className="mesa-capacity">Cap. {mesa.getCapacidadEfectiva()}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}>
                      Sillas:
                      <button className="silla-btn" onClick={e => { e.stopPropagation(); onQuitarSilla(mesa.id_mesa); }} aria-label={`Quitar silla de la mesa ${mesa.numero}`}>
                        <Minus size={14} />
                      </button>
                      <span style={{ fontWeight: 700 }}>{mesa.capacidad_extra}</span>
                      <button className="silla-btn" onClick={e => { e.stopPropagation(); onAnadirSilla(mesa.id_mesa); }} aria-label={`Añadir silla a la mesa ${mesa.numero}`}>
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {mesasAgrupadas.map(mesa => (
                <div
                  key={mesa.id_mesa}
                  className="mesa-card agrupada"
                  style={{ opacity: 0.85, cursor: 'default' }}
                  title="Esta mesa ya forma parte de un grupo"
                >
                  <div className="mesa-card-top">
                    <span className="mesa-numero" style={{ fontSize: '1.1rem' }}>Mesa {mesa.numero}</span>
                    <span className="mesa-capacity">Cap. {mesa.getCapacidadEfectiva()}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <span className="grupo-badge"><Link2 size={13} /> Juntada</span>
                    <button
                      className="btn-ghost-rest"
                      style={{ fontSize: '0.8rem', padding: '2px 8px', marginLeft: 'auto' }}
                      onClick={e => { e.stopPropagation(); onSeparar(mesa.id_mesa); }}
                    >
                      Separar
                    </button>
                  </div>
                </div>
              ))}

              {bloqueadas.length > 0 && (
                <div className="mesa-card" style={{ gridColumn: '1/-1', borderColor: '#e5e7eb', opacity: 0.6, cursor: 'default', backgroundColor: '#f9fafb' }}>
                  <span style={{ color: '#999', fontSize: '0.9rem' }}>
                    {bloqueadas.length} mesa(s) ocupada(s)/reservada(s) no disponibles para juntar.
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {seleccionadas.length >= 2 && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.95rem' }}>
            <strong>{seleccionadas.length} mesas</strong> seleccionadas · capacidad total <strong>{capacidadTotal} plazas</strong>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-ghost-rest" onClick={onClose}>Cancelar</button>
          <button
            className="btn-restaurant yellow"
            disabled={seleccionadas.length < 2}
            onClick={() => seleccionadas.length >= 2 && onJuntar(seleccionadas)}
          >
            Juntar {seleccionadas.length >= 2 ? `(${seleccionadas.length} mesas)` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JuntarMesasModal;
