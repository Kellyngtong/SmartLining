import { PrismaClient } from '@prisma/client';
import { BaseRepository } from './base.repository';

export { BaseRepository, getPaginationParams, formatPaginatedResponse } from './base.repository';
export { ColaRepository } from './cola.repository';
export { TurnoRepository } from './turno.repository';
export { UsuarioRepository } from './usuario.repository';
export { MesaRepository } from './mesa.repository';
