import { PrismaClient, Prisma } from '@prisma/client';
import { MesaRepository } from '../repositories/mesa.repository';
import { logger } from '../config/logger';
import sse from '../sse';

export interface AllocacionResult {
  tipo: 'mesa' | 'grupo';
  mesa: any;
  grupo: any;
}

export interface MatchResult {
  turno: any;
  mesa: any;
}

export interface OpcionMesa {
  mesaIds: number[];
  mesaPrincipal: number; // id de la mesa representante (la de menor número)
  mesas: Array<{
    id_mesa: number;
    numero: number;
    capacidad: number;
    capacidad_extra: number;
    capacidad_efectiva: number;
    estado: string;
    id_zona: number | null;
    zona: string | null;
  }>;
  capacidad: number; // capacidad efectiva total
  esGrupo: boolean;
  zonaId: number | null;
  zonaNombre: string | null;
  score: number;
  motivo: string;
  explicacion: Array<'CAPACIDAD_EXACTA' | 'CAPACIDAD_CERCANA' | 'EXCESO_CAPACIDAD' | 'ZONA_PREFERIDA' | 'MESA_UNICA' | 'GRUPO_SUGERIDO'>;
}

export interface BuscarOpcionesInput {
  colaId: number;
  comensales: number;
  start: Date; // inicio del hueco (fecha+hora)
  end: Date; // fin del hueco
  zonaId?: number | null; // filtro por zona
  preferenciaZona?: number | null; // zona preferida para scoring
  preferenciaMesa?: number | null;
  maxOpciones?: number;
}

export interface AsignacionResult {
  id_asignacion: number;
  id_cola: number;
  tipo_origen: 'RESERVA' | 'WAITLIST';
  id_reserva: number | null;
  id_waitlist: number | null;
  mesa: { id_mesa: number; numero: number; capacidad: number } | null;
  grupo_id: number | null;
  mesa_ids: number[];
  num_comensales: number;
  hora_inicio: Date;
  hora_fin_prevista: Date | null;
  estado: 'PENDIENTE' | 'ACTIVA';
  opcion?: OpcionMesa | null;
}

function toHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function estaEnHuecoActual(start: Date, end: Date | null, _mesaId: number, duracionFallbackMin: number): boolean {
  const ahora = new Date();
  const fin = end ?? new Date(start.getTime() + duracionFallbackMin * 60000);
  return start.getTime() <= ahora.getTime() && ahora.getTime() <= fin.getTime();
}

/**
 * Servicio central de asignación de mesas en el restaurante.
 * Versión 1: asignación live por turnos (legacy).
 * Versión 2: disponibilidad por ventana temporal, scoring de opciones,
 * bloqueo FOR UPDATE en transacción y asignación desde Reserva/Waitlist.
 */
export class TableAllocationService {
  private prisma: PrismaClient;
  private mesaRepo: MesaRepository;

  constructor(prismaClient?: PrismaClient, mesaRepository?: MesaRepository) {
    this.prisma = prismaClient ?? new PrismaClient();
    this.mesaRepo = mesaRepository ?? new MesaRepository(this.prisma);
  }

  private async getDuracionComida(colaId: number): Promise<number> {
    const cola = await this.prisma.cola.findUnique({
      where: { id_cola: colaId },
      select: { duracion_estimada_comida_min: true },
    });
    return cola?.duracion_estimada_comida_min ?? 90;
  }

  // ==========================================
  // V1: turnos legacy (buscarMejorMesa / intentarMatch / autoMatchAlLiberar)
  // ==========================================

  async buscarMejorMesa(colaId: number, numComensales: number): Promise<AllocacionResult | null> {
    const mesasLibres = await this.mesaRepo.findLibresByCapacidad(colaId, numComensales);
    if (mesasLibres.length > 0) {
      return { tipo: 'mesa' as const, mesa: mesasLibres[0], grupo: null as any };
    }
    const grupos = await this.mesaRepo.findGruposDisponiblesByCola(colaId);
    const apto = grupos
      .filter((g) => g.capacidad_total >= numComensales)
      .sort((a, b) => a.capacidad_total - b.capacidad_total)[0];
    if (apto) {
      return { tipo: 'grupo' as const, mesa: null as any, grupo: apto };
    }
    return null;
  }

  async intentarMatch(turnoId: number): Promise<MatchResult | null> {
    const turno = await this.prisma.turno.findUnique({
      where: { id_turno: turnoId },
      select: { id_turno: true, id_cola: true, num_comensales: true, categoria: true, estado: true },
    });
    if (!turno || turno.estado !== 'EN_ESPERA' || !turno.num_comensales) return null;

    const opcion = await this.buscarMejorMesa(turno.id_cola, turno.num_comensales);
    if (!opcion) return null;

    if (opcion.tipo === 'mesa') {
      const mesa = opcion.mesa;
      const result = await this.prisma.$transaction(async (tx) => {
        await tx.turno.update({
          where: { id_turno: turnoId },
          data: { estado: 'EN_ATENCION', fecha_hora_llamada: new Date(), mesa_id: mesa.id_mesa },
        });
        await tx.mesa.update({
          where: { id_mesa: mesa.id_mesa },
          data: { estado: 'OCUPADA' },
        });
        return { turno, mesa };
      });

      try {
        sse.sendSseEvent(result.turno.id_cola, 'MESA_ASIGNADA', {
          mesa: result.mesa,
          turno: result.turno,
        });
      } catch (e) {
        logger.warn('Failed to send SSE MESA_ASIGNADA', e);
      }
      return result;
    }

    const grupo = opcion.grupo;
    const mesaPrincipal = [...grupo.mesas].sort((a, b) => a.numero - b.numero)[0];
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.turno.update({
        where: { id_turno: turnoId },
        data: { estado: 'EN_ATENCION', fecha_hora_llamada: new Date(), mesa_id: mesaPrincipal.id_mesa },
      });
      await tx.mesa.update({
        where: { id_mesa: mesaPrincipal.id_mesa },
        data: { estado: 'OCUPADA' },
      });
      return { turno, mesa: mesaPrincipal };
    });

    try {
      sse.sendSseEvent(result.turno.id_cola, 'MESA_ASIGNADA', {
        mesa: { id_mesa: mesaPrincipal.id_mesa, numero: mesaPrincipal.numero, capacidad: grupo.capacidad_total },
        turno: result.turno,
      });
    } catch (e) {
      logger.warn('Failed to send SSE MESA_ASIGNADA', e);
    }
    return result;
  }

  async autoMatchAlLiberar(colaId: number, capacidadLibre: number): Promise<MatchResult | null> {
    const turnosEspera = await this.prisma.turno.findMany({
      where: {
        id_cola: colaId,
        estado: 'EN_ESPERA',
        num_comensales: { not: null },
        categoria: { not: 'GRAN_TAMANO' },
      },
      orderBy: { fecha_hora_creacion: 'asc' },
    });

    for (const turno of turnosEspera) {
      if (turno.num_comensales! <= capacidadLibre) {
        const match = await this.intentarMatch(turno.id_turno);
        if (match) return match;
      }
    }
    return null;
  }

  // ==========================================
  // V2: disponibilidad por ventana temporal
  // ==========================================

  /**
   * Busca todas las opciones de mesa (individuales + combinaciones) disponibles
   * para una ventana temporal. No produce efectos secundarios.
   */
  async buscarOpciones(opts: BuscarOpcionesInput): Promise<OpcionMesa[]> {
    const {
      colaId, comensales, start, end, zonaId, preferenciaZona, preferenciaMesa, maxOpciones,
    } = opts;

    const mesas = await this.prisma.mesa.findMany({
      where: {
        id_cola: colaId,
        activa: true,
        ...(zonaId ? { id_zona: zonaId } : {}),
      },
      include: { zona: { select: { nombre: true } } },
    });

    // Mesas físicamente no disponibles en ninguna ventana
    const nuncaDisponibles = new Set(
      mesas.filter((m) => m.estado === 'BLOQUEADA' || m.estado === 'FUERA_SERVICIO').map((m) => m.id_mesa)
    );

    // Mesas ocupadas de forma viva si la ventana incluye "ahora"
    const ahora = new Date();
    const ventanaIncluyeAhora = start.getTime() <= ahora.getTime() && ahora.getTime() <= end.getTime();

    // Asignaciones PENDIENTE/ACTIVA en la misma cola que se solapan con la ventana
    const asignaciones = await this.prisma.tableAssignment.findMany({
      where: {
        id_cola: colaId,
        estado: { in: ['PENDIENTE', 'ACTIVA'] },
      },
      include: {
        grupo: { include: { mesas: true } },
      },
    });

    const ocupadasPorAsignacion = new Set<number>();
    for (const a of asignaciones) {
      const fin = a.hora_fin_prevista ?? new Date(a.hora_inicio.getTime() + 90 * 60000);
      if (a.hora_inicio < end && fin > start) {
        ocupadasPorAsignacion.add(a.mesa_id);
        if (a.grupo) {
          for (const gm of a.grupo.mesas) ocupadasPorAsignacion.add(gm.id_mesa);
        }
      }
    }

    // Construcción de opciones
    const opciones: OpcionMesa[] = [];

    const hacerOpcion = (ids: number[], esGrupo: boolean): OpcionMesa | null => {
      const det = mesas.filter((m) => ids.includes(m.id_mesa));
      if (det.length !== ids.length) return null;
      const capacidad = det.reduce((acc, m) => acc + m.capacidad + (m.capacidad_extra ?? 0), 0);
      if (capacidad < comensales) return null;
      const rep = [...det].sort((a, b) => a.numero - b.numero)[0];
      // Mesas vivas no disponibles cuando la ventana es "ahora"
      if (ventanaIncluyeAhora) {
        const estadoRep = det.find((m) => m.id_mesa === rep.id_mesa)!.estado;
        if (estadoRep === 'OCUPADA' || estadoRep === 'RESERVADA' || estadoRep === 'LIMPIEZA') return null;
      }
      const zona = rep.zona;
      return {
        mesaIds: ids,
        mesaPrincipal: rep.id_mesa,
        mesas: det.map((m) => ({
          id_mesa: m.id_mesa,
          numero: m.numero,
          capacidad: m.capacidad,
          capacidad_extra: m.capacidad_extra ?? 0,
          capacidad_efectiva: m.capacidad + (m.capacidad_extra ?? 0),
          estado: m.estado,
          id_zona: m.id_zona,
          zona: m.zona?.nombre ?? null,
        })),
        capacidad,
        esGrupo,
        zonaId: rep.id_zona,
        zonaNombre: zona?.nombre ?? null,
        score: 0,
        motivo: '',
        explicacion: [],
      };
    };

    const libres = mesas.filter((m) => !nuncaDisponibles.has(m.id_mesa) && !ocupadasPorAsignacion.has(m.id_mesa));

    // 1) Mesas individuales
    for (const m of libres) {
      if (m.estado === 'AGRUPADA') continue; // individual no disponible, solo vía grupo
      const op = hacerOpcion([m.id_mesa], false);
      if (op) opciones.push(op);
    }

    // 2) Grupos existentes activos cuyas mesas estén libres
    const grupos = await this.prisma.mesaGrupo.findMany({
      where: { id_cola: colaId, activa: true },
      include: { mesas: { include: { mesa: true } } },
    });
    for (const g of grupos) {
      const ids = g.mesas.map((gm) => gm.mesa.id_mesa);
      const todosLibres = ids.every(
        (id) => !ocupadasPorAsignacion.has(id) && !nuncaDisponibles.has(id)
      );
      if (!todosLibres) continue;
      const op = hacerOpcion(ids, true);
      if (op) opciones.push(op);
    }

    // 3) Combinaciones a la carta (solo si no hay opción individual/grupo suficiente)
    if (opciones.length === 0) {
      const libresOrden = [...libres]
        .filter((m) => m.estado !== 'AGRUPADA')
        .sort((a, b) => (a.capacidad + (a.capacidad_extra ?? 0)) - (b.capacidad + (b.capacidad_extra ?? 0)));

      const combos: number[][] = [];
      const N = libresOrden.length;
      const yaVisto = new Set<string>();

      const intenta2 = () => {
        for (let i = 0; i < N && combos.length < 60; i++) {
          for (let j = i + 1; j < N; j++) {
            const ids = [libresOrden[i].id_mesa, libresOrden[j].id_mesa];
            const key = ids.sort((a, b) => a - b).join(',');
            if (yaVisto.has(key)) continue;
            yaVisto.add(key);
            const cap = libresOrden[i].capacidad + libresOrden[i].capacidad_extra
              + libresOrden[j].capacidad + libresOrden[j].capacidad_extra;
            if (cap >= comensales) combos.push(ids);
          }
        }
      };

      const intenta3 = () => {
        for (let i = 0; i < N && combos.length < 40; i++) {
          for (let j = i + 1; j < N; j++) {
            for (let k = j + 1; k < N; k++) {
              const ids = [libresOrden[i].id_mesa, libresOrden[j].id_mesa, libresOrden[k].id_mesa];
              const key = ids.sort((a, b) => a - b).join(',');
              if (yaVisto.has(key)) continue;
              yaVisto.add(key);
              const cap = libresOrden[i].capacidad + libresOrden[i].capacidad_extra
                + libresOrden[j].capacidad + libresOrden[j].capacidad_extra
                + libresOrden[k].capacidad + libresOrden[k].capacidad_extra;
              if (cap >= comensales) combos.push(ids);
            }
          }
        }
      };

      intenta2();
      if (combos.length === 0 && comensales > 6) intenta3();

      for (const ids of combos) {
        const op = hacerOpcion(ids, true);
        if (op) opciones.push(op);
      }
    }

    // 4) Puntuación
    if (opciones.length === 0) return [];

    for (const op of opciones) {
      const waste = op.capacidad - comensales;
      const fitScore = clamp(1 - waste / Math.max(comensales, 1), 0, 1);
      const zonaScore = (preferenciaZona && op.zonaId === preferenciaZona) ? 1 : 0.4;
      const comboPeso = op.esGrupo ? (op.mesas.length >= 3 ? 0.55 : 0.75) : 1;
      op.score = Math.round((0.4 * fitScore + 0.3 * zonaScore + 0.2 * comboPeso + 0.1 * 0.8) * 1000) / 1000;

      op.explicacion = [];
      if (waste === 0) op.explicacion.push('CAPACIDAD_EXACTA');
      else if (waste <= 2) op.explicacion.push('CAPACIDAD_CERCANA');
      else op.explicacion.push('EXCESO_CAPACIDAD');
      if (preferenciaZona && op.zonaId === preferenciaZona) op.explicacion.push('ZONA_PREFERIDA');
      if (op.esGrupo) op.explicacion.push('GRUPO_SUGERIDO');
      else op.explicacion.push('MESA_UNICA');

      const partes = [
        op.esGrupo ? `grupo de ${op.mesas.length} mesas (${op.capacidad} plazas)` : `mesa ${op.mesas[0].numero} (${op.capacidad} plazas)`,
        waste === 0 ? 'ajuste perfecto' : waste <= 2 ? 'ajuste cercano' : `sobra ${waste} plaza(s)`,
        preferenciaZona && op.zonaId === preferenciaZona ? 'en la zona preferida' : 'zona no preferida',
      ].filter(Boolean);
      op.motivo = partes.join(', ');
    }

    opciones.sort((a, b) => b.score - a.score || a.capacidad - b.capacidad);
    return maxOpciones ? opciones.slice(0, maxOpciones) : opciones;
  }

  /**
   * Consulta de disponibilidad de alto nivel para el endpoint GET /disponibilidad.
   */
  async consultarDisponibilidad(
    colaId: number,
    input: { fecha: Date; horaInicio: Date; comensales: number; zonaId?: number | null; preferenciaZona?: number | null; duracionMin?: number }
  ) {
    const duracion = input.duracionMin ?? (await this.getDuracionComida(colaId));
    const start = this.combinarFechaHora(input.fecha, input.horaInicio);
    const end = new Date(start.getTime() + duracion * 60000);

    const opciones = await this.buscarOpciones({
      colaId,
      comensales: input.comensales,
      start,
      end,
      zonaId: input.zonaId ?? null,
      preferenciaZona: input.preferenciaZona ?? null,
      maxOpciones: 10,
    });

    const totalMesas = await this.prisma.mesa.count({ where: { id_cola: colaId, activa: true } });
    return {
      colaId,
      fecha: input.fecha,
      hora_inicio: toHHMM(start),
      hora_fin_prevista: toHHMM(end),
      duracion_min: duracion,
      comensales: input.comensales,
      hayDisponibilidad: opciones.length > 0,
      opciones,
      mejor_opcion: opciones[0] ?? null,
      meta: {
        total_mesas: totalMesas,
        opciones_encontradas: opciones.length,
      },
    };
  }

  private combinarFechaHora(fecha: Date, hora: Date): Date {
    const d = new Date(fecha);
    d.setHours(hora.getHours(), hora.getMinutes(), 0, 0);
    return d;
  }

  // ==========================================
  // V2: asignación con bloqueo FOR UPDATE
  // ==========================================

  private async asignarMesaVentana(params: {
    colaId: number;
    mesaIds: number[];
    tipoOrigen: 'RESERVA' | 'WAITLIST';
    idReserva?: number | null;
    idWaitlist?: number | null;
    comensales: number;
    start: Date;
    end: Date;
    duracionMin: number;
  }): Promise<AsignacionResult | null> {
    const { colaId, mesaIds, tipoOrigen, idReserva, idWaitlist, comensales, start, end, duracionMin } = params;
    const ahora = new Date();
    const esAhora = start.getTime() <= ahora.getTime() && ahora.getTime() <= end.getTime();

    return this.prisma.$transaction(async (tx) => {
      // Lock las filas de mesa elegidas
      const locks = await tx.$queryRaw<Array<{ id_mesa: number }>>`
        SELECT id_mesa FROM mesa WHERE id_mesa IN (${Prisma.join(mesaIds)}) FOR UPDATE`;

      if (!locks || locks.length !== mesaIds.length) {
        throw new Error('MESA_NO_EXISTE');
      }

      // Re-verificar conflicto de ventana dentro de la transacción
      const solapadas = await tx.tableAssignment.findMany({
        where: {
          id_cola: colaId,
          estado: { in: ['PENDIENTE', 'ACTIVA'] },
          OR: [
            { mesa_id: { in: mesaIds } },
            { grupo: { mesas: { some: { id_mesa: { in: mesaIds } } } } },
          ],
        },
      });
      const conflictos = solapadas.filter((a) => {
        const fin = a.hora_fin_prevista ?? new Date(a.hora_inicio.getTime() + 90 * 60000);
        if (a.id_reserva === idReserva && a.id_waitlist === idWaitlist) return false; // misma fuente
        return a.hora_inicio < end && fin > start;
      });
      if (conflictos.length > 0) {
        throw new Error('Ventana_NO_DISPONIBLE');
      }

      // Estado físico de la mesa representante (releer con lock)
      const rep = locks.find((l) => l.id_mesa === mesaIds[0])!;
      const mesaActual = await tx.mesa.findUnique({ where: { id_mesa: rep.id_mesa } });
      if (esAhora && mesaActual && (mesaActual.estado === 'OCUPADA' || mesaActual.estado === 'BLOQUEADA')) {
        throw new Error('MESA_OCUPADA');
      }

      const asignacionData: Prisma.TableAssignmentUncheckedCreateInput = {
        id_cola: colaId,
        tipo_origen: tipoOrigen,
        id_reserva: idReserva ?? null,
        id_waitlist: idWaitlist ?? null,
        mesa_id: mesaIds[0],
        num_comensales: comensales,
        hora_inicio: start,
        hora_fin_prevista: end,
        estado: esAhora ? 'ACTIVA' : 'PENDIENTE',
      };

      const created = await tx.tableAssignment.create({ data: asignacionData });

      if (esAhora) {
        await tx.mesa.updateMany({
          where: { id_mesa: { in: mesaIds } },
          data: { estado: 'OCUPADA' },
        });
      }

      // Si la asignación viene de una reserva PENDIENTE, confirmarla
      if (tipoOrigen === 'RESERVA' && idReserva) {
        const r = await tx.reserva.findUnique({ where: { id_reserva: idReserva } });
        if (r && r.estado === 'PENDIENTE') {
          await tx.reserva.update({ where: { id_reserva: idReserva }, data: { estado: 'CONFIRMADA' } });
        }
      }

      return {
        id_asignacion: created.id_asignacion,
        id_cola: colaId,
        tipo_origen: tipoOrigen,
        id_reserva: idReserva ?? null,
        id_waitlist: idWaitlist ?? null,
        mesa: esAhora ? { id_mesa: created.mesa_id, numero: 0, capacidad: 0 } : null,
        grupo_id: null,
        mesa_ids: mesaIds,
        num_comensales: comensales,
        hora_inicio: created.hora_inicio,
        hora_fin_prevista: created.hora_fin_prevista,
        estado: created.estado as 'PENDIENTE' | 'ACTIVA',
      };
    });
  }

  /**
   * Asigna la mejor opción a una reserva. Soporta forzar mesa vía preferencia_mesa.
   */
  async asignarDesdeReserva(reservaId: number): Promise<AsignacionResult | null> {
    const reserva = await this.prisma.reserva.findUnique({ where: { id_reserva: reservaId } });
    if (!reserva) return null;
    if (reserva.estado === 'CANCELADA' || reserva.estado === 'NO_SHOW' || reserva.estado === 'COMPLETADA') return null;

    // Idempotente: si ya tiene asignación activa, no duplicar
    const existente = await this.asignacionActivaDeOrigen('RESERVA', reservaId, null);
    if (existente) {
      return this.toResultadoAsignacion(existente);
    }

    const duracion = await this.getDuracionComida(reserva.id_cola);
    const start = this.combinarFechaHora(reserva.fecha, reserva.hora_inicio);
    const end = new Date(start.getTime() + duracion * 60000);

    const opciones = await this.buscarOpciones({
      colaId: reserva.id_cola,
      comensales: reserva.num_comensales,
      start,
      end,
      zonaId: null,
      preferenciaZona: reserva.preferencia_zona ?? null,
      preferenciaMesa: reserva.preferencia_mesa ?? null,
      maxOpciones: 5,
    });

    // Forzar mesa preferida si es válida
    let mesaIds: number[] | null = null;
    if (reserva.preferencia_mesa) {
      const pref = opciones.find((o) => o.mesaIds.includes(reserva.preferencia_mesa!));
      if (pref) mesaIds = pref.mesaIds;
    }
    if (!mesaIds && opciones.length === 0) return null;
    if (!mesaIds) mesaIds = opciones[0].mesaIds;
    const opcion = opciones[0];

    try {
      const result = await this.asignarMesaVentana({
        colaId: reserva.id_cola,
        mesaIds,
        tipoOrigen: 'RESERVA',
        idReserva: reservaId,
        idWaitlist: null,
        comensales: reserva.num_comensales,
        start,
        end,
        duracionMin: duracion,
      });
      if (!result) return null;
      result.opcion = opcion;

      try {
        sse.sendSseEvent(reserva.id_cola, 'RESERVA_ASIGNADA', {
          reserva: { id_reserva: reservaId },
          asignacion: { id_asignacion: result.id_asignacion, mesa_ids: mesaIds },
        });
      } catch (e) {
        logger.warn('Failed to send SSE RESERVA_ASIGNADA', e);
      }
      return result;
    } catch (e) {
      logger.warn(`Assign reserva ${reservaId} failed:`, e);
      return null;
    }
  }

  /**
   * Asigna mesa a una entrada de waitlist (live, ahora).
   */
  async asignarDesdeWaitlist(waitlistId: number): Promise<AsignacionResult | null> {
    const entry = await this.prisma.waitlistEntry.findUnique({ where: { id_waitlist: waitlistId } });
    if (!entry) return null;
    if (entry.estado !== 'ESPERANDO' && entry.estado !== 'NOTIFICADO') return null;

    // Idempotente: si ya tiene asignación activa, no duplicar
    const existente = await this.asignacionActivaDeOrigen('WAITLIST', null, waitlistId);
    if (existente) return this.toResultadoAsignacion(existente);

    const duracion = await this.getDuracionComida(entry.id_cola);
    const ahora = new Date();
    const start = ahora;
    const end = new Date(start.getTime() + duracion * 60000);

    const opciones = await this.buscarOpciones({
      colaId: entry.id_cola,
      comensales: entry.num_comensales,
      start,
      end,
      zonaId: null,
      preferenciaZona: entry.preferencia_zona ?? null,
      preferenciaMesa: entry.preferencia_mesa ?? null,
      maxOpciones: 5,
    });

    let mesaIds: number[] | null = null;
    if (entry.preferencia_mesa) {
      const pref = opciones.find((o) => o.mesaIds.includes(entry.preferencia_mesa!));
      if (pref) mesaIds = pref.mesaIds;
    }
    if (!mesaIds && opciones.length === 0) return null;
    if (!mesaIds) mesaIds = opciones[0].mesaIds;
    const opcion = opciones[0];

    try {
      const result = await this.asignarMesaVentana({
        colaId: entry.id_cola,
        mesaIds,
        tipoOrigen: 'WAITLIST',
        idReserva: null,
        idWaitlist: waitlistId,
        comensales: entry.num_comensales,
        start,
        end,
        duracionMin: duracion,
      });
      if (!result) return null;

      await this.prisma.waitlistEntry.update({
        where: { id_waitlist: waitlistId },
        data: { estado: 'ASIGNADO', tiempo_estimado_min: 0 },
      });

      const mesas = await this.prisma.mesa.findMany({
        where: { id_mesa: { in: mesaIds } },
        select: { id_mesa: true, numero: true, capacidad: true },
      });
      const rep = [...mesas].sort((a, b) => a.numero - b.numero)[0];
      result.mesa = { id_mesa: rep.id_mesa, numero: rep.numero, capacidad: rep.capacidad };
      result.opcion = opcion;

      try {
        sse.sendSseEvent(entry.id_cola, 'MESA_ASIGNADA', {
          mesa: result.mesa,
          waitlist: { id_waitlist: waitlistId, cliente_nombre: entry.cliente_nombre },
          asignacion: { id_asignacion: result.id_asignacion },
        });
      } catch (e) {
        logger.warn('Failed to send SSE MESA_ASIGNADA (waitlist)', e);
      }
      return result;
    } catch (e) {
      logger.warn(`Assign waitlist ${waitlistId} failed:`, e);
      return null;
    }
  }

  /**
   * Asignación manual: fuerza una mesa concreta (individual o dentro de un grupo)
   * para una reserva o una entrada de waitlist. Idempotente: si el origen ya tiene
   * una asignación activa en la misma mesa, devuelve la existente.
   */
  async asignarMesaManual(params: {
    colaId: number;
    comensales: number;
    tipoOrigen: 'RESERVA' | 'WAITLIST';
    idReserva?: number | null;
    idWaitlist?: number | null;
    mesaId: number;
    start?: Date;
    end?: Date;
    duracionMin?: number;
  }): Promise<{ asignacion: AsignacionResult; mesa: { id_mesa: number; numero: number; capacidad: number } | null } | null> {
    const { colaId, comensales, tipoOrigen, idReserva, idWaitlist, mesaId } = params;
    const mesa = await this.prisma.mesa.findUnique({ where: { id_mesa: mesaId } });
    if (!mesa) return null;

    // Validar que la fuente no esté en estado final
    if (tipoOrigen === 'RESERVA') {
      if (!idReserva) return null;
      const r = await this.prisma.reserva.findUnique({ where: { id_reserva: idReserva } });
      if (!r) return null;
      if (r.estado === 'CANCELADA' || r.estado === 'NO_SHOW' || r.estado === 'COMPLETADA') return null;
    } else {
      if (!idWaitlist) return null;
      const w = await this.prisma.waitlistEntry.findUnique({ where: { id_waitlist: idWaitlist } });
      if (!w) return null;
      if (w.estado !== 'ESPERANDO' && w.estado !== 'NOTIFICADO') return null;
    }

    const duracion = params.duracionMin ?? (await this.getDuracionComida(colaId));

    let start = params.start;
    let end = params.end;
    if (!start) {
      if (tipoOrigen === 'RESERVA' && idReserva) {
        const r = await this.prisma.reserva.findUnique({ where: { id_reserva: idReserva } });
        if (!r) return null;
        start = this.combinarFechaHora(r.fecha, r.hora_inicio);
      } else {
        start = new Date();
      }
    }
    if (!end) end = new Date(start.getTime() + duracion * 60000);

    // Si la mesa pertenece a un grupo, asignar el grupo entero
    let mesaIds = [mesaId];
    const link = await this.prisma.mesaGrupoMesa.findFirst({
      where: { id_mesa: mesaId },
      include: { grupo: { include: { mesas: true } } },
    });
    if (link && (mesa.estado === 'AGRUPADA' || link.grupo.activa)) {
      mesaIds = link.grupo.mesas.map((gm) => gm.id_mesa);
    }

    // Idempotencia: si el origen ya tiene asignación activa en las mismas mesas, devolverla
    const existing = await this.asignacionActivaDeOrigen(tipoOrigen, idReserva, idWaitlist);
    if (existing) {
      const existingSet = new Set<number>([existing.mesa_id]);
      if (existing.grupo_id) {
        const g = await this.prisma.mesaGrupoMesa.findMany({
          where: { id_grupo: existing.grupo_id },
          select: { id_mesa: true },
        });
        g.forEach((m) => existingSet.add(m.id_mesa));
      }
      const mismaMesa = mesaIds.length === existingSet.size && mesaIds.every((id) => existingSet.has(id));
      if (mismaMesa) {
        const mesas = await this.prisma.mesa.findMany({
          where: { id_mesa: { in: mesaIds } },
          select: { id_mesa: true, numero: true, capacidad: true },
        });
        const rep = [...mesas].sort((a, b) => a.numero - b.numero)[0];
        return {
          asignacion: this.toResultadoAsignacion(existing),
          mesa: rep ? { id_mesa: rep.id_mesa, numero: rep.numero, capacidad: rep.capacidad } : null,
        };
      }
      // Distinta mesa: cancelar la anterior y liberar sus mesas si es "ahora"
      await this.prisma.tableAssignment.update({
        where: { id_asignacion: existing.id_asignacion },
        data: { estado: 'CANCELADA' },
      });
      if (estaEnHuecoActual(existing.hora_inicio, existing.hora_fin_prevista, existing.mesa_id, 90)) {
        const idsPrevios = [...existingSet];
        await this.prisma.mesa.updateMany({
          where: { id_mesa: { in: idsPrevios } },
          data: { estado: 'LIBRE' },
        });
      }
    }

    try {
      const result = await this.asignarMesaVentana({
        colaId,
        mesaIds,
        tipoOrigen,
        idReserva,
        idWaitlist,
        comensales,
        start,
        end,
        duracionMin: duracion,
      });
      if (!result) return null;

      if (tipoOrigen === 'WAITLIST' && idWaitlist) {
        await this.prisma.waitlistEntry.update({
          where: { id_waitlist: idWaitlist },
          data: { estado: 'ASIGNADO', tiempo_estimado_min: 0 },
        });
      }

      const mesas = await this.prisma.mesa.findMany({
        where: { id_mesa: { in: mesaIds } },
        select: { id_mesa: true, numero: true, capacidad: true },
      });
      const rep = [...mesas].sort((a, b) => a.numero - b.numero)[0];
      const mesaInfo = { id_mesa: rep.id_mesa, numero: rep.numero, capacidad: rep.capacidad };

      try {
        sse.sendSseEvent(colaId, 'MESA_ASIGNADA', {
          mesa: mesaInfo,
          waitlist: idWaitlist ? { id_waitlist: idWaitlist } : undefined,
          reserva: idReserva ? { id_reserva: idReserva } : undefined,
          asignacion: { id_asignacion: result.id_asignacion, mesa_ids: mesaIds },
        });
      } catch (e) {
        logger.warn('Failed to send SSE MESA_ASIGNADA (manual)', e);
      }
      return { asignacion: result, mesa: mesaInfo };
    } catch (e) {
      logger.warn('Manual assign failed:', e);
      return null;
    }
  }

  private async asignacionActivaDeOrigen(
    tipo: 'RESERVA' | 'WAITLIST',
    idReserva?: number | null,
    idWaitlist?: number | null
  ) {
    if (tipo === 'RESERVA' && idReserva) {
      return this.prisma.tableAssignment.findFirst({
        where: { id_reserva: idReserva, estado: { in: ['PENDIENTE', 'ACTIVA'] } },
      });
    }
    if (tipo === 'WAITLIST' && idWaitlist) {
      return this.prisma.tableAssignment.findFirst({
        where: { id_waitlist: idWaitlist, estado: { in: ['PENDIENTE', 'ACTIVA'] } },
      });
    }
    return null;
  }

  private toResultadoAsignacion(a: any): AsignacionResult {
    return {
      id_asignacion: a.id_asignacion,
      id_cola: a.id_cola,
      tipo_origen: a.tipo_origen,
      id_reserva: a.id_reserva,
      id_waitlist: a.id_waitlist,
      mesa: null,
      grupo_id: a.grupo_id,
      mesa_ids: [a.mesa_id],
      num_comensales: a.num_comensales,
      hora_inicio: a.hora_inicio,
      hora_fin_prevista: a.hora_fin_prevista,
      estado: a.estado,
    };
  }

  /**
   * Al liberar una mesa, además de los turnos legacy, intenta con la waitlist
   * (orden: prioridad desc, llegada asc).
   */
  async autoMatchWaitlistAlLiberar(colaId: number, capacidadLibre: number): Promise<AsignacionResult | null> {
    const esperando = await this.prisma.waitlistEntry.findMany({
      where: { id_cola: colaId, estado: { in: ['ESPERANDO', 'NOTIFICADO'] } },
      orderBy: [{ prioridad: 'desc' }, { hora_llegada: 'asc' }],
    });
    for (const e of esperando) {
      if (e.num_comensales <= capacidadLibre) {
        const asignacion = await this.asignarDesdeWaitlist(e.id_waitlist);
        if (asignacion) return asignacion;
      }
    }
    return null;
  }
}