import React from 'react';
import { Users, Link2, Armchair, Trash2 } from 'lucide-react';
import { Mesa } from '../../models';
import '../../styles/restaurant.css';

interface MesaCardProps {
  mesa: Mesa;
  onClick?: (mesa: Mesa) => void;
  onLiberar?: (mesa: Mesa) => void;
  onJuntar?: (mesa: Mesa) => void;
  onEliminar?: (mesa: Mesa) => void;
  selected?: boolean;
}

const estadoLabel: Record<string, string> = {
  LIBRE: 'Libre',
  OCUPADA: 'Ocupada',
  RESERVADA: 'Reservada',
  AGRUPADA: 'Juntada',
};

const MesaCard: React.FC<MesaCardProps> = ({ mesa, onClick, onLiberar, onJuntar, onEliminar, selected }) => {
  const estadoClass = mesa.estado.toLowerCase();
  const capacidadMostrada = mesa.capacidad_efectiva ?? mesa.getCapacidadEfectiva();

  return (
    <div
      className={`mesa-card ${estadoClass} ${selected ? 'selected' : ''}`}
      onClick={() => onClick?.(mesa)}
      {...(onClick
        ? {
            role: 'button',
            tabIndex: 0,
            'aria-label': `Mesa ${mesa.numero}, ${estadoLabel[mesa.estado] || mesa.estado}, capacidad ${capacidadMostrada}`,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(mesa);
              }
            },
          }
        : {})}
      style={{
        ...(selected ? { boxShadow: '0 0 0 3px var(--sl-yellow)' } : undefined),
        ...(onClick ? undefined : { cursor: 'default' }),
      }}
    >
      <div className="mesa-card-top">
        <span className="mesa-numero">
          {mesa.isAgrupada() && mesa.grupo
            ? `Grupo ${mesa.grupo.numero}`
            : `Mesa ${mesa.numero}`}
        </span>
        <span className="mesa-capacity">
          <Users size={16} />
          {capacidadMostrada}
          {mesa.capacidad_extra > 0 && (
            <span className="silla-badge" title={`${mesa.capacidad_extra} silla(s) extra`}>
              <Armchair size={12} /> +{mesa.capacidad_extra}
            </span>
          )}
        </span>
      </div>

      {mesa.isAgrupada() && (
        <div className="grupo-badge">
          <Link2 size={13} /> En grupo
        </div>
      )}

      <div className="mesa-card-bottom">
        <div className={`mesa-status ${estadoClass}`}>{estadoLabel[mesa.estado] || mesa.estado}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {mesa.isOcupada() && onLiberar && (
            <button
              className="btn-liberar-card"
              onClick={e => { e.stopPropagation(); onLiberar(mesa); }}
            >
              Liberar
            </button>
          )}
          {mesa.isLibre() && onJuntar && (
            <button
              className="btn-juntar-card"
              onClick={e => { e.stopPropagation(); onJuntar(mesa); }}
            >
              Juntar
            </button>
          )}
          {onEliminar && (
            <button
              className="btn-eliminar-card"
              title="Eliminar mesa"
              aria-label={`Eliminar mesa ${mesa.numero}`}
              onClick={e => { e.stopPropagation(); onEliminar(mesa); }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MesaCard;
