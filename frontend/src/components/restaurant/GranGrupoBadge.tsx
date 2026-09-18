import React from 'react';
import { AlertTriangle } from 'lucide-react';
import '../../styles/restaurant.css';

interface GranGrupoBadgeProps {
  numComensales: number;
  maxCapacidad: number;
}

const GranGrupoBadge: React.FC<GranGrupoBadgeProps> = ({ numComensales, maxCapacidad }) => {
  return (
    <div className="gran-grupo-alert">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <AlertTriangle size={20} style={{ color: '#f97316' }} />
        <div>
          <strong>Grupo de gran tamaño</strong>
          <div style={{ color: '#666', fontSize: '0.9rem' }}>
            {numComensales} personas superan la capacidad máxima de {maxCapacidad} personas. Requiere intervención manual.
          </div>
        </div>
      </div>
    </div>
  );
};

export default GranGrupoBadge;
