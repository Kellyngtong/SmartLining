import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import { logger } from '../config/logger';

const router = Router();

/**
 * POST /api/atenciones
 * Create new atencion (service record)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { id_turno, id_empleado, resultado } = req.body;

    // Validate required fields
    if (!id_turno || typeof id_turno !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'id_turno is required and must be a number',
      });
    }

    if (!id_empleado || typeof id_empleado !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'id_empleado is required and must be a number',
      });
    }

    if (!resultado || !['ATENDIDO', 'CANCELADO'].includes(resultado)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'resultado is required and must be ATENDIDO or CANCELADO',
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

    // Verify empleado exists
    const empleado = await prisma.usuario.findUnique({
      where: { id_usuario: id_empleado },
    });

    if (!empleado) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Empleado not found',
      });
    }

    const atencion = await prisma.atencion.create({
      data: {
        id_turno,
        id_empleado,
        resultado,
      },
      include: {
        turno: true,
        empleado: {
          select: {
            id_usuario: true,
            nombre: true,
            email: true,
            rol: true,
          },
        },
      },
    });

    return res.status(201).json({ success: true, data: atencion });
  } catch (error) {
    logger.error('Create atencion error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create atencion',
    });
  }
});

/**
 * GET /api/atenciones/:id
 * Get atencion by id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Invalid atencion ID',
      });
    }

    const atencion = await prisma.atencion.findUnique({
      where: { id_atencion: id },
      include: {
        turno: true,
        empleado: {
          select: {
            id_usuario: true,
            nombre: true,
            email: true,
            rol: true,
          },
        },
      },
    });

    if (!atencion) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Atencion not found',
      });
    }

    return res.json({ success: true, data: atencion });
  } catch (error) {
    logger.error('Get atencion error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch atencion',
    });
  }
});

/**
 * PATCH /api/atenciones/:id
 * Update atencion (duracion, resultado)
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Invalid atencion ID',
      });
    }

    const { duracion_atencion, resultado } = req.body;

    const updateData: any = {};

    if (duracion_atencion !== undefined) {
      if (typeof duracion_atencion !== 'number' || duracion_atencion < 0) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'duracion_atencion must be a non-negative number (seconds)',
        });
      }
      updateData.duracion_atencion = duracion_atencion;
    }

    if (resultado !== undefined) {
      if (!['ATENDIDO', 'CANCELADO'].includes(resultado)) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'resultado must be ATENDIDO or CANCELADO',
        });
      }
      updateData.resultado = resultado;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'At least one field must be updated',
      });
    }

    const atencion = await prisma.atencion.update({
      where: { id_atencion: id },
      data: updateData,
      include: {
        turno: true,
        empleado: {
          select: {
            id_usuario: true,
            nombre: true,
            email: true,
            rol: true,
          },
        },
      },
    });

    return res.json({ success: true, data: atencion });
  } catch (error) {
    logger.error('Update atencion error:', error);

    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Atencion not found',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update atencion',
    });
  }
});

export default router;
