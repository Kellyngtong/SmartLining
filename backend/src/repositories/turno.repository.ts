import { PrismaClient } from '@prisma/client';
import { BaseRepository } from './base.repository';

export interface CreateTurnoDTO {
  id_cola: number;
  id_cliente: number;
}

export interface UpdateTurnoDTO {
  estado?: 'EN_ESPERA' | 'EN_ATENCION' | 'FINALIZADO' | 'CANCELADO';
  fecha_hora_llamada?: Date;
  fecha_hora_inicio_atencion?: Date;
  fecha_hora_fin_atencion?: Date;
}

export interface TurnoRepositoryResult {
  id_turno: number;
  id_cola: number;
  id_cliente: number;
  numero_turno: number;
  estado: 'EN_ESPERA' | 'EN_ATENCION' | 'FINALIZADO' | 'CANCELADO';
  fecha_hora_creacion: Date;
  fecha_hora_llamada: Date | null;
  fecha_hora_inicio_atencion: Date | null;
  fecha_hora_fin_atencion: Date | null;
}

export interface TurnoWithDetailsResult extends TurnoRepositoryResult {
  atencion?: {
    id_atencion: number;
    id_empleado: number;
    duracion_atencion?: number;
    resultado: string;
  };
  valoracion?: {
    id_valoracion: number;
    puntuacion: number;
    comentario?: string;
  };
}

export class TurnoRepository extends BaseRepository<
  TurnoRepositoryResult,
  CreateTurnoDTO,
  UpdateTurnoDTO
> {
  async findById(id: number): Promise<TurnoRepositoryResult | null> {
    return this.prisma.turno.findUnique({
      where: { id_turno: id },
    });
  }

  async findByIdWithDetails(id: number): Promise<TurnoWithDetailsResult | null> {
    const turno = await this.prisma.turno.findUnique({
      where: { id_turno: id },
      include: {
        atencion: {
          select: {
            id_atencion: true,
            id_empleado: true,
            duracion_atencion: true,
            resultado: true,
          },
        },
        valoracion: {
          select: {
            id_valoracion: true,
            puntuacion: true,
            comentario: true,
          },
        },
      },
    });

    if (!turno) return null;

    return {
      ...turno,
      atencion: turno.atencion || undefined,
      valoracion: turno.valoracion || undefined,
    } as TurnoWithDetailsResult;
  }

  async findAll(options?: { skip?: number; take?: number }): Promise<TurnoRepositoryResult[]> {
    return this.prisma.turno.findMany({
      skip: options?.skip,
      take: options?.take,
      orderBy: { fecha_hora_creacion: 'desc' },
    });
  }

  async findByColaId(
    colaId: number,
    options?: { skip?: number; take?: number }
  ): Promise<TurnoRepositoryResult[]> {
    return this.prisma.turno.findMany({
      where: { id_cola: colaId },
      skip: options?.skip,
      take: options?.take,
      orderBy: { numero_turno: 'desc' },
    });
  }

  async findByClienteId(
    clienteId: number,
    options?: { skip?: number; take?: number }
  ): Promise<TurnoRepositoryResult[]> {
    return this.prisma.turno.findMany({
      where: { id_cliente: clienteId },
      skip: options?.skip,
      take: options?.take,
      orderBy: { fecha_hora_creacion: 'desc' },
    });
  }

  async findByEstado(
    estado: 'EN_ESPERA' | 'EN_ATENCION' | 'FINALIZADO' | 'CANCELADO',
    options?: { skip?: number; take?: number }
  ): Promise<TurnoRepositoryResult[]> {
    return this.prisma.turno.findMany({
      where: { estado: estado as any },
      skip: options?.skip,
      take: options?.take,
      orderBy: { fecha_hora_creacion: 'desc' },
    });
  }

  async findByColaIdAndEstado(
    colaId: number,
    estado: string,
    options?: { skip?: number; take?: number }
  ): Promise<TurnoRepositoryResult[]> {
    return this.prisma.turno.findMany({
      where: { id_cola: colaId, estado: estado as any },
      skip: options?.skip,
      take: options?.take,
      orderBy: { numero_turno: 'asc' },
    });
  }

  async getNextNumeroTurno(colaId: number): Promise<number> {
    const lastTurno = await this.prisma.turno.findFirst({
      where: { id_cola: colaId },
      orderBy: { numero_turno: 'desc' },
      select: { numero_turno: true },
    });

    return (lastTurno?.numero_turno ?? 0) + 1;
  }

  async create(data: CreateTurnoDTO): Promise<TurnoRepositoryResult> {
    const numeroTurno = await this.getNextNumeroTurno(data.id_cola);

    return this.prisma.turno.create({
      data: {
        id_cola: data.id_cola,
        id_cliente: data.id_cliente,
        numero_turno: numeroTurno,
        estado: 'EN_ESPERA' as any,
      },
    });
  }

  async update(id: number, data: UpdateTurnoDTO): Promise<TurnoRepositoryResult | null> {
    return this.prisma.turno
      .update({
        where: { id_turno: id },
        data: {
          ...(data.estado && { estado: data.estado as any }),
          ...(data.fecha_hora_llamada && {
            fecha_hora_llamada: data.fecha_hora_llamada,
          }),
          ...(data.fecha_hora_inicio_atencion && {
            fecha_hora_inicio_atencion: data.fecha_hora_inicio_atencion,
          }),
          ...(data.fecha_hora_fin_atencion && {
            fecha_hora_fin_atencion: data.fecha_hora_fin_atencion,
          }),
        },
      })
      .catch(() => null);
  }

  async delete(id: number): Promise<boolean> {
    try {
      await this.prisma.turno.delete({
        where: { id_turno: id },
      });
      return true;
    } catch {
      return false;
    }
  }

  async count(): Promise<number> {
    return this.prisma.turno.count();
  }

  async countByColaId(colaId: number): Promise<number> {
    return this.prisma.turno.count({
      where: { id_cola: colaId },
    });
  }

  async countByEstado(
    estado: 'EN_ESPERA' | 'EN_ATENCION' | 'FINALIZADO' | 'CANCELADO'
  ): Promise<number> {
    return this.prisma.turno.count({
      where: { estado: estado as any },
    });
  }
}
