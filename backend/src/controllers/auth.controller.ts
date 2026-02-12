import { Request, Response } from 'express';
import { AuthService, LoginRequest } from '../services/auth.service';
import { logger } from '../config/logger';

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const credentials: LoginRequest = req.body;

      // Basic validation
      if (!credentials.email || !credentials.password) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Email and password are required',
        });
        return;
      }

      const result = await AuthService.login(credentials);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Login error', error);

      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message === 'Invalid credentials') {
        res.status(401).json({
          error: 'INVALID_CREDENTIALS',
          message: 'Email or password is incorrect',
        });
      } else if (message === 'User account is inactive') {
        res.status(403).json({
          error: 'ACCOUNT_INACTIVE',
          message: 'This user account has been deactivated',
        });
      } else {
        res.status(500).json({
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Login failed',
        });
      }
    }
  }

  static async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: req.user,
      });
    } catch (error) {
      logger.error('Get user error', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get user info',
      });
    }
  }
}
