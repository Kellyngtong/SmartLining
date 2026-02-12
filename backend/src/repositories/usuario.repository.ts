import { PrismaClient } from '@prisma/client';
import { BaseRepository } from './base.repository';

export interface CreateUsuarioDTO {
  nombre: string;
  email: string;
  password_hash: string;
  rol: 'ADMINISTRADOR' | 'EMPLEADO';
  activo?: boolean;
}

export interface UpdateUsuarioDTO {
  nombre?: string;
  email?: string;
  rol?: 'ADMINISTRADOR' | 'EMPLEADO';
  activo?: boolean;
  password_hash?: string;
}

export interface UsuarioRepositoryResult {
  id_usuario: number;
  nombre: string;
  email: string;
  password_hash: string;
  rol: 'ADMINISTRADOR' | 'EMPLEADO';
  activo: boolean;
  fecha_creacion: Date;
}

export class UsuarioRepository extends BaseRepository<
  UsuarioRepositoryResult,
  CreateUsuarioDTO,
  UpdateUsuarioDTO
> {
  async findById(id: number): Promise<UsuarioRepositoryResult | null> {
    return this.prisma.usuario.findUnique({
      where: { id_usuario: id },
    });
  }

  async findByEmail(email: string): Promise<UsuarioRepositoryResult | null> {
    return this.prisma.usuario.findUnique({
      where: { email },
    });
  }

  async findAll(options?: { skip?: number; take?: number }): Promise<UsuarioRepositoryResult[]> {
    return this.prisma.usuario.findMany({
      skip: options?.skip,
      take: options?.take,
      orderBy: { fecha_creacion: 'desc' },
    });
  }

  async findByRole(
    rol: 'ADMINISTRADOR' | 'EMPLEADO',
    options?: { skip?: number; take?: number }
  ): Promise<UsuarioRepositoryResult[]> {
    return this.prisma.usuario.findMany({
      where: { rol },
      skip: options?.skip,
      take: options?.take,
      orderBy: { fecha_creacion: 'desc' },
    });
  }

  async findActive(options?: { skip?: number; take?: number }): Promise<UsuarioRepositoryResult[]> {
    return this.prisma.usuario.findMany({
      where: { activo: true },
      skip: options?.skip,
      take: options?.take,
      orderBy: { fecha_creacion: 'desc' },
    });
  }

  async create(data: CreateUsuarioDTO): Promise<UsuarioRepositoryResult> {
    return this.prisma.usuario.create({
      data: {
        nombre: data.nombre,
        email: data.email,
        password_hash: data.password_hash,
        rol: data.rol,
        activo: data.activo ?? true,
      },
    });
  }

  async update(id: number, data: UpdateUsuarioDTO): Promise<UsuarioRepositoryResult | null> {
    return this.prisma.usuario
      .update({
        where: { id_usuario: id },
        data: {
          ...(data.nombre && { nombre: data.nombre }),
          ...(data.email && { email: data.email }),
          ...(data.password_hash && { password_hash: data.password_hash }),
          ...(data.rol && { rol: data.rol }),
          ...(data.activo !== undefined && { activo: data.activo }),
        },
      })
      .catch(() => null);
  }

  async delete(id: number): Promise<boolean> {
    try {
      await this.prisma.usuario.delete({
        where: { id_usuario: id },
      });
      return true;
    } catch {
      return false;
    }
  }

  async count(): Promise<number> {
    return this.prisma.usuario.count();
  }

  async countByRole(rol: 'ADMINISTRADOR' | 'EMPLEADO'): Promise<number> {
    return this.prisma.usuario.count({
      where: { rol },
    });
  }

  async countActive(): Promise<number> {
    return this.prisma.usuario.count({
      where: { activo: true },
    });
  }
}
