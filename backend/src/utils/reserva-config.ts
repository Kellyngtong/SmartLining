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
}

export const CONFIG_DEFAULTS: ReservaConfigEfectiva = {
  antelacion_min_min: 60,
  antelacion_max_dias: 60,
  slot_min: 30,
  max_comensales_online: 20,
  max_reservas_por_telefono: 3,
  modificacion_limite_horas: 2,
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
  };
}

export function diaSemanaDeFecha(fecha: Date): string {
  return DIAS[fecha.getDay()];
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
): Promise<{ slots: SlotInfo[]; config: ReservaConfigEfectiva; abierto: boolean }> {
  const config = await getReservaConfig(colaId);
  const allocation = allocationService ?? new TableAllocationService(prisma, new MesaRepository(prisma));

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
