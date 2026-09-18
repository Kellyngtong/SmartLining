import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/auth.middleware';
import { ReservaRepository } from '../repositories/reserva.repository';
import { puedeAccederACola } from '../utils/tenant-access';
import { TableAllocationService } from '../services/tableAllocation.service';
import { MesaRepository } from '../repositories/mesa.repository';
import sse from '../sse';

const router = Router();
const reservaRepo = new ReservaRepository(prisma);
const mesaRepo = new MesaRepository(prisma);
const allocationService = new TableAllocationService(prisma, mesaRepo);

const ESTADOS_RESERVA = ['PENDIENTE', 'CONFIRMADA', 'CHECKED_IN', 'SENTADA', 'COMPLETADA', 'CANCELADA', 'NO_SHOW'];
const ORIGENES = ['TELEFONO', 'WEB', 'APP', 'WALK_IN', 'WHATSAPP', 'OTRO'];

const TRANSICIONES: Record<string, string[]> = {
  PENDIENTE: ['CONFIRMADA', 'CANCELADA'],
  CONFIRMADA: ['CHECKED_IN', 'CANCELADA', 'COMPLETADA'],
  CHECKED_IN: ['SENTADA', 'NO_SHOW', 'COMPLETADA'],
  SENTADA: ['COMPLETADA', 'NO_SHOW'],
  COMPLETADA: [],
  CANCELADA: [],
  NO_SHOW: [],
};

function parseFecha(str: string): Date | null {
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function parseHora(str: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(str);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  const d = new Date(2000, 0, 1, h, min, 0);
  return isNaN(d.getTime()) ? null : d;
}

function horaToHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ==========================================
// GET /api/restaurant/reservas/:colaId?fecha=YYYY-MM-DD&estado=&cliente=
// ==========================================
router.get('/reservas/:colaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    if (isNaN(colaId)) {
      return res.status(400).json({ success: false, error: 'Invalid cola ID' });
    }
    if (!(await puedeAccederACola(colaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    const fechaStr = req.query.fecha as string | undefined;
    const estado = req.query.estado as string | undefined;
    const cliente = req.query.cliente as string | undefined;
    const fecha = fechaStr ? new Date(`${fechaStr}T00:00:00`) : undefined;

    const reservas = await reservaRepo.findReservasByCola(colaId, { fecha, estado, cliente });
    const data = reservas.map((r) => ({
      ...r,
      hora_inicio_str: horaToHHMM(r.hora_inicio),
      hora_fin_str: r.hora_fin ? horaToHHMM(r.hora_fin) : null,
    }));
    return res.json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching reservas:', error);
    return res.status(500).json({ success: false, error: 'Error fetching reservas' });
  }
});

// ==========================================
// POST /api/restaurant/reservas
// Crear reserva (auto-asignación opcional si es para hoy/misma hora)
// ==========================================
router.post('/reservas', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      id_cola, id_cliente, cliente_nombre, cliente_telefono, cliente_email,
      fecha, hora_inicio, num_comensales, notas, preferencia_zona, preferencia_mesa, origen, auto_asignar,
    } = req.body;

    if (!id_cola || !cliente_nombre || !fecha || !hora_inicio || !num_comensales) {
      return res.status(400).json({
        success: false,
        error: 'id_cola, cliente_nombre, fecha, hora_inicio and num_comensales are required',
      });
    }
    if (!(await puedeAccederACola(id_cola, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    if (typeof num_comensales !== 'number' || num_comensales < 1) {
      return res.status(400).json({ success: false, error: 'num_comensales must be a positive number' });
    }
    const fechaDate = parseFecha(fecha);
    const horaDate = parseHora(hora_inicio);
    if (!fechaDate) return res.status(400).json({ success: false, error: 'fecha must be YYYY-MM-DD' });
    if (!horaDate) return res.status(400).json({ success: false, error: 'hora_inicio must be HH:MM' });
    if (origen !== undefined && !ORIGENES.includes(origen)) {
      return res.status(400).json({ success: false, error: `origen must be one of: ${ORIGENES.join(', ')}` });
    }

    // Incrementar visitas del cliente si se aporta id_cliente
    if (id_cliente) {
      try {
        await prisma.cliente.update({
          where: { id_cliente },
          data: { visitas: { increment: 1 } },
        });
      } catch (e) {
        logger.warn('Could not increment cliente visitas', e);
      }
    }

    const reserva = await reservaRepo.create({
      id_cola,
      id_cliente: id_cliente ?? null,
      cliente_nombre: cliente_nombre.trim(),
      cliente_telefono: cliente_telefono?.trim() ?? null,
      cliente_email: cliente_email?.trim() ?? null,
      fecha: fechaDate,
      hora_inicio: horaDate,
      num_comensales,
      notas: notas?.trim() || null,
      preferencia_zona: preferencia_zona ?? null,
      preferencia_mesa: preferencia_mesa ?? null,
      origen: origen ?? 'TELEFONO',
    });

    // Auto-asignación: solo si la reserva empieza "ahora" o dentro de la ventana actual
    let asignacion = null;
    const esAhora = fechaDate.toDateString() === new Date().toDateString();
    if (auto_asignar !== false && esAhora) {
      try {
        asignacion = await allocationService.asignarDesdeReserva(reserva.id_reserva);
      } catch (e) {
        logger.warn('Auto-assign reserva failed (non-fatal)', e);
        asignacion = null;
      }
    }

    try {
      sse.sendSseEvent(id_cola, 'RESERVA_CREADA', { reserva: { id_reserva: reserva.id_reserva } });
    } catch (e) {
      logger.warn('Failed to send SSE RESERVA_CREADA', e);
    }

    return res.status(201).json({
      success: true,
      data: {
        reserva,
        hora_inicio_str: horaToHHMM(reserva.hora_inicio),
        asignacion: asignacion ? { id_asignacion: asignacion.id_asignacion, mesa: asignacion.mesa } : null,
      },
      message: 'Reserva created' + (asignacion ? ' con mesa asignada' : ''),
    });
  } catch (error) {
    logger.error('Error creating reserva:', error);
    return res.status(500).json({ success: false, error: 'Error creating reserva' });
  }
});

// ==========================================
// PUT /api/restaurant/reservas/:id
// Editar detalles de una reserva
// ==========================================
router.put('/reservas/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid reserva ID' });
    }
    const reserva = await reservaRepo.findById(id);
    if (!reserva) {
      return res.status(404).json({ success: false, error: 'Reserva not found' });
    }
    if (!(await puedeAccederACola(reserva.id_cola, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: reserva belongs to another tenant' });
    }

    const body = req.body;
    const data: any = {};
    if (body.cliente_nombre !== undefined) data.cliente_nombre = body.cliente_nombre.trim();
    if (body.cliente_telefono !== undefined) data.cliente_telefono = body.cliente_telefono?.trim() ?? null;
    if (body.cliente_email !== undefined) data.cliente_email = body.cliente_email?.trim() ?? null;
    if (body.num_comensales !== undefined) {
      if (typeof body.num_comensales !== 'number' || body.num_comensales < 1) {
        return res.status(400).json({ success: false, error: 'num_comensales must be a positive number' });
      }
      data.num_comensales = body.num_comensales;
    }
    if (body.fecha !== undefined) {
      const fd = parseFecha(body.fecha);
      if (!fd) return res.status(400).json({ success: false, error: 'fecha must be YYYY-MM-DD' });
      data.fecha = fd;
    }
    if (body.hora_inicio !== undefined) {
      const hd = parseHora(body.hora_inicio);
      if (!hd) return res.status(400).json({ success: false, error: 'hora_inicio must be HH:MM' });
      data.hora_inicio = hd;
    }
    if (body.estado !== undefined && ESTADOS_RESERVA.includes(body.estado)) data.estado = body.estado;
    if (body.notas !== undefined) data.notas = body.notas?.trim() || null;
    if (body.preferencia_zona !== undefined) data.preferencia_zona = body.preferencia_zona ?? null;
    if (body.preferencia_mesa !== undefined) data.preferencia_mesa = body.preferencia_mesa ?? null;
    if (body.origen !== undefined && ORIGENES.includes(body.origen)) data.origen = body.origen;

    const updated = await reservaRepo.update(id, data);
    if (!updated) {
      return res.status(500).json({ success: false, error: 'Error updating reserva' });
    }
    return res.json({ success: true, data: updated, message: 'Reserva updated' });
  } catch (error) {
    logger.error('Error updating reserva:', error);
    return res.status(500).json({ success: false, error: 'Error updating reserva' });
  }
});

// ==========================================
// PATCH /api/restaurant/reservas/:id/estado
// Transición de estado con validación + auto-asignación al hacer check-in
// ==========================================
router.patch('/reservas/:id/estado', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { estado } = req.body;
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid reserva ID' });
    }
    const reserva = await reservaRepo.findById(id);
    if (!reserva) {
      return res.status(404).json({ success: false, error: 'Reserva not found' });
    }
    if (!(await puedeAccederACola(reserva.id_cola, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: reserva belongs to another tenant' });
    }
    if (!ESTADOS_RESERVA.includes(estado)) {
      return res.status(400).json({ success: false, error: `estado must be one of: ${ESTADOS_RESERVA.join(', ')}` });
    }
    if (estado === reserva.estado) {
      return res.json({ success: true, data: { reserva }, message: 'Estado de reserva actualizado (sin cambios)' });
    }
    const permitidos = TRANSICIONES[reserva.estado] ?? [];
    if (!permitidos.includes(estado)) {
      return res.status(409).json({
        success: false,
        error: `Transición no permitida de ${reserva.estado} a ${estado}`,
      });
    }

    if (reserva.estado === 'CANCELADA' || reserva.estado === 'NO_SHOW' || reserva.estado === 'COMPLETADA') {
      return res.status(409).json({ success: false, error: `Reserva en estado final (${reserva.estado})` });
    }

    // Cancelar/liberar asignación existente al pasar a NO atendida
    if (estado === 'CANCELADA' || estado === 'NO_SHOW') {
      await prisma.tableAssignment.updateMany({
        where: { id_reserva: id, estado: { in: ['PENDIENTE', 'ACTIVA'] } },
        data: { estado: 'CANCELADA' },
      });
    }

    // Al hacer check-in, intentar asignar mesa si aún no tiene
    let asignacion = null;
    if (estado === 'CHECKED_IN') {
      const tieneAsignacion = await prisma.tableAssignment.findFirst({ where: { id_reserva: id } });
      if (!tieneAsignacion) {
        try {
          asignacion = await allocationService.asignarDesdeReserva(id);
        } catch (e) {
          logger.warn('Auto-assign reserva on check-in failed (non-fatal)', e);
          asignacion = null;
        }
      }
    }

    const updated = await reservaRepo.updateEstado(id, estado);

    try {
      sse.sendSseEvent(reserva.id_cola, 'RESERVA_ESTADO', {
        reserva: { id_reserva: id, estado },
        asignacion: asignacion ? { id_asignacion: asignacion.id_asignacion, mesa: asignacion.mesa } : null,
      });
    } catch (e) {
      logger.warn('Failed to send SSE RESERVA_ESTADO', e);
    }

    return res.json({
      success: true,
      data: { reserva: updated, asignacion: asignacion ? { id_asignacion: asignacion.id_asignacion, mesa: asignacion.mesa } : null },
      message: 'Estado de reserva actualizado',
    });
  } catch (error) {
    logger.error('Error updating reserva estado:', error);
    return res.status(500).json({ success: false, error: 'Error updating reserva estado' });
  }
});

// ==========================================
// DELETE /api/restaurant/reservas/:id
// ==========================================
router.delete('/reservas/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid reserva ID' });
    }
    const reserva = await reservaRepo.findById(id);
    if (!reserva) {
      return res.status(404).json({ success: false, error: 'Reserva not found' });
    }
    if (!(await puedeAccederACola(reserva.id_cola, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: reserva belongs to another tenant' });
    }
    if (reserva.estado === 'SENTADA' || reserva.estado === 'COMPLETADA') {
      return res.status(409).json({ success: false, error: 'No se puede eliminar una reserva ya atendida' });
    }
    const deleted = await reservaRepo.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Reserva not found' });
    }
    try {
      sse.sendSseEvent(reserva.id_cola, 'RESERVA_ELIMINADA', { reserva: { id_reserva: id } });
    } catch (e) {
      logger.warn('Failed to send SSE RESERVA_ELIMINADA', e);
    }
    return res.json({ success: true, message: 'Reserva deleted' });
  } catch (error) {
    logger.error('Error deleting reserva:', error);
    return res.status(500).json({ success: false, error: 'Error deleting reserva' });
  }
});

export default router;