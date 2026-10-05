import React from 'react';
import { CheckCircle, LogOut, Info, History } from 'lucide-react';
import { ActividadEntry } from '../../types';
import '../../styles/restaurant.css';

const ICONOS: Record<string, React.ReactNode> = {
  MESA_ASIGNADA: <CheckCircle size={16} style={{ color: '#16a34a' }} />,
  MESA_LIBERADA: <LogOut size={16} style={{ color: '#2563eb' }} />,
  MESA_ESTADO: <Info size={16} style={{ color: '#d97706' }} />,
};

const haceCuanto = (iso: string) => {
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMin < 1) return 'ahora mismo';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
};

const horaCorta = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const ActividadTab: React.FC<{ actividad: ActividadEntry[] }> = ({ actividad }) => {
  if (actividad.length === 0) {
    return (
      <div className="cola-espera-card" style={{ textAlign: 'center', color: '#999' }}>
        <History size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
        Sin actividad registrada todavía. Las asignaciones y liberaciones aparecerán aquí.
      </div>
    );
  }

  return (
    <div className="cola-espera-card">
      <div className="cola-espera-list">
        {actividad.map(a => (
          <div key={a.id_actividad} className="cola-espera-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              {ICONOS[a.tipo] || <History size={16} />}
              <div>
                <div style={{ fontWeight: 600 }}>{a.descripcion}</div>
                <div className="turno-comensales">
                  {horaCorta(a.created_at)} · {haceCuanto(a.created_at)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActividadTab;
