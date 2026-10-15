import React, { useEffect, useState } from 'react';
import { Users, Clock, ArrowRight, CheckCircle, ChevronLeft, ChevronRight, Ban } from 'lucide-react';
import { Reserva } from '../../types';
import { Mesa } from '../../models';
import { apiClient } from '../../services/api';
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

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS_SEM = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

interface ReservaConMesa extends Reserva {
  asignaciones?: Array<{
    id_asignacion: number;
    mesa_id: number;
    estado: string;
    mesa?: { id_mesa: number; numero: number } | null;
  }>;
}

interface AgendaTabProps {
  colaId: number;
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

const aISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fmtCorta = (yyyyMmDd: string) => {
  const [y, m, d] = yyyyMmDd.split('-');
  return `${d}/${m}/${y}`;
};

interface Resumen {
  dias: Record<string, { reservas: number; pendientes: number }>;
  festivos: { id_cierre: number; fecha: string; motivo: string | null }[];
}

const AgendaTab: React.FC<AgendaTabProps> = ({ colaId, reservas, mesas, fecha, onFechaChange, onChangeEstado }) => {
  const [mesVista, setMesVista] = useState(() => {
    const [y, m] = fecha.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });
  const [resumen, setResumen] = useState<Resumen>({ dias: {}, festivos: [] });

  useEffect(() => {
    const mes = `${mesVista.getFullYear()}-${String(mesVista.getMonth() + 1).padStart(2, '0')}`;
    apiClient
      .getAgendaResumen(colaId, mes)
      .then(res => setResumen((res.data as any) || { dias: {}, festivos: [] }))
      .catch(() => {});
  }, [colaId, mesVista]);

  const festivoDe = (iso: string) => resumen.festivos.find(f => f.fecha === iso) || null;
  const cierreSeleccionado = festivoDe(fecha);
  const hoyIso = aISO(new Date());

  const moverMes = (delta: number) => {
    setMesVista(new Date(mesVista.getFullYear(), mesVista.getMonth() + delta, 1));
  };

  const irHoy = () => {
    const hoy = new Date();
    setMesVista(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    onFechaChange(aISO(hoy));
  };

  const primerDia = new Date(mesVista.getFullYear(), mesVista.getMonth(), 1);
  const huecos = (primerDia.getDay() + 6) % 7; // semana empieza en lunes
  const diasMes = new Date(mesVista.getFullYear(), mesVista.getMonth() + 1, 0).getDate();
  const celdas: (number | null)[] = [
    ...Array(huecos).fill(null),
    ...Array.from({ length: diasMes }, (_, i) => i + 1),
  ];

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
      <div key={r.id_reserva} className="cola-espera-item chip-wrap">
        <div className="chip-main">
          <span className="turno-posicion"><Clock size={14} className="icon-inline" /> {horaCorta(r.hora_inicio_str || r.hora_inicio)}</span>
          <div>
            <div className="chip-nombre">
              {r.cliente_nombre}
              <span className={`rest-badge est-${r.estado}`}>
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
            className="btn-restaurant yellow btn-sm"
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

  return (
    <div>
      {/* Calendario mensual */}
      <div className="panel mb-16">
        <div className="agenda-cal-head">
          <button className="btn-ghost-rest" onClick={() => moverMes(-1)} aria-label="Mes anterior">
            <ChevronLeft size={16} />
          </button>
          <h3>
            {MESES[mesVista.getMonth()]} {mesVista.getFullYear()}
          </h3>
          <div className="head-actions">
            <button className="btn-ghost-rest" onClick={irHoy}>
              Hoy
            </button>
            <button className="btn-ghost-rest" onClick={() => moverMes(1)} aria-label="Mes siguiente">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="agenda-cal-grid">
          {DIAS_SEM.map(d => (
            <div key={d} className="agenda-cal-dow">
              {d}
            </div>
          ))}
          {celdas.map((dia, i) => {
            if (dia == null) return <div key={`h-${i}`} />;
            const iso = `${mesVista.getFullYear()}-${String(mesVista.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const info = resumen.dias[iso];
            const festivo = festivoDe(iso);
            const esHoy = iso === hoyIso;
            const seleccionado = iso === fecha;
            const conReservas = !!info && info.reservas > 0;
            const clases = ['agenda-cal-day'];
            if (seleccionado) clases.push('seleccionado');
            if (conReservas) clases.push('con-reservas');
            if (festivo) clases.push('festivo');
            return (
              <button
                key={iso}
                onClick={() => onFechaChange(iso)}
                title={festivo ? `Cerrado: ${festivo.motivo || 'festivo'}` : info ? `${info.reservas} reserva(s)` : 'Sin reservas'}
                aria-label={`${dia}: ${festivo ? `cerrado (${festivo.motivo || 'festivo'})` : info ? `${info.reservas} reservas` : 'sin reservas'}`}
                className={clases.join(' ')}
              >
                <span className={`dia-num${esHoy ? ' hoy' : ''}`}>{dia}</span>
                {festivo ? (
                  <Ban size={14} className="dia-icon" />
                ) : info ? (
                  <span className="rest-badge blue agenda-count">{info.reservas}</span>
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="agenda-legend">
          <span><span className="rest-badge blue agenda-count">3</span> con reservas</span>
          <span><Ban size={12} className="icon-inline legend-cerrado" /> cerrado</span>
          <span><span className="agenda-hoy-dot">•</span> hoy</span>
        </div>
      </div>

      {/* Detalle del día */}
      <h3 className="agenda-detail-title">Detalle del {fmtCorta(fecha)}</h3>
      {cierreSeleccionado && (
        <div role="status" className="agenda-cierre">
          <Ban size={18} /> Cerrado: {cierreSeleccionado.motivo || 'festivo'}. Colas y reservas inhabilitadas este día.
        </div>
      )}
      {!cierreSeleccionado && ordenadas.length === 0 && (
        <div className="cola-espera-card rest-empty">
          No hay reservas activas para este día
        </div>
      )}
      {!cierreSeleccionado && ordenadas.length > 0 && (
        <>
          <p className="rest-hint">
            Operativa del día por mesa — avanzar estados en 1 clic. Para crear o editar, usa Reservas.
          </p>
          {sinMesa.length > 0 && (
            <div className="panel panel-sin-mesa mb-16">
              <h3>Sin mesa asignada ({sinMesa.length})</h3>
              <div className="cola-espera-list">
                {sinMesa.map(chip)}
              </div>
            </div>
          )}
          <div className="agenda-mesas-grid">
            {mesasOrdenadas.map(m => {
              const deMesa = ordenadas.filter(r => mesaDe(r) === m.id_mesa);
              if (deMesa.length === 0) return null;
              return (
                <div key={m.id_mesa} className="panel mb-0">
                  <h3>Mesa {m.numero} <span className="agenda-mesa-sub">· cap. {m.getCapacidadEfectiva()}</span></h3>
                  <div className="cola-espera-list">
                    {deMesa.map(chip)}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default AgendaTab;
