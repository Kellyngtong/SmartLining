import { Router, Request, Response } from 'express';
import { MesaEstado } from '@prisma/client';
import { MesaRepository } from '../repositories/mesa.repository';
import { logger } from '../config/logger';
import prisma from '../config/prisma';
import sse from '../sse';
import { authMiddleware } from '../middleware/auth.middleware';
import { TableAllocationService } from '../services/tableAllocation.service';

const router = Router();
const mesaRepo = new MesaRepository(prisma);
const allocationService = new TableAllocationService(prisma, mesaRepo);

/**
 * Comprueba que el usuario autenticado tiene acceso a la cola indicada
 * (mismo tenant). Devuelve true si tiene acceso, false si no o no autenticado.
 */
async function puedeAccederACola(colaId: number, idEmpresa: number | undefined): Promise<boolean> {
  if (!idEmpresa) return false;
  const cola = await prisma.cola.findUnique({ where: { id_cola: colaId } });
  return !!cola && cola.id_empresa === idEmpresa;
}

/**
 * Comprueba que el usuario autenticado tiene acceso a la mesa indicada
 * (misma empresa/tenant que la cola a la que pertenece).
 */
async function puedeAccederAMesa(mesaId: number, idEmpresa: number | undefined): Promise<boolean> {
  if (!idEmpresa) return false;
  const mesa = await prisma.mesa.findUnique({ where: { id_mesa: mesaId } });
  if (!mesa) return false;
  const cola = await prisma.cola.findUnique({ where: { id_cola: mesa.id_cola } });
  return !!cola && cola.id_empresa === idEmpresa;
}


// ==========================================
// GET /api/restaurant/mesas/:colaId
// ==========================================
router.get('/mesas/:colaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    if (isNaN(colaId)) {
      return res.status(400).json({ success: false, error: 'Invalid cola ID' });
    }
    if (!(await puedeAccederACola(colaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    const mesas = await mesaRepo.findByCola(colaId);
    return res.json({ success: true, data: mesas });
  } catch (error) {
    logger.error('Error fetching mesas:', error);
    return res.status(500).json({ success: false, error: 'Error fetching mesas' });
  }
});

// ==========================================
// GET /api/restaurant/mesas/:colaId/libres
// ==========================================
router.get('/mesas/:colaId/libres', authMiddleware, async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    if (isNaN(colaId)) {
      return res.status(400).json({ success: false, error: 'Invalid cola ID' });
    }
    if (!(await puedeAccederACola(colaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    const mesas = await mesaRepo.findLibresByCola(colaId);
    return res.json({ success: true, data: mesas });
  } catch (error) {
    logger.error('Error fetching libres:', error);
    return res.status(500).json({ success: false, error: 'Error fetching libres' });
  }
});

// ==========================================
// POST /api/restaurant/mesas
// ==========================================
router.post('/mesas', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { numero, capacidad, id_cola } = req.body;
    if (!numero || !capacidad || !id_cola) {
      return res.status(400).json({ success: false, error: 'numero, capacidad and id_cola are required' });
    }
    if (typeof numero !== 'number' || typeof capacidad !== 'number' || capacidad < 1) {
      return res.status(400).json({ success: false, error: 'Invalid numero or capacidad' });
    }
    if (!(await puedeAccederACola(id_cola, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    const mesa = await mesaRepo.create({ numero, capacidad, id_cola });
    return res.status(201).json({ success: true, data: mesa, message: 'Mesa created' });
  } catch (error) {
    logger.error('Error creating mesa:', error);
    return res.status(500).json({ success: false, error: 'Error creating mesa' });
  }
});

// ==========================================
// PUT /api/restaurant/mesas/:id
// ==========================================
router.put('/mesas/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid mesa ID' });
    }
    if (!(await puedeAccederAMesa(id, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    const {
      numero, capacidad, estado, capacidad_min, id_zona, x, y, width, height,
      rotation, shape, notas, activa, capacidad_extra,
    } = req.body;
    const data: any = {};
    if (numero !== undefined) data.numero = numero;
    if (capacidad !== undefined) data.capacidad = capacidad;
    if (capacidad_extra !== undefined) data.capacidad_extra = capacidad_extra;
    if (capacidad_min !== undefined) data.capacidad_min = capacidad_min;
    if (estado !== undefined) data.estado = estado;
    if (id_zona !== undefined) data.id_zona = id_zona ?? null;
    if (x !== undefined) data.x = x ?? null;
    if (y !== undefined) data.y = y ?? null;
    if (width !== undefined) data.width = width ?? null;
    if (height !== undefined) data.height = height ?? null;
    if (rotation !== undefined) data.rotation = rotation;
    if (shape !== undefined) data.shape = shape;
    if (notas !== undefined) data.notas = notas?.trim() || null;
    if (activa !== undefined) data.activa = activa;
    const mesa = await mesaRepo.update(id, data);
    if (!mesa) {
      return res.status(404).json({ success: false, error: 'Mesa not found' });
    }
    return res.json({ success: true, data: mesa, message: 'Mesa updated' });
  } catch (error) {
    logger.error('Error updating mesa:', error);
    return res.status(500).json({ success: false, error: 'Error updating mesa' });
  }
});

// ==========================================
// POST /api/restaurant/mesas/:id/bloquear | :id/limpiar | :id/servicio
// Acciones de estado recurrentes de una mesa
// ==========================================
const ACCIONES_ESTADO: Record<string, MesaEstado> = {
  bloquear: 'BLOQUEADA',
  limpiar: 'LIMPIEZA',
  servicio: 'FUERA_SERVICIO',
};

router.post('/mesas/:id/:accion', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const accion = req.params.accion as string;
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid mesa ID' });
    }
    const nuevoEstado = ACCIONES_ESTADO[accion];
    if (!nuevoEstado) {
      return res.status(400).json({ success: false, error: `Acción no soportada: ${accion}` });
    }
    if (!(await puedeAccederAMesa(id, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    const mesa = await mesaRepo.findById(id);
    if (!mesa) {
      return res.status(404).json({ success: false, error: 'Mesa not found' });
    }
    if (mesa.estado === 'OCUPADA') {
      return res.status(409).json({ success: false, error: 'No se puede cambiar el estado de una mesa ocupada' });
    }
    const updated = await mesaRepo.update(id, { estado: nuevoEstado });
    if (!updated) {
      return res.status(500).json({ success: false, error: 'Error actualizando mesa' });
    }
    try {
      sse.sendSseEvent(mesa.id_cola, 'MESA_ESTADO', {
        mesa: { id_mesa: id, numero: mesa.numero, estado: nuevoEstado },
      });
    } catch (e) {
      logger.warn('Failed to send SSE MESA_ESTADO', e);
    }
    return res.json({ success: true, data: updated, message: `Mesa ${accion} correctamente` });
  } catch (error) {
    logger.error('Error en acción de mesa:', error);
    return res.status(500).json({ success: false, error: 'Error en acción de mesa' });
  }
});

// ==========================================
// GET /api/restaurant/mesas/:id/historial
// Trazabilidad de configuración de la mesa
// ==========================================
router.get('/mesas/:id/historial', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid mesa ID' });
    }
    if (!(await puedeAccederAMesa(id, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    const historial = await prisma.mesaConfigHistorial.findMany({
      where: { mesa_id: id },
      orderBy: { fecha_inicio: 'desc' },
      include: { zona: { select: { id_zona: true, nombre: true } } },
    });
    return res.json({ success: true, data: historial });
  } catch (error) {
    logger.error('Error fetching historial mesa:', error);
    return res.status(500).json({ success: false, error: 'Error fetching mesa historial' });
  }
});

// ==========================================
// DELETE /api/restaurant/mesas/:id
// ==========================================
router.delete('/mesas/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid mesa ID' });
    }
    if (!(await puedeAccederAMesa(id, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }

    const mesa = await mesaRepo.findById(id);
    if (!mesa) {
      return res.status(404).json({ success: false, error: 'Mesa not found' });
    }
    if (mesa.estado === 'OCUPADA') {
      return res.status(409).json({ success: false, error: 'No se puede eliminar una mesa ocupada' });
    }

    const deleted = await mesaRepo.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Mesa not found' });
    }

    try {
      sse.sendSseEvent(mesa.id_cola, 'MESA_ELIMINADA', { mesa: { id_mesa: id, numero: mesa.numero } });
    } catch (e) {
      logger.warn('Failed to send SSE MESA_ELIMINADA', e);
    }

    return res.json({ success: true, message: 'Mesa deleted' });
  } catch (error) {
    logger.error('Error deleting mesa:', error);
    return res.status(500).json({ success: false, error: 'Error deleting mesa' });
  }
});

// ==========================================
// POST /api/restaurant/asignar/:mesaId/:turnoId
// Asignación manual de mesa a turno
// ==========================================
router.post('/asignar/:mesaId/:turnoId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const mesaId = parseInt(req.params.mesaId as string);
    const turnoId = parseInt(req.params.turnoId as string);
    if (isNaN(mesaId) || isNaN(turnoId)) {
      return res.status(400).json({ success: false, error: 'Invalid mesa or turno ID' });
    }
    if (!(await puedeAccederAMesa(mesaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }

    const mesa = await mesaRepo.findById(mesaId);
    if (!mesa) {
      return res.status(404).json({ success: false, error: 'Mesa not found' });
    }
    if (mesa.estado !== 'LIBRE' && mesa.estado !== 'AGRUPADA') {
      return res.status(409).json({ success: false, error: 'Mesa is not available' });
    }

    const turno = await prisma.turno.findUnique({ where: { id_turno: turnoId } });
    if (!turno) {
      return res.status(404).json({ success: false, error: 'Turno not found' });
    }
    if (turno.estado !== 'EN_ESPERA') {
      return res.status(409).json({ success: false, error: 'Turno is not waiting' });
    }

    // Capacidad a validar: si la mesa es AGRUPADA, usar la capacidad total del grupo
    let capacidadDisponible = mesaRepo.getCapacidadEfectiva(mesa);
    let grupo = null;
    if (mesa.estado === 'AGRUPADA') {
      grupo = await mesaRepo.findGrupoByMesa(mesaId);
      if (grupo) capacidadDisponible = grupo.capacidad_total;
    }

    // Validar capacidad (salvo grupos de gran tamaño que requieren combinación manual)
    if (turno.num_comensales && turno.categoria !== 'GRAN_TAMANO' && turno.num_comensales > capacidadDisponible) {
      return res.status(409).json({ success: false, error: 'Group size exceeds table capacity' });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.turno.update({
        where: { id_turno: turnoId },
        data: { estado: 'EN_ATENCION', fecha_hora_llamada: new Date(), mesa_id: mesaId },
      });
      if (grupo) {
        // El grupo actúa como una única mesa: ocupar todas sus mesas
        await tx.mesa.updateMany({
          where: { id_mesa: { in: grupo.mesas.map((m) => m.id_mesa) } },
          data: { estado: 'OCUPADA' },
        });
      } else {
        await tx.mesa.update({
          where: { id_mesa: mesaId },
          data: { estado: 'OCUPADA' },
        });
      }
      return { mesaId, turnoId };
    });

    // SSE
    try {
      sse.sendSseEvent(turno.id_cola, 'MESA_ASIGNADA', {
        mesa: { id_mesa: mesaId, numero: mesa.numero, capacidad: capacidadDisponible },
        turno: { id_turno: turnoId, num_comensales: turno.num_comensales },
      });
    } catch (e) {
      logger.warn('Failed to send SSE MESA_ASIGNADA', e);
    }

    return res.json({ success: true, data: result, message: 'Mesa assigned to turno' });
  } catch (error) {
    logger.error('Error assigning mesa:', error);
    return res.status(500).json({ success: false, error: 'Error assigning mesa' });
  }
});

// ==========================================
// POST /api/restaurant/liberar/:mesaId
// Libera mesa + intenta auto-match
// ==========================================
router.post('/liberar/:mesaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const mesaId = parseInt(req.params.mesaId as string);
    if (isNaN(mesaId)) {
      return res.status(400).json({ success: false, error: 'Invalid mesa ID' });
    }
    if (!(await puedeAccederAMesa(mesaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }

    // true = restablecer la mesa a su estado normal (quitar sillas/juntas)
    const restablecer = req.body?.restablecer !== false;

    const mesa = await mesaRepo.findById(mesaId);
    if (!mesa) {
      return res.status(404).json({ success: false, error: 'Mesa not found' });
    }
    if (mesa.estado === 'LIBRE') {
      return res.status(409).json({ success: false, error: 'Mesa is already free' });
    }

    // ¿La mesa pertenece a un grupo?
    const grupo = await mesaRepo.findGrupoByMesa(mesaId);

    // Si tiene turno asociado, finalizar ese turno
    const turnoAsociado = await prisma.turno.findFirst({
      where: { mesa_id: mesaId, estado: 'EN_ATENCION' },
    });
    if (turnoAsociado) {
      await prisma.turno.update({
        where: { id_turno: turnoAsociado.id_turno },
        data: { estado: 'FINALIZADO', fecha_hora_fin_atencion: new Date() },
      });
    }

    // Si pertenecía a un grupo:
    //   - restablecer = true -> disolver el grupo, todas las mesas a LIBRE, quitar sillas
    //   - restablecer = false -> mantener el grupo y las sillas, mesas vuelven a AGRUPADA
    let grupoDisuelto = false;
    if (grupo) {
      if (restablecer) {
        await mesaRepo.deleteGrupo(grupo.id_grupo); // devuelve las mesas AGRUPADA a LIBRE
        // La mesa principal estaba OCUPADA sirviendo a un grupo: liberarla explícitamente
        if (mesa.estado === 'OCUPADA') {
          await mesaRepo.liberarMesa(mesaId);
        }
        grupoDisuelto = true;
      } else {
        // Mantener grupo: liberar todas sus mesas a AGRUPADA
        await prisma.mesa.updateMany({
          where: { id_mesa: { in: grupo.mesas.map((m) => m.id_mesa) } },
          data: { estado: 'AGRUPADA' },
        });
      }
    } else {
      // Mesa individual
      if (restablecer && mesa.capacidad_extra > 0) {
        await mesaRepo.update(mesaId, { capacidad_extra: 0 });
      }
      await mesaRepo.liberarMesa(mesaId);
    }

    // SSE
    try {
      sse.sendSseEvent(mesa.id_cola, 'MESA_LIBERADA', {
        mesa: {
          id_mesa: mesaId,
          numero: mesa.numero,
          capacidad: mesa.capacidad + (restablecer ? 0 : mesa.capacidad_extra),
        },
        grupoDisuelto,
      });
    } catch (e) {
      logger.warn('Failed to send SSE MESA_LIBERADA', e);
    }

    // Intentar auto-match con la capacidad efectiva liberada
    // 1) turnos legacy; 2) waitlist (colas de espera del restaurante)
    const capacidadLiberada = grupo
      ? (restablecer ? grupo.capacidad_total : grupo.capacidad_total)
      : mesa.capacidad + (restablecer ? 0 : mesa.capacidad_extra);
    let match = await allocationService.autoMatchAlLiberar(mesa.id_cola, capacidadLiberada);
    let matchWaitlist = null;
    if (!match) {
      matchWaitlist = await allocationService.autoMatchWaitlistAlLiberar(mesa.id_cola, capacidadLiberada);
    }

    return res.json({
      success: true,
      data: {
        mesa: { id_mesa: mesaId, estado: grupo && !restablecer ? 'AGRUPADA' : 'LIBRE' },
        grupoDisuelto,
        match: match
          ? { turnoId: match.turno.id_turno, mesa: match.mesa }
          : null,
        matchWaitlist: matchWaitlist
          ? { asignacionId: matchWaitlist.id_asignacion, mesa: matchWaitlist.mesa }
          : null,
      },
      message: 'Mesa freed' + (grupoDisuelto ? ' y grupo disuelto' : '') + (match || matchWaitlist ? ' y reasignada' : ''),
    });
  } catch (error) {
    logger.error('Error liberating mesa:', error);
    return res.status(500).json({ success: false, error: 'Error liberating mesa' });
  }
});

// ==========================================
// GET /api/restaurant/cola-activa/:colaId
// Estado completo de la cola restaurante: mesas + turnos en espera
// ==========================================
router.get('/cola-activa/:colaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    if (isNaN(colaId)) {
      return res.status(400).json({ success: false, error: 'Invalid cola ID' });
    }
    if (!(await puedeAccederACola(colaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }

    const [mesasRaw, grupos, turnosEspera, turnosAtencion, maxCap] = await Promise.all([
      mesaRepo.findByCola(colaId),
      mesaRepo.findGruposByCola(colaId),
      prisma.turno.findMany({
        where: { id_cola: colaId, estado: 'EN_ESPERA' },
        orderBy: { fecha_hora_creacion: 'asc' },
        include: { cliente: { select: { nombre: true } } },
      }),
      prisma.turno.findMany({
        where: { id_cola: colaId, estado: 'EN_ATENCION' },
        include: {
          cliente: { select: { nombre: true } },
          mesa: { select: { numero: true, capacidad: true } },
        },
      }),
      mesaRepo.getMaxCapacidad(colaId),
    ]);

    // Enriquecer mesas con capacidad efectiva y grupo al que pertenecen
    const mesasGrupoMap = new Map<number, { id_grupo: number; numero: number; capacidad_total: number }>();
    for (const g of grupos) {
      for (const m of g.mesas) {
        mesasGrupoMap.set(m.id_mesa, { id_grupo: g.id_grupo, numero: g.numero, capacidad_total: g.capacidad_total });
      }
    }
    const mesas = mesasRaw.map((m) => ({
      ...m,
      capacidad_efectiva: mesaRepo.getCapacidadEfectiva(m),
      grupo: mesasGrupoMap.get(m.id_mesa) ?? null,
    }));

    // Calcular ETA para cada turno en espera
    let tiempoPromedioPorTurno = 5;
    try {
      const agg = await prisma.atencion.aggregate({
        _avg: { duracion_atencion: true },
        where: { duracion_atencion: { not: null }, turno: { id_cola: colaId } },
      });
      const avgSeconds = agg._avg?.duracion_atencion ?? null;
      if (avgSeconds && avgSeconds > 0) {
        tiempoPromedioPorTurno = Math.max(1, Math.round((avgSeconds / 60) * 100) / 100);
      }
    } catch (e) {
      // fallback
    }

    const turnosEsperaConEta = turnosEspera.map((t, idx) => ({
      id_turno: t.id_turno,
      numero_turno: t.numero_turno,
      num_comensales: t.num_comensales,
      categoria: t.categoria,
      peticion_especial: t.peticion_especial,
      cliente_nombre: t.cliente?.nombre,
      fecha_hora_creacion: t.fecha_hora_creacion,
      posicion: idx + 1,
      eta_minutos: idx * tiempoPromedioPorTurno,
    }));

    const stats = {
      totalMesas: mesas.length,
      mesasLibres: mesas.filter((m) => m.estado === 'LIBRE').length,
      mesasOcupadas: mesas.filter((m) => m.estado === 'OCUPADA').length,
      turnosEnEspera: turnosEspera.length,
      turnosEnAtencion: turnosAtencion.length,
      maxCapacidadRestaurante: maxCap,
    };

    return res.json({
      success: true,
      data: {
        mesas,
        turnosEspera: turnosEsperaConEta,
        turnosAtencion,
        stats,
      },
    });
  } catch (error) {
    logger.error('Error fetching cola activa:', error);
    return res.status(500).json({ success: false, error: 'Error fetching cola activa' });
  }
});

// ==========================================
// POST /api/restaurant/turno
// Crear turno de restaurante (con num_comensales)
// ==========================================
router.post('/turno', async (req: Request, res: Response) => {
  try {
    const { id_cola, id_cliente, num_comensales, peticion_especial } = req.body;

    if (!id_cola || !id_cliente || !num_comensales) {
      return res.status(400).json({
        success: false,
        error: 'id_cola, id_cliente and num_comensales are required',
      });
    }

    if (typeof num_comensales !== 'number' || num_comensales < 1) {
      return res.status(400).json({
        success: false,
        error: 'num_comensales must be a positive number',
      });
    }

    // Verificar cola existe y es de tipo RESTAURANTE
    const cola = await prisma.cola.findUnique({ where: { id_cola } });
    if (!cola) {
      return res.status(404).json({ success: false, error: 'Queue not found' });
    }

    // Obtener max capacidad del restaurante
    const maxCap = await mesaRepo.getMaxCapacidad(id_cola);

    // Determinar si es gran grupo
    const esGranGrupo = maxCap > 0 && num_comensales > maxCap;
    const categoria = esGranGrupo ? 'GRAN_TAMANO' : null;

    // Obtener siguiente número de turno
    const lastTurno = await prisma.turno.findFirst({
      where: { id_cola },
      orderBy: { numero_turno: 'desc' },
      select: { numero_turno: true },
    });
    const numeroTurno = (lastTurno?.numero_turno ?? 0) + 1;

    // Crear turno
    const turno = await prisma.turno.create({
      data: {
        id_cola,
        id_cliente,
        numero_turno: numeroTurno,
        num_comensales,
        categoria,
        peticion_especial: peticion_especial?.trim() || null,
        estado: 'EN_ESPERA',
      },
    });

    // Notificar a los operadores si es gran grupo
    if (esGranGrupo) {
      try {
        sse.sendSseEvent(id_cola, 'GRAN_GRUPO', {
          turno: {
            id_turno: turno.id_turno,
            numero_turno: turno.numero_turno,
            num_comensales,
          },
          message: `Grupo de ${num_comensales} personas excede la capacidad máxima (${maxCap}). Se requiere intervención manual.`,
        });
      } catch (e) {
        logger.warn('Failed to send SSE GRAN_GRUPO', e);
      }
    }

    // Intentar match automático inmediato (si no es gran grupo)
    let match = null;
    if (!esGranGrupo) {
      match = await allocationService.intentarMatch(turno.id_turno);
    }

    // Calcular posición y ETA
    const turnosEnEspera = await prisma.turno.count({
      where: { id_cola, estado: 'EN_ESPERA' },
    });

    let tiempoPromedioPorTurno = 5;
    try {
      const agg = await prisma.atencion.aggregate({
        _avg: { duracion_atencion: true },
        where: { duracion_atencion: { not: null }, turno: { id_cola } },
      });
      const avgSeconds = agg._avg?.duracion_atencion ?? null;
      if (avgSeconds && avgSeconds > 0) {
        tiempoPromedioPorTurno = Math.max(1, Math.round((avgSeconds / 60) * 100) / 100);
      }
    } catch (e) {
      // fallback
    }

    // SSE para actualización de cola
    try {
      sse.sendSseEvent(id_cola, 'COLA_RESTAURANTE_ACTUALIZADA', {
        turnosEnEspera,
      });
    } catch (e) {
      logger.warn('Failed to send SSE COLA_RESTAURANTE_ACTUALIZADA', e);
    }

    return res.status(201).json({
      success: true,
      data: {
        turno,
        match: match
          ? { turno: match.turno, mesa: match.mesa }
          : null,
        meta: {
          esGranGrupo,
          categoria,
          posicion: turnosEnEspera,
          etaMinutos: match ? 0 : (turnosEnEspera - 1) * tiempoPromedioPorTurno,
          maxCapacidadRestaurante: maxCap,
        },
      },
      message: esGranGrupo
        ? 'Gran grupo registrado. Se notifica al operador.'
        : match
          ? 'Turno creado y mesa asignada automáticamente'
          : 'Turno creado, en espera de mesa',
    });
  } catch (error) {
    logger.error('Error creating restaurant turno:', error);
    return res.status(500).json({ success: false, error: 'Error creating turno' });
  }
});

// ==========================================
// POST /api/restaurant/crear-mesas-lote
// Crear múltiples mesas de una vez
// ==========================================
router.post('/crear-mesas-lote', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id_cola, mesas } = req.body;

    if (!id_cola || !Array.isArray(mesas) || mesas.length === 0) {
      return res.status(400).json({ success: false, error: 'id_cola and mesas array are required' });
    }
    if (!(await puedeAccederACola(id_cola, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }

    const created = [];
    for (const m of mesas) {
      if (m.numero && m.capacidad) {
        const mesa = await mesaRepo.create({
          numero: m.numero,
          capacidad: m.capacidad,
          id_cola,
        });
        created.push(mesa);
      }
    }

    return res.status(201).json({ success: true, data: created, message: `${created.length} mesas created` });
  } catch (error) {
    logger.error('Error creating batch mesas:', error);
    return res.status(500).json({ success: false, error: 'Error creating mesas' });
  }
});

// ==========================================
// POST /api/restaurant/juntar
// Juntar varias mesas libres en un grupo
// ==========================================
router.post('/juntar', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id_cola, mesa_ids } = req.body;
    if (!id_cola || !Array.isArray(mesa_ids) || mesa_ids.length < 2) {
      return res.status(400).json({ success: false, error: 'id_cola and at least 2 mesa_ids required' });
    }
    if (!(await puedeAccederACola(id_cola, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }

    // Verificar que las mesas existen, son libres y pertenecen a la cola
    const mesas = await mesaRepo.findByCola(id_cola);
    const idsValidos = mesas.filter((m) => mesa_ids.includes(m.id_mesa) && m.estado === 'LIBRE').map((m) => m.id_mesa);
    if (idsValidos.length !== new Set(mesa_ids).size) {
      const noEncontradas = mesa_ids.filter((id) => !idsValidos.includes(id));
      return res.status(409).json({ success: false, error: `Mesas no disponibles o no existen: ${noEncontradas.join(', ')}` });
    }

    const grupo = await mesaRepo.createGrupo(id_cola, mesa_ids);
    if (!grupo) {
      return res.status(500).json({ success: false, error: 'No se pudo crear el grupo' });
    }

    try {
      sse.sendSseEvent(id_cola, 'MESA_JUNTADA', { grupo });
    } catch (e) {
      logger.warn('Failed to send SSE MESA_JUNTADA', e);
    }

    return res.status(201).json({ success: true, data: grupo, message: `Mesas juntadas (${grupo.capacidad_total} plazas)` });
  } catch (error) {
    logger.error('Error juntando mesas:', error);
    return res.status(500).json({ success: false, error: 'Error juntando mesas' });
  }
});

// ==========================================
// POST /api/restaurant/separar/:mesaId
// Separar la mesa de su grupo (disolver el grupo)
// ==========================================
router.post('/separar/:mesaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const mesaId = parseInt(req.params.mesaId as string);
    if (isNaN(mesaId)) {
      return res.status(400).json({ success: false, error: 'Invalid mesa ID' });
    }
    if (!(await puedeAccederAMesa(mesaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    const mesa = await mesaRepo.findById(mesaId);
    if (!mesa) {
      return res.status(404).json({ success: false, error: 'Mesa not found' });
    }
    const grupo = await mesaRepo.findGrupoByMesa(mesaId);
    if (!grupo) {
      return res.status(409).json({ success: false, error: 'La mesa no pertenece a un grupo' });
    }
    await mesaRepo.deleteGrupo(grupo.id_grupo);

    try {
      sse.sendSseEvent(mesa.id_cola, 'MESA_SEPARADA', { mesaId, grupoId: grupo.id_grupo });
    } catch (e) {
      logger.warn('Failed to send SSE MESA_SEPARADA', e);
    }

    return res.json({ success: true, data: { grupoId: grupo.id_grupo }, message: 'Grupo disuelto' });
  } catch (error) {
    logger.error('Error separando mesas:', error);
    return res.status(500).json({ success: false, error: 'Error separando mesas' });
  }
});

// ==========================================
// POST /api/restaurant/silla/:mesaId/:cantidad
// Añadir (+) o quitar (-) sillas extra a una mesa
// ==========================================
router.post('/silla/:mesaId/:cantidad', authMiddleware, async (req: Request, res: Response) => {
  try {
    const mesaId = parseInt(req.params.mesaId as string);
    const cantidad = parseInt(req.params.cantidad as string);
    if (isNaN(mesaId) || isNaN(cantidad) || cantidad === 0) {
      return res.status(400).json({ success: false, error: 'Invalid mesa ID or cantidad' });
    }
    if (!(await puedeAccederAMesa(mesaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }
    const mesa = await mesaRepo.findById(mesaId);
    if (!mesa) {
      return res.status(404).json({ success: false, error: 'Mesa not found' });
    }

    const updated = cantidad > 0
      ? await mesaRepo.addSilla(mesaId, cantidad)
      : await mesaRepo.removeSilla(mesaId, -cantidad);
    if (!updated) {
      return res.status(500).json({ success: false, error: 'Error actualizando sillas' });
    }

    try {
      sse.sendSseEvent(mesa.id_cola, 'MESA_SILLAS', {
        mesa: { id_mesa: mesaId, numero: mesa.numero, capacidad_extra: updated.capacidad_extra },
      });
    } catch (e) {
      logger.warn('Failed to send SSE MESA_SILLAS', e);
    }

    return res.json({
      success: true,
      data: updated,
      message: cantidad > 0 ? `Silla(s) añadida(s): ${cantidad}` : `Silla(s) retirada(s): ${-cantidad}`,
    });
  } catch (error) {
    logger.error('Error actualizando sillas:', error);
    return res.status(500).json({ success: false, error: 'Error actualizando sillas' });
  }
});

// ==========================================
// GET /api/restaurant/stats/:colaId
// Estadísticas del restaurante
// ==========================================
router.get('/stats/:colaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const colaId = parseInt(req.params.colaId as string);
    if (isNaN(colaId)) {
      return res.status(400).json({ success: false, error: 'Invalid cola ID' });
    }
    if (!(await puedeAccederACola(colaId, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: cola belongs to another tenant' });
    }

    const [mesas, turnosHoy, maxCap] = await Promise.all([
      mesaRepo.findByCola(colaId),
      prisma.turno.findMany({
        where: {
          id_cola: colaId,
          fecha_hora_creacion: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        include: {
          atencion: { select: { duracion_atencion: true } },
        },
      }),
      mesaRepo.getMaxCapacidad(colaId),
    ]);

    const totalMesas = mesas.length;
    const libres = mesas.filter((m) => m.estado === 'LIBRE').length;
    const ocupadas = mesas.filter((m) => m.estado === 'OCUPADA').length;
    const tasaOcupacion = totalMesas > 0 ? Math.round((ocupadas / totalMesas) * 100) : 0;

    const turnosFinalizados = turnosHoy.filter((t) => t.estado === 'FINALIZADO');
    const tiemposAtencion = turnosFinalizados
      .map((t) => t.atencion?.duracion_atencion)
      .filter((d): d is number => d != null && d > 0);
    const tiempoPromedioAtencion = tiemposAtencion.length > 0
      ? Math.round(tiemposAtencion.reduce((a, b) => a + b, 0) / tiemposAtencion.length / 60)
      : 0;

    return res.json({
      success: true,
      data: {
        totalMesas,
        mesasLibres: libres,
        mesasOcupadas: ocupadas,
        tasaOcupacion,
        turnosHoy: turnosHoy.length,
        turnosFinalizadosHoy: turnosFinalizados.length,
        tiempoPromedioAtencionMinutos: tiempoPromedioAtencion,
        maxCapacidadRestaurante: maxCap,
      },
    });
  } catch (error) {
    logger.error('Error fetching restaurant stats:', error);
    return res.status(500).json({ success: false, error: 'Error fetching stats' });
  }
});

// ==========================================
// PATCH /api/restaurant/turno/:turnoId
// Gestionar un puesto de la cola de forma individual:
// editar num_comensales, petición especial y estado de un turno EN_ESPERA.
// ==========================================
router.patch('/turno/:turnoId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const turnoId = parseInt(req.params.turnoId as string);
    const { num_comensales, peticion_especial, estado } = req.body;

    if (isNaN(turnoId)) {
      return res.status(400).json({ success: false, error: 'Invalid turno ID' });
    }

    const turno = await prisma.turno.findUnique({ where: { id_turno: turnoId } });
    if (!turno) {
      return res.status(404).json({ success: false, error: 'Turno not found' });
    }
    if (!(await puedeAccederACola(turno.id_cola, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: turno belongs to another tenant' });
    }

    // Recalcular categoría si cambia el número de comensales
    let categoria = turno.categoria;
    if (typeof num_comensales === 'number' && num_comensales > 0) {
      const maxCap = await mesaRepo.getMaxCapacidad(turno.id_cola);
      const esGranGrupo = maxCap > 0 && num_comensales > maxCap;
      categoria = esGranGrupo ? 'GRAN_TAMANO' : null;
    }

    const updated = await prisma.turno.update({
      where: { id_turno: turnoId },
      data: {
        ...(typeof num_comensales === 'number' && num_comensales > 0 ? { num_comensales, categoria } : {}),
        ...(typeof peticion_especial === 'string' ? { peticion_especial: peticion_especial.trim() || null } : {}),
        ...(estado === 'EN_ESPERA' || estado === 'FINALIZADO' || estado === 'CANCELADO'
          ? { estado }
          : {}),
      },
    });

    return res.json({ success: true, data: updated, message: 'Turno actualizado' });
  } catch (error) {
    logger.error('Error updating turno:', error);
    return res.status(500).json({ success: false, error: 'Error updating turno' });
  }
});

// ==========================================
// DELETE /api/restaurant/turno/:turnoId
// Eliminar (quitar de la cola) un puesto individual de forma manual.
// ==========================================
router.delete('/turno/:turnoId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const turnoId = parseInt(req.params.turnoId as string);

    if (isNaN(turnoId)) {
      return res.status(400).json({ success: false, error: 'Invalid turno ID' });
    }

    const turno = await prisma.turno.findUnique({ where: { id_turno: turnoId } });
    if (!turno) {
      return res.status(404).json({ success: false, error: 'Turno not found' });
    }
    if (!(await puedeAccederACola(turno.id_cola, req.user?.id_empresa))) {
      return res.status(403).json({ success: false, error: 'Access denied: turno belongs to another tenant' });
    }

    // Solo se permite quitar de la cola turnos que aún estén en espera
    if (turno.estado !== 'EN_ESPERA') {
      return res.status(409).json({
        success: false,
        error: 'Solo se pueden quitar de la cola turnos en espera',
      });
    }

    await prisma.turno.delete({ where: { id_turno: turnoId } });

    // Notificar actualización de cola
    try {
      sse.sendSseEvent(turno.id_cola, 'COLA_RESTAURANTE_ACTUALIZADA', {});
    } catch (e) {
      logger.warn('Failed to send SSE COLA_RESTAURANTE_ACTUALIZADA', e);
    }

    return res.json({ success: true, message: 'Turno eliminado de la cola' });
  } catch (error) {
    logger.error('Error deleting turno:', error);
    return res.status(500).json({ success: false, error: 'Error deleting turno' });
  }
});

export default router;
