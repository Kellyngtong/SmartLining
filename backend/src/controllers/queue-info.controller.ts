import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/queue-info/:colaId
 * Obtener información de una cola incluyendo:
 * - Nombre y descripción de la cola
 * - Total en espera y en atención
 * - Turno actual siendo atendido
 * - Si se proporciona turnoId: posición del usuario y tiempo estimado
 */
router.get('/:colaId', async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    const turnoIdQuery = req.query.turnoId;
    const turnoId = turnoIdQuery && typeof turnoIdQuery === 'string' ? parseInt(turnoIdQuery) : undefined;

    if (isNaN(colaId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid queue ID',
      });
    }

    // Obtener info de la cola
    const cola = await prisma.cola.findUnique({
      where: { id_cola: colaId },
    });

    if (!cola) {
      return res.status(404).json({
        success: false,
        error: 'Queue not found',
      });
    }

    // Obtener turnos activos en la cola (EN_ESPERA y EN_ATENCION)
    const turnosActivos = await prisma.turno.findMany({
      where: {
        id_cola: colaId,
        estado: { in: ['EN_ESPERA', 'EN_ATENCION'] },
      },
      orderBy: { fecha_hora_creacion: 'asc' },
      include: {
        cliente: true,
      },
    });

    // Separar por estado
    const turnosEnAtencion = turnosActivos.filter(t => t.estado === 'EN_ATENCION');
    const turnosEnEspera = turnosActivos.filter(t => t.estado === 'EN_ESPERA');
    const turnoActual = turnosEnAtencion.length > 0 ? turnosEnAtencion[0] : null;

    // Calcular posición del usuario si se proporciona turnoId
    let miPosicion: number | null = null;
    let miTurno: any = null;

    if (turnoId) {
      miTurno = await prisma.turno.findUnique({
        where: { id_turno: turnoId },
        include: { cliente: true },
      });

      if (miTurno && miTurno.id_cola === colaId) {
        // Contar cuántos turnos hay en espera antes del mío
        miPosicion = turnosEnEspera.filter((t: any) => t.fecha_hora_creacion <= miTurno!.fecha_hora_creacion).length;
      }
    }

    // Calcular tiempo estimado
    // Asumimos 5 minutos por turno como promedio
    const tiempoPromedioPorTurno = 5; // minutos
    let tiempoEstimado = 0;

    if (miPosicion && miPosicion > 0) {
      // Tiempo = (personas delante) * promedio
      tiempoEstimado = (miPosicion - 1) * tiempoPromedioPorTurno;
    }

    return res.json({
      success: true,
      data: {
        queue: {
          id_cola: cola.id_cola,
          nombre: cola.nombre,
          descripcion: cola.descripcion,
          activa: cola.activa,
        },
        stats: {
          totalEnEspera: turnosEnEspera.length,
          totalEnAtencion: turnosEnAtencion.length,
          turnoActual: turnoActual
            ? {
                id_turno: turnoActual.id_turno,
                numero: turnoActual.numero_turno,
              }
            : null,
        },
        userInfo: turnoId && miTurno && miPosicion !== null
          ? {
              turnoId: miTurno.id_turno,
              numeroDeTurno: miTurno.numero_turno,
              clienteNombre: 'Cliente',
              estado: miTurno.estado,
              miPosicion,
              tiempoEstimadoMinutos: tiempoEstimado,
            }
          : null,
      },
    });
  } catch (error) {
    logger.error('Error fetching queue info:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching queue information',
    });
  }
});

export default router;
