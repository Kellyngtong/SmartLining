import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { environment } from '../config/environment';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export class JwtService {
  static generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    const secret = environment.JWT_SECRET || 'default-secret';
    return jwt.sign(payload, secret, {
      expiresIn: environment.JWT_EXPIRES_IN || '24h',
      algorithm: 'HS256',
    } as SignOptions);
  }

  static verifyToken(token: string): JwtPayload {
    try {
      const secret = environment.JWT_SECRET || 'default-secret';
      return jwt.verify(token, secret, {
        algorithms: ['HS256'],
      } as VerifyOptions) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  static decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload | null;
    } catch {
      return null;
    }
  }

  static isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return true;

    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
  }
}
