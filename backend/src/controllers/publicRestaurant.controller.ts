import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import prisma from '../config/prisma';
import { logger } from '../config/logger';
import { ReservaRepository } from '../repositories/reserva.repository';
import { TableAllocationService } from '../services/tableAllocation.service';
import { MesaRepository } from '../repositories/mesa.repository';
import {
  getReservaConfig,
  generarSlots,
  diaSemanaDeFecha,
  slotDateTime,
  motivoCierre,
} from '../utils/reserva-config';
import { notificarConfirmada, notificarCambio, notificarCancelacion, emailValido } from '../services/reserva-notifier.service';
import sse from '../sse';

const router = Router();
const reservaRepo = new ReservaRepository(prisma);
const mesaRepo = new MesaRepository(prisma);
const allocationService = new TableAllocationService(prisma, mesaRepo);

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

// ==========================================
// GET /api/restaurant/public/restaurantes
// Listar restaurantes activos (todas las empresas — público)
// ==========================================
router.get('/restaurantes', async (_req: Request, res: Response) => {
  try {
    const restaurantes = await prisma.cola.findMany({
      where: { tipo: 'RESTAURANTE', activa: true },
      select: {
        id_cola: true,
        nombre: true,
        descripcion: true,
        duracion_estimada_comida_min: true,
        empresa: { select: { id_empresa: true, nombre: true } },
      },
      orderBy: { nombre: 'asc' },
    });
    return res.json({ success: true, data: restaurantes });
  } catch (error) {
    logger.error('Error fetching public restaurantes:', error);
    return res.status(500).json({ success: false, error: 'Error fetching restaurants' });
  }
});

// ==========================================
// GET /api/restaurant/public/restaurantes/:colaId
// Detalle de un restaurante (público)
// ==========================================
router.get('/restaurantes/:colaId', async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    if (isNaN(colaId)) {
      return res.status(400).json({ success: false, error: 'Invalid cola ID' });
    }

    const cola = await prisma.cola.findUnique({
      where: { id_cola: colaId },
      select: {
        id_cola: true,
        nombre: true,
        descripcion: true,
        tipo: true,
        activa: true,
        duracion_estimada_comida_min: true,
        empresa: { select: { id_empresa: true, nombre: true } },
        zonas: { select: { id_zona: true, nombre: true, tipo: true }, orderBy: { orden: 'asc' } },
      },
    });

    if (!cola || cola.tipo !== 'RESTAURANTE') {
      return res.status(404).json({ success: false, error: 'Restaurant not found' });
    }

    const mesas = await mesaRepo.findByCola(colaId);
    const totalMesas = mesas.length;
    const libres = mesas.filter(m => m.estado === 'LIBRE').length;
    const capacidadMaxima = mesas.reduce((max, m) => Math.max(max, m.capacidad ?? 0), 0);
    const cierreHoy = await motivoCierre(colaId, new Date());

    return res.json({
      success: true,
      data: {
        ...cola,
        mesas: { total: totalMesas, libres },
        capacidad_maxima: capacidadMaxima,
        cerrado_hoy: cierreHoy !== null,
        motivo_cierre: cierreHoy,
      },
    });
  } catch (error) {
    logger.error('Error fetching public restaurante:', error);
    return res.status(500).json({ success: false, error: 'Error fetching restaurant' });
  }
});

// ==========================================
// GET /api/restaurant/public/disponibilidad/:colaId
// Comprobar disponibilidad (público, sin auth)
// ==========================================
router.get('/disponibilidad/:colaId', async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    if (isNaN(colaId)) {
      return res.status(400).json({ success: false, error: 'Invalid cola ID' });
    }

    const cola = await prisma.cola.findUnique({ where: { id_cola: colaId }, select: { tipo: true, activa: true } });
    if (!cola || cola.tipo !== 'RESTAURANTE' || !cola.activa) {
      return res.status(404).json({ success: false, error: 'Restaurant not found' });
    }

    const comensales = parseInt(req.query.comensales as string, 10);
    if (isNaN(comensales) || comensales < 1) {
      return res.status(400).json({ success: false, error: 'comensales is required and must be >= 1' });
    }

    const fechaStr = (req.query.fecha as string) ?? new Date().toISOString().slice(0, 10);
    const horaStr = (req.query.hora as string) ?? new Date().toISOString().slice(11, 16);
    const fecha = parseFecha(`${fechaStr}T00:00:00`);
    const hora = parseHora(horaStr);
    if (!fecha) return res.status(400).json({ success: false, error: 'fecha must be YYYY-MM-DD' });
    if (!hora) return res.status(400).json({ success: false, error: 'hora must be HH:MM' });

    const zonaParam = req.query.zona as string | undefined;
    const zonaId = zonaParam ? parseInt(zonaParam, 10) : null;
    const duracionMin = req.query.duracion_min ? parseInt(req.query.duracion_min as string, 10) : undefined;

    const data = await allocationService.consultarDisponibilidad(colaId, {
      fecha,
      horaInicio: hora,
      comensales,
      zonaId,
      duracionMin,
    });
    return res.json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching public disponibilidad:', error);
    return res.status(500).json({ success: false, error: 'Error checking availability' });
  }
});

// ==========================================
// POST /api/restaurant/public/reservas
// Crear reserva pública (PENDIENTE, origen WEB) con reglas de servicio:
// horarios, antelación, topes, disponibilidad verificada y anti-duplicados
// ==========================================
router.post('/reservas', async (req: Request, res: Response) => {
  try {
    const {
      id_cola, cliente_nombre, cliente_telefono, cliente_email,
      fecha, hora_inicio, num_comensales, notas, preferencia_zona,
    } = req.body;

    if (!id_cola || !cliente_nombre || !fecha || !hora_inicio || !num_comensales) {
      return res.status(400).json({
        success: false,
        error: 'id_cola, cliente_nombre, fecha, hora_inicio and num_comensales are required',
      });
    }
    if (!emailValido(cliente_email)) {
      return res.status(400).json({
        success: false,
        error: 'cliente_email es obligatorio y debe ser válido para recibir los avisos de tu reserva',
      });
    }

    const cola = await prisma.cola.findUnique({
      where: { id_cola },
      select: { tipo: true, activa: true, id_empresa: true },
    });
    if (!cola || cola.tipo !== 'RESTAURANTE' || !cola.activa) {
      return res.status(404).json({ success: false, error: 'Restaurant not found or inactive' });
    }

    if (typeof num_comensales !== 'number' || num_comensales < 1) {
      return res.status(400).json({ success: false, error: 'num_comensales must be a positive number' });
    }

    const fechaDate = parseFecha(fecha);
    const horaDate = parseHora(hora_inicio);
    if (!fechaDate) return res.status(400).json({ success: false, error: 'fecha must be YYYY-MM-DD' });
    if (!horaDate) return res.status(400).json({ success: false, error: 'hora_inicio must be HH:MM' });

    const config = await getReservaConfig(id_cola);
    const telefono = cliente_telefono?.trim() || null;

    // --- Regla: día de cierre (inhabilita reservas) ---
    const cierre = await motivoCierre(id_cola, fechaDate);
    if (cierre) {
      return res.status(400).json({ success: false, error: `Cerrado: ${cierre}` });
    }

    // --- Regla: tope de comensales online ---
    if (num_comensales > config.max_comensales_online) {
      return res.status(400).json({
        success: false,
        error: `Para grupos de más de ${config.max_comensales_online} personas, contacta directamente con el restaurante`,
      });
    }

    // --- Regla: ventana de antelación ---
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const maxFecha = new Date(hoy);
    maxFecha.setDate(maxFecha.getDate() + config.antelacion_max_dias);
    const fechaSoloDia = new Date(fechaDate);
    fechaSoloDia.setHours(0, 0, 0, 0);
    if (fechaSoloDia < hoy) {
      return res.status(400).json({ success: false, error: 'La fecha debe ser hoy o futura' });
    }
    if (fechaSoloDia > maxFecha) {
      return res.status(400).json({
        success: false,
        error: `Solo se puede reservar con ${config.antelacion_max_dias} días de antelación como máximo`,
      });
    }
    const slotDt = slotDateTime(fechaDate, hora_inicio);
    if (slotDt.getTime() < Date.now() + config.antelacion_min_min * 60000) {
      return res.status(400).json({
        success: false,
        error: `Reserva con al menos ${config.antelacion_min_min} minutos de antelación`,
      });
    }

    // --- Regla: dentro del horario de apertura (si hay horarios configurados) ---
    const horariosCola = await prisma.horarioCola.findMany({ where: { id_cola } });
    if (horariosCola.length > 0) {
      const delDia = horariosCola.filter(h => h.dia_semana === diaSemanaDeFecha(fechaDate) as any);
      const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const dentro = delDia.some(h => hora_inicio >= hhmm(h.hora_inicio) && hora_inicio < hhmm(h.hora_fin));
      if (!dentro) {
        return res.status(400).json({ success: false, error: 'El restaurante está cerrado en ese horario' });
      }
    }

    // --- Regla: tope de reservas activas por teléfono (anti-spam) ---
    if (telefono) {
      const activas = await prisma.reserva.count({
        where: {
          id_cola,
          cliente_telefono: telefono,
          estado: { in: ['PENDIENTE', 'CONFIRMADA', 'CHECKED_IN'] },
          fecha: { gte: hoy },
        },
      });
      if (activas >= config.max_reservas_por_telefono) {
        return res.status(429).json({
          success: false,
          error: `Ya tienes ${activas} reservas activas con este teléfono. Cancela alguna antes de crear otra.`,
        });
      }
    }

    // --- Anti-doble-envío: misma reserva creada en los últimos 2 minutos ---
    const hace2min = new Date(Date.now() - 2 * 60000);
    const duplicada = await prisma.reserva.findFirst({
      where: {
        id_cola,
        cliente_nombre: cliente_nombre.trim(),
        cliente_telefono: telefono,
        fecha: fechaDate,
        num_comensales,
        created_at: { gte: hace2min },
      },
    });
    if (duplicada) {
      return res.json({
        success: true,
        data: { reserva: duplicada, duplicada: true },
        message: 'Tu solicitud ya estaba registrada.',
      });
    }

    // --- Regla: disponibilidad verificada (anti-overbooking) ---
    const disp: any = await allocationService.consultarDisponibilidad(id_cola, {
      fecha: fechaDate,
      horaInicio: horaDate,
      comensales: num_comensales,
    });
    if (!disp?.hayDisponibilidad) {
      // Buscar hasta 3 alternativas cercanas el mismo día
      const alternativas: string[] = [];
      for (const delta of [config.slot_min, -config.slot_min, config.slot_min * 2, -config.slot_min * 2]) {
        if (alternativas.length >= 3) break;
        const [h, m] = hora_inicio.split(':').map(Number);
        const alt = new Date(2000, 0, 1, h, m + delta, 0);
        if (alt.getHours() > 23 || alt.getHours() < 0) continue;
        try {
          const d2: any = await allocationService.consultarDisponibilidad(id_cola, {
            fecha: fechaDate,
            horaInicio: alt,
            comensales: num_comensales,
          });
          if (d2?.hayDisponibilidad) {
            alternativas.push(`${String(alt.getHours()).padStart(2, '0')}:${String(alt.getMinutes()).padStart(2, '0')}`);
          }
        } catch { /* ignorar */ }
      }
      return res.status(409).json({
        success: false,
        error: 'No hay mesa disponible en esa franja horaria',
        alternativas,
      });
    }

    // --- Vincular cliente por teléfono (CRM) ---
    let idCliente: number | null = null;
    if (telefono) {
      const existente = await prisma.cliente.findFirst({
        where: { telefono, id_empresa: cola.id_empresa },
      });
      if (existente) {
        idCliente = existente.id_cliente;
      } else {
        const nuevo = await prisma.cliente.create({
          data: {
            nombre: cliente_nombre.trim(),
            telefono,
            email: cliente_email?.trim() || null,
            id_empresa: cola.id_empresa,
            origen: 'WEB',
          },
        });
        idCliente = nuevo.id_cliente;
      }
    }

    const reserva = await reservaRepo.create({
      id_cola,
      id_cliente: idCliente,
      cliente_nombre: cliente_nombre.trim(),
      cliente_telefono: telefono,
      cliente_email: cliente_email?.trim() ?? null,
      fecha: fechaDate,
      hora_inicio: horaDate,
      num_comensales,
      notas: notas?.trim() || null,
      preferencia_zona: preferencia_zona ?? null,
      origen: 'WEB',
      estado: 'CONFIRMADA',
      token_publico: randomUUID(),
    });

    // Hold provisional de la mejor mesa (anti-overbooking real con FOR UPDATE).
    // Si otra petición ganó la carrera, se anula la reserva y se devuelve 409.
    const holdOk = await allocationService.crearHoldReserva(reserva.id_reserva);
    if (!holdOk) {
      await reservaRepo.delete(reserva.id_reserva).catch(() => null);
      return res.status(409).json({
        success: false,
        error: 'Esa franja se acaba de completar. Elige otra hora.',
      });
    }

    try {
      sse.sendSseEvent(id_cola, 'RESERVA_CREADA', { reserva: { id_reserva: reserva.id_reserva } });
    } catch (e) {
      logger.warn('Failed to send SSE RESERVA_CREADA', e);
    }

    void notificarConfirmada(reserva);

    return res.status(201).json({
      success: true,
      data: { reserva, mi_reserva_url: `/restaurante/mi-reserva/${reserva.token_publico}` },
      message: 'Reserva confirmada. ¡Te esperamos!',
    });
  } catch (error) {
    logger.error('Error creating public reserva:', error);
    return res.status(500).json({ success: false, error: 'Error creating reservation' });
  }
});

// ==========================================
// GET /api/restaurant/public/slots/:colaId?fecha=YYYY-MM-DD&comensales=N
// Slots reservables del día con disponibilidad real (público)
// ==========================================
router.get('/slots/:colaId', async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    if (isNaN(colaId)) {
      return res.status(400).json({ success: false, error: 'Invalid cola ID' });
    }
    const cola = await prisma.cola.findUnique({ where: { id_cola: colaId }, select: { tipo: true, activa: true } });
    if (!cola || cola.tipo !== 'RESTAURANTE' || !cola.activa) {
      return res.status(404).json({ success: false, error: 'Restaurant not found' });
    }
    const comensales = parseInt(req.query.comensales as string, 10);
    if (isNaN(comensales) || comensales < 1) {
      return res.status(400).json({ success: false, error: 'comensales is required and must be >= 1' });
    }
    const fechaStr = req.query.fecha as string;
    const fecha = fechaStr ? parseFecha(`${fechaStr}T00:00:00`) : null;
    if (!fecha) return res.status(400).json({ success: false, error: 'fecha must be YYYY-MM-DD' });

    const data = await generarSlots(colaId, fecha, comensales, allocationService);
    return res.json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching public slots:', error);
    return res.status(500).json({ success: false, error: 'Error fetching slots' });
  }
});

// ==========================================
// R2 — Autogestión del cliente con token (sin login)
// ==========================================

async function findReservaByToken(token: string) {
  return prisma.reserva.findUnique({
    where: { token_publico: token },
    include: {
      cola: { select: { id_cola: true, nombre: true } },
      asignaciones: { include: { mesa: { select: { id_mesa: true, numero: true } } } },
    },
  });
}

function dentroDeLimite(reserva: { fecha: Date; hora_inicio: Date }, limiteHoras: number): boolean {
  const [h, m] = [reserva.hora_inicio.getHours(), reserva.hora_inicio.getMinutes()];
  const slot = new Date(reserva.fecha);
  slot.setHours(h, m, 0, 0);
  return Date.now() <= slot.getTime() - limiteHoras * 3600000;
}

// GET /api/restaurant/public/mis-reservas/:token
router.get('/mis-reservas/:token', async (req: Request, res: Response) => {
  try {
    const reserva = await findReservaByToken(req.params.token as string);
    if (!reserva) {
      return res.status(404).json({ success: false, error: 'Reserva no encontrada' });
    }
    const config = await getReservaConfig(reserva.id_cola);
    const modificable = (reserva.estado === 'PENDIENTE' || reserva.estado === 'CONFIRMADA')
      && dentroDeLimite(reserva, config.modificacion_limite_horas);
    return res.json({
      success: true,
      data: {
        reserva,
        puede_confirmar: reserva.estado === 'PENDIENTE',
        puede_modificar: modificable,
        puede_cancelar: modificable,
      },
    });
  } catch (error) {
    logger.error('Error fetching mi-reserva:', error);
    return res.status(500).json({ success: false, error: 'Error fetching reservation' });
  }
});

// POST /api/restaurant/public/mis-reservas/:token/confirmar
router.post('/mis-reservas/:token/confirmar', async (req: Request, res: Response) => {
  try {
    const reserva = await findReservaByToken(req.params.token as string);
    if (!reserva) {
      return res.status(404).json({ success: false, error: 'Reserva no encontrada' });
    }
    if (reserva.estado !== 'PENDIENTE') {
      return res.status(409).json({ success: false, error: `La reserva ya está en estado ${reserva.estado}` });
    }
    const updated = await reservaRepo.updateEstado(reserva.id_reserva, 'CONFIRMADA');
    try {
      sse.sendSseEvent(reserva.id_cola, 'RESERVA_ESTADO', { reserva: { id_reserva: reserva.id_reserva, estado: 'CONFIRMADA' } });
    } catch (e) {
      logger.warn('Failed to send SSE RESERVA_ESTADO', e);
    }
    if (updated) void notificarConfirmada(updated);
    return res.json({ success: true, data: { reserva: updated }, message: 'Asistencia confirmada. ¡Te esperamos!' });
  } catch (error) {
    logger.error('Error confirming mi-reserva:', error);
    return res.status(500).json({ success: false, error: 'Error confirming reservation' });
  }
});

// POST /api/restaurant/public/mis-reservas/:token/cancelar
router.post('/mis-reservas/:token/cancelar', async (req: Request, res: Response) => {
  try {
    const reserva = await findReservaByToken(req.params.token as string);
    if (!reserva) {
      return res.status(404).json({ success: false, error: 'Reserva no encontrada' });
    }
    if (reserva.estado !== 'PENDIENTE' && reserva.estado !== 'CONFIRMADA') {
      return res.status(409).json({ success: false, error: `La reserva ya está en estado ${reserva.estado}` });
    }
    const config = await getReservaConfig(reserva.id_cola);
    if (!dentroDeLimite(reserva, config.modificacion_limite_horas)) {
      return res.status(409).json({
        success: false,
        error: `Solo se puede cancelar hasta ${config.modificacion_limite_horas}h antes. Contacta con el restaurante.`,
      });
    }
    await prisma.tableAssignment.updateMany({
      where: { id_reserva: reserva.id_reserva, estado: { in: ['PENDIENTE', 'ACTIVA'] } },
      data: { estado: 'CANCELADA' },
    });
    const updated = await reservaRepo.updateEstado(reserva.id_reserva, 'CANCELADA');
    if (reserva.id_cliente) {
      await prisma.cliente.update({
        where: { id_cliente: reserva.id_cliente },
        data: { cancelaciones: { increment: 1 } },
      }).catch(() => null);
    }
    try {
      sse.sendSseEvent(reserva.id_cola, 'RESERVA_ESTADO', { reserva: { id_reserva: reserva.id_reserva, estado: 'CANCELADA' } });
    } catch (e) {
      logger.warn('Failed to send SSE RESERVA_ESTADO', e);
    }
    if (updated) void notificarCancelacion(updated, true);
    return res.json({ success: true, data: { reserva: updated }, message: 'Reserva cancelada' });
  } catch (error) {
    logger.error('Error cancelling mi-reserva:', error);
    return res.status(500).json({ success: false, error: 'Error cancelling reservation' });
  }
});

// PUT /api/restaurant/public/mis-reservas/:token
// Modificar fecha/hora/comensales con las mismas reglas que la creación
router.put('/mis-reservas/:token', async (req: Request, res: Response) => {
  try {
    const reserva = await findReservaByToken(req.params.token as string);
    if (!reserva) {
      return res.status(404).json({ success: false, error: 'Reserva no encontrada' });
    }
    if (reserva.estado !== 'PENDIENTE' && reserva.estado !== 'CONFIRMADA') {
      return res.status(409).json({ success: false, error: `La reserva ya está en estado ${reserva.estado}` });
    }
    const config = await getReservaConfig(reserva.id_cola);
    if (!dentroDeLimite(reserva, config.modificacion_limite_horas)) {
      return res.status(409).json({
        success: false,
        error: `Solo se puede modificar hasta ${config.modificacion_limite_horas}h antes. Contacta con el restaurante.`,
      });
    }

    const { fecha, hora_inicio, num_comensales } = req.body;
    const data: any = {};
    if (num_comensales !== undefined) {
      if (typeof num_comensales !== 'number' || num_comensales < 1) {
        return res.status(400).json({ success: false, error: 'num_comensales must be a positive number' });
      }
      if (num_comensales > config.max_comensales_online) {
        return res.status(400).json({
          success: false,
          error: `Para grupos de más de ${config.max_comensales_online} personas, contacta directamente con el restaurante`,
        });
      }
      data.num_comensales = num_comensales;
    }
    let fechaDate = reserva.fecha;
    if (fecha !== undefined) {
      const fd = parseFecha(fecha);
      if (!fd) return res.status(400).json({ success: false, error: 'fecha must be YYYY-MM-DD' });
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const maxFecha = new Date(hoy);
      maxFecha.setDate(maxFecha.getDate() + config.antelacion_max_dias);
      const soloDia = new Date(fd);
      soloDia.setHours(0, 0, 0, 0);
      if (soloDia < hoy || soloDia > maxFecha) {
        return res.status(400).json({ success: false, error: 'Fecha fuera del rango permitido' });
      }
      fechaDate = fd;
      data.fecha = fd;
    }
    let horaStr = `${String(reserva.hora_inicio.getHours()).padStart(2, '0')}:${String(reserva.hora_inicio.getMinutes()).padStart(2, '0')}`;
    if (hora_inicio !== undefined) {
      const hd = parseHora(hora_inicio);
      if (!hd) return res.status(400).json({ success: false, error: 'hora_inicio must be HH:MM' });
      horaStr = hora_inicio;
      data.hora_inicio = hd;
    }

    // Antelación del nuevo slot
    if (slotDateTime(fechaDate, horaStr).getTime() < Date.now() + config.antelacion_min_min * 60000) {
      return res.status(400).json({
        success: false,
        error: `Reserva con al menos ${config.antelacion_min_min} minutos de antelación`,
      });
    }

    // Disponibilidad del nuevo slot
    const comensalesFinal = data.num_comensales ?? reserva.num_comensales;
    const disp: any = await allocationService.consultarDisponibilidad(reserva.id_cola, {
      fecha: fechaDate,
      horaInicio: parseHora(horaStr)!,
      comensales: comensalesFinal,
    });
    if (!disp?.hayDisponibilidad) {
      return res.status(409).json({ success: false, error: 'No hay mesa disponible en esa franja horaria' });
    }

    // Mover el hold a la nueva ventana: liberar holds viejos, actualizar y re-bloquear.
    // Si la nueva ventana está llena, se revierte al estado anterior.
    await allocationService.liberarHoldsReserva(reserva.id_reserva);
    const updated = await reservaRepo.update(reserva.id_reserva, data);
    const holdOk = await allocationService.crearHoldReserva(reserva.id_reserva);
    if (!holdOk) {
      await reservaRepo.update(reserva.id_reserva, {
        fecha: reserva.fecha,
        hora_inicio: reserva.hora_inicio,
        num_comensales: reserva.num_comensales,
      }).catch(() => null);
      await allocationService.crearHoldReserva(reserva.id_reserva).catch(() => null);
      return res.status(409).json({ success: false, error: 'Esa franja se acaba de completar. Elige otra hora.' });
    }
    try {
      sse.sendSseEvent(reserva.id_cola, 'RESERVA_ESTADO', { reserva: { id_reserva: reserva.id_reserva, estado: reserva.estado } });
    } catch (e) {
      logger.warn('Failed to send SSE RESERVA_ESTADO', e);
    }
    if (updated) void notificarCambio(updated, 'Has modificado tu reserva desde tu enlace personal.');
    return res.json({ success: true, data: { reserva: updated }, message: 'Reserva actualizada' });
  } catch (error) {
    logger.error('Error updating mi-reserva:', error);
    return res.status(500).json({ success: false, error: 'Error updating reservation' });
  }
});

export default router;
