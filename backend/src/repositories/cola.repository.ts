import { PrismaClient } from '@prisma/client';
import { BaseRepository } from './base.repository';

export interface CreateColaDTO {
  nombre: string;
  descripcion?: string;
  activa?: boolean;
  id_empresa: number;
  tipo?: string;
}

export interface UpdateColaDTO {
  nombre?: string;
  descripcion?: string;
  activa?: boolean;
  tipo?: string;
}

export interface ColaRepositoryResult {
  id_cola: number;
  id_empresa: number;
  nombre: string;
  descripcion: string | null;
  tipo: string;
  activa: boolean;
  fecha_creacion: Date;
}

export interface ColaWithHorariosResult extends ColaRepositoryResult {
  horarios?: Array<{
    id_horario: number;
    dia_semana: string;
    hora_inicio: Date;
    hora_fin: Date;
  }>;
  eventos?: Array<{
    id_evento: number;
    tipo: string;
    nombre: string;
  }>;
}

export class ColaRepository extends BaseRepository<
  ColaRepositoryResult,
  CreateColaDTO,
  UpdateColaDTO
> {
  async findById(id: number): Promise<ColaRepositoryResult | null> {
    return this.prisma.cola.findUnique({
      where: { id_cola: id },
    });
  }

  async findByIdWithDetails(id: number): Promise<ColaWithHorariosResult | null> {
    const cola = await this.prisma.cola.findUnique({
      where: { id_cola: id },
      include: {
        horarios: {
          select: {
            id_horario: true,
            dia_semana: true,
            hora_inicio: true,
            hora_fin: true,
          },
        },
        eventos: {
          include: {
            evento: {
              select: {
                id_evento: true,
                tipo: true,
                nombre: true,
              },
            },
          },
        },
      },
    });

    if (!cola) return null;

    return {
      ...cola,
      horarios: cola.horarios,
      eventos: cola.eventos.map((ce) => ({
        id_evento: ce.evento.id_evento,
        tipo: ce.evento.tipo,
        nombre: ce.evento.nombre,
      })),
    };
  }

  async findAll(
    options?: { skip?: number; take?: number },
    idEmpresa?: number
  ): Promise<ColaRepositoryResult[]> {
    return this.prisma.cola.findMany({
      where: idEmpresa ? { id_empresa: idEmpresa } : undefined,
      skip: options?.skip,
      take: options?.take,
      orderBy: { fecha_creacion: 'desc' },
    });
  }

  async findActive(
    options?: { skip?: number; take?: number },
    idEmpresa?: number
  ): Promise<ColaRepositoryResult[]> {
    return this.prisma.cola.findMany({
      where: { activa: true, ...(idEmpresa ? { id_empresa: idEmpresa } : {}) },
      skip: options?.skip,
      take: options?.take,
      orderBy: { fecha_creacion: 'desc' },
    });
  }

  async findByNombre(nombre: string): Promise<ColaRepositoryResult | null> {
    return this.prisma.cola.findFirst({
      where: {
        nombre: nombre,
      },
    });
  }

  async create(data: CreateColaDTO): Promise<ColaRepositoryResult> {
    return this.prisma.cola.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        activa: data.activa ?? true,
        tipo: data.tipo ?? 'GENERICA',
        id_empresa: data.id_empresa,
      },
    });
  }

  async update(id: number, data: UpdateColaDTO): Promise<ColaRepositoryResult | null> {
    return this.prisma.cola
      .update({
        where: { id_cola: id },
        data: {
          ...(data.nombre && { nombre: data.nombre }),
          ...(data.descripcion !== undefined && {
            descripcion: data.descripcion,
          }),
          ...(data.activa !== undefined && { activa: data.activa }),
          ...(data.tipo !== undefined && { tipo: data.tipo }),
        },
      })
      .catch(() => null);
  }

  async delete(id: number): Promise<boolean> {
    try {
      await this.prisma.cola.delete({
        where: { id_cola: id },
      });
      return true;
    } catch {
      return false;
    }
  }

  async count(where?: { id_empresa?: number }): Promise<number> {
    return this.prisma.cola.count({ where });
  }

  async countActive(): Promise<number> {
    return this.prisma.cola.count({
      where: { activa: true },
    });
  }
}
