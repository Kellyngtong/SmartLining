import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const method = req.method;
    const path = req.path;
    const statusCode = res.statusCode;

    const logLevel = statusCode >= 400 ? 'warn' : statusCode >= 300 ? 'info' : 'debug';

    const logMessage = `${method} ${path} ${statusCode} ${duration}ms`;

    if (logLevel === 'warn') {
      logger.warn(logMessage);
    } else if (logLevel === 'info') {
      logger.info(logMessage);
    } else {
      logger.debug(logMessage);
    }
  });

  next();
};
