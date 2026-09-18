import React, { useState, useEffect, useRef } from 'react';
import { Link2 } from 'lucide-react';
import { Mesa } from '../../models';
import { MesaGrupoAgrupado } from '../../models/mesaGrupos';
import { TurnoEspera } from '../../store/restaurant.store';
import '../../styles/restaurant.css';

interface AsignarMesaModalProps {
  turno: TurnoEspera;
  mesasLibres: Mesa[];
  gruposDisponibles?: MesaGrupoAgrupado[];
  onAsignar: (mesaId: number) => void;
  onClose: () => void;
}

const AsignarMesaModal: React.FC<AsignarMesaModalProps> = ({
  turno,
  mesasLibres,
  gruposDisponibles = [],
  onAsignar,
  onClose,
}) => {
  const [mesaId, setMesaId] = useState<number | null>(null);
  const comensales = turno.num_comensales;
  const cardRef = useRef<HTMLDivElement>(null);

  // Cerrar con Escape y llevar el foco al diálogo al abrir
  useEffect(() => {
    cardRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Mesas individuales que caben al grupo (>= comensales)
  const mesasAptas = comensales ? mesasLibres.filter(m => m.capacidad >= comensales) : mesasLibres;

  // Grupos disponibles que caben al grupo de comensales
  const gruposAptos = comensales
    ? gruposDisponibles.filter(g => g.disponible && g.capacidad_total >= comensales)
    : gruposDisponibles.filter(g => g.disponible);

  const sinOpciones = mesasAptas.length === 0 && gruposAptos.length === 0;

  const opciones = [
    ...gruposAptos.map(g => ({ mesaId: g.representante.id_mesa, esGrupo: true, numero: g.numero, capacidad: g.capacidad_total })),
    ...mesasAptas.map(m => ({ mesaId: m.id_mesa, esGrupo: false, numero: m.numero, capacidad: m.capacidad })),
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Asignar mesa al turno ${turno.numero_turno}`}
        className="modal-card"
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: 8 }}>Asignar mesa — Turno {turno.numero_turno}</h3>
        <p style={{ color: '#666', marginBottom: 16 }}>
          {comensales ?? '—'} personas · ~ {turno.eta_minutos} min de espera estimado
          {turno.cliente_nombre ? ` · ${turno.cliente_nombre}` : ''}
        </p>

        {sinOpciones ? (
          <p style={{ color: '#b91c1c', fontWeight: 600 }}>
            No hay mesas ni grupos libres que quepan a {comensales} personas. Junta mesas o añade sillas primero.
          </p>
        ) : (
          <div className="mesa-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', marginBottom: 16 }}>
            {opciones.map(op => (
              <div
                key={`${op.esGrupo ? 'g' : 'm'}-${op.mesaId}`}
                className={`mesa-card ${op.esGrupo ? 'libre' : 'libre'}`}
                role="button"
                tabIndex={0}
                aria-pressed={mesaId === op.mesaId}
                aria-label={`${op.esGrupo ? 'Grupo' : 'Mesa'} ${op.numero}, capacidad ${op.capacidad}`}
                onClick={() => setMesaId(op.mesaId)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setMesaId(op.mesaId);
                  }
                }}
                style={mesaId === op.mesaId ? { boxShadow: '0 0 0 3px var(--sl-yellow)' } : undefined}
              >
                <div className="mesa-numero" style={{ fontSize: '1.2rem' }}>
                  {op.esGrupo ? `Grupo ${op.numero}` : `Mesa ${op.numero}`}
                </div>
                <div className="mesa-capacity">Cap. {op.capacidad}</div>
                {op.esGrupo && (
                  <div className="grupo-badge" style={{ marginTop: 6 }}>
                    <Link2 size={13} /> Juntada
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-ghost-rest" onClick={onClose}>Cancelar</button>
          <button
            className="btn-restaurant yellow"
            disabled={mesaId == null}
            onClick={() => mesaId != null && onAsignar(mesaId)}
          >
            Asignar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AsignarMesaModal;
