import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import { logger } from '../config/logger';

const router = Router();

/**
 * GET /api/analytics/service-time?colaId=1&period=30
 * Returns average service time (minutes) per day for the last `period` days for the given queue.
 */
router.get('/service-time', async (req: Request, res: Response) => {
  try {
    const colaId = req.query.colaId ? parseInt(String(req.query.colaId)) : undefined;
    const period = req.query.period ? parseInt(String(req.query.period)) : 30;

    if (!colaId || isNaN(colaId)) {
      return res.status(400).json({ success: false, error: 'colaId is required' });
    }

    const days = Math.max(1, Math.min(365, period));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Fetch atenciones joined with turno to filter by cola
    const atenciones = await prisma.atencion.findMany({
      where: {
        duracion_atencion: { not: null },
        turno: { id_cola: colaId },
      },
      select: {
        duracion_atencion: true,
        turno: {
          select: { fecha_hora_inicio_atencion: true, fecha_hora_creacion: true },
        },
      },
    });

    // Aggregate by date (YYYY-MM-DD)
    const buckets: Record<string, { totalSec: number; count: number }> = {};

    atenciones.forEach((a) => {
      const when = a.turno.fecha_hora_inicio_atencion || a.turno.fecha_hora_creacion || new Date();
      const day = new Date(when).toISOString().slice(0, 10);
      if (!buckets[day]) buckets[day] = { totalSec: 0, count: 0 };
      buckets[day].totalSec += a.duracion_atencion as number;
      buckets[day].count += 1;
    });

    // Build series for last `days` days
    const series: Array<{ date: string; avgMinutes: number | null }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const bucket = buckets[key];
      if (bucket && bucket.count > 0) {
        series.push({ date: key, avgMinutes: Math.round(((bucket.totalSec / bucket.count) / 60) * 100) / 100 });
      } else {
        series.push({ date: key, avgMinutes: null });
      }
    }

    return res.json({ success: true, data: { series } });
  } catch (error) {
    logger.error('Error fetching service-time analytics:', error);
    return res.status(500).json({ success: false, error: 'Error fetching analytics' });
  }
});

export default router;
