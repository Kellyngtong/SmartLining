import { WaitlistEntry } from '@prisma/client';
import { BaseRepository } from './base.repository';

export interface CreateWaitlistDTO {
  id_cola: number;
  id_cliente?: number | null;
  cliente_nombre: string;
  cliente_telefono?: string | null;
  num_comensales: number;
  estado?: 'ESPERANDO' | 'NOTIFICADO' | 'ASIGNADO' | 'SENTADO' | 'CANCELADO' | 'NO_SHOW';
  tiempo_estimado_min?: number | null;
  prioridad?: number;
  preferencia_zona?: number | null;
  preferencia_mesa?: number | null;
  notas?: string | null;
  turno_legacy_id?: number | null;
}

export interface UpdateWaitlistDTO {
  cliente_nombre?: string;
  cliente_telefono?: string | null;
  num_comensales?: number;
  estado?: 'ESPERANDO' | 'NOTIFICADO' | 'ASIGNADO' | 'SENTADO' | 'CANCELADO' | 'NO_SHOW';
  tiempo_estimado_min?: number | null;
  prioridad?: number;
  preferencia_zona?: number | null;
  preferencia_mesa?: number | null;
  notas?: string | null;
}

export interface WaitlistConAsignacion extends WaitlistEntry {
  asignaciones?: Array<{
    id_asignacion: number;
    mesa_id: number;
    grupo_id: number | null;
    estado: string;
    mesa?: { id_mesa: number; numero: number } | null;
  }>;
}

export class WaitlistRepository extends BaseRepository<WaitlistEntry, CreateWaitlistDTO, UpdateWaitlistDTO> {
  async findById(id: number): Promise<WaitlistEntry | null> {
    return this.prisma.waitlistEntry.findUnique({ where: { id_waitlist: id } });
  }

  async findAll(options?: { skip?: number; take?: number }): Promise<WaitlistEntry[]> {
    return this.prisma.waitlistEntry.findMany({
      skip: options?.skip,
      take: options?.take,
      orderBy: [{ prioridad: 'desc' }, { hora_llegada: 'asc' }],
    });
  }

  async findWaitlistByCola(
    colaId: number,
    opts: { estado?: string; activas?: boolean } = {}
  ): Promise<WaitlistConAsignacion[]> {
    const where: any = { id_cola: colaId };
    if (opts.estado) {
      where.estado = opts.estado;
    } else if (opts.activas) {
      where.estado = { in: ['ESPERANDO', 'NOTIFICADO'] };
    }
    return this.prisma.waitlistEntry.findMany({
      where,
      orderBy: [{ prioridad: 'desc' }, { hora_llegada: 'asc' }],
      include: {
        asignaciones: {
          include: { mesa: { select: { id_mesa: true, numero: true } } },
        },
      },
    });
  }

  async create(data: CreateWaitlistDTO): Promise<WaitlistEntry> {
    return this.prisma.waitlistEntry.create({
      data: {
        id_cola: data.id_cola,
        id_cliente: data.id_cliente ?? null,
        cliente_nombre: data.cliente_nombre,
        cliente_telefono: data.cliente_telefono ?? null,
        num_comensales: data.num_comensales,
        estado: (data.estado as any) ?? 'ESPERANDO',
        tiempo_estimado_min: data.tiempo_estimado_min ?? null,
        prioridad: data.prioridad ?? 0,
        preferencia_zona: data.preferencia_zona ?? null,
        preferencia_mesa: data.preferencia_mesa ?? null,
        notas: data.notas ?? null,
        turno_legacy_id: data.turno_legacy_id ?? null,
      },
    });
  }

  async update(id: number, data: UpdateWaitlistDTO): Promise<WaitlistEntry | null> {
    return this.prisma.waitlistEntry
      .update({
        where: { id_waitlist: id },
        data: {
          ...(data.cliente_nombre !== undefined && { cliente_nombre: data.cliente_nombre }),
          ...(data.cliente_telefono !== undefined && { cliente_telefono: data.cliente_telefono }),
          ...(data.num_comensales !== undefined && { num_comensales: data.num_comensales }),
          ...(data.estado !== undefined && { estado: data.estado as any }),
          ...(data.tiempo_estimado_min !== undefined && { tiempo_estimado_min: data.tiempo_estimado_min }),
          ...(data.prioridad !== undefined && { prioridad: data.prioridad }),
          ...(data.preferencia_zona !== undefined && { preferencia_zona: data.preferencia_zona }),
          ...(data.preferencia_mesa !== undefined && { preferencia_mesa: data.preferencia_mesa }),
          ...(data.notas !== undefined && { notas: data.notas }),
        },
      })
      .catch(() => null);
  }

  async updateEstado(id: number, estado: string): Promise<WaitlistEntry | null> {
    return this.prisma.waitlistEntry
      .update({ where: { id_waitlist: id }, data: { estado: estado as any } })
      .catch(() => null);
  }

  async delete(id: number): Promise<boolean> {
    try {
      await this.prisma.$transaction([
        this.prisma.tableAssignment.deleteMany({ where: { id_waitlist: id } }),
        this.prisma.waitlistEntry.delete({ where: { id_waitlist: id } }),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  async count(): Promise<number> {
    return this.prisma.waitlistEntry.count();
  }
}