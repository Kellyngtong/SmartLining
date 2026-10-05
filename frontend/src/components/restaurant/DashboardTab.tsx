import React, { useEffect, useState } from 'react';
import { Users, CalendarDays, Clock, Utensils, LayoutGrid, TrendingUp } from 'lucide-react';
import { DashboardSala } from '../../types';
import { apiClient } from '../../services/api';
import '../../styles/restaurant.css';

const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE: '#64748b',
  CONFIRMADA: '#2563eb',
  CHECKED_IN: '#0d9488',
  SENTADA: '#16a34a',
  COMPLETADA: '#1e293b',
  CANCELADA: '#dc2626',
  NO_SHOW: '#ea580c',
};

interface DashboardTabProps {
  dashboard: DashboardSala | null;
  colaId?: number;
}

const DashboardTab: React.FC<DashboardTabProps> = ({ dashboard, colaId }) => {
  const [reporte, setReporte] = useState<any>(null);

  useEffect(() => {
    if (!colaId) return;
    apiClient
      .getReporteReservas(colaId)
      .then(res => setReporte(res.data))
      .catch(() => {});
  }, [colaId]);

  if (!dashboard) {
    return <div className="cola-espera-card" style={{ textAlign: 'center', color: '#999' }}>Cargando dashboard...</div>;
  }

  const m = dashboard.mesas;

  return (
    <div>
      <div className="restaurant-stats">
        <div className="stat-card">
          <div className="stat-value">{m.total_mesas}</div>
          <div className="stat-label">Mesas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value green">{m.libres}</div>
          <div className="stat-label">Libres</div>
        </div>
        <div className="stat-card">
          <div className="stat-value red">{m.ocupadas}</div>
          <div className="stat-label">Ocupadas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value yellow">{m.reservadas}</div>
          <div className="stat-label">Reservadas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: m.tasa_ocupacion > 80 ? '#dc2626' : m.tasa_ocupacion > 60 ? '#d97706' : '#16a34a' }}>
            {m.tasa_ocupacion}%
          </div>
          <div className="stat-label">Tasa ocupación</div>
        </div>
      </div>

      <div className="operator-layout" style={{ marginBottom: 24 }}>
        <div className="panel">
          <h3><LayoutGrid size={18} /> Ocupación por zona</h3>
          {m.por_zona.length === 0 ? (
            <div style={{ color: '#999' }}>Sin zonas configuradas</div>
          ) : (
            m.por_zona.map(z => (
              <div key={z.id_zona} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: 4 }}>
                  <strong>{z.nombre}</strong>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{z.ocupadas}/{z.total} · {z.tasa}%</span>
                </div>
                <div style={{ background: '#f1f5f9', borderRadius: 8, height: 10, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${z.tasa}%`,
                      height: '100%',
                      background: z.tasa > 80 ? '#dc2626' : z.tasa > 60 ? '#d97706' : '#16a34a',
                      borderRadius: 8,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="panel">
          <h3><Users size={18} /> Cola de espera</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div className="stat-label">Esperando ahora</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{dashboard.waitlist.esperando_ahora}</div>
            </div>
            <div>
              <div className="stat-label">Grupos hoy</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{dashboard.waitlist.hoy}</div>
            </div>
            <div>
              <div className="stat-label">Tiempo medio espera</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                {dashboard.waitlist.tiempo_medio_espera_min != null ? `${dashboard.waitlist.tiempo_medio_espera_min} min` : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="operator-layout" style={{ marginBottom: 24 }}>
        <div className="panel">
          <h3><CalendarDays size={18} /> Reservas hoy ({dashboard.reservas.hoy})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dashboard.reservas.por_estado.map(r => (
              <div key={r.estado} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    minWidth: 90,
                    display: 'inline-flex',
                    justifyContent: 'center',
                    padding: '2px 8px',
                    borderRadius: 20,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: '#fff',
                    background: ESTADO_COLOR[r.estado] || '#64748b',
                  }}
                >
                  {r.estado}
                </span>
                <span style={{ fontWeight: 700 }}>{r.cantidad}</span>
                {dashboard.reservas.hoy > 0 && (
                  <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 8, height: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round((r.cantidad / dashboard.reservas.hoy) * 100)}%`, height: '100%', background: ESTADO_COLOR[r.estado] || '#64748b', borderRadius: 8 }} />
                  </div>
                )}
              </div>
            ))}
            <div style={{ marginTop: 8, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              Duración comida estimada: <strong>{dashboard.cola.duracion_estimada_comida_min} min</strong>
            </div>
          </div>
        </div>

        <div className="panel">
          <h3><Utensils size={18} /> Operación</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Clock size={16} style={{ color: 'var(--sl-amber)' }} />
              <span style={{ flex: 1 }}>Tiempo medio comida</span>
              <strong>{dashboard.operacion.tiempo_medio_comida_min != null ? `${dashboard.operacion.tiempo_medio_comida_min} min` : '—'}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Users size={16} style={{ color: 'var(--sl-amber)' }} />
              <span style={{ flex: 1 }}>Grupos finalizados hoy</span>
              <strong>{dashboard.operacion.grupos_finalizados_hoy}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <LayoutGrid size={16} style={{ color: 'var(--sl-amber)' }} />
              <span style={{ flex: 1 }}>Asignaciones de mesa hoy</span>
              <strong>{dashboard.operacion.asignaciones_mesa_hoy}</strong>
            </div>
            {m.otro_estado > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Clock size={16} style={{ color: '#d97706' }} />
                <span style={{ flex: 1 }}>Mesas en otro estado (bloqueada/servicio)</span>
                <strong>{m.otro_estado}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {reporte && (
        <div className="panel">
          <h3><TrendingUp size={18} /> Reservas últimos 30 días ({reporte.total})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            <div>
              <div className="stat-label">Confirmación</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>{reporte.tasa_confirmacion}%</div>
            </div>
            <div>
              <div className="stat-label">Cancelación</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{reporte.tasa_cancelacion}%</div>
            </div>
            <div>
              <div className="stat-label">No-show</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ea580c' }}>{reporte.tasa_no_show}%</div>
            </div>
            <div>
              <div className="stat-label">Comensales</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{reporte.comensales}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardTab;