import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../services/jwt.service';
import { AuthService } from '../services/auth.service';
import { logger } from '../config/logger';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        nombre: string;
        rol: string;
      };
      token?: string;
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization header',
      });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const payload = JwtService.verifyToken(token);
      const user = await AuthService.getUserFromToken(token);

      req.user = user;
      req.token = token;

      next();
    } catch (error) {
      logger.warn(`Invalid token attempt`);
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      });
    }
  } catch (error) {
    logger.error('Auth middleware error', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Authentication failed',
    });
  }
};

export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        const user = await AuthService.getUserFromToken(token);
        req.user = user;
        req.token = token;
      } catch {
        // Token is invalid, but continue without auth context
        logger.debug('Optional auth: token validation failed, continuing');
      }
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error', error);
    next();
  }
};
