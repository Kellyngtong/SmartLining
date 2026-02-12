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
 * GET /api/usuarios
 * List all usuarios with pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = req.query.page as string | undefined;
    const limit = req.query.limit as string | undefined;
    const { skip, take } = getPaginationParams(page, limit);

    const usuarios = await prisma.usuario.findMany({
      skip,
      take,
      select: {
        id_usuario: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        fecha_creacion: true,
      },
      orderBy: { fecha_creacion: 'desc' },
    });

    const total = await prisma.usuario.count();
    const response = formatPaginatedResponse(usuarios, total, skip / take + 1, take);

    return res.json({ success: true, ...response });
  } catch (error) {
    logger.error('Get usuarios error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch usuarios',
    });
  }
});

/**
 * GET /api/usuarios/:id
 * Get single usuario by id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Invalid usuario ID',
      });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id_usuario: id },
      select: {
        id_usuario: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        fecha_creacion: true,
      },
    });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Usuario not found',
      });
    }

    return res.json({ success: true, data: usuario });
  } catch (error) {
    logger.error('Get usuario error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch usuario',
    });
  }
});

/**
 * GET /api/usuarios/email/:email
 * Get usuario by email
 */
router.get('/email/:email', async (req: Request, res: Response) => {
  try {
    const email = req.params.email as string;
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Invalid email format',
      });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: {
        id_usuario: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        fecha_creacion: true,
      },
    });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Usuario not found',
      });
    }

    return res.json({ success: true, data: usuario });
  } catch (error) {
    logger.error('Get usuario by email error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch usuario',
    });
  }
});

/**
 * PATCH /api/usuarios/:id
 * Update usuario (nombre, activo)
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Invalid usuario ID',
      });
    }

    const { nombre, activo } = req.body;

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

    if (activo !== undefined) {
      if (typeof activo !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'activo must be a boolean',
        });
      }
      updateData.activo = activo;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'At least one field must be updated',
      });
    }

    const usuario = await prisma.usuario.update({
      where: { id_usuario: id },
      data: updateData,
      select: {
        id_usuario: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        fecha_creacion: true,
      },
    });

    return res.json({ success: true, data: usuario });
  } catch (error) {
    logger.error('Update usuario error:', error);

    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
      return res.status(409).json({
        success: false,
        error: 'CONFLICT',
        message: 'Email already exists',
      });
    }

    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Usuario not found',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update usuario',
    });
  }
});

export default router;
