import React, { useEffect, useState } from 'react';
import { Save, Plus, Trash2, Clock } from 'lucide-react';
import { apiClient } from '../../services/api';
import '../../styles/restaurant.css';

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];

interface Horario {
  id_horario: number;
  id_cola: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
}

const hhmm = (v: string): string => {
  if (!v) return '';
  if (v.includes('T')) return v.slice(v.indexOf('T') + 1, v.indexOf('T') + 6);
  const d = new Date(v);
  if (!isNaN(d.getTime())) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return v.slice(0, 5);
};

const toInput = (hora: string) => `2000-01-01T${hora.length === 5 ? hora : '00:00'}:00.000Z`;

const CAMPOS: { key: string; label: string; ayuda: string; min: number }[] = [
  { key: 'antelacion_min_min', label: 'Antelación mínima (min)', ayuda: 'Cuánto antes debe reservar el cliente', min: 0 },
  { key: 'antelacion_max_dias', label: 'Antelación máxima (días)', ayuda: 'Hasta cuántos días adelante se puede reservar', min: 1 },
  { key: 'slot_min', label: 'Intervalo de slots (min)', ayuda: 'Cada cuántos minutos se ofrecen horas', min: 5 },
  { key: 'max_comensales_online', label: 'Comensales máx. online', ayuda: 'Grupos mayores deben llamar', min: 1 },
  { key: 'max_reservas_por_telefono', label: 'Reservas activas por teléfono', ayuda: 'Anti-spam', min: 1 },
  { key: 'modificacion_limite_horas', label: 'Límite cambio/cancelación (h)', ayuda: 'Hasta cuántas horas antes puede cambiar el cliente', min: 0 },
];

const AjustesTab: React.FC<{ colaId: number }> = ({ colaId }) => {
  const [config, setConfig] = useState<Record<string, number>>({});
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [nuevo, setNuevo] = useState({ dia_semana: 'LUNES', hora_inicio: '13:00', hora_fin: '15:30' });

  const cargar = async () => {
    try {
      const res = await apiClient.getReservaConfig(colaId);
      const data = res.data as any;
      if (data) {
        const c: Record<string, number> = {};
        CAMPOS.forEach(f => {
          if (typeof data[f.key] === 'number') c[f.key] = data[f.key];
        });
        setConfig(c);
      }
    } catch (e) {
      console.error('Error loading config', e);
    }
    try {
      const res = await apiClient.getHorariosCola(colaId);
      setHorarios((res.data as Horario[]) || []);
    } catch (e) {
      console.error('Error loading horarios', e);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colaId]);

  const guardar = async () => {
    setGuardando(true);
    setMensaje(null);
    try {
      await apiClient.updateReservaConfig(colaId, config);
      setMensaje('Configuración guardada');
    } catch (e) {
      setMensaje('No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  const crearHorario = async () => {
    try {
      await apiClient.createHorarioCola(colaId, nuevo.dia_semana, toInput(nuevo.hora_inicio), toInput(nuevo.hora_fin));
      setMensaje('Horario añadido');
      await cargar();
    } catch (e: any) {
      setMensaje(e?.response?.data?.message || 'No se pudo añadir (¿ya existe ese día?)');
    }
  };

  const borrarHorario = async (id: number) => {
    if (!window.confirm('¿Eliminar este horario?')) return;
    try {
      await apiClient.deleteHorarioCola(id);
      await cargar();
    } catch (e) {
      setMensaje('No se pudo eliminar');
    }
  };

  return (
    <div>
      <div className="panel" style={{ marginBottom: 16 }}>
        <h3>Reglas de reserva online</h3>
        <div className="mesa-form">
          {CAMPOS.map(f => (
            <label key={f.key}>
              {f.label}
              <input
                type="number"
                min={f.min}
                value={config[f.key] ?? ''}
                onChange={e => setConfig({ ...config, [f.key]: parseInt(e.target.value, 10) || 0 })}
                title={f.ayuda}
              />
            </label>
          ))}
        </div>
        <button className="btn-restaurant yellow" onClick={guardar} disabled={guardando} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Save size={16} /> {guardando ? 'Guardando…' : 'Guardar reglas'}
        </button>
        {mensaje && <p role="status" style={{ marginTop: 8, color: '#15803d' }}>{mensaje}</p>}
      </div>

      <div className="panel">
        <h3><Clock size={18} /> Horarios de apertura (reservas)</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: -8, marginBottom: 12 }}>
          Si no hay horarios, se aceptan reservas a cualquier hora. Con horarios, fuera de ellos se rechaza.
        </p>
        {horarios.length === 0 ? (
          <p style={{ color: '#999' }}>Sin horarios configurados</p>
        ) : (
          <div className="cola-espera-list" style={{ marginBottom: 16 }}>
            {horarios.map(h => (
              <div key={h.id_horario} className="cola-espera-item">
                <div><strong>{h.dia_semana}</strong> <span style={{ color: 'var(--color-text-secondary)' }}>{hhmm(h.hora_inicio)} → {hhmm(h.hora_fin)}</span></div>
                <button className="btn-ghost-rest" style={{ color: '#b91c1c' }} onClick={() => borrarHorario(h.id_horario)} aria-label={`Eliminar horario del ${h.dia_semana}`}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Día
            <select value={nuevo.dia_semana} onChange={e => setNuevo({ ...nuevo, dia_semana: e.target.value })} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}>
              {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Apertura
            <input type="time" value={nuevo.hora_inicio} onChange={e => setNuevo({ ...nuevo, hora_inicio: e.target.value })} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Cierre
            <input type="time" value={nuevo.hora_fin} onChange={e => setNuevo({ ...nuevo, hora_fin: e.target.value })} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }} />
          </label>
          <button className="btn-restaurant" onClick={crearHorario} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Plus size={16} /> Añadir
          </button>
        </div>
      </div>
    </div>
  );
};

export default AjustesTab;
