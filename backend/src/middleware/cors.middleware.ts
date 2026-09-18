import { Request, Response, NextFunction } from 'express';

const isAllowedOrigin = (origin: string | undefined, allowed: string[]): boolean =>
  !!origin && (allowed.includes('*') || allowed.includes(origin));

export const corsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const envOrigin = process.env.CORS_ORIGIN;
  const allowedOrigins = envOrigin && envOrigin !== '*'
    ? envOrigin.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  let originToSet = '*';

  if (allowedOrigins.length > 0) {
    originToSet = isAllowedOrigin(req.headers.origin, allowedOrigins)
      ? (req.headers.origin as string)
      : allowedOrigins[0];
  } else if (envOrigin === '*') {
    if (process.env.CORS_CREDENTIALS === 'true' && req.headers.origin) {
      originToSet = req.headers.origin as string;
    } else {
      originToSet = '*';
    }
  } else if (req.headers.origin) {
    originToSet = req.headers.origin as string;
  } else if (process.env.FRONT_URL) {
    originToSet = process.env.FRONT_URL;
  }

  res.header('Access-Control-Allow-Origin', originToSet);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');

  const allowCredentials = process.env.CORS_CREDENTIALS === 'true' && originToSet !== '*';
  if (allowCredentials) {
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  res.header('Vary', 'Origin');

  res.header('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
};
