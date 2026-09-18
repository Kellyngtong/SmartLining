import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/auth.middleware';
import { WaitlistRepository } from '../repositories/waitlist.repository';
import { puedeAccederACola } from '../utils/tenant-access';
import { TableAllocationService } from '../services/tableAllocation.service';
import { MesaRepository } from '../repositories/mesa.repository';
import sse from '../sse';

const router = Router();
const waitlistRepo = new WaitlistRepository(prisma);
const mesaRepo = new MesaRepository(prisma);
const allocationService = new TableAllocationService(prisma, mesaRepo);

const ESTADOS_WAITLIST = ['ESPERANDO', 'NOTIFICADO', 'ASIGNADO', 'SENTADO', 'CANCELADO', 'NO_SHOW'];

// ==========================================
// GET /api/restaurant/waitlist/:colaId?estado=&activas=1
// ==========================================
router.get('/waitlist/:colaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    if (isNaN(colaId)) {
      return res.status(400).json({ success: false, error: 'Invalid cola ID' });
    }
    if (!(await puedeAccederACola(colaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    const estado = req.query.estado as string | undefined;
    const activas = req.query.activas === '1' || req.query.activas === 'true';
    const entries = await waitlistRepo.findWaitlistByCola(colaId, { estado, activas });
    return res.json({ success: true, data: entries });
  } catch (error) {
    logger.error('Error fetching waitlist:', error);
    return res.status(500).json({ success: false, error: 'Error fetching waitlist' });
  }
});

// ==========================================
// POST /api/restaurant/waitlist
// Añadir grupo a la cola de espera (opcional auto-match inmediato)
// ==========================================
router.post('/waitlist', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      id_cola, id_cliente, cliente_nombre, cliente_telefono, num_comensales,
      prioridad, preferencia_zona, preferencia_mesa, notas, auto_asignar,
    } = req.body;

    if (!id_cola || !cliente_nombre || !num_comensales) {
      return res.status(400).json({
        success: false,
        error: 'id_cola, cliente_nombre and num_comensales are required',
      });
    }
    if (!(await puedeAccederACola(id_cola, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    if (typeof num_comensales !== 'number' || num_comensales < 1) {
      return res.status(400).json({ success: false, error: 'num_comensales must be a positive number' });
    }

    const entry = await waitlistRepo.create({
      id_cola,
      id_cliente: id_cliente ?? null,
      cliente_nombre: cliente_nombre.trim(),
      cliente_telefono: cliente_telefono?.trim() ?? null,
      num_comensales,
      prioridad: prioridad ?? 0,
      preferencia_zona: preferencia_zona ?? null,
      preferencia_mesa: preferencia_mesa ?? null,
      notas: notas?.trim() || null,
    });

    // Auto-match inmediato con mesas libres (por defecto activo)
    let match = null;
    if (auto_asignar !== false) {
      try {
        match = await allocationService.asignarDesdeWaitlist(entry.id_waitlist);
        if (!match) {
          // Recalcular ETA
          const esperando = await prisma.waitlistEntry.count({ where: { id_cola, estado: 'ESPERANDO' } });
          await waitlistRepo.update(entry.id_waitlist, { tiempo_estimado_min: esperando * 5 });
        } else {
          await waitlistRepo.update(entry.id_waitlist, { tiempo_estimado_min: 0 });
        }
      } catch (e) {
        logger.warn('Auto-match waitlist failed (non-fatal)', e);
      }
    }

    try {
      sse.sendSseEvent(id_cola, 'WAITLIST_ACTUALIZADA', { entry: { id_waitlist: entry.id_waitlist } });
    } catch (e) {
      logger.warn('Failed to send SSE WAITLIST_ACTUALIZADA', e);
    }

    return res.status(201).json({
      success: true,
      data: {
        entry,
        match: match ? { id_asignacion: match.id_asignacion, mesa: match.mesa } : null,
      },
      message: match ? 'Grupo añadido y mesa asignada' : 'Grupo añadido a la cola de espera',
    });
  } catch (error) {
    logger.error('Error creating waitlist entry:', error);
    return res.status(500).json({ success: false, error: 'Error creating waitlist entry' });
  }
});

// ==========================================
// PUT /api/restaurant/waitlist/:id
// Editar entrada de la cola (incl. prioridad)
// ==========================================
router.put('/waitlist/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid waitlist ID' });
    }
    const entry = await waitlistRepo.findById(id);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Waitlist entry not found' });
    }
    if (!(await puedeAccederACola(entry.id_cola, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: entry belongs to another tenant' });
    }

    const body = req.body;
    const data: any = {};
    if (body.cliente_nombre !== undefined) data.cliente_nombre = body.cliente_nombre.trim();
    if (body.cliente_telefono !== undefined) data.cliente_telefono = body.cliente_telefono?.trim() ?? null;
    if (body.num_comensales !== undefined) {
      if (typeof body.num_comensales !== 'number' || body.num_comensales < 1) {
        return res.status(400).json({ success: false, error: 'num_comensales must be a positive number' });
      }
      data.num_comensales = body.num_comensales;
    }
    if (body.prioridad !== undefined) {
      if (typeof body.prioridad !== 'number' || body.prioridad < 0) {
        return res.status(400).json({ success: false, error: 'prioridad must be a non-negative number' });
      }
      data.prioridad = body.prioridad;
    }
    if (body.tiempo_estimado_min !== undefined) data.tiempo_estimado_min = body.tiempo_estimado_min;
    if (body.preferencia_zona !== undefined) data.preferencia_zona = body.preferencia_zona ?? null;
    if (body.preferencia_mesa !== undefined) data.preferencia_mesa = body.preferencia_mesa ?? null;
    if (body.notas !== undefined) data.notas = body.notas?.trim() || null;
    if (body.estado !== undefined && ESTADOS_WAITLIST.includes(body.estado)) data.estado = body.estado;

    const updated = await waitlistRepo.update(id, data);
    if (!updated) {
      return res.status(500).json({ success: false, error: 'Error updating waitlist entry' });
    }
    try {
      sse.sendSseEvent(updated.id_cola, 'WAITLIST_ACTUALIZADA', { entry: { id_waitlist: id } });
    } catch (e) {
      logger.warn('Failed to send SSE WAITLIST_ACTUALIZADA', e);
    }
    return res.json({ success: true, data: updated, message: 'Waitlist entry updated' });
  } catch (error) {
    logger.error('Error updating waitlist entry:', error);
    return res.status(500).json({ success: false, error: 'Error updating waitlist entry' });
  }
});

// ==========================================
// PATCH /api/restaurant/waitlist/:id/estado
// NO_SHOW / CANCELADO / NOTIFICADO / SENTADO
// ==========================================
router.patch('/waitlist/:id/estado', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { estado } = req.body;
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid waitlist ID' });
    }
    const entry = await waitlistRepo.findById(id);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Waitlist entry not found' });
    }
    if (!(await puedeAccederACola(entry.id_cola, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: entry belongs to another tenant' });
    }
    if (!ESTADOS_WAITLIST.includes(estado)) {
      return res.status(400).json({ success: false, error: `estado must be one of: ${ESTADOS_WAITLIST.join(', ')}` });
    }

    if (estado === 'CANCELADO' || estado === 'NO_SHOW') {
      await prisma.tableAssignment.updateMany({
        where: { id_waitlist: id, estado: { in: ['PENDIENTE', 'ACTIVA'] } },
        data: { estado: 'CANCELADA' },
      });
    }

    const updated = await waitlistRepo.updateEstado(id, estado);
    try {
      sse.sendSseEvent(entry.id_cola, 'WAITLIST_ACTUALIZADA', { entry: { id_waitlist: id, estado } });
    } catch (e) {
      logger.warn('Failed to send SSE WAITLIST_ACTUALIZADA', e);
    }
    return res.json({ success: true, data: updated, message: 'Estado de waitlist actualizado' });
  } catch (error) {
    logger.error('Error updating waitlist estado:', error);
    return res.status(500).json({ success: false, error: 'Error updating waitlist estado' });
  }
});

// ==========================================
// DELETE /api/restaurant/waitlist/:id
// ==========================================
router.delete('/waitlist/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid waitlist ID' });
    }
    const entry = await waitlistRepo.findById(id);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Waitlist entry not found' });
    }
    if (!(await puedeAccederACola(entry.id_cola, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: entry belongs to another tenant' });
    }
    if (entry.estado === 'SENTADO' || entry.estado === 'ASIGNADO') {
      return res.status(409).json({ success: false, error: 'No se puede eliminar un grupo ya atendido/asignado' });
    }
    const deleted = await waitlistRepo.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Waitlist entry not found' });
    }
    try {
      sse.sendSseEvent(entry.id_cola, 'WAITLIST_ACTUALIZADA', { entry: { id_waitlist: id } });
    } catch (e) {
      logger.warn('Failed to send SSE WAITLIST_ACTUALIZADA', e);
    }
    return res.json({ success: true, message: 'Waitlist entry deleted' });
  } catch (error) {
    logger.error('Error deleting waitlist entry:', error);
    return res.status(500).json({ success: false, error: 'Error deleting waitlist entry' });
  }
});

export default router;