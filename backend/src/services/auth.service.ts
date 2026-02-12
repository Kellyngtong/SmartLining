import bcrypt from 'bcrypt';
import { JwtService, JwtPayload } from './jwt.service';
import prisma from '../config/prisma';
import { logger } from '../config/logger';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id_usuario: number;
    nombre: string;
    email: string;
    rol: string;
    activo: boolean;
    fecha_creacion: string;
  };
}

export class AuthService {
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    const { email, password } = credentials;

    const user = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!user) {
      logger.warn(`Login attempt with non-existent email: ${email}`);
      throw new Error('Invalid credentials');
    }

    if (!user.activo) {
      logger.warn(`Login attempt with inactive user: ${email}`);
      throw new Error('User account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      logger.warn(`Failed login attempt for user: ${email}`);
      throw new Error('Invalid credentials');
    }

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      userId: user.id_usuario.toString(),
      email: user.email,
      role: user.rol,
    };

    const token = JwtService.generateToken(payload);

    logger.info(`User logged in: ${email}`);

    return {
      token,
      user: {
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        activo: user.activo,
        fecha_creacion: user.fecha_creacion.toISOString(),
      },
    };
  }

  static async validateToken(token: string): Promise<JwtPayload> {
    return JwtService.verifyToken(token);
  }

  static async getUserFromToken(token: string) {
    const payload = await this.validateToken(token);

    const user = await prisma.usuario.findUnique({
      where: { id_usuario: parseInt(payload.userId) },
      select: {
        id_usuario: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
      },
    });

    if (!user || !user.activo) {
      throw new Error('User not found or inactive');
    }

    return {
      id: user.id_usuario.toString(),
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    };
  }
}
