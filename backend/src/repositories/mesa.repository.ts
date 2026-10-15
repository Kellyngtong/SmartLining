import { PrismaClient, MesaEstado } from '@prisma/client';
import { BaseRepository } from './base.repository';

export interface CreateMesaDTO {
  numero: number;
  capacidad: number;
  id_cola: number;
  estado?: MesaEstado;
}

export interface UpdateMesaDTO {
  numero?: number;
  capacidad?: number;
  capacidad_extra?: number;
  estado?: MesaEstado;
  capacidad_min?: number;
  id_zona?: number | null;
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
  rotation?: number;
  shape?: 'REDONDA' | 'CUADRADA' | 'RECTANGULAR';
  notas?: string | null;
  activa?: boolean;
}

export interface MesaRepositoryResult {
  id_mesa: number;
  numero: number;
  capacidad: number;
  capacidad_extra: number;
  estado: MesaEstado;
  id_cola: number;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

export interface MesaGrupoResult {
  id_grupo: number;
  id_cola: number;
  numero: number;
  capacidad_total: number;
  fecha_creacion: Date;
  mesas: MesaRepositoryResult[];
}

export class MesaRepository extends BaseRepository<
  MesaRepositoryResult,
  CreateMesaDTO,
  UpdateMesaDTO
> {
  async findById(id: number): Promise<MesaRepositoryResult | null> {
    return this.prisma.mesa.findUnique({
      where: { id_mesa: id },
    });
  }

  async findAll(options?: { skip?: number; take?: number }): Promise<MesaRepositoryResult[]> {
    return this.prisma.mesa.findMany({
      skip: options?.skip,
      take: options?.take,
      orderBy: { numero: 'asc' },
    });
  }

  async findByCola(colaId: number): Promise<MesaRepositoryResult[]> {
    return this.prisma.mesa.findMany({
      where: { id_cola: colaId },
      orderBy: { numero: 'asc' },
    });
  }

  async findLibresByCola(colaId: number): Promise<MesaRepositoryResult[]> {
    return this.prisma.mesa.findMany({
      where: { id_cola: colaId, estado: 'LIBRE' },
      orderBy: { numero: 'asc' },
    });
  }

  async findLibresByCapacidad(colaId: number, capacidadMin: number): Promise<MesaRepositoryResult[]> {
    // Sin pre-filtro por capacidad base en SQL: una mesa con sillas extra
    // (p. ej. base 10 + 2) también es candidata. Se filtra por efectiva en código,
    // igual que hace getMaxCapacidad.
    const mesas = await this.prisma.mesa.findMany({
      where: {
        id_cola: colaId,
        estado: 'LIBRE',
      },
      orderBy: { capacidad: 'asc' },
    });
    const aptas = mesas.filter((m) => this.getCapacidadEfectiva(m) >= capacidadMin);
    return aptas.sort((a, b) => this.getCapacidadEfectiva(a) - this.getCapacidadEfectiva(b));
  }

  async findOcupadasByCola(colaId: number): Promise<MesaRepositoryResult[]> {
    return this.prisma.mesa.findMany({
      where: { id_cola: colaId, estado: 'OCUPADA' },
      orderBy: { numero: 'asc' },
    });
  }

  async getMaxCapacidad(colaId: number): Promise<number> {
    const result = await this.prisma.mesa.aggregate({
      _max: { capacidad: true },
      where: { id_cola: colaId },
    });
    // Considerar sillas extra (capacidad efectiva)
    const mesas = await this.prisma.mesa.findMany({
      where: { id_cola: colaId },
      select: { capacidad: true, capacidad_extra: true },
    });
    const maxMesa = mesas.reduce((acc, m) => Math.max(acc, m.capacidad + (m.capacidad_extra ?? 0)), 0);
    return Math.max(result._max?.capacidad ?? 0, maxMesa);
  }

  async create(data: CreateMesaDTO): Promise<MesaRepositoryResult> {
    return this.prisma.mesa.create({
      data: {
        numero: data.numero,
        capacidad: data.capacidad,
        id_cola: data.id_cola,
        estado: data.estado ?? 'LIBRE',
      },
    });
  }

  async update(id: number, data: UpdateMesaDTO): Promise<MesaRepositoryResult | null> {
    const updated = await this.prisma.mesa
      .update({
        where: { id_mesa: id },
        data: {
          ...(data.numero !== undefined && { numero: data.numero }),
          ...(data.capacidad !== undefined && { capacidad: data.capacidad }),
          ...(data.capacidad_extra !== undefined && { capacidad_extra: data.capacidad_extra }),
          ...(data.estado !== undefined && { estado: data.estado }),
          ...(data.capacidad_min !== undefined && { capacidad_min: data.capacidad_min }),
          ...(data.id_zona !== undefined && { id_zona: data.id_zona }),
          ...(data.x !== undefined && { x: data.x }),
          ...(data.y !== undefined && { y: data.y }),
          ...(data.width !== undefined && { width: data.width }),
          ...(data.height !== undefined && { height: data.height }),
          ...(data.rotation !== undefined && { rotation: data.rotation }),
          ...(data.shape !== undefined && { shape: data.shape }),
          ...(data.notas !== undefined && { notas: data.notas?.trim() || null }),
          ...(data.activa !== undefined && { activa: data.activa }),
        },
      })
      .catch(() => null);
    if (!updated) return null;
    // Si cambia la capacidad y la mesa está juntada, recalcular el total del grupo
    if (data.capacidad !== undefined || data.capacidad_extra !== undefined) {
      try {
        const link = await this.prisma.mesaGrupoMesa.findFirst({
          where: { id_mesa: id },
          select: { id_grupo: true },
        });
        if (link) {
          const miembros = await this.prisma.mesaGrupoMesa.findMany({
            where: { id_grupo: link.id_grupo },
            select: { id_mesa: true },
          });
          const todas = await this.prisma.mesa.findMany({
            where: { id_mesa: { in: miembros.map((m) => m.id_mesa) } },
          });
          const total = todas.reduce((acc, m) => acc + this.getCapacidadEfectiva(m), 0);
          await this.prisma.mesaGrupo.update({ where: { id_grupo: link.id_grupo }, data: { capacidad_total: total } });
        }
      } catch {
        // no bloquea la edición si el recálculo falla
      }
    }
    return updated;
  }

  async liberarMesa(id: number): Promise<MesaRepositoryResult | null> {
    return this.prisma.mesa
      .update({
        where: { id_mesa: id },
        data: {
          estado: 'LIBRE',
        },
      })
      .catch(() => null);
  }

  async asignarMesa(mesaId: number): Promise<MesaRepositoryResult | null> {
    return this.prisma.mesa
      .update({
        where: { id_mesa: mesaId },
        data: {
          estado: 'OCUPADA',
        },
      })
      .catch(() => null);
  }

  async delete(id: number): Promise<boolean> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const mesa = await tx.mesa.findUnique({ where: { id_mesa: id } });
        if (!mesa) return false;

        // Quitar la mesa de su grupo (si pertenece a uno)
        const link = await tx.mesaGrupoMesa.findFirst({
          where: { id_mesa: id },
          select: { id_grupo: true },
        });
        if (link) {
          await tx.mesaGrupoMesa.deleteMany({ where: { id_mesa: id } });

          // Si el grupo se queda con menos de 2 mesas, se disuelve
          const restantes = await tx.mesaGrupoMesa.count({
            where: { id_grupo: link.id_grupo },
          });
          if (restantes < 2) {
            const grupo = await tx.mesaGrupo.findUnique({
              where: { id_grupo: link.id_grupo },
              include: { mesas: { select: { id_mesa: true } } },
            });
            await tx.mesaGrupo.delete({ where: { id_grupo: link.id_grupo } });
            const ids = grupo?.mesas.map((m) => m.id_mesa) ?? [];
            if (ids.length > 0) {
              await tx.mesa.updateMany({
                where: { id_mesa: { in: ids }, estado: 'AGRUPADA' },
                data: { estado: 'LIBRE' },
              });
            }
          }
        }

        // Desvincular la mesa de los turnos que la tengan como referencia
        await tx.turno.updateMany({
          where: { mesa_id: id },
          data: { mesa_id: null },
        });

        await tx.mesa.delete({ where: { id_mesa: id } });
        return true;
      });
    } catch {
      return false;
    }
  }

  async count(): Promise<number> {
    return this.prisma.mesa.count();
  }

  async countByCola(colaId: number): Promise<number> {
    return this.prisma.mesa.count({
      where: { id_cola: colaId },
    });
  }

  async countLibresByCola(colaId: number): Promise<number> {
    return this.prisma.mesa.count({
      where: { id_cola: colaId, estado: 'LIBRE' },
    });
  }

  // ========================
  // SILLA EXTRA
  // ========================
  // Capacidad efectiva de una mesa (base + sillas extra)
  getCapacidadEfectiva(mesa: { capacidad: number; capacidad_extra: number }): number {
    return mesa.capacidad + (mesa.capacidad_extra ?? 0);
  }

  async addSilla(id: number, cantidad = 1): Promise<MesaRepositoryResult | null> {
    const mesa = await this.findById(id);
    if (!mesa) return null;
    return this.prisma.mesa
      .update({
        where: { id_mesa: id },
        data: { capacidad_extra: mesa.capacidad_extra + cantidad },
      })
      .catch(() => null);
  }

  async removeSilla(id: number, cantidad = 1): Promise<MesaRepositoryResult | null> {
    const mesa = await this.findById(id);
    if (!mesa) return null;
    const nueva = Math.max(0, mesa.capacidad_extra - cantidad);
    return this.prisma.mesa
      .update({
        where: { id_mesa: id },
        data: { capacidad_extra: nueva },
      })
      .catch(() => null);
  }

  // ========================
  // GRUPOS DE MESAS
  // ========================
  async findGrupoByMesa(mesaId: number): Promise<MesaGrupoResult | null> {
    const link = await this.prisma.mesaGrupoMesa.findFirst({
      where: { id_mesa: mesaId },
      include: {
        grupo: {
          include: {
            mesas: { include: { mesa: true } },
          },
        },
      },
    });
    if (!link?.grupo) return null;
    return this.toGrupo(link.grupo);
  }

  async findGrupoById(idGrupo: number): Promise<MesaGrupoResult | null> {
    const grupo = await this.prisma.mesaGrupo.findUnique({
      where: { id_grupo: idGrupo },
      include: {
        mesas: { include: { mesa: true } },
      },
    });
    if (!grupo) return null;
    return this.toGrupo(grupo);
  }

  async findGruposByCola(colaId: number): Promise<MesaGrupoResult[]> {
    const grupos = await this.prisma.mesaGrupo.findMany({
      where: { id_cola: colaId },
      include: {
        mesas: { include: { mesa: true } },
      },
    });
    return grupos.map((g) => this.toGrupo(g));
  }

  // Grupos "disponibles" (ninguna de sus mesas está ocupada ni reservada)
  async findGruposDisponiblesByCola(colaId: number): Promise<MesaGrupoResult[]> {
    const grupos = await this.findGruposByCola(colaId);
    return grupos.filter((g) =>
      g.mesas.every((m) => m.estado === 'AGRUPADA' || m.estado === 'LIBRE')
    );
  }

  async createGrupo(colaId: number, mesaIds: number[]): Promise<MesaGrupoResult | null> {
    const mesas = await this.prisma.mesa.findMany({
      where: { id_mesa: { in: mesaIds } },
    });
    if (mesas.length !== new Set(mesaIds).size) return null;

    // Capacidad total = suma de capacidades efectivas
    const capacidadTotal = mesas.reduce((acc, m) => acc + this.getCapacidadEfectiva(m), 0);
    // Nº de grupo secuencial por cola (Grupo 1, 2, 3...)
    const numeroGrupo = (await this.prisma.mesaGrupo.count({ where: { id_cola: colaId } })) + 1;

    const idGrupo = await this.prisma.$transaction(async (tx) => {
      const grupo = await tx.mesaGrupo.create({
        data: {
          id_cola: colaId,
          numero: numeroGrupo,
          capacidad_total: capacidadTotal,
          mesas: {
            create: mesaIds.map((id) => ({ id_mesa: id })),
          },
        },
        select: { id_grupo: true },
      });
      // Marcar mesas del grupo como AGRUPADA
      await tx.mesa.updateMany({
        where: { id_mesa: { in: mesaIds }, estado: 'LIBRE' },
        data: { estado: 'AGRUPADA' },
      });
      return grupo.id_grupo;
    });

    // Re-consultar para devolver el estado real (mesas AGRUPADA)
    return this.findGrupoById(idGrupo);
  }

  async deleteGrupo(idGrupo: number): Promise<boolean> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const grupo = await tx.mesaGrupo.findUnique({
          where: { id_grupo: idGrupo },
          include: { mesas: true },
        });
        if (!grupo) throw new Error('Grupo no encontrado');
        const mesaIds = grupo.mesas.map((m) => m.id_mesa);
        // Primero los miembros (la FK no tiene ON DELETE CASCADE)
        await tx.mesaGrupoMesa.deleteMany({ where: { id_grupo: idGrupo } });
        await tx.mesaGrupo.delete({ where: { id_grupo: idGrupo } });
        // Restaurar mesas del grupo que estén libres a LIBRE
        if (mesaIds.length > 0) {
          await tx.mesa.updateMany({
            where: { id_mesa: { in: mesaIds }, estado: 'AGRUPADA' },
            data: { estado: 'LIBRE' },
          });
        }
      });
      return true;
    } catch {
      return false;
    }
  }

  private toGrupo(g: {
    id_grupo: number;
    id_cola: number;
    numero: number;
    capacidad_total: number;
    fecha_creacion: Date;
    mesas: Array<{ mesa: MesaRepositoryResult }>;
  }): MesaGrupoResult {
    return {
      id_grupo: g.id_grupo,
      id_cola: g.id_cola,
      numero: g.numero,
      capacidad_total: g.capacidad_total,
      fecha_creacion: g.fecha_creacion,
      mesas: g.mesas.map((m) => m.mesa),
    };
  }
}
