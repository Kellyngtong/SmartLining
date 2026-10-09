import React, { useEffect, useState } from 'react';
import { Save, Plus, Trash2, Clock, Mail, Send, Smartphone, Monitor, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
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
  { key: 'recordatorio_horas_antelacion', label: 'Recordatorio (h antes)', ayuda: 'Cuándo se envía el email recordatorio', min: 1 },
  { key: 'review_retardo_horas', label: 'Reseña Google (h después)', ayuda: 'Cuándo se pide la reseña tras completar', min: 0 },
];

const NOTIFS: { key: string; label: string }[] = [
  { key: 'notif_creada', label: 'Reserva recibida' },
  { key: 'notif_confirmada', label: 'Reserva confirmada' },
  { key: 'notif_recordatorio', label: 'Recordatorio' },
  { key: 'notif_cambio', label: 'Cambio de reserva' },
  { key: 'notif_cancelacion', label: 'Cancelación' },
  { key: 'notif_review', label: 'Pedir reseña Google' },
];

const TEXTOS = ['marca_nombre', 'marca_logo_url', 'marca_color'];

const PLANTILLAS: { key: string; label: string }[] = [
  { key: 'reserva-creada', label: 'Reserva recibida' },
  { key: 'reserva-confirmada', label: 'Reserva confirmada' },
  { key: 'reserva-recordatorio', label: 'Recordatorio' },
  { key: 'reserva-cambio', label: 'Cambio de reserva' },
  { key: 'reserva-cancelada', label: 'Cancelación' },
  { key: 'mesa-lista', label: 'Mesa lista' },
  { key: 'review', label: 'Pedir reseña' },
  { key: 'email-prueba', label: 'Prueba' },
];

const AjustesTab: React.FC<{ colaId: number }> = ({ colaId }) => {
  const [config, setConfig] = useState<Record<string, number>>({});
  const [textos, setTextos] = useState<Record<string, string>>({});
  const [notifs, setNotifs] = useState<Record<string, boolean>>({});
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [nuevo, setNuevo] = useState({ dia_semana: 'LUNES', hora_inicio: '13:00', hora_fin: '15:30' });
  const [testEmail, setTestEmail] = useState('');
  const [enviandoTest, setEnviandoTest] = useState(false);
  const [testResultado, setTestResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [emailEstado, setEmailEstado] = useState<any>(null);
  const [previewPlantilla, setPreviewPlantilla] = useState('reserva-confirmada');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewVista, setPreviewVista] = useState<'movil' | 'escritorio'>('movil');
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [enlaces, setEnlaces] = useState<{ id_enlace: number; nombre: string; url: string; orden: number; activa: boolean }[]>([]);
  const [nuevoEnlace, setNuevoEnlace] = useState({ nombre: '', url: '' });

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
        const t: Record<string, string> = {};
        TEXTOS.forEach(k => {
          if (typeof data[k] === 'string') t[k] = data[k];
        });
        setTextos(t);
        const n: Record<string, boolean> = {};
        NOTIFS.forEach(f => {
          if (typeof data[f.key] === 'boolean') n[f.key] = data[f.key];
        });
        setNotifs(n);
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
    try {
      const res = await apiClient.getResenaEnlaces(colaId);
      setEnlaces((res.data as any[]) || []);
    } catch (e) {
      console.error('Error loading enlaces', e);
    }
    try {
      const res = await apiClient.getEmailEstado(colaId);
      setEmailEstado(res.data ?? null);
    } catch (e) {
      console.error('Error loading email estado', e);
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
      await apiClient.updateReservaConfig(colaId, { ...config, ...textos, ...notifs });
      setMensaje('Configuración guardada');
    } catch (e: any) {
      setMensaje(e?.response?.data?.error || 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  const enviarPrueba = async () => {
    if (!testEmail.trim()) return;
    setEnviandoTest(true);
    setTestResultado(null);
    try {
      const res = await apiClient.sendEmailPrueba(colaId, testEmail.trim());
      const data = res.data as any;
      if (data?.enviado) {
        setTestResultado({ ok: true, texto: `Prueba enviada a ${testEmail.trim()}. Revisa la bandeja (y spam).` });
      } else {
        setTestResultado({ ok: false, texto: `No enviado: ${data?.error || 'revisa la configuración SMTP'}` });
      }
    } catch (e: any) {
      setTestResultado({ ok: false, texto: e?.response?.data?.error || 'No se pudo enviar la prueba' });
    } finally {
      setEnviandoTest(false);
      try {
        const res = await apiClient.getEmailEstado(colaId);
        setEmailEstado(res.data ?? null);
      } catch (e) {
        // sin estado
      }
    }
  };

  const cargarPreview = async (plantilla: string) => {
    setCargandoPreview(true);
    try {
      const res = await apiClient.previewEmail(colaId, plantilla);
      setPreviewHtml((res.data as any)?.html ?? null);
    } catch (e) {
      setPreviewHtml(null);
    } finally {
      setCargandoPreview(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    cargarPreview(previewPlantilla);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colaId]);

  const crearEnlace = async () => {
    if (!nuevoEnlace.nombre.trim() || !nuevoEnlace.url.trim()) return;
    try {
      await apiClient.createResenaEnlace(colaId, { nombre: nuevoEnlace.nombre.trim(), url: nuevoEnlace.url.trim() });
      setNuevoEnlace({ nombre: '', url: '' });
      setMensaje('Enlace añadido');
      await cargar();
    } catch (e: any) {
      setMensaje(e?.response?.data?.error || 'No se pudo añadir el enlace');
    }
  };

  const borrarEnlace = async (id: number) => {
    if (!window.confirm('¿Eliminar este enlace de reseña?')) return;
    try {
      await apiClient.deleteResenaEnlace(id);
      await cargar();
    } catch (e) {
      setMensaje('No se pudo eliminar');
    }
  };

  const toggleEnlace = async (id: number, activa: boolean) => {
    try {
      await apiClient.updateResenaEnlace(id, { activa });
      await cargar();
    } catch (e) {
      setMensaje('No se pudo actualizar');
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

      <div className="panel" style={{ marginBottom: 16 }}>
        <h3><Mail size={18} /> Comunicaciones por email</h3>
        {emailEstado && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              marginBottom: 16,
              padding: '12px 14px',
              borderRadius: 10,
              fontSize: '0.85rem',
              background: emailEstado.configurado ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${emailEstado.configurado ? '#bbf7d0' : '#fecaca'}`,
              color: emailEstado.configurado ? '#15803d' : '#b91c1c',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                marginTop: 4,
                backgroundColor: emailEstado.configurado ? '#22c55e' : '#dc2626',
                flexShrink: 0,
              }}
            />
            <div>
              <div>
                <strong>SMTP {emailEstado.configurado ? 'configurado' : 'sin configurar'}</strong>
                {emailEstado.host && <span> · {emailEstado.host}:{emailEstado.puerto} · {emailEstado.usuario}</span>}
              </div>
              {emailEstado.remitente && (
                <div style={{ marginTop: 4 }}>
                  Remitente: <strong>{emailEstado.remitente}</strong> (debe estar verificado en Brevo)
                </div>
              )}
              <div style={{ marginTop: 4 }}>
                Últimas 24h: {emailEstado.ultimas_24h?.ENVIADO ?? 0} enviados · {emailEstado.ultimas_24h?.FALLO ?? 0} fallos · {emailEstado.ultimas_24h?.OMITIDO ?? 0} omitidos
              </div>
              {emailEstado.ultimo_error && (
                <div style={{ marginTop: 4 }}>
                  Último error ({emailEstado.ultimo_error.plantilla} → {emailEstado.ultimo_error.destinatario}): {emailEstado.ultimo_error.error || 'desconocido'}
                </div>
              )}
            </div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginBottom: 16 }}>
          {NOTIFS.map(f => (
            <label key={f.key} style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center', fontSize: '0.9rem' }}>
              <input
                type="checkbox"
                checked={notifs[f.key] !== false}
                onChange={e => setNotifs({ ...notifs, [f.key]: e.target.checked })}
              />
              {f.label}
            </label>
          ))}
        </div>
        <div className="mesa-form">
          <label className="full-width" style={{ fontWeight: 600 }}>Enlaces de reseña (email post-visita)
            <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Añade las plataformas que necesites (Google, TripAdvisor…). Sin enlaces activos no se envía.
            </span>
          </label>
        </div>
        {enlaces.length === 0 ? (
          <p style={{ color: '#999', fontSize: '0.9rem' }}>Sin enlaces configurados</p>
        ) : (
          <div className="cola-espera-list" style={{ marginBottom: 12 }}>
            {enlaces.map(l => (
              <div key={l.id_enlace} className="cola-espera-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <input
                    type="checkbox"
                    checked={l.activa}
                    onChange={e => toggleEnlace(l.id_enlace, e.target.checked)}
                    title={l.activa ? 'Desactivar' : 'Activar'}
                    aria-label={`Activar enlace ${l.nombre}`}
                  />
                  <div style={{ opacity: l.activa ? 1 : 0.5 }}>
                    <div><strong>{l.nombre}</strong></div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', wordBreak: 'break-all' }}>{l.url}</div>
                  </div>
                </div>
                <button className="btn-ghost-rest" style={{ color: '#b91c1c' }} onClick={() => borrarEnlace(l.id_enlace)} aria-label={`Eliminar enlace ${l.nombre}`}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 8 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Plataforma
            <input
              value={nuevoEnlace.nombre}
              onChange={e => setNuevoEnlace({ ...nuevoEnlace, nombre: e.target.value })}
              placeholder="Google"
              maxLength={60}
              style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.85rem', color: 'var(--color-text-secondary)', flex: 1, minWidth: 220 }}>
            URL
            <input
              type="url"
              value={nuevoEnlace.url}
              onChange={e => setNuevoEnlace({ ...nuevoEnlace, url: e.target.value })}
              placeholder="https://…"
              style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
            />
          </label>
          <button className="btn-restaurant" onClick={crearEnlace} disabled={!nuevoEnlace.nombre.trim() || !nuevoEnlace.url.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Plus size={16} /> Añadir
          </button>
        </div>
        <div className="mesa-form" style={{ marginTop: 12 }}>
          <label>Nombre marca
            <input
              value={textos.marca_nombre ?? ''}
              onChange={e => setTextos({ ...textos, marca_nombre: e.target.value })}
              placeholder="Nombre del restaurante"
            />
          </label>
          <label>Color marca
            <input
              value={textos.marca_color ?? ''}
              onChange={e => setTextos({ ...textos, marca_color: e.target.value })}
              placeholder="#c9a227"
              title="Color hex para cabeceras y botones, ej. #c9a227"
            />
          </label>
          <label className="full-width">Logo marca (URL)
            <input
              type="url"
              value={textos.marca_logo_url ?? ''}
              onChange={e => setTextos({ ...textos, marca_logo_url: e.target.value })}
              placeholder="https://…/logo.png"
            />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 12 }}>
          <button className="btn-restaurant yellow" onClick={guardar} disabled={guardando} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Save size={16} /> Guardar comunicaciones
          </button>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="tu@email.com"
              style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8 }}
            />
            <button className="btn-ghost-rest" onClick={enviarPrueba} disabled={enviandoTest || !testEmail.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Send size={14} /> {enviandoTest ? 'Enviando…' : 'Enviar prueba'}
            </button>
          </div>
        </div>
        {testResultado && (
          <div
            role={testResultado.ok ? 'status' : 'alert'}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              marginTop: 12,
              padding: '12px 14px',
              borderRadius: 10,
              fontSize: '0.9rem',
              background: testResultado.ok ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${testResultado.ok ? '#bbf7d0' : '#fecaca'}`,
              color: testResultado.ok ? '#15803d' : '#b91c1c',
            }}
          >
            {testResultado.ok ? <CheckCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} /> : <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />}
            <span>{testResultado.texto}</span>
          </div>
        )}
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h3><Smartphone size={18} /> Vista previa del email</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <select
            value={previewPlantilla}
            onChange={e => { setPreviewPlantilla(e.target.value); void cargarPreview(e.target.value); }}
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
            aria-label="Plantilla a previsualizar"
          >
            {PLANTILLAS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <div className="vista-toggle" style={{ marginBottom: 0 }}>
            <button className={previewVista === 'movil' ? 'active' : ''} onClick={() => setPreviewVista('movil')}>
              <Smartphone size={14} style={{ marginRight: 4 }} /> Móvil
            </button>
            <button className={previewVista === 'escritorio' ? 'active' : ''} onClick={() => setPreviewVista('escritorio')}>
              <Monitor size={14} style={{ marginRight: 4 }} /> Escritorio
            </button>
          </div>
          <button className="btn-ghost-rest" onClick={() => cargarPreview(previewPlantilla)} disabled={cargandoPreview} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              width: previewVista === 'movil' ? '100%' : '100%',
              maxWidth: previewVista === 'movil' ? 375 : 640,
              border: previewVista === 'movil' ? '10px solid #1f2937' : '1px solid var(--color-border)',
              borderRadius: previewVista === 'movil' ? 28 : 12,
              overflow: 'hidden',
              background: '#fff',
            }}
          >
            {cargandoPreview ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <span className="spinner-rest" role="status" aria-label="Cargando vista previa" />
              </div>
            ) : previewHtml ? (
              <iframe
                title={`Vista previa: ${previewPlantilla} (${previewVista})`}
                srcDoc={previewHtml}
                sandbox=""
                style={{ width: '100%', height: 560, border: 'none', display: 'block', background: '#fff' }}
              />
            ) : (
              <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>No se pudo cargar la vista previa</p>
            )}
          </div>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 8, textAlign: 'center' }}>
          Datos de ejemplo con tu branding actual. Guarda los cambios de marca para verlos aquí.
        </p>
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
