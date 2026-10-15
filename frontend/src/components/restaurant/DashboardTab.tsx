import React, { useEffect, useState } from 'react';
import { Users, CalendarDays, Clock, Utensils, LayoutGrid, TrendingUp } from 'lucide-react';
import { DashboardSala } from '../../types';
import { apiClient } from '../../services/api';
import '../../styles/restaurant.css';

interface DashboardTabProps {
  dashboard: DashboardSala | null;
  colaId?: number;
}

const tasaClase = (tasa: number) => (tasa > 80 ? 't-bad' : tasa > 60 ? 't-warn' : 't-ok');

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
    return <div className="cola-espera-card rest-empty">Cargando dashboard...</div>;
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
          <div className={`stat-value ${tasaClase(m.tasa_ocupacion)}`}>
            {m.tasa_ocupacion}%
          </div>
          <div className="stat-label">Tasa ocupación</div>
        </div>
      </div>

      <div className="operator-layout mb-16">
        <div className="panel">
          <h3><LayoutGrid size={18} /> Ocupación por zona</h3>
          {m.por_zona.length === 0 ? (
            <div className="rest-empty">Sin zonas configuradas</div>
          ) : (
            m.por_zona.map(z => (
              <div key={z.id_zona} className="dash-zona-row">
                <div className="dash-zona-head">
                  <strong>{z.nombre}</strong>
                  <span className="zona-count">{z.ocupadas}/{z.total} · {z.tasa}%</span>
                </div>
                <div className="rest-bar mid">
                  <div
                    className={`rest-bar-fill fill-${z.tasa > 80 ? 'bad' : z.tasa > 60 ? 'warn' : 'ok'}`}
                    style={{ ['--w' as any]: `${z.tasa}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="panel">
          <h3><Users size={18} /> Cola de espera</h3>
          <div className="dash-mini-grid">
            <div>
              <div className="stat-label">Esperando ahora</div>
              <div className="dash-big">{dashboard.waitlist.esperando_ahora}</div>
            </div>
            <div>
              <div className="stat-label">Grupos hoy</div>
              <div className="dash-big">{dashboard.waitlist.hoy}</div>
            </div>
            <div>
              <div className="stat-label">Tiempo medio espera</div>
              <div className="dash-med">
                {dashboard.waitlist.tiempo_medio_espera_min != null ? `${dashboard.waitlist.tiempo_medio_espera_min} min` : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="operator-layout mb-16">
        <div className="panel">
          <h3><CalendarDays size={18} /> Reservas hoy ({dashboard.reservas.hoy})</h3>
          <div className="dash-col">
            {dashboard.reservas.por_estado.map(r => (
              <div key={r.estado} className="dash-estado-row">
                <span className={`rest-badge est-${r.estado} dash-estado-badge`}>
                  {r.estado}
                </span>
                <span className="strong">{r.cantidad}</span>
                {dashboard.reservas.hoy > 0 && (
                  <div className="rest-bar thin dash-estado-bar">
                    <div
                      className={`rest-bar-fill est-${r.estado}`}
                      style={{ ['--w' as any]: `${Math.round((r.cantidad / dashboard.reservas.hoy) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
            <div className="dash-nota">
              Duración comida estimada: <strong>{dashboard.cola.duracion_estimada_comida_min} min</strong>
            </div>
          </div>
        </div>

        <div className="panel">
          <h3><Utensils size={18} /> Operación</h3>
          <div className="dash-col gap-14">
            <div className="dash-linea">
              <Clock size={16} className="t-warn" />
              <span className="flex-1">Tiempo medio comida</span>
              <strong>{dashboard.operacion.tiempo_medio_comida_min != null ? `${dashboard.operacion.tiempo_medio_comida_min} min` : '—'}</strong>
            </div>
            <div className="dash-linea">
              <Users size={16} className="t-warn" />
              <span className="flex-1">Grupos finalizados hoy</span>
              <strong>{dashboard.operacion.grupos_finalizados_hoy}</strong>
            </div>
            <div className="dash-linea">
              <LayoutGrid size={16} className="t-warn" />
              <span className="flex-1">Asignaciones de mesa hoy</span>
              <strong>{dashboard.operacion.asignaciones_mesa_hoy}</strong>
            </div>
            {m.otro_estado > 0 && (
              <div className="dash-linea">
                <Clock size={16} className="t-warn" />
                <span className="flex-1">Mesas en otro estado (bloqueada/servicio)</span>
                <strong>{m.otro_estado}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {reporte && (
        <div className="panel">
          <h3><TrendingUp size={18} /> Reservas últimos 30 días ({reporte.total})</h3>
          <div className="dash-kpi-grid">
            <div>
              <div className="stat-label">Confirmación</div>
              <div className="dash-kpi t-ok">{reporte.tasa_confirmacion}%</div>
            </div>
            <div>
              <div className="stat-label">Cancelación</div>
              <div className="dash-kpi t-bad">{reporte.tasa_cancelacion}%</div>
            </div>
            <div>
              <div className="stat-label">No-show</div>
              <div className="dash-kpi t-warn">{reporte.tasa_no_show}%</div>
            </div>
            <div>
              <div className="stat-label">Comensales</div>
              <div className="dash-kpi">{reporte.comensales}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardTab;
