import React from 'react';
import { Users, Clock, AlertTriangle } from 'lucide-react';
import { TurnoEspera } from '../../store/restaurant.store';
import '../../styles/restaurant.css';

interface ColaEsperaListProps {
  turnos: TurnoEspera[];
  onAsignar?: (turno: TurnoEspera) => void;
  maxCapacidad?: number;
}

// A partir de este ETA el tiempo de espera se marca en rojo (atención prioritaria)
const UMBRAL_ETA_ELEVADA_MIN = 15;

const ColaEsperaList: React.FC<ColaEsperaListProps> = ({ turnos, onAsignar, maxCapacidad }) => {
  if (turnos.length === 0) {
    return (
      <div className="cola-espera-card" style={{ textAlign: 'center', color: '#999' }}>
        No hay grupos en espera
      </div>
    );
  }

  return (
    <div className="cola-espera-card">
      <h4 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Clock size={18} /> Grupos en espera ({turnos.length})
      </h4>
      <div className="cola-espera-list">
        {turnos.map(turno => {
          const esGranGrupo = maxCapacidad != null && turno.num_comensales != null && turno.num_comensales > maxCapacidad;
          return (
            <div key={turno.id_turno} className="cola-espera-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span className="turno-posicion">#{turno.posicion}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    Turno {turno.numero_turno}
                    {turno.cliente_nombre ? ` · ${turno.cliente_nombre}` : ''}
                  </div>
                  <div className="turno-comensales">
                    <Users size={14} /> {turno.num_comensales ?? '—'} personas
                    {esGranGrupo && (
                      <span className="gran-grupo-badge">
                        <AlertTriangle size={12} /> Gran grupo
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  className={`turno-eta ${turno.eta_minutos > UMBRAL_ETA_ELEVADA_MIN ? 'negativa' : ''}`}
                  title={turno.eta_minutos > UMBRAL_ETA_ELEVADA_MIN ? `Espera superior a ${UMBRAL_ETA_ELEVADA_MIN} min: atención prioritaria` : 'Tiempo estimado de espera'}
                >
                  ~{turno.eta_minutos} min
                </span>
                {onAsignar && (
                  <button className="btn-restaurant yellow" style={{ padding: '6px 12px' }} onClick={() => onAsignar(turno)}>
                    Asignar mesa
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ColaEsperaList;
