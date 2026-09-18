import React from 'react';
import { RestaurantStats } from '../../store/restaurant.store';
import '../../styles/restaurant.css';

interface StatsMesasWidgetProps {
  stats: RestaurantStats | null;
}

const StatsMesasWidget: React.FC<StatsMesasWidgetProps> = ({ stats }) => {
  if (!stats) return null;

  return (
    <div className="restaurant-stats">
      <div className="stat-card">
        <div className="stat-value">{stats.totalMesas}</div>
        <div className="stat-label">Mesas totales</div>
      </div>
      <div className="stat-card">
        <div className="stat-value green">{stats.mesasLibres}</div>
        <div className="stat-label">Mesas libres</div>
      </div>
      <div className="stat-card">
        <div className="stat-value red">{stats.mesasOcupadas}</div>
        <div className="stat-label">Mesas ocupadas</div>
      </div>
      <div className="stat-card">
        <div className="stat-value yellow">{stats.turnosEnEspera}</div>
        <div className="stat-label">En espera</div>
      </div>
    </div>
  );
};

export default StatsMesasWidget;
