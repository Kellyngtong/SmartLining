import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/auth.middleware';
import { puedeAccederACola } from '../utils/tenant-access';
import { getReservaConfig } from '../utils/reserva-config';
import { sendMail, renderMail } from '../services/mail.service';
import { emailValido, getBrandVars } from '../services/reserva-notifier.service';

const router = Router();

// ==========================================
// GET /api/restaurant/config/:colaId
// ==========================================
router.get('/config/:colaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    if (isNaN(colaId)) {
      return res.status(400).json({ success: false, error: 'Invalid cola ID' });
    }
    if (!(await puedeAccederACola(colaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    const config = await getReservaConfig(colaId);
    return res.json({ success: true, data: { id_cola: colaId, ...config } });
  } catch (error) {
    logger.error('Error fetching reserva config:', error);
    return res.status(500).json({ success: false, error: 'Error fetching config' });
  }
});

// ==========================================
// PUT /api/restaurant/config/:colaId
// ==========================================
router.put('/config/:colaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    if (isNaN(colaId)) {
      return res.status(400).json({ success: false, error: 'Invalid cola ID' });
    }
    if (!(await puedeAccederACola(colaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    const body = req.body;
    const num = (v: unknown, min: number, name: string): number | null => {
      if (v === undefined) return null;
      if (typeof v !== 'number' || !Number.isInteger(v) || v < min) {
        throw new Error(`${name} must be an integer >= ${min}`);
      }
      return v;
    };
    let data: any;
    try {
      const str = (v: unknown, max: number, name: string): string | null | undefined => {
        if (v === undefined) return undefined;
        if (v === null || v === '') return null;
        if (typeof v !== 'string' || v.length > max) {
          throw new Error(`${name} must be a string up to ${max} chars`);
        }
        return v.trim() || null;
      };
      const bool = (v: unknown, name: string): boolean | undefined => {
        if (v === undefined) return undefined;
        if (typeof v !== 'boolean') throw new Error(`${name} must be boolean`);
        return v;
      };
      const color = str(body.marca_color, 20, 'marca_color');
      if (color && !/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(color)) {
        throw new Error('marca_color must be a hex color like #c9a227');
      }
      const pick = <T>(v: T | undefined | null, key: string): Record<string, T | null> =>
        v === undefined ? {} : { [key]: v };
      data = {
        ...(num(body.antelacion_min_min, 0, 'antelacion_min_min') !== null && { antelacion_min_min: body.antelacion_min_min }),
        ...(num(body.antelacion_max_dias, 1, 'antelacion_max_dias') !== null && { antelacion_max_dias: body.antelacion_max_dias }),
        ...(num(body.slot_min, 5, 'slot_min') !== null && { slot_min: body.slot_min }),
        ...(num(body.max_comensales_online, 1, 'max_comensales_online') !== null && { max_comensales_online: body.max_comensales_online }),
        ...(num(body.max_reservas_por_telefono, 1, 'max_reservas_por_telefono') !== null && { max_reservas_por_telefono: body.max_reservas_por_telefono }),
        ...(num(body.modificacion_limite_horas, 0, 'modificacion_limite_horas') !== null && { modificacion_limite_horas: body.modificacion_limite_horas }),
        ...(num(body.recordatorio_horas_antelacion, 1, 'recordatorio_horas_antelacion') !== null && { recordatorio_horas_antelacion: body.recordatorio_horas_antelacion }),
        ...(num(body.review_retardo_horas, 0, 'review_retardo_horas') !== null && { review_retardo_horas: body.review_retardo_horas }),
        ...pick(str(body.marca_nombre, 150, 'marca_nombre'), 'marca_nombre'),
        ...pick(str(body.marca_logo_url, 500, 'marca_logo_url'), 'marca_logo_url'),
        ...pick(color, 'marca_color'),
        ...(bool(body.notif_creada, 'notif_creada') !== undefined && { notif_creada: body.notif_creada }),
        ...(bool(body.notif_confirmada, 'notif_confirmada') !== undefined && { notif_confirmada: body.notif_confirmada }),
        ...(bool(body.notif_recordatorio, 'notif_recordatorio') !== undefined && { notif_recordatorio: body.notif_recordatorio }),
        ...(bool(body.notif_cambio, 'notif_cambio') !== undefined && { notif_cambio: body.notif_cambio }),
        ...(bool(body.notif_cancelacion, 'notif_cancelacion') !== undefined && { notif_cancelacion: body.notif_cancelacion }),
        ...(bool(body.notif_review, 'notif_review') !== undefined && { notif_review: body.notif_review }),
      };
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
    const config = await prisma.reservaConfig.upsert({
      where: { id_cola: colaId },
      update: data,
      create: { id_cola: colaId, ...data },
    });
    return res.json({ success: true, data: config, message: 'Configuración actualizada' });
  } catch (error) {
    logger.error('Error updating reserva config:', error);
    return res.status(500).json({ success: false, error: 'Error updating config' });
  }
});

// ==========================================
// POST /api/restaurant/email-prueba/:colaId { to }
// Enviar correo de prueba con el branding del restaurante
// ==========================================
router.post('/email-prueba/:colaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    const { to } = req.body;
    if (isNaN(colaId)) {
      return res.status(400).json({ success: false, error: 'Invalid cola ID' });
    }
    if (!(await puedeAccederACola(colaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    if (!emailValido(to)) {
      return res.status(400).json({ success: false, error: 'to debe ser un email válido' });
    }
    const brand = await getBrandVars(colaId);
    const result = await sendMail({
      id_cola: colaId,
      to: to.trim(),
      subject: `Prueba de correo — ${brand.marca}`,
      plantilla: 'email-prueba',
      vars: {},
      brand,
    });
    return res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error sending test email:', error);
    return res.status(500).json({ success: false, error: 'Error sending test email' });
  }
});

// ==========================================
// POST /api/restaurant/email-preview/:colaId { plantilla }
// Renderiza una plantilla con datos de ejemplo + branding (sin enviar)
// ==========================================
const PLANTILLAS_PREVIEW = [
  'reserva-creada',
  'reserva-confirmada',
  'reserva-recordatorio',
  'reserva-cambio',
  'reserva-cancelada',
  'mesa-lista',
  'review',
  'email-prueba',
];

router.post('/email-preview/:colaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    const { plantilla } = req.body;
    if (isNaN(colaId)) {
      return res.status(400).json({ success: false, error: 'Invalid cola ID' });
    }
    if (!(await puedeAccederACola(colaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    if (!PLANTILLAS_PREVIEW.includes(plantilla)) {
      return res.status(400).json({ success: false, error: `plantilla debe ser una de: ${PLANTILLAS_PREVIEW.join(', ')}` });
    }
    const brand = await getBrandVars(colaId);
    const enlaces = await prisma.resenaEnlace.findMany({
      where: { id_cola: colaId, activa: true },
      orderBy: [{ orden: 'asc' }, { id_enlace: 'asc' }],
      select: { nombre: true, url: true },
    });
    const vars = {
      nombre: 'María García',
      fecha: '10/10/2026',
      hora: '21:00',
      comensales: 2,
      miReservaUrl: '#',
      motivo: 'Este es un texto de ejemplo.',
      googleReviewUrl: null,
      tripadvisorReviewUrl: null,
      reviewLinks: enlaces.length > 0 ? enlaces : [
        { nombre: 'Google', url: '#' },
        { nombre: 'TripAdvisor', url: '#' },
      ],
    };
    const html = renderMail(plantilla, vars, brand);
    return res.json({ success: true, data: { plantilla, html } });
  } catch (error) {
    logger.error('Error rendering email preview:', error);
    return res.status(500).json({ success: false, error: 'Error rendering preview' });
  }
});

// ==========================================
// GET /api/restaurant/email-estado/:colaId
// Diagnóstico SMTP: configuración (sin secretos), volumen 24h y último error
// ==========================================
router.get('/email-estado/:colaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    if (isNaN(colaId)) {
      return res.status(400).json({ success: false, error: 'Invalid cola ID' });
    }
    if (!(await puedeAccederACola(colaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    const desde = new Date(Date.now() - 24 * 3600000);
    const [grupos, ultimo] = await Promise.all([
      prisma.emailLog.groupBy({
        by: ['estado'],
        where: { id_cola: colaId, created_at: { gte: desde } },
        _count: { estado: true },
      }),
      prisma.emailLog.findFirst({
        where: { id_cola: colaId, estado: { in: ['FALLO', 'OMITIDO'] } },
        orderBy: { created_at: 'desc' },
      }),
    ]);
    const stats: Record<string, number> = { ENVIADO: 0, FALLO: 0, OMITIDO: 0 };
    for (const g of grupos) {
      if (g.estado in stats) stats[g.estado] = g._count.estado;
    }
    const user = process.env.SMTP_USER || '';
    return res.json({
      success: true,
      data: {
        configurado: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD),
        host: process.env.SMTP_HOST || null,
        puerto: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : null,
        usuario: user ? `${user.slice(0, 3)}***` : null,
        remitente: process.env.SMTP_FROM?.trim() || user || null,
        ultimas_24h: stats,
        ultimo_error: ultimo
          ? { plantilla: ultimo.plantilla, destinatario: ultimo.destinatario, error: ultimo.error, fecha: ultimo.created_at }
          : null,
      },
    });
  } catch (error) {
    logger.error('Error fetching email estado:', error);
    return res.status(500).json({ success: false, error: 'Error fetching email estado' });
  }
});

// ==========================================
// GET /api/restaurant/clientes-historial?colaId=&telefono=
// Ficha CRM por teléfono: historial + estadísticas
// ==========================================
router.get('/clientes-historial', authMiddleware, async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.query.colaId as string, 10);
    const telefono = (req.query.telefono as string)?.trim();
    if (isNaN(colaId) || !telefono) {
      return res.status(400).json({ success: false, error: 'colaId and telefono are required' });
    }
    if (!(await puedeAccederACola(colaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    const reservas = await prisma.reserva.findMany({
      where: { id_cola: colaId, cliente_telefono: telefono },
      orderBy: [{ fecha: 'desc' }, { hora_inicio: 'desc' }],
      take: 20,
    });
    const porEstado: Record<string, number> = {};
    for (const r of reservas) porEstado[r.estado] = (porEstado[r.estado] ?? 0) + 1;
    const finalizadas = (porEstado.COMPLETADA ?? 0) + (porEstado.SENTADA ?? 0);
    const noShows = porEstado.NO_SHOW ?? 0;
    const atendidas = finalizadas + noShows;
    return res.json({
      success: true,
      data: {
        telefono,
        total: reservas.length,
        por_estado: porEstado,
        tasa_no_show: atendidas > 0 ? Math.round((noShows / atendidas) * 100) : 0,
        ultimas: reservas.slice(0, 10),
      },
    });
  } catch (error) {
    logger.error('Error fetching cliente historial:', error);
    return res.status(500).json({ success: false, error: 'Error fetching historial' });
  }
});

// ==========================================
// GET /api/restaurant/reporte-reservas/:colaId?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
// ==========================================
router.get('/reporte-reservas/:colaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    if (isNaN(colaId)) {
      return res.status(400).json({ success: false, error: 'Invalid cola ID' });
    }
    if (!(await puedeAccederACola(colaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const desdeStr = (req.query.desde as string) || new Date(hoy.getTime() - 29 * 86400000).toISOString().slice(0, 10);
    const hastaStr = (req.query.hasta as string) || hoy.toISOString().slice(0, 10);
    const desde = new Date(`${desdeStr}T00:00:00`);
    const hastaFin = new Date(`${hastaStr}T00:00:00`);
    hastaFin.setDate(hastaFin.getDate() + 1);
    if (isNaN(desde.getTime()) || isNaN(hastaFin.getTime())) {
      return res.status(400).json({ success: false, error: 'desde/hasta must be YYYY-MM-DD' });
    }

    const reservas = await prisma.reserva.findMany({
      where: { id_cola: colaId, fecha: { gte: desde, lt: hastaFin } },
      select: { estado: true, fecha: true, num_comensales: true, origen: true },
    });
    const porEstado: Record<string, number> = {};
    const porDia: Record<string, number> = {};
    let comensales = 0;
    for (const r of reservas) {
      porEstado[r.estado] = (porEstado[r.estado] ?? 0) + 1;
      const key = r.fecha.toISOString().slice(0, 10);
      porDia[key] = (porDia[key] ?? 0) + 1;
      comensales += r.num_comensales;
    }
    const total = reservas.length;
    const confirmadas = (porEstado.CONFIRMADA ?? 0) + (porEstado.CHECKED_IN ?? 0) + (porEstado.SENTADA ?? 0) + (porEstado.COMPLETADA ?? 0);
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
    return res.json({
      success: true,
      data: {
        desde: desdeStr,
        hasta: hastaStr,
        total,
        comensales,
        por_estado: porEstado,
        tasa_confirmacion: pct(confirmadas),
        tasa_cancelacion: pct(porEstado.CANCELADA ?? 0),
        tasa_no_show: pct(porEstado.NO_SHOW ?? 0),
        por_dia: Object.entries(porDia).sort(([a], [b]) => (a < b ? -1 : 1)).map(([fecha, n]) => ({ fecha, total: n })),
      },
    });
  } catch (error) {
    logger.error('Error fetching reporte reservas:', error);
    return res.status(500).json({ success: false, error: 'Error fetching report' });
  }
});

export default router;
