import React from 'react';
import { Users, User } from 'lucide-react';
import { Mesa } from '../../models';
import { OcupanteInfo } from '../../types';
import '../../styles/restaurant.css';

interface MesaListProps {
  mesas: Mesa[];
  onMesaClick?: (mesa: Mesa) => void;
  onLiberar?: (mesa: Mesa) => void;
  ocupacion?: Record<number, OcupanteInfo>;
}

const estadoLabel: Record<string, string> = {
  LIBRE: 'Libre',
  OCUPADA: 'Ocupada',
  RESERVADA: 'Reservada',
};

const MesaList: React.FC<MesaListProps> = ({ mesas, onMesaClick, onLiberar, ocupacion }) => {
  return (
    <div className="mesa-list">
      {mesas.map(mesa => {
        const estadoClass = mesa.estado.toLowerCase();
        const ocupante = ocupacion?.[mesa.id_mesa] ?? null;
        return (
          <div key={mesa.id_mesa} className={`mesa-list-item ${estadoClass}`}>
            <div className="mesa-list-info" onClick={() => onMesaClick?.(mesa)}>
              <span className="mesa-list-numero">{mesa.numero}</span>
              <span className="mesa-capacity">
                <Users size={16} /> {mesa.capacidad} comensales
              </span>
              {ocupante && (
                <span className="ocupante-badge" title={`${ocupante.detalle} · ${ocupante.comensales} personas`}>
                  <User size={12} />
                  <span>{ocupante.nombre}{ocupante.comensales > 0 ? ` · ${ocupante.comensales}` : ''}</span>
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={`mesa-status ${estadoClass}`}>
                {estadoLabel[mesa.estado] || mesa.estado}
              </span>
              {mesa.isOcupada() && onLiberar && (
                <button className="btn-danger" onClick={() => onLiberar(mesa)}>
                  Liberar
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MesaList;
