import React from 'react';
import { Users } from 'lucide-react';
import { Mesa } from '../../models';
import '../../styles/restaurant.css';

interface MesaListProps {
  mesas: Mesa[];
  onMesaClick?: (mesa: Mesa) => void;
  onLiberar?: (mesa: Mesa) => void;
}

const estadoLabel: Record<string, string> = {
  LIBRE: 'Libre',
  OCUPADA: 'Ocupada',
  RESERVADA: 'Reservada',
};

const MesaList: React.FC<MesaListProps> = ({ mesas, onMesaClick, onLiberar }) => {
  return (
    <div className="mesa-list">
      {mesas.map(mesa => {
        const estadoClass = mesa.estado.toLowerCase();
        return (
          <div key={mesa.id_mesa} className={`mesa-list-item ${estadoClass}`}>
            <div className="mesa-list-info" onClick={() => onMesaClick?.(mesa)}>
              <span className="mesa-list-numero">{mesa.numero}</span>
              <span className="mesa-capacity">
                <Users size={16} /> {mesa.capacidad} comensales
              </span>
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
