import prisma from '../config/prisma';
import { TableAllocationService } from '../services/tableAllocation.service';
import { MesaRepository } from '../repositories/mesa.repository';

export interface ReservaConfigEfectiva {
  antelacion_min_min: number;
  antelacion_max_dias: number;
  slot_min: number;
  max_comensales_online: number;
  max_reservas_por_telefono: number;
  modificacion_limite_horas: number;
  marca_nombre: string | null;
  marca_logo_url: string | null;
  marca_color: string | null;
  recordatorio_horas_antelacion: number;
  review_retardo_horas: number;
  notif_creada: boolean;
  notif_confirmada: boolean;
  notif_recordatorio: boolean;
  notif_cambio: boolean;
  notif_cancelacion: boolean;
  notif_review: boolean;
}

export const CONFIG_DEFAULTS: ReservaConfigEfectiva = {
  antelacion_min_min: 60,
  antelacion_max_dias: 60,
  slot_min: 30,
  max_comensales_online: 20,
  max_reservas_por_telefono: 3,
  modificacion_limite_horas: 2,
  marca_nombre: null,
  marca_logo_url: null,
  marca_color: null,
  recordatorio_horas_antelacion: 24,
  review_retardo_horas: 2,
  notif_creada: true,
  notif_confirmada: true,
  notif_recordatorio: true,
  notif_cambio: true,
  notif_cancelacion: true,
  notif_review: true,
};

const DIAS = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

export async function getReservaConfig(colaId: number): Promise<ReservaConfigEfectiva> {
  const cfg = await prisma.reservaConfig.findUnique({ where: { id_cola: colaId } });
  if (!cfg) return { ...CONFIG_DEFAULTS };
  return {
    antelacion_min_min: cfg.antelacion_min_min,
    antelacion_max_dias: cfg.antelacion_max_dias,
    slot_min: cfg.slot_min,
    max_comensales_online: cfg.max_comensales_online,
    max_reservas_por_telefono: cfg.max_reservas_por_telefono,
    modificacion_limite_horas: cfg.modificacion_limite_horas,
    marca_nombre: cfg.marca_nombre,
    marca_logo_url: cfg.marca_logo_url,
    marca_color: cfg.marca_color,
    recordatorio_horas_antelacion: cfg.recordatorio_horas_antelacion,
    review_retardo_horas: cfg.review_retardo_horas,
    notif_creada: cfg.notif_creada,
    notif_confirmada: cfg.notif_confirmada,
    notif_recordatorio: cfg.notif_recordatorio,
    notif_cambio: cfg.notif_cambio,
    notif_cancelacion: cfg.notif_cancelacion,
    notif_review: cfg.notif_review,
  };
}

export function diaSemanaDeFecha(fecha: Date): string {
  return DIAS[fecha.getDay()];
}

function inicioDia(fecha: Date): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Devuelve el motivo de cierre si la fecha es día de cierre, o null.
 */
export async function motivoCierre(colaId: number, fecha: Date): Promise<string | null> {
  const dia = inicioDia(fecha);
  const cierre = await prisma.diaCierre.findFirst({
    where: { id_cola: colaId, fecha: dia },
    select: { motivo: true },
  });
  if (!cierre) return null;
  return cierre.motivo?.trim() || 'Cerrado';
}

export function slotDateTime(fecha: Date, horaStr: string): Date {
  const [h, m] = horaStr.split(':').map(Number);
  const d = new Date(fecha);
  d.setHours(h, m, 0, 0);
  return d;
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export interface SlotInfo {
  hora: string;
  disponible: boolean;
}

/**
 * Genera los slots reservables de un día: intersección de horarios de apertura
 * con la antelación mínima, marcando disponibilidad real por slot.
 */
export async function generarSlots(
  colaId: number,
  fecha: Date,
  comensales: number,
  allocationService?: TableAllocationService
): Promise<{ slots: SlotInfo[]; config: ReservaConfigEfectiva; abierto: boolean; motivo?: string | null }> {
  const config = await getReservaConfig(colaId);
  const allocation = allocationService ?? new TableAllocationService(prisma, new MesaRepository(prisma));

  const cierre = await motivoCierre(colaId, fecha);
  if (cierre) {
    return { slots: [], config, abierto: false, motivo: cierre };
  }

  const horarios = await prisma.horarioCola.findMany({
    where: { id_cola: colaId, dia_semana: diaSemanaDeFecha(fecha) as any },
    orderBy: { hora_inicio: 'asc' },
  });

  if (horarios.length === 0) {
    return { slots: [], config, abierto: false };
  }

  const ahora = new Date();
  const limiteAntelacion = new Date(ahora.getTime() + config.antelacion_min_min * 60000);

  const horas = new Set<string>();
  for (const h of horarios) {
    const ini = hhmm(h.hora_inicio);
    const fin = hhmm(h.hora_fin);
    const [ih, im] = ini.split(':').map(Number);
    const [fh, fm] = fin.split(':').map(Number);
    const cur = new Date(fecha);
    cur.setHours(ih, im, 0, 0);
    const end = new Date(fecha);
    end.setHours(fh, fm, 0, 0);
    while (cur < end) {
      horas.add(hhmm(cur));
      cur.setMinutes(cur.getMinutes() + config.slot_min);
    }
  }

  const ordenadas = [...horas].sort();
  const slots: SlotInfo[] = [];
  for (const hora of ordenadas) {
    const dt = slotDateTime(fecha, hora);
    if (dt < limiteAntelacion) continue;
    const [h, m] = hora.split(':').map(Number);
    const horaDate = new Date(2000, 0, 1, h, m, 0);
    try {
      const disp: any = await allocation.consultarDisponibilidad(colaId, {
        fecha,
        horaInicio: horaDate,
        comensales,
      });
      slots.push({ hora, disponible: !!disp?.hayDisponibilidad });
    } catch {
      slots.push({ hora, disponible: false });
    }
  }
  return { slots, config, abierto: true };
}
