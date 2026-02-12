import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import { logger } from '../config/logger';

const router = Router();

// Pagination helper
function getPaginationParams(page: any, limit: any) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;
  const take = limitNum;
  return { skip, take, page: pageNum, limit: limitNum };
}

// Format paginated response
function formatPaginatedResponse(data: any[], total: number, page: number, limit: number) {
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * GET /api/eventos
 * List all eventos with pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = req.query.page as string | undefined;
    const limit = req.query.limit as string | undefined;
    const { skip, take } = getPaginationParams(page, limit);

    const eventos = await prisma.evento.findMany({
      skip,
      take,
      include: {
        colas: {
          include: { cola: true },
        },
      },
      orderBy: { fecha_inicio: 'desc' },
    });

    const total = await prisma.evento.count();
    const response = formatPaginatedResponse(eventos, total, skip / take + 1, take);

    return res.json({ success: true, ...response });
  } catch (error) {
    logger.error('Get eventos error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch eventos',
    });
  }
});

/**
 * GET /api/eventos/:id
 * Get single evento by id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Invalid evento ID',
      });
    }

    const evento = await prisma.evento.findUnique({
      where: { id_evento: id },
      include: {
        colas: {
          include: { cola: true },
        },
      },
    });

    if (!evento) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Evento not found',
      });
    }

    return res.json({ success: true, data: evento });
  } catch (error) {
    logger.error('Get evento error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch evento',
    });
  }
});

/**
 * POST /api/eventos
 * Create new evento
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { tipo, nombre, descripcion, fecha_inicio, fecha_fin } = req.body;

    // Validate required fields
    if (!tipo || !['PROMOCION', 'FESTIVO', 'EVENTO'].includes(tipo)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'tipo is required and must be PROMOCION, FESTIVO, or EVENTO',
      });
    }

    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'nombre is required and must be a non-empty string',
      });
    }

    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'fecha_inicio and fecha_fin are required',
      });
    }

    const evento = await prisma.evento.create({
      data: {
        tipo,
        nombre: nombre.trim(),
        descripcion: descripcion ? descripcion.trim() : '',
        fecha_inicio: new Date(fecha_inicio),
        fecha_fin: new Date(fecha_fin),
      },
      include: {
        colas: true,
      },
    });

    return res.status(201).json({ success: true, data: evento });
  } catch (error) {
    logger.error('Create evento error:', error);

    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
      return res.status(409).json({
        success: false,
        error: 'CONFLICT',
        message: 'Evento with this name already exists',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create evento',
    });
  }
});

/**
 * PATCH /api/eventos/:id
 * Update evento
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Invalid evento ID',
      });
    }

    const { nombre, descripcion, fecha_inicio, fecha_fin } = req.body;

    // Validate input
    const updateData: any = {};
    if (nombre !== undefined) {
      if (typeof nombre !== 'string' || nombre.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'nombre must be a non-empty string',
        });
      }
      updateData.nombre = nombre.trim();
    }

    if (descripcion !== undefined) {
      if (typeof descripcion !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'descripcion must be a string',
        });
      }
      updateData.descripcion = descripcion.trim();
    }

    if (fecha_inicio !== undefined) {
      updateData.fecha_inicio = new Date(fecha_inicio);
    }

    if (fecha_fin !== undefined) {
      updateData.fecha_fin = new Date(fecha_fin);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'At least one field must be updated',
      });
    }

    const evento = await prisma.evento.update({
      where: { id_evento: id },
      data: updateData,
      include: {
        colas: {
          include: { cola: true },
        },
      },
    });

    return res.json({ success: true, data: evento });
  } catch (error) {
    logger.error('Update evento error:', error);

    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
      return res.status(409).json({
        success: false,
        error: 'CONFLICT',
        message: 'Evento with this name already exists',
      });
    }

    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Evento not found',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update evento',
    });
  }
});

/**
 * DELETE /api/eventos/:id
 * Delete evento
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Invalid evento ID',
      });
    }

    await prisma.evento.delete({
      where: { id_evento: id },
    });

    return res.json({
      success: true,
      message: 'Evento deleted successfully',
    });
  } catch (error) {
    logger.error('Delete evento error:', error);

    if (error instanceof Error && error.message.includes('Record to delete not found')) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Evento not found',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to delete evento',
    });
  }
});

export default router;
