import { Reserva } from '@prisma/client';
import { BaseRepository } from './base.repository';

export interface CreateReservaDTO {
  id_cola: number;
  id_cliente?: number | null;
  cliente_nombre: string;
  cliente_telefono?: string | null;
  cliente_email?: string | null;
  fecha: Date;
  hora_inicio: Date;
  hora_fin?: Date | null;
  num_comensales: number;
  estado?: 'PENDIENTE' | 'CONFIRMADA' | 'CHECKED_IN' | 'SENTADA' | 'COMPLETADA' | 'CANCELADA' | 'NO_SHOW';
  notas?: string | null;
  preferencia_zona?: number | null;
  preferencia_mesa?: number | null;
  origen?: 'TELEFONO' | 'WEB' | 'APP' | 'WALK_IN' | 'WHATSAPP' | 'OTRO';
  token_publico?: string | null;
}

export interface UpdateReservaDTO {
  cliente_nombre?: string;
  cliente_telefono?: string | null;
  cliente_email?: string | null;
  fecha?: Date;
  hora_inicio?: Date;
  hora_fin?: Date | null;
  num_comensales?: number;
  estado?: 'PENDIENTE' | 'CONFIRMADA' | 'CHECKED_IN' | 'SENTADA' | 'COMPLETADA' | 'CANCELADA' | 'NO_SHOW';
  notas?: string | null;
  preferencia_zona?: number | null;
  preferencia_mesa?: number | null;
  origen?: 'TELEFONO' | 'WEB' | 'APP' | 'WALK_IN' | 'WHATSAPP' | 'OTRO';
}

export interface ReservaConAsignacion extends Reserva {
  asignaciones?: Array<{
    id_asignacion: number;
    mesa_id: number;
    grupo_id: number | null;
    estado: string;
    mesa?: { id_mesa: number; numero: number } | null;
  }>;
}

export const ESTADOS_FINALES_RESERVA = ['COMPLETADA', 'CANCELADA', 'NO_SHOW'];

export class ReservaRepository extends BaseRepository<Reserva, CreateReservaDTO, UpdateReservaDTO> {
  async findById(id: number): Promise<Reserva | null> {
    return this.prisma.reserva.findUnique({ where: { id_reserva: id } });
  }

  async findAll(options?: { skip?: number; take?: number }): Promise<Reserva[]> {
    return this.prisma.reserva.findMany({
      skip: options?.skip,
      take: options?.take,
      orderBy: [{ fecha: 'asc' }, { hora_inicio: 'asc' }],
    });
  }

  async findReservasByCola(
    colaId: number,
    opts: { fecha?: Date; estado?: string; cliente?: string; vista?: 'actual' | 'historial' } = {}
  ): Promise<ReservaConAsignacion[]> {
    const where: any = { id_cola: colaId };
    if (opts.vista === 'actual') {
      // En curso: estados no finales, cualquier fecha, próximas primero
      where.estado = { notIn: ESTADOS_FINALES_RESERVA };
    } else if (opts.vista === 'historial') {
      // Cerradas: solo finales, de más reciente a más antigua
      where.estado = { in: ESTADOS_FINALES_RESERVA };
    } else {
      if (opts.fecha) where.fecha = opts.fecha;
      if (opts.estado) where.estado = opts.estado;
    }
    if (opts.cliente) {
      where.OR = [
        { cliente_nombre: { contains: opts.cliente } },
        { cliente_telefono: { contains: opts.cliente } },
      ];
    }
    const esHistorial = opts.vista === 'historial';
    return this.prisma.reserva.findMany({
      where,
      orderBy: esHistorial
        ? [{ fecha: 'desc' }, { hora_inicio: 'desc' }]
        : [{ fecha: 'asc' }, { hora_inicio: 'asc' }],
      ...(esHistorial ? { take: 200 } : {}),
      include: {
        asignaciones: {
          include: { mesa: { select: { id_mesa: true, numero: true } } },
        },
      },
    });
  }

  async create(data: CreateReservaDTO): Promise<Reserva> {
    return this.prisma.reserva.create({
      data: {
        id_cola: data.id_cola,
        id_cliente: data.id_cliente ?? null,
        cliente_nombre: data.cliente_nombre,
        cliente_telefono: data.cliente_telefono ?? null,
        cliente_email: data.cliente_email ?? null,
        fecha: data.fecha,
        hora_inicio: data.hora_inicio,
        hora_fin: data.hora_fin ?? null,
        num_comensales: data.num_comensales,
        estado: (data.estado as any) ?? 'PENDIENTE',
        notas: data.notas ?? null,
        preferencia_zona: data.preferencia_zona ?? null,
        preferencia_mesa: data.preferencia_mesa ?? null,
        origen: (data.origen as any) ?? 'TELEFONO',
        token_publico: data.token_publico ?? null,
      },
    });
  }

  async update(id: number, data: UpdateReservaDTO): Promise<Reserva | null> {
    return this.prisma.reserva
      .update({
        where: { id_reserva: id },
        data: {
          ...(data.cliente_nombre !== undefined && { cliente_nombre: data.cliente_nombre }),
          ...(data.cliente_telefono !== undefined && { cliente_telefono: data.cliente_telefono }),
          ...(data.cliente_email !== undefined && { cliente_email: data.cliente_email }),
          ...(data.fecha !== undefined && { fecha: data.fecha }),
          ...(data.hora_inicio !== undefined && { hora_inicio: data.hora_inicio }),
          ...(data.hora_fin !== undefined && { hora_fin: data.hora_fin }),
          ...(data.num_comensales !== undefined && { num_comensales: data.num_comensales }),
          ...(data.estado !== undefined && { estado: data.estado as any }),
          ...(data.notas !== undefined && { notas: data.notas }),
          ...(data.preferencia_zona !== undefined && { preferencia_zona: data.preferencia_zona }),
          ...(data.preferencia_mesa !== undefined && { preferencia_mesa: data.preferencia_mesa }),
          ...(data.origen !== undefined && { origen: data.origen as any }),
        },
      })
      .catch(() => null);
  }

  async updateEstado(id: number, estado: string): Promise<Reserva | null> {
    return this.prisma.reserva
      .update({ where: { id_reserva: id }, data: { estado: estado as any } })
      .catch(() => null);
  }

  async delete(id: number): Promise<boolean> {
    try {
      await this.prisma.$transaction([
        this.prisma.tableAssignment.deleteMany({ where: { id_reserva: id } }),
        this.prisma.reserva.delete({ where: { id_reserva: id } }),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  async count(): Promise<number> {
    return this.prisma.reserva.count();
  }
}