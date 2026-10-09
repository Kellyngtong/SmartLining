import prisma from '../config/prisma';
import { logger } from '../config/logger';
import { sendMail, BrandVars } from './mail.service';
import { getReservaConfig } from '../utils/reserva-config';

export function emailValido(email: string | null | undefined): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function fmtFecha(fecha: Date): string {
  const d = new Date(fecha);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function fmtHora(hora: Date): string {
  const d = new Date(hora);
  if (!isNaN(d.getTime())) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return '?';
}

function slotDeReserva(fecha: Date, hora: Date): Date {
  const d = new Date(fecha);
  const h = new Date(hora);
  d.setHours(h.getHours(), h.getMinutes(), 0, 0);
  return d;
}

function miReservaUrl(token: string | null): string | null {
  if (!token) return null;
  const base = (process.env.APP_PUBLIC_URL || 'http://localhost:8080').replace(/\/$/, '');
  return `${base}/restaurante/mi-reserva/${token}`;
}

async function brandDe(colaId: number, nombreCola: string): Promise<BrandVars> {
  const cfg = await getReservaConfig(colaId);
  return {
    marca: cfg.marca_nombre?.trim() || nombreCola,
    color: cfg.marca_color?.trim() || '#c9a227',
    logoUrl: cfg.marca_logo_url?.trim() || null,
  };
}

export async function getBrandVars(colaId: number): Promise<BrandVars> {
  const cola = await prisma.cola.findUnique({ where: { id_cola: colaId }, select: { nombre: true } });
  return brandDe(colaId, cola?.nombre ?? 'Restaurante');
}

async function contexto(colaId: number) {
  const [cola, cfg] = await Promise.all([
    prisma.cola.findUnique({ where: { id_cola: colaId }, select: { nombre: true } }),
    getReservaConfig(colaId),
  ]);
  const brand = await brandDe(colaId, cola?.nombre ?? 'Restaurante');
  return { cola, cfg, brand };
}

type ReservaMail = {
  id_reserva: number;
  id_cola: number;
  cliente_nombre: string;
  cliente_email: string | null;
  fecha: Date;
  hora_inicio: Date;
  num_comensales: number;
  estado: string;
  token_publico: string | null;
};

function varsReserva(r: ReservaMail, url: string | null) {
  return {
    nombre: r.cliente_nombre,
    fecha: fmtFecha(r.fecha),
    hora: fmtHora(r.hora_inicio),
    comensales: r.num_comensales,
    miReservaUrl: url,
  };
}

export async function notificarCreada(r: ReservaMail): Promise<void> {
  try {
    if (!emailValido(r.cliente_email)) return;
    const { cfg, brand } = await contexto(r.id_cola);
    if (!cfg.notif_creada) return;
    await sendMail({
      id_cola: r.id_cola,
      to: r.cliente_email!.trim(),
      subject: `Hemos recibido tu reserva — ${brand.marca}`,
      plantilla: 'reserva-creada',
      vars: varsReserva(r, miReservaUrl(r.token_publico)),
      brand,
    });
  } catch (e) {
    logger.warn('notificarCreada falló (no bloqueante):', e);
  }
}

export async function notificarConfirmada(r: ReservaMail): Promise<void> {
  try {
    if (!emailValido(r.cliente_email)) return;
    const { cfg, brand } = await contexto(r.id_cola);
    if (!cfg.notif_confirmada) return;
    await sendMail({
      id_cola: r.id_cola,
      to: r.cliente_email!.trim(),
      subject: `Mesa reservada en ${brand.marca} — ${varsReserva(r, null).fecha} ${varsReserva(r, null).hora}`,
      plantilla: 'reserva-confirmada',
      vars: varsReserva(r, miReservaUrl(r.token_publico)),
      brand,
    });
  } catch (e) {
    logger.warn('notificarConfirmada falló (no bloqueante):', e);
  }
}

export async function notificarCambio(r: ReservaMail, motivo?: string): Promise<void> {
  try {
    if (!emailValido(r.cliente_email)) return;
    const { cfg, brand } = await contexto(r.id_cola);
    if (!cfg.notif_cambio) return;
    await sendMail({
      id_cola: r.id_cola,
      to: r.cliente_email!.trim(),
      subject: `Tu reserva en ${brand.marca} ha cambiado`,
      plantilla: 'reserva-cambio',
      vars: { ...varsReserva(r, miReservaUrl(r.token_publico)), motivo: motivo ?? null },
      brand,
    });
  } catch (e) {
    logger.warn('notificarCambio falló (no bloqueante):', e);
  }
}

export async function notificarCancelacion(r: ReservaMail, porCliente: boolean): Promise<void> {
  try {
    if (!emailValido(r.cliente_email)) return;
    const { cfg, brand } = await contexto(r.id_cola);
    if (!cfg.notif_cancelacion) return;
    await sendMail({
      id_cola: r.id_cola,
      to: r.cliente_email!.trim(),
      subject: `Reserva cancelada — ${brand.marca}`,
      plantilla: 'reserva-cancelada',
      vars: {
        ...varsReserva(r, miReservaUrl(r.token_publico)),
        motivo: porCliente ? null : 'Ha sido cancelada por el restaurante. Disculpa las molestias.',
      },
      brand,
    });
  } catch (e) {
    logger.warn('notificarCancelacion falló (no bloqueante):', e);
  }
}

export async function notificarMesaLista(turnoId: number): Promise<void> {
  try {
    const turno = await prisma.turno.findUnique({
      where: { id_turno: turnoId },
      include: { cliente: { select: { nombre: true, email: true } } },
    });
    if (!turno || !emailValido(turno.cliente?.email)) return;
    const { brand } = await contexto(turno.id_cola);
    await sendMail({
      id_cola: turno.id_cola,
      to: turno.cliente!.email!.trim(),
      subject: `Tu mesa en ${brand.marca} ya está lista`,
      plantilla: 'mesa-lista',
      vars: { nombre: turno.cliente?.nombre ?? 'Hola' },
      brand,
    });
  } catch (e) {
    logger.warn('notificarMesaLista falló (no bloqueante):', e);
  }
}

/**
 * Barrido de recordatorios: CONFIRMADAs cuyo slot empieza dentro de las
 * próximas Xh (X configurable por restaurante). Anti-duplicado por flag.
 */
export async function enviarRecordatorios(): Promise<{ enviados: number; fallos: number }> {
  let enviados = 0;
  let fallos = 0;
  try {
    const ahora = new Date();
    const candidatas = await prisma.reserva.findMany({
      where: {
        estado: 'CONFIRMADA',
        recordatorio_enviado_at: null,
        cliente_email: { not: null },
      },
      take: 200,
    });
    for (const r of candidatas) {
      try {
        if (!emailValido(r.cliente_email)) continue;
        const cfg = await getReservaConfig(r.id_cola);
        if (!cfg.notif_recordatorio) continue;
        const slot = slotDeReserva(r.fecha, r.hora_inicio);
        const limite = new Date(ahora.getTime() + cfg.recordatorio_horas_antelacion * 3600000);
        if (slot <= ahora || slot > limite) continue;
        const { brand } = await contexto(r.id_cola);
        const res = await sendMail({
          id_cola: r.id_cola,
          to: r.cliente_email!.trim(),
          subject: `Mañana tienes mesa en ${brand.marca} — ¿sigues viniendo?`,
          plantilla: 'reserva-recordatorio',
          vars: varsReserva(r as ReservaMail, miReservaUrl(r.token_publico)),
          brand,
        });
        if (res.enviado) {
          await prisma.reserva.update({
            where: { id_reserva: r.id_reserva },
            data: { recordatorio_enviado_at: new Date() },
          });
          enviados++;
        } else {
          fallos++;
        }
      } catch (e) {
        logger.warn(`Recordatorio reserva ${r.id_reserva} falló:`, e);
        fallos++;
      }
    }
  } catch (e) {
    logger.warn('Barrido de recordatorios falló:', e);
  }
  return { enviados, fallos };
}

/**
 * Barrido de reseñas: COMPLETADAs hace más de Yh, con al menos un enlace
 * de reseña activo. Sin enlaces no se envía nada (silencio, sin spam).
 */
export async function enviarReviews(): Promise<{ enviados: number; fallos: number }> {
  let enviados = 0;
  let fallos = 0;
  try {
    const candidatas = await prisma.reserva.findMany({
      where: {
        estado: 'COMPLETADA',
        review_enviado_at: null,
        cliente_email: { not: null },
      },
      take: 200,
    });
    for (const r of candidatas) {
      try {
        if (!emailValido(r.cliente_email)) continue;
        const cfg = await getReservaConfig(r.id_cola);
        if (!cfg.notif_review) continue;
        const enlaces = await prisma.resenaEnlace.findMany({
          where: { id_cola: r.id_cola, activa: true },
          orderBy: [{ orden: 'asc' }, { id_enlace: 'asc' }],
          select: { nombre: true, url: true },
        });
        if (enlaces.length === 0) continue;
        const corte = new Date(Date.now() - cfg.review_retardo_horas * 3600000);
        if (r.updated_at > corte) continue;
        const { brand } = await contexto(r.id_cola);
        const res = await sendMail({
          id_cola: r.id_cola,
          to: r.cliente_email!.trim(),
          subject: `¿Qué tal en ${brand.marca}? Valóranos`,
          plantilla: 'review',
          vars: {
            ...varsReserva(r as ReservaMail, miReservaUrl(r.token_publico)),
            reviewLinks: enlaces,
          },
          brand,
        });
        if (res.enviado) {
          await prisma.reserva.update({
            where: { id_reserva: r.id_reserva },
            data: { review_enviado_at: new Date() },
          });
          enviados++;
        } else {
          fallos++;
        }
      } catch (e) {
        logger.warn(`Review reserva ${r.id_reserva} falló:`, e);
        fallos++;
      }
    }
  } catch (e) {
    logger.warn('Barrido de reviews falló:', e);
  }
  return { enviados, fallos };
}
