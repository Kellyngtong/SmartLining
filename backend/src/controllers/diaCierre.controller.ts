import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/auth.middleware';
import { puedeAccederACola } from '../utils/tenant-access';

const router = Router();

function parseFechaDia(str: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (!m) return null;
  const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 0, 0, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

// ==========================================
// GET /api/restaurant/dias-cierre/:colaId
// ==========================================
router.get('/dias-cierre/:colaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    if (isNaN(colaId)) {
      return res.status(400).json({ success: false, error: 'Invalid cola ID' });
    }
    if (!(await puedeAccederACola(colaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    const desde = (req.query.desde as string) || new Date().toISOString().slice(0, 10);
    const desdeDate = parseFechaDia(desde) ?? new Date();
    const cierres = await prisma.diaCierre.findMany({
      where: { id_cola: colaId, fecha: { gte: desdeDate } },
      orderBy: { fecha: 'asc' },
      take: 120,
    });
    return res.json({ success: true, data: cierres });
  } catch (error) {
    logger.error('Error fetching dias cierre:', error);
    return res.status(500).json({ success: false, error: 'Error fetching cierres' });
  }
});

// ==========================================
// POST /api/restaurant/dias-cierre/:colaId { fecha: YYYY-MM-DD, motivo? }
// ==========================================
router.post('/dias-cierre/:colaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    const { fecha, motivo } = req.body;
    if (isNaN(colaId)) {
      return res.status(400).json({ success: false, error: 'Invalid cola ID' });
    }
    if (!(await puedeAccederACola(colaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    const fechaDate = typeof fecha === 'string' ? parseFechaDia(fecha) : null;
    if (!fechaDate) {
      return res.status(400).json({ success: false, error: 'fecha must be YYYY-MM-DD' });
    }
    if (typeof motivo === 'string' && motivo.length > 150) {
      return res.status(400).json({ success: false, error: 'motivo up to 150 chars' });
    }
    const existente = await prisma.diaCierre.findFirst({ where: { id_cola: colaId, fecha: fechaDate } });
    if (existente) {
      return res.status(409).json({ success: false, error: 'Ese día ya está marcado como cierre' });
    }
    const cierre = await prisma.diaCierre.create({
      data: {
        id_cola: colaId,
        fecha: fechaDate,
        motivo: typeof motivo === 'string' && motivo.trim() ? motivo.trim() : null,
      },
    });
    return res.status(201).json({ success: true, data: cierre, message: 'Día de cierre añadido' });
  } catch (error) {
    logger.error('Error creating dia cierre:', error);
    return res.status(500).json({ success: false, error: 'Error creating cierre' });
  }
});

// ==========================================
// DELETE /api/restaurant/dias-cierre/:id
// ==========================================
router.delete('/dias-cierre/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid cierre ID' });
    }
    const cierre = await prisma.diaCierre.findUnique({ where: { id_cierre: id } });
    if (!cierre) {
      return res.status(404).json({ success: false, error: 'Cierre not found' });
    }
    if (!(await puedeAccederACola(cierre.id_cola, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    await prisma.diaCierre.delete({ where: { id_cierre: id } });
    return res.json({ success: true, message: 'Día de cierre eliminado' });
  } catch (error) {
    logger.error('Error deleting dia cierre:', error);
    return res.status(500).json({ success: false, error: 'Error deleting cierre' });
  }
});

export default router;
