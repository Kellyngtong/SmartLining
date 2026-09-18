import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, RefreshCw, AlertTriangle, Users, Clock, Link2, LayoutGrid, CalendarDays, ListOrdered, Map, BarChart3 } from 'lucide-react';
import MesaGrid from '../components/restaurant/MesaGrid';
import VistaToggle from '../components/restaurant/VistaToggle';
import StatsMesasWidget from '../components/restaurant/StatsMesasWidget';
import MesaForm from '../components/restaurant/MesaForm';
import ColaEsperaList from '../components/restaurant/ColaEsperaList';
import AsignarMesaModal from '../components/restaurant/AsignarMesaModal';
import LiberarMesaModal from '../components/restaurant/LiberarMesaModal';
import JuntarMesasModal from '../components/restaurant/JuntarMesasModal';
import ReservasTab from '../components/restaurant/ReservasTab';
import WaitlistTab from '../components/restaurant/WaitlistTab';
import ZonasTab from '../components/restaurant/ZonasTab';
import DashboardTab from '../components/restaurant/DashboardTab';
import { useRestaurantStore, TurnoEspera } from '../store/restaurant.store';
import { Mesa } from '../models';
import { Reserva, WaitlistEntry } from '../types';
import { agruparMesasJuntadas } from '../models/mesaGrupos';
import { apiClient } from '../services/api';
import '../styles/restaurant.css';

interface EstadoEdicion {
  mesa: Mesa;
}

type TabId = 'sala' | 'reservas' | 'waitlist' | 'zonas' | 'dashboard';

const hoyStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const RestaurantAdminPage: React.FC = () => {
  const { colaId } = useParams<{ colaId: string }>();
  const id = colaId ? parseInt(colaId, 10) : NaN;

  const {
    mesas,
    turnosEspera,
    stats,
    isLoading,
    error,
    fetchCola,
    fetchSala,
    initSse,
    zonas,
    mesasSinZona,
    reservas,
    waitlist,
    dashboard,
    crearMesa,
    editarMesa,
    borrarMesa,
    asignarManual,
    liberarMesa,
    juntarMesas,
    separarMesa,
    anadirSilla,
    quitarSilla,
    crearZona,
    editarZona,
    borrarZona,
    asignarMesasZona,
    fetchReservas,
    cambiarEstadoReserva,
    borrarReserva,
    cambiarEstadoWaitlist,
    borrarWaitlist,
    clearError,
  } = useRestaurantStore();

  const [tab, setTab] = useState<TabId>('sala');
  const [vista, setVista] = useState<'grid' | 'lista'>('grid');
  const [crear, setCrear] = useState(false);
  const [editando, setEditando] = useState<EstadoEdicion | null>(null);
  const [asignando, setAsignando] = useState<TurnoEspera | null>(null);
  const [liberando, setLiberando] = useState<Mesa | null>(null);
  const [juntando, setJuntando] = useState(false);
  const [juntarMesaId, setJuntarMesaId] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [statsRest, setStatsRest] = useState<any>(null);
  const [fechaReservas, setFechaReservas] = useState<string>(hoyStr());

  const refresh = useCallback(() => {
    if (!isNaN(id)) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      fetchCola(id);
    }
  }, [id, fetchCola]);

  const refreshSala = useCallback(() => {
    if (!isNaN(id)) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      fetchSala(id, fechaReservas);
    }
  }, [id, fetchSala, fechaReservas]);

  const fetchStats = useCallback(() => {
    if (!isNaN(id)) {
      apiClient.getRestaurantStats(id).then(res => {
        const data = res.data as any;
        if (data) setStatsRest(data);
      }).catch(() => {});
    }
  }, [id]);

  useEffect(() => {
    if (isNaN(id)) return;
    refresh();
    fetchSala(id, fechaReservas);
    fetchStats();
    return initSse(id);
  }, [id, fetchSala, fechaReservas, fetchStats, initSse, refresh]);

  useEffect(() => {
    if (!mensaje) return;
    const t = setTimeout(() => setMensaje(null), 5000);
    return () => clearTimeout(t);
  }, [mensaje]);

  const handleCrear = async (data: { numero: number; capacidad: number }) => {
    const ok = await crearMesa(data);
    if (ok) {
      setMensaje(`Mesa ${data.numero} creada`);
      setCrear(false);
    } else {
      setMensaje(error || 'No se pudo crear la mesa');
    }
  };

  const handleEditar = async (data: { numero: number; capacidad: number }) => {
    if (!editando) return;
    const ok = await editarMesa(editando.mesa.id_mesa, data);
    if (ok) {
      setMensaje(`Mesa ${data.numero} actualizada`);
      setEditando(null);
    } else {
      setMensaje(error || 'No se pudo actualizar');
    }
  };

  const handleBorrarMesa = async (mesa: Mesa) => {
    if (!window.confirm(`¿Eliminar la mesa ${mesa.numero}?`)) return;
    const ok = await borrarMesa(mesa.id_mesa);
    if (ok) setMensaje(`Mesa ${mesa.numero} eliminada`);
    else setMensaje(error || 'No se pudo eliminar');
  };

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
      setMensaje('Mesas unidas correctamente');
      setJuntando(false);
    } else {
      setMensaje(error || 'No se pudieron unir las mesas');
    }
  };

  const handleFechaReservas = (f: string) => {
    setFechaReservas(f);
    if (!isNaN(id)) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      fetchReservas(id, f);
    }
  };

  const handleAndo = async (fn: () => Promise<boolean>, okMsg: string): Promise<boolean> => {
    clearError();
    const ok = await fn();
    setMensaje(ok ? okMsg : error || 'Operación fallida');
    return ok;
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'sala', label: 'Sala', icon: <LayoutGrid size={16} /> },
    { id: 'reservas', label: 'Reservas', icon: <CalendarDays size={16} /> },
    { id: 'waitlist', label: 'Cola espera', icon: <ListOrdered size={16} /> },
    { id: 'zonas', label: 'Zonas', icon: <Map size={16} /> },
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={16} /> },
  ];

  return (
    <div className="restaurant-container">
      <div className="restaurant-hero">
        <h1>Administración del Restaurante</h1>
        <p>Gestiona sala, reservas, lista de espera, zonas y el estado del local.</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          <button className="btn-restaurant yellow" onClick={() => { refreshSala(); fetchStats(); }} disabled={isLoading}>
            <RefreshCw size={16} style={{ marginRight: 6 }} /> Refrescar
          </button>
          {tab === 'sala' && (
            <>
              <button
                className="btn-restaurant"
                style={{ background: 'var(--sl-black)', color: 'var(--sl-yellow)', borderColor: 'var(--sl-yellow)' }}
                onClick={() => { setJuntando(true); setJuntarMesaId(null); }}
              >
                <Link2 size={16} style={{ marginRight: 6 }} /> Unir mesas / sillas
              </button>
              <button className="btn-restaurant" onClick={() => setCrear(true)}>
                <Plus size={16} style={{ marginRight: 6 }} /> Nueva mesa
              </button>
            </>
          )}
        </div>
      </div>

      <div className="rest-tabs" role="tablist">
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`rest-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
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

      {tab === 'sala' && (
        <>
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

          <div className="panel" style={{ marginBottom: 24 }}>
            <h3>Cola de comensales</h3>
            <ColaEsperaList
              turnos={turnosEspera}
              onAsignar={setAsignando}
              maxCapacidad={stats?.maxCapacidadRestaurante}
            />
          </div>

          <div className="panel" style={{ marginBottom: 24 }}>
            <h3>Configuración del local</h3>
            {statsRest && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                <div>
                  <div className="stat-label">Capacidad máx. / mesa</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--sl-amber)' }}>
                    {statsRest.maxCapacidadRestaurante} pers.
                  </div>
                </div>
                <div>
                  <div className="stat-label">Turnos hoy</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{statsRest.turnosHoy}</div>
                </div>
                <div>
                  <div className="stat-label">Tiempo medio atención</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                    {statsRest.tiempoPromedioAtencionMinutos} min
                  </div>
                </div>
                <div>
                  <div className="stat-label">Tasa ocupación</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{statsRest.tasaOcupacion}%</div>
                </div>
              </div>
            )}
          </div>

          <div className="panel">
            <h3>Mesas del restaurante ({mesas.length})</h3>

            {crear && (
              <div style={{ background: '#fafafa', border: '1px solid var(--color-border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <h4 style={{ marginBottom: 10 }}>Nueva mesa</h4>
                <MesaForm onSubmit={handleCrear} onCancel={() => setCrear(false)} submitLabel="Crear mesa" />
              </div>
            )}

            {editando && (
              <div style={{ background: '#fafafa', border: '1px solid var(--color-border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <h4 style={{ marginBottom: 10 }}>Editar mesa {editando.mesa.numero}</h4>
                <MesaForm
                  onSubmit={handleEditar}
                  onCancel={() => setEditando(null)}
                  initial={{ numero: editando.mesa.numero, capacidad: editando.mesa.capacidad }}
                  submitLabel="Guardar cambios"
                />
              </div>
            )}

            <VistaToggle vista={vista} onVistaChange={setVista} />

            {vista === 'lista' ? (
              <div className="mesa-list">
                {mesas.map(mesa => (
                  <div key={mesa.id_mesa} className={`mesa-list-item ${mesa.estado.toLowerCase()}`}>
                    <div className="mesa-list-info">
                      <span className="mesa-list-numero">{mesa.numero}</span>
                      <span>Mesa {mesa.numero} · {mesa.capacidad} comensales</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-ghost-rest" onClick={() => setEditando({ mesa })}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn-ghost-rest" style={{ color: '#b91c1c' }} onClick={() => handleBorrarMesa(mesa)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <MesaGrid
                mesas={mesas}
                onLiberar={mesa => mesa.isOcupada() && handleLiberarClick(mesa)}
                onJuntar={mesa => { setJuntarMesaId(mesa.id_mesa); setJuntando(true); }}
                onEliminar={mesa => handleBorrarMesa(mesa)}
              />
            )}
          </div>
        </>
      )}

      {tab === 'reservas' && (
        <ReservasTab
          reservas={reservas}
          fecha={fechaReservas}
          zonas={zonas.map(z => ({ id_zona: z.id_zona, nombre: z.nombre }))}
          onFechaChange={handleFechaReservas}
          onChangeEstado={async (rid, estado) => {
            const ok = await cambiarEstadoReserva(rid, estado);
            setMensaje(ok ? `Estado de reserva actualizado a ${estado}` : error || 'No se pudo actualizar');
          }}
          onDelete={(r: Reserva) => {
            if (!window.confirm(`¿Eliminar la reserva de ${r.cliente_nombre}?`)) return;
            void handleAndo(() => borrarReserva(r.id_reserva), 'Reserva eliminada');
          }}
        />
      )}

      {tab === 'waitlist' && (
        <WaitlistTab
          entries={waitlist}
          onChangeEstado={async (wid, estado) => {
            const ok = await cambiarEstadoWaitlist(wid, estado);
            setMensaje(ok ? `Estado de la cola actualizado a ${estado}` : error || 'No se pudo actualizar');
          }}
          onDelete={(e: WaitlistEntry) => {
            if (!window.confirm(`¿Eliminar a ${e.cliente_nombre} de la cola?`)) return;
            void handleAndo(() => borrarWaitlist(e.id_waitlist), 'Entrada eliminada');
          }}
        />
      )}

      {tab === 'zonas' && (
        <ZonasTab
          zonas={zonas}
          mesasSinZona={mesasSinZona}
          onCrear={(data) => handleAndo(() => crearZona(data), `Zona '${data.nombre}' creada`)}
          onEditar={(zid, data) => handleAndo(() => editarZona(zid, data), 'Zona actualizada')}
          onEliminar={(z) => {
            if (!window.confirm(`¿Eliminar la zona '${z.nombre}'? Sus mesas quedarán sin zona.`)) return;
            void handleAndo(() => borrarZona(z.id_zona), `Zona '${z.nombre}' eliminada`);
          }}
          onAsignarMesas={(zid, mesaIds) => handleAndo(() => asignarMesasZona(zid, mesaIds), 'Mesas actualizadas en la zona')}
        />
      )}

      {tab === 'dashboard' && <DashboardTab dashboard={dashboard} />}

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

export default RestaurantAdminPage;