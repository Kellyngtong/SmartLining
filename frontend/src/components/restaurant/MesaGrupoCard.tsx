import React from 'react';
import { Users, Link2 } from 'lucide-react';
import { MesaGrupoAgrupado } from '../../models/mesaGrupos';
import '../../styles/restaurant.css';

interface MesaGrupoCardProps {
  grupo: MesaGrupoAgrupado;
  onLiberar?: (grupo: MesaGrupoAgrupado) => void;
  selected?: boolean;
}

const MesaGrupoCard: React.FC<MesaGrupoCardProps> = ({ grupo, onLiberar, selected }) => {
  const estadoClass = grupo.miembroOcupado ? 'ocupada' : 'libre';
  const label = grupo.miembroOcupado ? 'Ocupada' : 'Juntada';

  return (
    <div
      className={`mesa-card agrupada ${estadoClass} ${selected ? 'selected' : ''}`}
      style={selected ? { boxShadow: '0 0 0 3px var(--sl-yellow)' } : undefined}
    >
      <div className="mesa-card-top">
        <span className="mesa-numero">Grupo {grupo.numero}</span>
        <span className="mesa-capacity">
          <Users size={16} />
          {grupo.capacidad_total}
        </span>
      </div>

      <div className="grupo-badge">
        <Link2 size={13} /> {grupo.mesas.length} mesas juntadas
      </div>

      <div className="mesa-card-bottom">
        <div className={`mesa-status ${estadoClass}`}>{label}</div>
        {grupo.miembroOcupado && onLiberar && (
          <button
            className="btn-liberar-card"
            onClick={e => { e.stopPropagation(); onLiberar(grupo); }}
          >
            Liberar
          </button>
        )}
      </div>
    </div>
  );
};

export default MesaGrupoCard;
