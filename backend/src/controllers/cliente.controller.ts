import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/clientes
 * Crear un nuevo cliente (sin autenticación requerida)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nombre } = req.body;

    // Validación básica
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cliente name is required',
      });
    }

    // Crear cliente
    const cliente = await prisma.cliente.create({
      data: {
        nombre: nombre.trim(),
        origen: 'QR',
      },
    });

    return res.status(201).json({
      success: true,
      data: cliente,
      message: 'Cliente created successfully',
    });
  } catch (error) {
    logger.error('Error creating cliente:', error);
    return res.status(500).json({
      success: false,
      error: 'Error creating cliente',
    });
  }
});

/**
 * GET /api/clientes/:id
 * Obtener un cliente por ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const clienteId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);

    if (isNaN(clienteId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid cliente ID',
      });
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id_cliente: clienteId },
      include: {
        turnos: true,
      },
    });

    if (!cliente) {
      return res.status(404).json({
        success: false,
        error: 'Cliente not found',
      });
    }

    return res.json({
      success: true,
      data: cliente,
    });
  } catch (error) {
    logger.error('Error fetching cliente:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching cliente',
    });
  }
});

export default router;
