import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import { logger } from '../config/logger';

const router = Router();

/**
 * GET /api/horarios-cola/:colaId
 * Get all horarios for a specific cola
 */
router.get('/:colaId', async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    if (isNaN(colaId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Invalid cola ID',
      });
    }

    // Verify cola exists
    const cola = await prisma.cola.findUnique({
      where: { id_cola: colaId },
    });

    if (!cola) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Cola not found',
      });
    }

    const horarios = await prisma.horarioCola.findMany({
      where: { id_cola: colaId },
      orderBy: { dia_semana: 'asc' },
    });

    return res.json({
      success: true,
      data: horarios,
    });
  } catch (error) {
    logger.error('Get horarios cola error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch horarios',
    });
  }
});

/**
 * POST /api/horarios-cola/:colaId
 * Create new horario for a cola
 */
router.post('/:colaId', async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    if (isNaN(colaId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Invalid cola ID',
      });
    }

    const { dia_semana, hora_inicio, hora_fin } = req.body;

    // Validate input
    if (dia_semana === undefined || dia_semana === null) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'dia_semana is required (LUNES-DOMINGO)',
      });
    }

    const validDias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
    if (!validDias.includes(dia_semana)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message:
          'dia_semana must be one of: LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO, DOMINGO',
      });
    }

    if (!hora_inicio || typeof hora_inicio !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'hora_inicio is required and must be a time string',
      });
    }

    if (!hora_fin || typeof hora_fin !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'hora_fin is required and must be a time string',
      });
    }

    // Verify cola exists
    const cola = await prisma.cola.findUnique({
      where: { id_cola: colaId },
    });

    if (!cola) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Cola not found',
      });
    }

    const horario = await prisma.horarioCola.create({
      data: {
        id_cola: colaId,
        dia_semana,
        hora_inicio,
        hora_fin,
      },
    });

    return res.status(201).json({ success: true, data: horario });
  } catch (error) {
    logger.error('Create horario cola error:', error);

    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
      return res.status(409).json({
        success: false,
        error: 'CONFLICT',
        message: 'Horario for this day already exists',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create horario',
    });
  }
});

/**
 * PATCH /api/horarios-cola/:id
 * Update horario
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Invalid horario ID',
      });
    }

    const { hora_inicio, hora_fin } = req.body;

    const updateData: any = {};

    if (hora_inicio !== undefined) {
      if (typeof hora_inicio !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'hora_inicio must be a time string',
        });
      }
      updateData.hora_inicio = hora_inicio;
    }

    if (hora_fin !== undefined) {
      if (typeof hora_fin !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'hora_fin must be a time string',
        });
      }
      updateData.hora_fin = hora_fin;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'At least one field must be updated',
      });
    }

    const horario = await prisma.horarioCola.update({
      where: { id_horario: id },
      data: updateData,
    });

    return res.json({ success: true, data: horario });
  } catch (error) {
    logger.error('Update horario cola error:', error);

    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Horario not found',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update horario',
    });
  }
});

/**
 * DELETE /api/horarios-cola/:id
 * Delete horario
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Invalid horario ID',
      });
    }

    await prisma.horarioCola.delete({
      where: { id_horario: id },
    });

    return res.json({
      success: true,
      message: 'Horario deleted successfully',
    });
  } catch (error) {
    logger.error('Delete horario cola error:', error);

    if (error instanceof Error && error.message.includes('Record to delete not found')) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Horario not found',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to delete horario',
    });
  }
});

export default router;
