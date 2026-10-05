import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/auth.middleware';
import { puedeAccederACola } from '../utils/tenant-access';
import { getReservaConfig } from '../utils/reserva-config';

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
      data = {
        ...(num(body.antelacion_min_min, 0, 'antelacion_min_min') !== null && { antelacion_min_min: body.antelacion_min_min }),
        ...(num(body.antelacion_max_dias, 1, 'antelacion_max_dias') !== null && { antelacion_max_dias: body.antelacion_max_dias }),
        ...(num(body.slot_min, 5, 'slot_min') !== null && { slot_min: body.slot_min }),
        ...(num(body.max_comensales_online, 1, 'max_comensales_online') !== null && { max_comensales_online: body.max_comensales_online }),
        ...(num(body.max_reservas_por_telefono, 1, 'max_reservas_por_telefono') !== null && { max_reservas_por_telefono: body.max_reservas_por_telefono }),
        ...(num(body.modificacion_limite_horas, 0, 'modificacion_limite_horas') !== null && { modificacion_limite_horas: body.modificacion_limite_horas }),
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
