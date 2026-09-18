import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/auth.middleware';
import { puedeAccederACola, puedeAccederAMesa } from '../utils/tenant-access';
import { TableAllocationService } from '../services/tableAllocation.service';
import { MesaRepository } from '../repositories/mesa.repository';

const router = Router();
const mesaRepo = new MesaRepository(prisma);
const allocationService = new TableAllocationService(prisma, mesaRepo);

/**
 * POST /api/restaurant/asignar
 * Asignar mesa a una reserva o a una entrada de waitlist.
 *
 * Body:
 * {
 *   id_cola: number,
 *   comensales: number,
 *   tipo_origen: 'RESERVA' | 'WAITLIST',
 *   id_reserva?: number,   // requerido si tipo_origen = RESERVA
 *   id_waitlist?: number,  // requerido si tipo_origen = WAITLIST
 *   mesa_id?: number,      // forzar mesa concreta (opcional)
 *   fecha?, hora_inicio?,  // para reservas futuras (opcional; se toma de la reserva)
 *   duracion_min?, zona_id?
 * }
 */
router.post('/asignar', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      id_cola, comensales, tipo_origen, id_reserva, id_waitlist, mesa_id,
      fecha, hora_inicio, duracion_min, zona_id,
    } = req.body;

    if (!id_cola || !comensales || !tipo_origen) {
      return res.status(400).json({ success: false, error: 'id_cola, comensales and tipo_origen are required' });
    }
    if (!['RESERVA', 'WAITLIST'].includes(tipo_origen)) {
      return res.status(400).json({ success: false, error: 'tipo_origen must be RESERVA or WAITLIST' });
    }
    if (tipo_origen === 'RESERVA' && !id_reserva) {
      return res.status(400).json({ success: false, error: 'id_reserva es requerida para tipo_origen RESERVA' });
    }
    if (tipo_origen === 'WAITLIST' && !id_waitlist) {
      return res.status(400).json({ success: false, error: 'id_waitlist es requerida para tipo_origen WAITLIST' });
    }
    if (typeof comensales !== 'number' || comensales < 1) {
      return res.status(400).json({ success: false, error: 'comensales must be a positive number' });
    }
    if (!(await puedeAccederACola(id_cola, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }

    if (mesa_id) {
      if (!(await puedeAccederAMesa(mesa_id, req.user?.id_empresa))) {
        return res.status(403).json({ success: false, error: 'Access denied: mesa belongs to another tenant' });
      }
      let start: Date | undefined;
      if (fecha && hora_inicio) {
        const d = new Date(fecha);
        const h = /^(\d{1,2}):(\d{2})$/.exec(hora_inicio);
        if (isNaN(d.getTime()) || !h) {
          return res.status(400).json({ success: false, error: 'fecha u hora_inicio inválidos' });
        }
        d.setHours(parseInt(h[1], 10), parseInt(h[2], 10), 0, 0);
        start = d;
      }
      const resultado = await allocationService.asignarMesaManual({
        colaId: id_cola,
        comensales,
        tipoOrigen: tipo_origen,
        idReserva: tipo_origen === 'RESERVA' ? id_reserva : null,
        idWaitlist: tipo_origen === 'WAITLIST' ? id_waitlist : null,
        mesaId: mesa_id,
        start,
        duracionMin: duracion_min,
      });
      if (!resultado) {
        return res.status(409).json({ success: false, error: 'No se pudo asignar la mesa (ventana ocupada o mesa no disponible)' });
      }
      return res.json({
        success: true,
        data: { asignacion: resultado.asignacion, mesa: resultado.mesa },
        message: 'Mesa asignada manualmente',
      });
    }

    // Asignación automática (mejor opción por scoring)
    let asignacion;
    if (tipo_origen === 'RESERVA') {
      asignacion = await allocationService.asignarDesdeReserva(id_reserva);
    } else {
      asignacion = await allocationService.asignarDesdeWaitlist(id_waitlist);
    }
    if (!asignacion) {
      return res.status(409).json({ success: false, error: 'No hay mesa disponible para este grupo en el hueco solicitado' });
    }
    return res.json({
      success: true,
      data: { asignacion },
      message: 'Mesa asignada automáticamente',
    });
  } catch (error) {
    logger.error('Error en /asignar:', error);
    return res.status(500).json({ success: false, error: 'Error assigning mesa' });
  }
});

export default router;