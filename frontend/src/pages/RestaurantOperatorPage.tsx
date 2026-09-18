import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { RefreshCw, AlertTriangle, Users, Clock, Link2 } from 'lucide-react';
import MesaGrid from '../components/restaurant/MesaGrid';
import MesaList from '../components/restaurant/MesaList';
import VistaToggle from '../components/restaurant/VistaToggle';
import ColaEsperaList from '../components/restaurant/ColaEsperaList';
import StatsMesasWidget from '../components/restaurant/StatsMesasWidget';
import AsignarMesaModal from '../components/restaurant/AsignarMesaModal';
import LiberarMesaModal from '../components/restaurant/LiberarMesaModal';
import JuntarMesasModal from '../components/restaurant/JuntarMesasModal';
import { useRestaurantStore, TurnoEspera } from '../store/restaurant.store';
import { Mesa } from '../models';
import { agruparMesasJuntadas } from '../models/mesaGrupos';
import '../styles/restaurant.css';

const RestaurantOperatorPage: React.FC = () => {
  const { colaId } = useParams<{ colaId: string }>();
  const id = colaId ? parseInt(colaId, 10) : NaN;

  const {
    mesas,
    turnosEspera,
    stats,
    isLoading,
    error,
    fetchCola,
    initSse,
    asignarManual,
    liberarMesa,
    juntarMesas,
    separarMesa,
    anadirSilla,
    quitarSilla,
    clearError,
  } = useRestaurantStore();

  const [vista, setVista] = useState<'grid' | 'lista'>('grid');
  const [asignando, setAsignando] = useState<TurnoEspera | null>(null);
  const [liberando, setLiberando] = useState<Mesa | null>(null);
  const [juntando, setJuntando] = useState(false);
  const [juntarMesaId, setJuntarMesaId] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!isNaN(id)) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      fetchCola(id);
    }
  }, [id, fetchCola]);

  useEffect(() => {
    refresh();
    return initSse(id);
  }, [refresh, initSse, id]);

  // Refresco periódico como respaldo en caso de que el streaming SSE falle
  useEffect(() => {
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (!mensaje) return;
    const t = setTimeout(() => setMensaje(null), 5000);
    return () => clearTimeout(t);
  }, [mensaje]);

  const mesasLibres = mesas.filter(m => m.isLibre());
  const gruposDisponibles = agruparMesasJuntadas(mesas).filter(g => g.disponible);

  const turnosGranGrupo = turnosEspera.filter(
    t => t.categoria === 'GRAN_TAMANO' || (stats && t.num_comensales != null && t.num_comensales > stats.maxCapacidadRestaurante)
  );

  const handleAsignar = async (mesaId: number) => {
    if (!asignando) return;
    const ok = await asignarManual(mesaId, asignando.id_turno);
    if (ok) {
      setMensaje(`Turno ${asignando.numero_turno} asignado a mesa ${mesas.find(m => m.id_mesa === mesaId)?.numero}`);
      setAsignando(null);
    } else {
      setMensaje(error || 'No se pudo asignar');
    }
  };

  const handleLiberarClick = (mesa: Mesa) => {
    // Si la mesa tiene suplemento (sillas extra o forma parte de un grupo), decidir al liberar
    if (mesa.capacidad_extra > 0 || mesa.grupo || mesa.isAgrupada()) {
      setLiberando(mesa);
    } else {
      doLiberar(mesa, true);
    }
  };

  const doLiberar = async (mesa: Mesa, restablecer: boolean) => {
    const ok = await liberarMesa(mesa.id_mesa, restablecer);
    if (ok) {
      setMensaje(`Mesa ${mesa.numero} liberada${restablecer ? '' : ' (mantuvo suplemento)'}`);
    } else {
      setMensaje(error || 'No se pudo liberar');
    }
    setLiberando(null);
  };

  const handleJuntar = async (mesaIds: number[]) => {
    const ok = await juntarMesas(mesaIds);
    if (ok) {
      setMensaje('Mesas juntadas correctamente');
      setJuntando(false);
    } else {
      setMensaje(error || 'No se pudieron juntar las mesas');
    }
  };

  return (
    <div className="restaurant-container">
      <div className="restaurant-hero">
        <h1>Panel del Operador</h1>
        <p>Gestión de mesas y cola de comensales en tiempo real.</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          <button className="btn-restaurant yellow" onClick={refresh} disabled={isLoading}>
            <RefreshCw size={16} style={{ marginRight: 6 }} /> Actualizar
          </button>
          <button
            className="btn-restaurant"
            style={{ background: 'var(--sl-black)', color: 'var(--sl-yellow)', borderColor: 'var(--sl-yellow)' }}
            onClick={() => { setJuntando(true); setJuntarMesaId(null); }}
          >
            <Link2 size={16} style={{ marginRight: 6 }} /> Unir mesas / sillas
          </button>
          <button className="btn-restaurant" onClick={clearError}>Limpiar errores</button>
        </div>
      </div>

      {mensaje && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', borderRadius: 8, padding: '10px 16px', marginBottom: 16 }}>
          {mensaje}
        </div>
      )}

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: 8, padding: '10px 16px', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <StatsMesasWidget stats={stats} />

      {turnosGranGrupo.length > 0 && (
        <div className="alertas-gran-grupo">
          <div className="alertas-gran-grupo-header">
            <AlertTriangle size={20} />
            <span>Grupos grandes esperando — requieren atención manual</span>
          </div>
          <div className="alertas-gran-grupo-list">
            {turnosGranGrupo.map(t => (
              <div key={t.id_turno} className="alertas-gran-grupo-item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>Turno {t.numero_turno}</strong>
                  <span style={{ color: 'var(--color-text-secondary)' }}> {t.cliente_nombre ? `· ${t.cliente_nombre}` : ''}</span>
                  <div className="alertas-gran-grupo-meta">
                    <span><Users size={14} /> {t.num_comensales} personas</span>
                    <span><Clock size={14} /> Esperando ~{t.eta_minutos} min</span>
                  </div>
                </div>
                <button
                  className="btn-restaurant yellow"
                  style={{ padding: '8px 14px', whiteSpace: 'nowrap', flexShrink: 0 }}
                  onClick={() => setAsignando(t)}
                >
                  Atender
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="operator-layout">
        {/* Mesas */}
        <div className="panel">
          <h3>Mesas del restaurante</h3>
          <VistaToggle vista={vista} onVistaChange={setVista} />

          {vista === 'grid' ? (
            <MesaGrid
              mesas={mesas}
              onLiberar={mesa => mesa.isOcupada() && handleLiberarClick(mesa)}
              onJuntar={mesa => { setJuntarMesaId(mesa.id_mesa); setJuntando(true); }}
            />
          ) : (
            <MesaList mesas={mesas} onLiberar={mesa => mesa.isOcupada() && handleLiberarClick(mesa)} />
          )}
        </div>

        {/* Cola de espera */}
        <div className="panel">
          <h3>Cola de comensales</h3>
          {stats && stats.turnosEnAtencion > 0 && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
              <strong style={{ color: '#15803d' }}>{stats.turnosEnAtencion}</strong> grupos sentados en mesa
            </div>
          )}
          <ColaEsperaList
            turnos={turnosEspera}
            onAsignar={setAsignando}
            maxCapacidad={stats?.maxCapacidadRestaurante}
          />
        </div>
      </div>

      {asignando && (
        <AsignarMesaModal
          turno={asignando}
          mesasLibres={mesasLibres}
          gruposDisponibles={gruposDisponibles}
          onAsignar={handleAsignar}
          onClose={() => setAsignando(null)}
        />
      )}

      {liberando && (
        <LiberarMesaModal
          mesa={liberando}
          onLiberar={(restablecer) => doLiberar(liberando, restablecer)}
          onClose={() => setLiberando(null)}
        />
      )}

      {juntando && (
        <JuntarMesasModal
          mesas={mesas}
          preseleccionadaMesaId={juntarMesaId}
          onJuntar={handleJuntar}
          onAnadirSilla={(mesaId) => { anadirSilla(mesaId); }}
          onQuitarSilla={(mesaId) => { quitarSilla(mesaId); }}
          onSeparar={(mesaId) => { separarMesa(mesaId); }}
          onClose={() => { setJuntando(false); setJuntarMesaId(null); }}
        />
      )}
    </div>
  );
};

export default RestaurantOperatorPage;
