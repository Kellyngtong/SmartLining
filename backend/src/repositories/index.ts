export { BaseRepository, getPaginationParams, formatPaginatedResponse } from './base.repository';
export {
  UsuarioRepository,
  type CreateUsuarioDTO,
  type UpdateUsuarioDTO,
  type UsuarioRepositoryResult,
} from './usuario.repository';
export {
  ColaRepository,
  type CreateColaDTO,
  type UpdateColaDTO,
  type ColaRepositoryResult,
  type ColaWithHorariosResult,
} from './cola.repository';
export {
  TurnoRepository,
  type CreateTurnoDTO,
  type UpdateTurnoDTO,
  type TurnoRepositoryResult,
  type TurnoWithDetailsResult,
} from './turno.repository';

import { PrismaClient } from '@prisma/client';
import { UsuarioRepository } from './usuario.repository';
import { ColaRepository } from './cola.repository';
import { TurnoRepository } from './turno.repository';

/**
 * Repository Factory - Central point for managing all repositories
 * Ensures single instance of each repository per Prisma client
 */
export class RepositoryFactory {
  private usuarioRepository: UsuarioRepository;
  private colaRepository: ColaRepository;
  private turnoRepository: TurnoRepository;

  constructor(private prisma: PrismaClient) {
    this.usuarioRepository = new UsuarioRepository(prisma);
    this.colaRepository = new ColaRepository(prisma);
    this.turnoRepository = new TurnoRepository(prisma);
  }

  getUsuarioRepository(): UsuarioRepository {
    return this.usuarioRepository;
  }

  getColaRepository(): ColaRepository {
    return this.colaRepository;
  }

  getTurnoRepository(): TurnoRepository {
    return this.turnoRepository;
  }
}
