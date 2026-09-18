import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import { logger } from '../config/logger';
import { ReservaRepository } from '../repositories/reserva.repository';
import { TableAllocationService } from '../services/tableAllocation.service';
import { MesaRepository } from '../repositories/mesa.repository';
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

    return res.json({
      success: true,
      data: {
        ...cola,
        mesas: { total: totalMesas, libres },
        capacidad_maxima: capacidadMaxima,
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
// Crear reserva pública (PENDIENTE, origen WEB)
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

    const cola = await prisma.cola.findUnique({ where: { id_cola }, select: { tipo: true, activa: true } });
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

    const reserva = await reservaRepo.create({
      id_cola,
      cliente_nombre: cliente_nombre.trim(),
      cliente_telefono: cliente_telefono?.trim() ?? null,
      cliente_email: cliente_email?.trim() ?? null,
      fecha: fechaDate,
      hora_inicio: horaDate,
      num_comensales,
      notas: notas?.trim() || null,
      preferencia_zona: preferencia_zona ?? null,
      origen: 'WEB',
    });

    try {
      sse.sendSseEvent(id_cola, 'RESERVA_CREADA', { reserva: { id_reserva: reserva.id_reserva } });
    } catch (e) {
      logger.warn('Failed to send SSE RESERVA_CREADA', e);
    }

    return res.status(201).json({
      success: true,
      data: { reserva },
      message: 'Reserva creada con éxito. El restaurante confirmará pronto.',
    });
  } catch (error) {
    logger.error('Error creating public reserva:', error);
    return res.status(500).json({ success: false, error: 'Error creating reservation' });
  }
});

export default router;
