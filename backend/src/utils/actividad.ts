import prisma from '../config/prisma';
import { logger } from '../config/logger';

export type TipoActividad = 'MESA_ASIGNADA' | 'MESA_LIBERADA' | 'MESA_ESTADO';

interface ActividadInput {
  id_cola: number;
  tipo: TipoActividad;
  descripcion: string;
  id_mesa?: number | null;
  id_turno?: number | null;
  id_reserva?: number | null;
  id_waitlist?: number | null;
}

/**
 * Registra un evento visible de sala. Fire-and-forget: nunca rompe el flujo
 * que lo origina (errores solo a log).
 */
export function registrarActividad(input: ActividadInput): void {
  prisma.actividadLog
    .create({
      data: {
        id_cola: input.id_cola,
        tipo: input.tipo,
        descripcion: input.descripcion,
        id_mesa: input.id_mesa ?? null,
        id_turno: input.id_turno ?? null,
        id_reserva: input.id_reserva ?? null,
        id_waitlist: input.id_waitlist ?? null,
      },
    })
    .catch((e) => logger.warn('No se pudo registrar actividad:', e?.message ?? e));
}
