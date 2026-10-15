import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/auth.middleware';
import { puedeAccederACola } from '../utils/tenant-access';
import { TableAllocationService } from '../services/tableAllocation.service';
import { MesaRepository } from '../repositories/mesa.repository';

const router = Router();
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
// GET /api/restaurant/disponibilidad/:colaId
// ?fecha=YYYY-MM-DD&hora=HH:MM&comensales=&zona=&duracion_min=
// ==========================================
router.get('/disponibilidad/:colaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    if (isNaN(colaId)) {
      return res.status(400).json({ success: false, error: 'Invalid cola ID' });
    }
    if (!(await puedeAccederACola(colaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
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
    logger.error('Error fetching disponibilidad:', error);
    return res.status(500).json({ success: false, error: 'Error fetching disponibilidad' });
  }
});

// ==========================================
// GET /api/restaurant/dashboard/:colaId
// ==========================================
router.get('/dashboard/:colaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    if (isNaN(colaId)) {
      return res.status(400).json({ success: false, error: 'Invalid cola ID' });
    }
    if (!(await puedeAccederACola(colaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }

    const hoyInicio = new Date();
    hoyInicio.setHours(0, 0, 0, 0);
    const hoyFin = new Date(hoyInicio);
    hoyFin.setDate(hoyFin.getDate() + 1);

    const [mesas, zonas, waitlistHoy, reservasHoy, turnosHoy, asignacionesHoy, cola] = await Promise.all([
      mesaRepo.findByCola(colaId),
      prisma.zona.findMany({
        where: { id_cola: colaId },
        orderBy: { orden: 'asc' },
        include: { mesas: true },
      }),
      prisma.waitlistEntry.findMany({
        where: { id_cola: colaId, hora_llegada: { gte: hoyInicio } },
        orderBy: { hora_llegada: 'asc' },
      }),
      prisma.reserva.findMany({
        where: { id_cola: colaId, fecha: { gte: hoyInicio } },
        orderBy: [{ fecha: 'asc' }, { hora_inicio: 'asc' }],
      }),
      prisma.turno.findMany({
        where: {
          id_cola: colaId,
          fecha_hora_creacion: { gte: hoyInicio },
          estado: 'FINALIZADO',
        },
        select: {
          fecha_hora_llamada: true,
          fecha_hora_fin_atencion: true,
          atencion: { select: { duracion_atencion: true } },
        },
      }),
      prisma.tableAssignment.findMany({
        where: {
          id_cola: colaId,
          hora_inicio: { gte: hoyInicio, lt: hoyFin },
          estado: { in: ['ACTIVA', 'COMPLETADA'] },
        },
      }),
      prisma.cola.findUnique({ where: { id_cola: colaId } }),
    ]);

    const totalMesas = mesas.length;
    const libres = mesas.filter((m) => m.estado === 'LIBRE').length;
    const ocupadas = mesas.filter((m) => m.estado === 'OCUPADA').length;
    const reservadas = mesas.filter((m) => m.estado === 'RESERVADA').length;
    const otroEstado = mesas.filter((m) => m.estado !== 'LIBRE' && m.estado !== 'OCUPADA' && m.estado !== 'RESERVADA').length;
    const tasaOcupacion = totalMesas > 0 ? Math.round((ocupadas / totalMesas) * 100) : 0;

    const ocupacionPorZona = zonas.map((z) => {
      const total = z.mesas.filter((m) => m.activa).length;
      if (total === 0) return { id_zona: z.id_zona, nombre: z.nombre, total, ocupadas: 0, tasa: 0 };
      const ocu = z.mesas.filter((m) => m.activa && m.estado === 'OCUPADA').length;
      return { id_zona: z.id_zona, nombre: z.nombre, total, ocupadas: ocu, tasa: Math.round((ocu / total) * 100) };
    });

    const esperando = waitlistHoy.filter((w) => w.estado === 'ESPERANDO' || w.estado === 'NOTIFICADO');
    const duraciones = waitlistHoy
      .filter((w) => w.tiempo_estimado_min != null && w.tiempo_estimado_min > 0)
      .map((w) => w.tiempo_estimado_min!);
    const tiempoMedioEspera = duraciones.length > 0
      ? Math.round(duraciones.reduce((a, b) => a + b, 0) / duraciones.length)
      : null;

    const estadosReserva = ['PENDIENTE', 'CONFIRMADA', 'CHECKED_IN', 'SENTADA', 'COMPLETADA', 'CANCELADA', 'NO_SHOW'];
    const reservasPorEstado = estadosReserva.map((e) => ({
      estado: e,
      cantidad: reservasHoy.filter((r) => r.estado === e).length,
    }));

    const tiemposComida = turnosHoy
      .map((t) => {
        if (t.fecha_hora_llamada && t.fecha_hora_fin_atencion) {
          return (t.fecha_hora_fin_atencion.getTime() - t.fecha_hora_llamada.getTime()) / 60000;
        }
        if (t.atencion?.duracion_atencion) return t.atencion.duracion_atencion / 60;
        return null;
      })
      .filter((v): v is number => v != null && v > 0);
    const tiempoMedioComida = tiemposComida.length > 0
      ? Math.round(tiemposComida.reduce((a, b) => a + b, 0) / tiemposComida.length)
      : null;

    return res.json({
      success: true,
      data: {
        cola: { id_cola: colaId, nombre: cola?.nombre, duracion_estimada_comida_min: cola?.duracion_estimada_comida_min ?? 90 },
        mesas: {
          total_mesas: totalMesas,
          libres,
          ocupadas,
          reservadas,
          otro_estado: otroEstado,
          tasa_ocupacion: tasaOcupacion,
          por_zona: ocupacionPorZona,
        },
        waitlist: {
          hoy: waitlistHoy.length,
          esperando_ahora: esperando.length,
          tiempo_medio_espera_min: tiempoMedioEspera,
        },
        reservas: {
          hoy: reservasHoy.length,
          por_estado: reservasPorEstado,
          proxima: reservasHoy.find((r) => r.estado === 'CONFIRMADA' || r.estado === 'PENDIENTE')?.fecha ?? null,
        },
        operacion: {
          grupos_finalizados_hoy: turnosHoy.length,
          asignaciones_mesa_hoy: asignacionesHoy.length,
          tiempo_medio_comida_min: tiempoMedioComida,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching dashboard:', error);
    return res.status(500).json({ success: false, error: 'Error fetching dashboard' });
  }
});

// ==========================================
// GET /api/restaurant/agenda-resumen/:colaId?mes=YYYY-MM
// Conteo de reservas por día + festivos del mes (para el calendario)
// ==========================================
router.get('/agenda-resumen/:colaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    if (isNaN(colaId)) {
      return res.status(400).json({ success: false, error: 'Invalid cola ID' });
    }
    if (!(await puedeAccederACola(colaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    const mesParam = (req.query.mes as string) || new Date().toISOString().slice(0, 7);
    const m = /^(\d{4})-(\d{2})$/.exec(mesParam);
    if (!m) return res.status(400).json({ success: false, error: 'mes must be YYYY-MM' });
    const inicio = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, 1, 0, 0, 0, 0);
    const fin = new Date(parseInt(m[1], 10), parseInt(m[2], 10), 1, 0, 0, 0, 0);

    const [reservas, cierres] = await Promise.all([
      prisma.reserva.findMany({
        // Solo reservas vivas: las procesadas/finalizadas no pintan en la agenda
        where: {
          id_cola: colaId,
          fecha: { gte: inicio, lt: fin },
          estado: { notIn: ['COMPLETADA', 'CANCELADA', 'NO_SHOW'] },
        },
        select: { fecha: true, estado: true },
      }),
      prisma.diaCierre.findMany({
        where: { id_cola: colaId, fecha: { gte: inicio, lt: fin } },
        orderBy: { fecha: 'asc' },
      }),
    ]);

    const dias: Record<string, { reservas: number; pendientes: number }> = {};
    for (const r of reservas) {
      const key = r.fecha.toISOString().slice(0, 10);
      if (!dias[key]) dias[key] = { reservas: 0, pendientes: 0 };
      dias[key].reservas++;
      if (r.estado === 'PENDIENTE' || r.estado === 'CONFIRMADA') dias[key].pendientes++;
    }
    return res.json({
      success: true,
      data: {
        mes: mesParam,
        dias,
        festivos: cierres.map(c => ({
          id_cierre: c.id_cierre,
          fecha: c.fecha.toISOString().slice(0, 10),
          motivo: c.motivo,
        })),
      },
    });
  } catch (error) {
    logger.error('Error fetching agenda resumen:', error);
    return res.status(500).json({ success: false, error: 'Error fetching resumen' });
  }
});

export default router;