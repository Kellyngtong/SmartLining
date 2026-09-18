import { Zona } from '@prisma/client';
import { BaseRepository } from './base.repository';

export interface CreateZonaDTO {
  id_cola: number;
  nombre: string;
  tipo?: 'SALA' | 'TERRAZA' | 'BARRA' | 'VIP' | 'EXTERIOR' | 'PRIVADO';
  orden?: number;
  activa?: boolean;
}

export interface UpdateZonaDTO {
  nombre?: string;
  tipo?: 'SALA' | 'TERRAZA' | 'BARRA' | 'VIP' | 'EXTERIOR' | 'PRIVADO';
  orden?: number;
  activa?: boolean;
}

export interface ZonaConMesas extends Zona {
  mesas?: Array<{ id_mesa: number; numero: number }>;
  num_mesas?: number;
}

export class ZonaRepository extends BaseRepository<Zona, CreateZonaDTO, UpdateZonaDTO> {
  async findById(id: number): Promise<Zona | null> {
    return this.prisma.zona.findUnique({ where: { id_zona: id } });
  }

  async findAll(options?: { skip?: number; take?: number }): Promise<Zona[]> {
    return this.prisma.zona.findMany({
      skip: options?.skip,
      take: options?.take,
      orderBy: { orden: 'asc' },
    });
  }

  async findZonasByCola(colaId: number): Promise<ZonaConMesas[]> {
    return this.prisma.zona.findMany({
      where: { id_cola: colaId },
      orderBy: [{ orden: 'asc' }, { id_zona: 'asc' }],
      include: {
        mesas: {
          where: { activa: true },
          select: { id_mesa: true, numero: true },
          orderBy: { numero: 'asc' },
        },
      },
    });
  }

  async create(data: CreateZonaDTO): Promise<Zona> {
    return this.prisma.zona.create({
      data: {
        id_cola: data.id_cola,
        nombre: data.nombre,
        tipo: (data.tipo as any) ?? 'SALA',
        orden: data.orden ?? 0,
        activa: data.activa ?? true,
      },
    });
  }

  async update(id: number, data: UpdateZonaDTO): Promise<Zona | null> {
    return this.prisma.zona
      .update({
        where: { id_zona: id },
        data: {
          ...(data.nombre !== undefined && { nombre: data.nombre }),
          ...(data.tipo !== undefined && { tipo: data.tipo as any }),
          ...(data.orden !== undefined && { orden: data.orden }),
          ...(data.activa !== undefined && { activa: data.activa }),
        },
      })
      .catch(() => null);
  }

  async delete(id: number): Promise<boolean> {
    try {
      // Al eliminar la zona, las mesas quedan sin zona (id_zona = null)
      await this.prisma.$transaction([
        this.prisma.mesa.updateMany({ where: { id_zona: id }, data: { id_zona: null } }),
        this.prisma.zona.delete({ where: { id_zona: id } }),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  async asignarMesas(zonaId: number, mesaIds: number[]): Promise<number> {
    const result = await this.prisma.mesa.updateMany({
      where: { id_mesa: { in: mesaIds } },
      data: { id_zona: zonaId },
    });
    return result.count;
  }

  async count(): Promise<number> {
    return this.prisma.zona.count();
  }
}