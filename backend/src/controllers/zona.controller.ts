import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/auth.middleware';
import { ZonaRepository } from '../repositories/zona.repository';
import { puedeAccederACola, puedeAccederAZona } from '../utils/tenant-access';
import sse from '../sse';

const router = Router();
const zonaRepo = new ZonaRepository(prisma);

const TIPOS_ZONA = ['SALA', 'TERRAZA', 'BARRA', 'VIP', 'EXTERIOR', 'PRIVADO'];

// ==========================================
// GET /api/restaurant/zonas/:colaId
// Listar zonas del restaurante con sus mesas
// ==========================================
router.get('/zonas/:colaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    if (isNaN(colaId)) {
      return res.status(400).json({ success: false, error: 'Invalid cola ID' });
    }
    if (!(await puedeAccederACola(colaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    const zonas = await zonaRepo.findZonasByCola(colaId);
    const mesas = await prisma.mesa.findMany({
      where: { id_cola: colaId, activa: true },
      select: { id_mesa: true, numero: true, capacidad: true, id_zona: true },
      orderBy: { numero: 'asc' },
    });
    return res.json({ success: true, data: { zonas, mesasSinZona: mesas.filter((m) => m.id_zona === null) } });
  } catch (error) {
    logger.error('Error fetching zonas:', error);
    return res.status(500).json({ success: false, error: 'Error fetching zonas' });
  }
});

// ==========================================
// POST /api/restaurant/zonas/:colaId
// Crear una zona nueva
// ==========================================
router.post('/zonas/:colaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    const { nombre, tipo, orden, activa } = req.body;
    if (isNaN(colaId)) {
      return res.status(400).json({ success: false, error: 'Invalid cola ID' });
    }
    if (!(await puedeAccederACola(colaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Zona nombre is required' });
    }
    if (tipo !== undefined && !TIPOS_ZONA.includes(tipo)) {
      return res.status(400).json({ success: false, error: `tipo must be one of: ${TIPOS_ZONA.join(', ')}` });
    }

    const existe = await prisma.zona.findFirst({ where: { id_cola: colaId, nombre: nombre.trim() } });
    if (existe) {
      return res.status(409).json({ success: false, error: 'Ya existe una zona con ese nombre' });
    }

    const zona = await zonaRepo.create({ id_cola: colaId, nombre: nombre.trim(), tipo, orden, activa });
    return res.status(201).json({ success: true, data: zona, message: 'Zona created' });
  } catch (error) {
    logger.error('Error creating zona:', error);
    return res.status(500).json({ success: false, error: 'Error creating zona' });
  }
});

// ==========================================
// PUT /api/restaurant/zonas/:id
// Actualizar zona
// ==========================================
router.put('/zonas/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid zona ID' });
    }
    if (!(await puedeAccederAZona(id, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: zona belongs to another tenant' });
    }
    const { nombre, tipo, orden, activa } = req.body;
    if (tipo !== undefined && !TIPOS_ZONA.includes(tipo)) {
      return res.status(400).json({ success: false, error: `tipo must be one of: ${TIPOS_ZONA.join(', ')}` });
    }
    const zona = await zonaRepo.update(id, { nombre, tipo, orden, activa });
    if (!zona) {
      return res.status(404).json({ success: false, error: 'Zona not found' });
    }
    return res.json({ success: true, data: zona, message: 'Zona updated' });
  } catch (error) {
    logger.error('Error updating zona:', error);
    return res.status(500).json({ success: false, error: 'Error updating zona' });
  }
});

// ==========================================
// DELETE /api/restaurant/zonas/:id
// Eliminar zona (las mesas quedan sin zona asignada)
// ==========================================
router.delete('/zonas/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid zona ID' });
    }
    const zona = await zonaRepo.findById(id);
    if (!zona) {
      return res.status(404).json({ success: false, error: 'Zona not found' });
    }
    if (!(await puedeAccederAZona(id, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: zona belongs to another tenant' });
    }
    const deleted = await zonaRepo.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Zona not found' });
    }
    try {
      sse.sendSseEvent(zona.id_cola, 'ZONA_ELIMINADA', { zona: { id_zona: id } });
    } catch (e) {
      logger.warn('Failed to send SSE ZONA_ELIMINADA', e);
    }
    return res.json({ success: true, message: 'Zona deleted' });
  } catch (error) {
    logger.error('Error deleting zona:', error);
    return res.status(500).json({ success: false, error: 'Error deleting zona' });
  }
});

// ==========================================
// POST /api/restaurant/zonas/:id/asignar-mesas
// Asignar un conjunto de mesas a la zona
// ==========================================
router.post('/zonas/:id/asignar-mesas', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { mesa_ids } = req.body;
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid zona ID' });
    }
    if (!Array.isArray(mesa_ids) || mesa_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'mesa_ids array is required' });
    }
    const zona = await zonaRepo.findById(id);
    if (!zona) {
      return res.status(404).json({ success: false, error: 'Zona not found' });
    }
    if (!(await puedeAccederAZona(id, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: zona belongs to another tenant' });
    }
    const count = await zonaRepo.asignarMesas(id, mesa_ids);
    try {
      sse.sendSseEvent(zona.id_cola, 'ZONA_MESAS', { zonaId: id, count });
    } catch (e) {
      logger.warn('Failed to send SSE ZONA_MESAS', e);
    }
    return res.json({ success: true, data: { count }, message: `${count} mesas asignadas a la zona` });
  } catch (error) {
    logger.error('Error assigning mesas to zona:', error);
    return res.status(500).json({ success: false, error: 'Error assigning mesas to zona' });
  }
});

export default router;