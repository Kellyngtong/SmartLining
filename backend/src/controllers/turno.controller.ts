import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { TurnoRepository } from '../repositories/turno.repository';
import { getPaginationParams, formatPaginatedResponse } from '../repositories/base.repository';
import { logger } from '../config/logger';

const router = Router();
const prisma = new PrismaClient();
const turnoRepo = new TurnoRepository(prisma);

/**
 * GET /api/turnos
 * Listar todos los turnos con paginación
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const estado = req.query.estado as string;
    const colaId = req.query.colaId ? parseInt(req.query.colaId as string) : undefined;

    const { skip, take } = getPaginationParams(page, limit);

    let turnos;
    let total;

    if (estado && colaId) {
      turnos = await turnoRepo.findByColaIdAndEstado(colaId, estado as any, { skip, take });
      total = await prisma.turno.count({
        where: { id_cola: colaId, estado: estado as any },
      });
    } else if (estado) {
      turnos = await turnoRepo.findByEstado(estado as any, { skip, take });
      total = await turnoRepo.countByEstado(estado as any);
    } else if (colaId) {
      turnos = await turnoRepo.findByColaId(colaId, { skip, take });
      total = await turnoRepo.countByColaId(colaId);
    } else {
      turnos = await turnoRepo.findAll({ skip, take });
      total = await turnoRepo.count();
    }

    const pagination = formatPaginatedResponse(turnos, total, page, limit);
    return res.json({
      success: true,
      ...pagination,
    });
  } catch (error) {
    logger.error('Error fetching turnos:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching tickets',
    });
  }
});

/**
 * GET /api/turnos/:id
 * Obtener detalle de un turno con atención y valoración
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ticket ID',
      });
    }

    const turno = await turnoRepo.findByIdWithDetails(id);

    if (!turno) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    return res.json({
      success: true,
      data: turno,
    });
  } catch (error) {
    logger.error('Error fetching turno:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching ticket',
    });
  }
});

/**
 * POST /api/turnos
 * Crear un nuevo turno
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { id_cola, id_cliente } = req.body;

    // Validación
    if (!id_cola || !id_cliente) {
      return res.status(400).json({
        success: false,
        error: 'Queue ID and Client ID are required',
      });
    }

    // Verificar que cola existe
    const colaRepo = new (require('../repositories/cola.repository').ColaRepository)(prisma);
    const cola = await colaRepo.findById(id_cola);
    if (!cola) {
      return res.status(404).json({
        success: false,
        error: 'Queue not found',
      });
    }

    // Verificar que cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id_cliente },
    });
    if (!cliente) {
      return res.status(404).json({
        success: false,
        error: 'Client not found',
      });
    }

    const turno = await turnoRepo.create({
      id_cola,
      id_cliente,
    });

    return res.status(201).json({
      success: true,
      data: turno,
      message: 'Ticket created successfully',
    });
  } catch (error) {
    logger.error('Error creating turno:', error);
    return res.status(500).json({
      success: false,
      error: 'Error creating ticket',
    });
  }
});

/**
 * PATCH /api/turnos/:id
 * Actualizar estado de un turno
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { estado, fecha_hora_llamada, fecha_hora_inicio_atencion, fecha_hora_fin_atencion } =
      req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ticket ID',
      });
    }

    const turno = await turnoRepo.update(id, {
      estado: estado as any,
      fecha_hora_llamada: fecha_hora_llamada ? new Date(fecha_hora_llamada) : undefined,
      fecha_hora_inicio_atencion: fecha_hora_inicio_atencion
        ? new Date(fecha_hora_inicio_atencion)
        : undefined,
      fecha_hora_fin_atencion: fecha_hora_fin_atencion
        ? new Date(fecha_hora_fin_atencion)
        : undefined,
    });

    if (!turno) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    return res.json({
      success: true,
      data: turno,
      message: 'Ticket updated successfully',
    });
  } catch (error) {
    logger.error('Error updating turno:', error);
    return res.status(500).json({
      success: false,
      error: 'Error updating ticket',
    });
  }
});

/**
 * DELETE /api/turnos/:id
 * Eliminar un turno
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ticket ID',
      });
    }

    const deleted = await turnoRepo.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    return res.json({
      success: true,
      message: 'Ticket deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting turno:', error);
    return res.status(500).json({
      success: false,
      error: 'Error deleting ticket',
    });
  }
});

/**
 * GET /api/turnos/:id/cliente
 * Obtener turnos de un cliente
 */
router.get('/cliente/:clienteId', async (req: Request, res: Response) => {
  try {
    const clienteId = parseInt(req.params.clienteId as string);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { skip, take } = getPaginationParams(page, limit);

    if (isNaN(clienteId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid client ID',
      });
    }

    const turnos = await turnoRepo.findByClienteId(clienteId, { skip, take });
    const total = await prisma.turno.count({ where: { id_cliente: clienteId } });

    const pagination = formatPaginatedResponse(turnos, total, page, limit);
    return res.json({
      success: true,
      ...pagination,
    });
  } catch (error) {
    logger.error('Error fetching turnos for cliente:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching client tickets',
    });
  }
});

export default router;
