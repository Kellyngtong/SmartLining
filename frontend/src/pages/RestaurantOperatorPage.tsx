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
import { useRestaurantStore, TurnoEspera, SugerenciaMesa, LiberarMesaResult } from '../store/restaurant.store';
import { Mesa } from '../models';
import { agruparMesasJuntadas } from '../models/mesaGrupos';
import { apiClient } from '../services/api';
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
    fetchZonas,
    initSse,
    asignarManual,
    liberarMesa,
    juntarMesas,
    separarMesa,
    anadirSilla,
    quitarSilla,
    clearError,
    ocupacion,
    zonas,
  } = useRestaurantStore();

  const [vista, setVista] = useState<'grid' | 'lista'>('grid');
  const [filtroZonaMesa, setFiltroZonaMesa] = useState<number | 'todas'>('todas');
  const [asignando, setAsignando] = useState<TurnoEspera | null>(null);
  const [liberando, setLiberando] = useState<Mesa | null>(null);
  const [juntando, setJuntando] = useState(false);
  const [juntarMesaId, setJuntarMesaId] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [sugerencia, setSugerencia] = useState<(SugerenciaMesa & { motivo: string | null }) | null>(null);

  const refresh = useCallback(() => {
    if (!isNaN(id)) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      fetchCola(id);
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      fetchZonas(id);
    }
  }, [id, fetchCola, fetchZonas]);

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

  const filtroZonaValido = filtroZonaMesa === 'todas' || zonas.some(z => z.id_zona === filtroZonaMesa);
  const mesasFiltradas = filtroZonaValido && filtroZonaMesa !== 'todas'
    ? mesas.filter(m => m.id_zona === filtroZonaMesa)
    : mesas;
  const contarZona = (idZona: number | null) => mesas.filter(m => (m.id_zona ?? null) === idZona).length;

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
    const turnoMatch = turnosEspera;
    const res: LiberarMesaResult | null = await liberarMesa(mesa.id_mesa, restablecer);
    if (res) {
      let extra = '';
      if (res.match) {
        const t = turnoMatch.find(x => x.id_turno === res.match!.turnoId);
        extra = t
          ? ` y asignada al turno ${t.numero_turno}${t.cliente_nombre ? ` (${t.cliente_nombre}, ${t.num_comensales} pers.)` : ''}`
          : ' y reasignada automáticamente';
      } else if (res.matchWaitlist) {
        extra = ' y asignada a la cola de espera';
      }
      setMensaje(`Mesa ${mesa.numero} liberada${restablecer ? '' : ' (mantuvo suplemento)'}${extra}`);
      if (!res.match && !res.matchWaitlist && res.sugerencia) {
        setSugerencia({ ...res.sugerencia, motivo: res.matchOmitido ?? null });
      } else {
        setSugerencia(null);
      }
    } else {
      setMensaje(error || 'No se pudo liberar');
    }
    setLiberando(null);
  };

  const atenderSugerenciaTurno = (s: SugerenciaMesa) => {
    const t = useRestaurantStore.getState().turnosEspera.find(x => x.id_turno === s.id);
    if (t) {
      setAsignando(t);
      setSugerencia(null);
    } else {
      setMensaje('Ese turno ya no está en espera');
      setSugerencia(null);
    }
  };

  const atenderSugerenciaWaitlist = async (s: SugerenciaMesa) => {
    if (isNaN(id)) return;
    try {
      const res = await apiClient.asignarMesaSala({
        id_cola: id,
        comensales: s.comensales,
        tipo_origen: 'WAITLIST',
        id_waitlist: s.id,
      });
      if (res.success) {
        setMensaje(`Mesa asignada a ${s.nombre} (${s.comensales} pers.)`);
        setSugerencia(null);
        await useRestaurantStore.getState().fetchCola(id);
      } else {
        setMensaje('No se pudo asignar automáticamente');
      }
    } catch (e) {
      setMensaje('No se pudo asignar automáticamente');
    }
  };

  const maxEspera = Math.max(0, ...turnosEspera.map(t => t.num_comensales ?? 0));

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

      {sugerencia && (
        <div className="alertas-gran-grupo" style={{ background: '#eff6ff', borderColor: '#93c5fd' }}>
          <div className="alertas-gran-grupo-header" style={{ color: '#1d4ed8' }}>
            <Users size={20} />
            <span>
              {sugerencia.motivo === 'GRAN_TAMANO' && 'Un grupo grande sigue en espera (supera una mesa): '}
              {sugerencia.motivo === 'GRUPO_GRANDE' && 'Un grupo en espera no cabe en la mesa liberada: '}
              {sugerencia.motivo === 'SIN_MESA_COMPATIBLE' && 'Hay un grupo compatible en espera: '}
              {sugerencia.motivo === 'ERROR_MATCH' && 'No se pudo asignar automáticamente (error interno): '}
              <strong>{sugerencia.nombre} ({sugerencia.comensales} pers.)</strong>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {sugerencia.tipo === 'TURNO' ? (
              <button className="btn-restaurant yellow" style={{ padding: '8px 14px' }} onClick={() => atenderSugerenciaTurno(sugerencia)}>
                Asignar ahora
              </button>
            ) : sugerencia.motivo === 'SIN_MESA_COMPATIBLE' ? (
              <button className="btn-restaurant yellow" style={{ padding: '8px 14px' }} onClick={() => atenderSugerenciaWaitlist(sugerencia)}>
                Asignar ahora
              </button>
            ) : null}
            {(sugerencia.motivo === 'GRAN_TAMANO' || sugerencia.motivo === 'GRUPO_GRANDE') && (
              <button
                className="btn-ghost-rest"
                onClick={() => { setJuntando(true); setJuntarMesaId(null); setSugerencia(null); }}
              >
                Unir mesas
              </button>
            )}
            <button className="btn-ghost-rest" onClick={() => setSugerencia(null)}>Descartar</button>
          </div>
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
          <h3>Mesas del restaurante ({mesas.length})</h3>
          {zonas.length > 0 && (
            <div className="vista-toggle" role="tablist" aria-label="Filtrar mesas por zona" style={{ marginBottom: 16 }}>
              <button
                className={filtroZonaMesa === 'todas' ? 'active' : ''}
                onClick={() => setFiltroZonaMesa('todas')}
              >
                Todos ({mesas.length})
              </button>
              {zonas.map(z => (
                <button
                  key={z.id_zona}
                  className={filtroZonaMesa === z.id_zona ? 'active' : ''}
                  onClick={() => setFiltroZonaMesa(z.id_zona)}
                >
                  {z.nombre} ({contarZona(z.id_zona)})
                </button>
              ))}
            </div>
          )}
          <VistaToggle vista={vista} onVistaChange={setVista} />

          {vista === 'grid' ? (
            <MesaGrid
              mesas={mesasFiltradas}
              onLiberar={mesa => mesa.isOcupada() && handleLiberarClick(mesa)}
              onJuntar={mesa => { setJuntarMesaId(mesa.id_mesa); setJuntando(true); }}
              ocupacion={ocupacion}
            />
          ) : (
            <MesaList mesas={mesasFiltradas} onLiberar={mesa => mesa.isOcupada() && handleLiberarClick(mesa)} ocupacion={ocupacion} />
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
          maxEspera={maxEspera > 0 ? maxEspera : null}
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
