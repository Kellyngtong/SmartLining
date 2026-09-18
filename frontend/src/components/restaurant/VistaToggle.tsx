import React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import '../../styles/restaurant.css';

interface VistaToggleProps {
  vista: 'grid' | 'lista';
  onVistaChange: (vista: 'grid' | 'lista') => void;
}

const VistaToggle: React.FC<VistaToggleProps> = ({ vista, onVistaChange }) => {
  return (
    <div className="vista-toggle">
      <button className={vista === 'grid' ? 'active' : ''} onClick={() => onVistaChange('grid')}>
        <LayoutGrid size={16} /> Grid
      </button>
      <button className={vista === 'lista' ? 'active' : ''} onClick={() => onVistaChange('lista')}>
        <List size={16} /> Lista
      </button>
    </div>
  );
};

export default VistaToggle;
