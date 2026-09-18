import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, AlertTriangle, Users, ArrowLeft } from 'lucide-react';
import { apiClient } from '../services/api';
import '../styles/restaurant.css';

interface TurnoEstado {
  id_turno: number;
  numero_turno?: number;
  num_comensales?: number | null;
  categoria?: string | null;
  estado: string;
  posicion?: number;
  eta_minutos?: number;
  mesa_numero?: number | null;
}

const RestaurantTicketPage: React.FC = () => {
  const { turnoId } = useParams<{ turnoId: string }>();
  const navigate = useNavigate();
  const [turno, setTurno] = useState<TurnoEstado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Mi turno — SmartLining';
    return () => {
      document.title = 'SmartLining';
    };
  }, []);

  useEffect(() => {
    if (!turnoId) return;
    const id = parseInt(turnoId, 10);
    if (isNaN(id)) return;

    let cancelled = false;
    let es: EventSource | null = null;

    const consultar = () => {
      apiClient
        .getTicketById(id)
        .then(res => {
          if (cancelled) return;
          const data = res.data as any;
          if (data) {
            setTurno({
              id_turno: data.id_turno,
              numero_turno: data.numero_turno,
              num_comensales: data.num_comensales,
              categoria: data.categoria,
              estado: data.estado,
              mesa_numero: data.mesa?.numero ?? null,
            });
            setLoading(false);
            // SSE en tiempo real (misma cola que el turno); el polling queda como respaldo
            if (!es && data.id_cola) {
              try {
                const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
                es = new EventSource(`${API_BASE_URL}/events?queueId=${data.id_cola}`);
                const refrescar = () => {
                  if (!cancelled) consultar();
                };
                ['queueUpdate', 'MESA_ASIGNADA', 'MESA_LIBERADA', 'COLA_RESTAURANTE_ACTUALIZADA'].forEach(ev =>
                  es!.addEventListener(ev, refrescar)
                );
              } catch (e) {
                // SSE no disponible: el polling sigue funcionando
              }
            }
          }
        })
        .catch(() => {
          if (!cancelled) setError('No se pudo recuperar el estado de tu turno');
          setLoading(false);
        });
    };

    consultar();
    const interval = setInterval(consultar, 4000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (es) es.close();
    };
  }, [turnoId]);

  if (loading) {
    return (
      <div className="restaurant-container" style={{ textAlign: 'center', paddingTop: 60 }}>
        <span className="spinner-rest" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (error || !turno) {
    return (
      <div className="restaurant-container" style={{ textAlign: 'center', paddingTop: 40 }}>
        <p style={{ color: '#b91c1c' }}>{error || 'Turno no encontrado'}</p>
      </div>
    );
  }

  const esGranGrupo = turno.categoria === 'GRAN_TAMANO';

  return (
    <div className="restaurant-container">
      <div className="ticket-status">
        <div className="ticket-num">Turno {turno.numero_turno}</div>

        {turno.estado === 'EN_ATENCION' && (
          <>
            <div className="status-text" style={{ color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <CheckCircle2 size={22} /> ¡Ya tienes mesa!
            </div>
            {turno.mesa_numero && (
              <p className="status-detail" style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: 8 }}>
                Siéntate en la <strong style={{ color: 'var(--sl-amber)' }}>Mesa {turno.mesa_numero}</strong>
              </p>
            )}
          </>
        )}

        {turno.estado === 'EN_ESPERA' && (
          <>
            <div className="status-text" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Clock size={22} style={{ color: 'var(--sl-amber)' }} /> En espera de mesa
            </div>
            {esGranGrupo ? (
              <div style={{ marginTop: 12 }}>
                <span className="gran-grupo-badge">
                  <AlertTriangle size={14} /> Grupo de gran tamaño · espera asistencia
                </span>
                <p className="status-detail" style={{ marginTop: 12 }}>
                  {turno.num_comensales} personas. Un camarero te atenderá para organizar las mesas.
                </p>
              </div>
            ) : (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Users size={16} />
                <span className="status-detail">{turno.num_comensales} personas</span>
              </div>
            )}
            <p className="status-detail" style={{ marginTop: 12 }}>Mantén esta pantalla abierta: se actualizará sola cuando tu mesa esté lista.</p>
          </>
        )}

        {turno.estado === 'FINALIZADO' && (
          <div className="status-text" style={{ color: '#666' }}>Gracias por visitarnos</div>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button
          className="btn-ghost-rest"
          onClick={() => navigate('/restaurante')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.9rem' }}
        >
          <ArrowLeft size={16} /> Volver al inicio
        </button>
      </div>
    </div>
  );
};

export default RestaurantTicketPage;
