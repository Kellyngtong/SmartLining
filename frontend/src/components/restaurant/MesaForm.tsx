import React, { useState } from 'react';
import '../../styles/restaurant.css';

interface MesaFormProps {
  onSubmit: (data: { numero: number; capacidad: number }) => void;
  onCancel?: () => void;
  initial?: { numero?: number; capacidad?: number };
  submitLabel?: string;
}

const MesaForm: React.FC<MesaFormProps> = ({ onSubmit, onCancel, initial, submitLabel = 'Guardar mesa' }) => {
  const [numero, setNumero] = useState(initial?.numero?.toString() ?? '');
  const [capacidad, setCapacidad] = useState(initial?.capacidad?.toString() ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(numero, 10);
    const c = parseInt(capacidad, 10);
    if (isNaN(n) || isNaN(c) || n < 1 || c < 1) return;
    onSubmit({ numero: n, capacidad: c });
  };

  return (
    <form className="mesa-form" onSubmit={handleSubmit}>
      <label>
        Nº mesa
        <input
          type="number"
          min={1}
          value={numero}
          onChange={e => setNumero(e.target.value)}
          placeholder="Ej: 11"
          required
        />
      </label>
      <label>
        Capacidad
        <input
          type="number"
          min={1}
          value={capacidad}
          onChange={e => setCapacidad(e.target.value)}
          placeholder="Ej: 4"
          required
        />
      </label>
      <div className="full-width" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        {onCancel && (
          <button type="button" className="btn-ghost-rest" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn-restaurant yellow">
          {submitLabel}
        </button>
      </div>
    </form>
  );
};

export default MesaForm;
