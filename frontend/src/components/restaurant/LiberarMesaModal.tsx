import React, { useEffect, useRef } from 'react';
import { Link2 } from 'lucide-react';
import { Mesa } from '../../models';
import '../../styles/restaurant.css';

interface LiberarMesaModalProps {
  mesa: Mesa;
  onLiberar: (restablecer: boolean) => void;
  onClose: () => void;
}

const LiberarMesaModal: React.FC<LiberarMesaModalProps> = ({ mesa, onLiberar, onClose }) => {
  const tieneSillas = mesa.capacidad_extra > 0;
  const grupo = mesa.grupo;
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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Liberar mesa ${mesa.numero}`}
        className="modal-card"
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: 12 }}>Liberar mesa {mesa.numero}</h3>

        {tieneSillas && (
          <div className="liberar-suplemento-info" style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: '0.95rem' }}>
            <strong>Sillas extra:</strong> esta mesa tiene {mesa.capacidad_extra} silla(s) añadida(s) (capacidad {mesa.capacidad} → {mesa.capacidad_extra + mesa.capacidad}).
          </div>
        )}
        {grupo && (
          <div className="liberar-suplemento-info" style={{ background: '#f0f9ff', border: '1px solid #7dd3fc', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: '0.95rem' }}>
            <strong><Link2 size={14} style={{ verticalAlign: '-2px' }} /> Mesa juntada:</strong> forma parte de un grupo de mesas (capacidad total {grupo.capacidad_total} plazas).
          </div>
        )}

        <p style={{ color: '#444', marginBottom: 18 }}>
          ¿Restablecer la mesa a su estado normal al liberarla?
        </p>

        <div style={{ display: 'flex', gap: 12, flexDirection: 'column', marginBottom: 8 }}>
          <button
            className="btn-restaurant yellow"
            onClick={() => onLiberar(true)}
          >
            {tieneSillas || grupo ? 'Restablecer mesa (quitar sillas / separar)' : 'Liberar y restablecer'}
          </button>
          {tieneSillas || grupo ? (
            <button
              className="btn-restaurant"
              onClick={() => onLiberar(false)}
              style={{ background: '#f0f0f0' }}
            >
              Mantener suplemento (dejar silla(s) / junta)
            </button>
          ) : null}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn-ghost-rest" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
};

export default LiberarMesaModal;
