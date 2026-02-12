import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ColaRepository } from '../repositories/cola.repository';
import { getPaginationParams, formatPaginatedResponse } from '../repositories/base.repository';
import { logger } from '../config/logger';

const router = Router();
const prisma = new PrismaClient();
const colaRepo = new ColaRepository(prisma);

/**
 * GET /api/colas
 * Listar todas las colas con paginación
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { skip, take } = getPaginationParams(page, limit);

    const [colas, total] = await Promise.all([colaRepo.findAll({ skip, take }), colaRepo.count()]);

    const pagination = formatPaginatedResponse(colas, total, page, limit);
    return res.json({
      success: true,
      ...pagination,
    });
  } catch (error) {
    logger.error('Error fetching colas:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching queues',
    });
  }
});

/**
 * GET /api/colas/activas
 * Listar solo las colas activas
 */
router.get('/activas', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { skip, take } = getPaginationParams(page, limit);

    const colas = await colaRepo.findActive({ skip, take });
    const total = await prisma.cola.count({ where: { activa: true } });

    const pagination = formatPaginatedResponse(colas, total, page, limit);
    return res.json({
      success: true,
      ...pagination,
    });
  } catch (error) {
    logger.error('Error fetching active colas:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching active queues',
    });
  }
});

/**
 * GET /api/colas/:id
 * Obtener detalle de una cola con horarios y eventos
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid queue ID',
      });
    }

    const cola = await colaRepo.findByIdWithDetails(id);

    if (!cola) {
      return res.status(404).json({
        success: false,
        error: 'Queue not found',
      });
    }

    return res.json({
      success: true,
      data: cola,
    });
  } catch (error) {
    logger.error('Error fetching cola:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching queue',
    });
  }
});

/**
 * POST /api/colas
 * Crear una nueva cola (requiere autenticación ADMINISTRADOR)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nombre, descripcion, activa } = req.body;

    // Validación básica
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Queue name is required',
      });
    }

    // Verificar nombre único
    const exists = await colaRepo.findByNombre(nombre);
    if (exists) {
      return res.status(409).json({
        success: false,
        error: 'Queue name already exists',
      });
    }

    const cola = await colaRepo.create({
      nombre: nombre.trim(),
      descripcion: descripcion?.trim(),
      activa: activa ?? true,
    });

    return res.status(201).json({
      success: true,
      data: cola,
      message: 'Queue created successfully',
    });
  } catch (error) {
    logger.error('Error creating cola:', error);
    return res.status(500).json({
      success: false,
      error: 'Error creating queue',
    });
  }
});

/**
 * PATCH /api/colas/:id
 * Actualizar una cola
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { nombre, descripcion, activa } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid queue ID',
      });
    }

    const cola = await colaRepo.update(id, {
      nombre,
      descripcion,
      activa,
    });

    if (!cola) {
      return res.status(404).json({
        success: false,
        error: 'Queue not found',
      });
    }

    return res.json({
      success: true,
      data: cola,
      message: 'Queue updated successfully',
    });
  } catch (error) {
    logger.error('Error updating cola:', error);
    return res.status(500).json({
      success: false,
      error: 'Error updating queue',
    });
  }
});

/**
 * DELETE /api/colas/:id
 * Eliminar una cola
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid queue ID',
      });
    }

    const deleted = await colaRepo.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Queue not found',
      });
    }

    return res.json({
      success: true,
      message: 'Queue deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting cola:', error);
    return res.status(500).json({
      success: false,
      error: 'Error deleting queue',
    });
  }
});

/**
 * GET /api/colas/:id/turnos
 * Obtener turnos de una cola
 */
router.get('/:id/turnos', async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.id as string);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { skip, take } = getPaginationParams(page, limit);

    if (isNaN(colaId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid queue ID',
      });
    }

    // Verificar que la cola existe
    const cola = await colaRepo.findById(colaId);
    if (!cola) {
      return res.status(404).json({
        success: false,
        error: 'Queue not found',
      });
    }

    const turnoRepo = new (require('../repositories/turno.repository').TurnoRepository)(prisma);
    const turnos = await turnoRepo.findByColaId(colaId, { skip, take });
    const total = await prisma.turno.count({ where: { id_cola: colaId } });

    const pagination = formatPaginatedResponse(turnos, total, page, limit);
    return res.json({
      success: true,
      ...pagination,
    });
  } catch (error) {
    logger.error('Error fetching turnos for cola:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching queue tickets',
    });
  }
});

export default router;
