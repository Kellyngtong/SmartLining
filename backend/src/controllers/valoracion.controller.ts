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
 * POST /api/valoraciones
 * Create new valoracion (rating/feedback)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { id_turno, puntuacion, comentario } = req.body;

    // Validate required fields
    if (!id_turno || typeof id_turno !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'id_turno is required and must be a number',
      });
    }

    if (
      puntuacion === undefined ||
      typeof puntuacion !== 'number' ||
      puntuacion < 1 ||
      puntuacion > 5
    ) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'puntuacion is required and must be a number between 1 and 5',
      });
    }

    // Verify turno exists
    const turno = await prisma.turno.findUnique({
      where: { id_turno },
    });

    if (!turno) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Turno not found',
      });
    }

    // Check if valoracion already exists
    const existing = await prisma.valoracion.findUnique({
      where: { id_turno },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'CONFLICT',
        message: 'Valoracion for this turno already exists',
      });
    }

    const valoracion = await prisma.valoracion.create({
      data: {
        id_turno,
        puntuacion,
        comentario: comentario ? comentario.trim() : '',
      },
      include: {
        turno: {
          include: {
            cliente: true,
            cola: true,
          },
        },
      },
    });

    return res.status(201).json({ success: true, data: valoracion });
  } catch (error) {
    logger.error('Create valoracion error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create valoracion',
    });
  }
});

/**
 * GET /api/valoraciones
 * List all valoraciones with pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = req.query.page as string | undefined;
    const limit = req.query.limit as string | undefined;
    const { skip, take } = getPaginationParams(page, limit);

    const valoraciones = await prisma.valoracion.findMany({
      skip,
      take,
      include: {
        turno: {
          include: {
            cliente: true,
            cola: true,
          },
        },
      },
      orderBy: { fecha_valoracion: 'desc' },
    });

    const total = await prisma.valoracion.count();
    const response = formatPaginatedResponse(valoraciones, total, skip / take + 1, take);

    return res.json({ success: true, ...response });
  } catch (error) {
    logger.error('Get valoraciones error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch valoraciones',
    });
  }
});

/**
 * GET /api/valoraciones/turno/:turnoId
 * Get valoracion for a specific turno
 */
router.get('/turno/:turnoId', async (req: Request, res: Response) => {
  try {
    const turnoId = parseInt(req.params.turnoId as string);
    if (isNaN(turnoId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Invalid turno ID',
      });
    }

    const valoracion = await prisma.valoracion.findUnique({
      where: { id_turno: turnoId },
      include: {
        turno: {
          include: {
            cliente: true,
            cola: true,
            atencion: true,
          },
        },
      },
    });

    if (!valoracion) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Valoracion not found for this turno',
      });
    }

    return res.json({ success: true, data: valoracion });
  } catch (error) {
    logger.error('Get valoracion error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch valoracion',
    });
  }
});

/**
 * GET /api/valoraciones/:id
 * Get valoracion by id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Invalid valoracion ID',
      });
    }

    const valoracion = await prisma.valoracion.findUnique({
      where: { id_valoracion: id },
      include: {
        turno: {
          include: {
            cliente: true,
            cola: true,
          },
        },
      },
    });

    if (!valoracion) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Valoracion not found',
      });
    }

    return res.json({ success: true, data: valoracion });
  } catch (error) {
    logger.error('Get valoracion error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch valoracion',
    });
  }
});

/**
 * PATCH /api/valoraciones/:id
 * Update valoracion
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Invalid valoracion ID',
      });
    }

    const { puntuacion, comentario } = req.body;

    const updateData: any = {};

    if (puntuacion !== undefined) {
      if (typeof puntuacion !== 'number' || puntuacion < 1 || puntuacion > 5) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'puntuacion must be a number between 1 and 5',
        });
      }
      updateData.puntuacion = puntuacion;
    }

    if (comentario !== undefined) {
      if (typeof comentario !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'comentario must be a string',
        });
      }
      updateData.comentario = comentario.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'At least one field must be updated',
      });
    }

    const valoracion = await prisma.valoracion.update({
      where: { id_valoracion: id },
      data: updateData,
      include: {
        turno: {
          include: {
            cliente: true,
            cola: true,
          },
        },
      },
    });

    return res.json({ success: true, data: valoracion });
  } catch (error) {
    logger.error('Update valoracion error:', error);

    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Valoracion not found',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update valoracion',
    });
  }
});

/**
 * DELETE /api/valoraciones/:id
 * Delete valoracion
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Invalid valoracion ID',
      });
    }

    await prisma.valoracion.delete({
      where: { id_valoracion: id },
    });

    return res.json({
      success: true,
      message: 'Valoracion deleted successfully',
    });
  } catch (error) {
    logger.error('Delete valoracion error:', error);

    if (error instanceof Error && error.message.includes('Record to delete not found')) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Valoracion not found',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to delete valoracion',
    });
  }
});

export default router;
