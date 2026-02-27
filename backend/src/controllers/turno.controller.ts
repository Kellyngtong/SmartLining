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
 * GET /api/turnos/me
 * Obtener el turno asociado a la cookie `turno_id`.
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/\bturno_id=([^;\s]+)/);
    const turnoIdStr = match ? match[1] : null;

    if (!turnoIdStr) {
      return res.status(400).json({ success: false, error: 'No turno cookie present' });
    }

    const id = parseInt(turnoIdStr, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid turno id in cookie' });
    }

    const turno = await prisma.turno.findUnique({
      where: { id_turno: id },
      include: {
        cliente: true,
        atencion: {
          select: {
            id_atencion: true,
            id_empleado: true,
            duracion_atencion: true,
            resultado: true,
          },
        },
        valoracion: {
          select: {
            id_valoracion: true,
            puntuacion: true,
            comentario: true,
          },
        },
      },
    });

    if (!turno) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    // Calcular posición y ETA similar a /api/queue-info
    const colaId = turno.id_cola;
    const turnosActivos = await prisma.turno.findMany({
      where: { id_cola: colaId, estado: { in: ['EN_ESPERA', 'EN_ATENCION'] } },
      orderBy: { fecha_hora_creacion: 'asc' },
    });

    const turnosEnAtencion = turnosActivos.filter((t) => t.estado === 'EN_ATENCION');
    const turnosEnEspera = turnosActivos.filter((t) => t.estado === 'EN_ESPERA');

    const miPosicion = turnosEnEspera.findIndex((t) => t.id_turno === turno.id_turno) + 1 || 1;

    let tiempoPromedioPorTurno = 5;
    try {
      const agg = await prisma.atencion.aggregate({
        _avg: { duracion_atencion: true },
        where: { duracion_atencion: { not: null }, turno: { id_cola: colaId } },
      });
      const avgSeconds = agg._avg?.duracion_atencion ?? null;
      if (avgSeconds && avgSeconds > 0) {
        tiempoPromedioPorTurno = Math.max(1, Math.round((avgSeconds / 60) * 100) / 100);
      }
    } catch (e) {
      logger.warn('Failed to compute average atencion duration for /turnos/me', e);
    }

    const tiempoEstimado = miPosicion > 0 ? (miPosicion - 1) * tiempoPromedioPorTurno : 0;

    return res.json({
      success: true,
      data: {
        turno,
        queue: {
          id_cola: colaId,
        },
        userInfo: {
          turnoId: turno.id_turno,
          numeroDeTurno: turno.numero_turno,
          clienteNombre: turno.cliente ? turno.cliente.nombre : undefined,
          estado: turno.estado,
          miPosicion,
          tiempoEstimadoMinutos: tiempoEstimado,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching my turno from cookie:', error);
    return res.status(500).json({ success: false, error: 'Error fetching ticket' });
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

    // Calcular posición y tiempo estimado (minutos) similar a /api/queue-info
    try {
      const turnosActivos = await prisma.turno.findMany({
        where: {
          id_cola,
          estado: { in: ['EN_ESPERA', 'EN_ATENCION'] },
        },
        orderBy: { fecha_hora_creacion: 'asc' },
      });

      const turnosEnEspera = turnosActivos.filter((t) => t.estado === 'EN_ESPERA');

      let miPosicion = turnosEnEspera.findIndex((t) => t.id_turno === turno.id_turno) + 1;
      if (!miPosicion || miPosicion < 1) miPosicion = 1;

      // Calcular tiempo promedio por turno (minutos) usando historial de atenciones
      let tiempoPromedioPorTurno = 5; // fallback minutos
      try {
        const agg = await prisma.atencion.aggregate({
          _avg: { duracion_atencion: true },
          where: {
            duracion_atencion: { not: null },
            turno: { id_cola },
          },
        });

        const avgSeconds = agg._avg?.duracion_atencion ?? null;
        if (avgSeconds && avgSeconds > 0) {
          tiempoPromedioPorTurno = Math.max(1, Math.round((avgSeconds / 60) * 100) / 100);
        }
      } catch (e) {
        logger.warn(
          'Failed to compute average atencion duration for cookie expiry, using fallback',
          e
        );
      }

      const tiempoEstimado = miPosicion > 0 ? (miPosicion - 1) * tiempoPromedioPorTurno : 0;

      // Duración de la cookie: 10 minutos después del ETA (en segundos). Mínimo 60s.
      const cookieSeconds = Math.max(60, Math.ceil((tiempoEstimado + 10) * 60));

      // Set cookie `turno_id` with expiration based on estimation
      // Secure only in production; HttpOnly + SameSite=Lax
      res.cookie('turno_id', String(turno.id_turno), {
        maxAge: cookieSeconds * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      return res.status(201).json({
        success: true,
        data: turno,
        meta: {
          miPosicion,
          tiempoEstimadoMinutos: tiempoEstimado,
          cookieMaxAgeSeconds: cookieSeconds,
        },
        message: 'Ticket created successfully',
      });
    } catch (e) {
      // If cookie or estimation fails, still return the created turno
      logger.warn('Failed to compute or set turno cookie/ETA, returning ticket without cookie', e);
      return res.status(201).json({
        success: true,
        data: turno,
        message: 'Ticket created successfully',
      });
    }
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
