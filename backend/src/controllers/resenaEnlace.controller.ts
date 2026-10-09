import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/auth.middleware';
import { puedeAccederACola } from '../utils/tenant-access';

const router = Router();

function validarUrl(url: unknown): string | null {
  if (url === undefined) return null;
  if (typeof url !== 'string' || !/^https?:\/\/.+\..+/.test(url.trim()) || url.trim().length > 500) {
    throw new Error('url must be a valid http(s) URL up to 500 chars');
  }
  return url.trim();
}

// ==========================================
// GET /api/restaurant/resena-enlaces/:colaId
// ==========================================
router.get('/resena-enlaces/:colaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    if (isNaN(colaId)) {
      return res.status(400).json({ success: false, error: 'Invalid cola ID' });
    }
    if (!(await puedeAccederACola(colaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    const enlaces = await prisma.resenaEnlace.findMany({
      where: { id_cola: colaId },
      orderBy: [{ orden: 'asc' }, { id_enlace: 'asc' }],
    });
    return res.json({ success: true, data: enlaces });
  } catch (error) {
    logger.error('Error fetching resena enlaces:', error);
    return res.status(500).json({ success: false, error: 'Error fetching enlaces' });
  }
});

// ==========================================
// POST /api/restaurant/resena-enlaces/:colaId { nombre, url }
// ==========================================
router.post('/resena-enlaces/:colaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    const { nombre, url } = req.body;
    if (isNaN(colaId)) {
      return res.status(400).json({ success: false, error: 'Invalid cola ID' });
    }
    if (!(await puedeAccederACola(colaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    if (!nombre || typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 60) {
      return res.status(400).json({ success: false, error: 'nombre is required (up to 60 chars)' });
    }
    let urlValida: string | null;
    try {
      urlValida = validarUrl(url);
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
    if (!urlValida) {
      return res.status(400).json({ success: false, error: 'url is required' });
    }
    const maxOrden = await prisma.resenaEnlace.aggregate({
      where: { id_cola: colaId },
      _max: { orden: true },
    });
    const enlace = await prisma.resenaEnlace.create({
      data: {
        id_cola: colaId,
        nombre: nombre.trim(),
        url: urlValida,
        orden: (maxOrden._max.orden ?? -1) + 1,
      },
    });
    return res.status(201).json({ success: true, data: enlace, message: 'Enlace creado' });
  } catch (error) {
    logger.error('Error creating resena enlace:', error);
    return res.status(500).json({ success: false, error: 'Error creating enlace' });
  }
});

async function puedeAccederAEnlace(id: number, idEmpresa: number | undefined): Promise<boolean> {
  if (!idEmpresa) return false;
  const enlace = await prisma.resenaEnlace.findUnique({ where: { id_enlace: id } });
  if (!enlace) return false;
  return puedeAccederACola(enlace.id_cola, idEmpresa);
}

// ==========================================
// PUT /api/restaurant/resena-enlaces/:id { nombre?, url?, orden?, activa? }
// ==========================================
router.put('/resena-enlaces/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid enlace ID' });
    }
    if (!(await puedeAccederAEnlace(id, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    const { nombre, url, orden, activa } = req.body;
    const data: any = {};
    if (nombre !== undefined) {
      if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 60) {
        return res.status(400).json({ success: false, error: 'nombre must be up to 60 chars' });
      }
      data.nombre = nombre.trim();
    }
    if (url !== undefined) {
      try {
        const urlValida = validarUrl(url);
        if (!urlValida) return res.status(400).json({ success: false, error: 'url is required' });
        data.url = urlValida;
      } catch (e: any) {
        return res.status(400).json({ success: false, error: e.message });
      }
    }
    if (orden !== undefined) {
      if (typeof orden !== 'number' || !Number.isInteger(orden) || orden < 0) {
        return res.status(400).json({ success: false, error: 'orden must be an integer >= 0' });
      }
      data.orden = orden;
    }
    if (activa !== undefined) {
      if (typeof activa !== 'boolean') {
        return res.status(400).json({ success: false, error: 'activa must be boolean' });
      }
      data.activa = activa;
    }
    const enlace = await prisma.resenaEnlace.update({ where: { id_enlace: id }, data });
    return res.json({ success: true, data: enlace, message: 'Enlace actualizado' });
  } catch (error) {
    logger.error('Error updating resena enlace:', error);
    return res.status(500).json({ success: false, error: 'Error updating enlace' });
  }
});

// ==========================================
// DELETE /api/restaurant/resena-enlaces/:id
// ==========================================
router.delete('/resena-enlaces/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid enlace ID' });
    }
    if (!(await puedeAccederAEnlace(id, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    await prisma.resenaEnlace.delete({ where: { id_enlace: id } });
    return res.json({ success: true, message: 'Enlace eliminado' });
  } catch (error) {
    logger.error('Error deleting resena enlace:', error);
    return res.status(500).json({ success: false, error: 'Error deleting enlace' });
  }
});

export default router;
