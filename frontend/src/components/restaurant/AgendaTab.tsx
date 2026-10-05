import React from 'react';
import { Users, Clock, ArrowRight, CheckCircle } from 'lucide-react';
import { Reserva } from '../../types';
import { Mesa } from '../../models';
import '../../styles/restaurant.css';

// Primer estado de cada transición = "avanzar" en 1 clic
const SIGUIENTE: Record<string, string> = {
  PENDIENTE: 'CONFIRMADA',
  CONFIRMADA: 'CHECKED_IN',
  CHECKED_IN: 'SENTADA',
  SENTADA: 'COMPLETADA',
};

const ETIQUETA_AVANZAR: Record<string, string> = {
  PENDIENTE: 'Confirmar',
  CONFIRMADA: 'Check-in',
  CHECKED_IN: 'Sentar',
  SENTADA: 'Completar',
};

const COLORES: Record<string, string> = {
  PENDIENTE: '#64748b',
  CONFIRMADA: '#2563eb',
  CHECKED_IN: '#0d9488',
  SENTADA: '#16a34a',
  COMPLETADA: '#1e293b',
  CANCELADA: '#dc2626',
  NO_SHOW: '#ea580c',
};

interface ReservaConMesa extends Reserva {
  asignaciones?: Array<{
    id_asignacion: number;
    mesa_id: number;
    estado: string;
    mesa?: { id_mesa: number; numero: number } | null;
  }>;
}

interface AgendaTabProps {
  reservas: ReservaConMesa[];
  mesas: Mesa[];
  fecha: string;
  onFechaChange: (fecha: string) => void;
  onChangeEstado: (id: number, estado: string) => Promise<void>;
}

const horaCorta = (v: string) => {
  const d = new Date(v);
  if (!isNaN(d.getTime())) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return v.slice(11, 16);
};

const AgendaTab: React.FC<AgendaTabProps> = ({ reservas, mesas, fecha, onFechaChange, onChangeEstado }) => {
  const vivas = reservas.filter(r => !['CANCELADA', 'NO_SHOW', 'COMPLETADA'].includes(r.estado));
  const ordenadas = [...vivas].sort((a, b) =>
    (a.hora_inicio_str || a.hora_inicio).localeCompare(b.hora_inicio_str || b.hora_inicio)
  );

  const mesaDe = (r: ReservaConMesa): number | null => {
    const act = (r.asignaciones || []).find(a => a.estado === 'PENDIENTE' || a.estado === 'ACTIVA');
    return act ? act.mesa_id : null;
  };

  const sinMesa = ordenadas.filter(r => mesaDe(r) == null);
  const mesasOrdenadas = [...mesas].sort((a, b) => a.numero - b.numero);

  const chip = (r: ReservaConMesa) => {
    const siguiente = SIGUIENTE[r.estado];
    return (
      <div key={r.id_reserva} className="cola-espera-item" style={{ flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span className="turno-posicion"><Clock size={14} style={{ verticalAlign: 'middle' }} /> {horaCorta(r.hora_inicio_str || r.hora_inicio)}</span>
          <div>
            <div style={{ fontWeight: 600 }}>
              {r.cliente_nombre}
              <span
                style={{
                  marginLeft: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 8px',
                  borderRadius: 20,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#fff',
                  background: COLORES[r.estado] || '#64748b',
                }}
              >
                {r.estado}
              </span>
            </div>
            <div className="turno-comensales">
              <Users size={14} /> {r.num_comensales} pers.
              {r.cliente_telefono && <span>{r.cliente_telefono}</span>}
            </div>
          </div>
        </div>
        {siguiente && (
          <button
            className="btn-restaurant yellow"
            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => onChangeEstado(r.id_reserva, siguiente)}
            aria-label={`${ETIQUETA_AVANZAR[r.estado]}: ${r.cliente_nombre}`}
          >
            {r.estado === 'SENTADA' ? <CheckCircle size={14} /> : <ArrowRight size={14} />}
            {ETIQUETA_AVANZAR[r.estado]}
          </button>
        )}
      </div>
    );
  };

  if (ordenadas.length === 0) {
    return (
      <div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="date"
              value={fecha}
              onChange={e => onFechaChange(e.target.value)}
              style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8 }}
            />
          </label>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Operativa del día por mesa — avanzar estados en 1 clic. Para crear o editar, usa Reservas.
          </span>
        </div>
        <div className="cola-espera-card" style={{ textAlign: 'center', color: '#999' }}>
          No hay reservas activas para esta fecha
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="date"
            value={fecha}
            onChange={e => onFechaChange(e.target.value)}
            style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          Operativa del día por mesa — avanzar estados en 1 clic. Para crear o editar, usa Reservas.
        </span>
      </div>
      {sinMesa.length > 0 && (
        <div className="panel" style={{ marginBottom: 16, borderLeft: '5px solid var(--sl-yellow)' }}>
          <h3>Sin mesa asignada ({sinMesa.length})</h3>
          <div className="cola-espera-list">
            {sinMesa.map(chip)}
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {mesasOrdenadas.map(m => {
          const deMesa = ordenadas.filter(r => mesaDe(r) === m.id_mesa);
          if (deMesa.length === 0) return null;
          return (
            <div key={m.id_mesa} className="panel" style={{ marginBottom: 0 }}>
              <h3>Mesa {m.numero} <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400, fontSize: '0.85rem' }}>· cap. {m.getCapacidadEfectiva()}</span></h3>
              <div className="cola-espera-list">
                {deMesa.map(chip)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AgendaTab;
