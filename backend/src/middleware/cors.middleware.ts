import { Request, Response, NextFunction } from 'express';

export const corsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Priority:
  // 1. If CORS_ORIGIN env var is '*', allow all origins (no credentials header).
  // 2. If CORS_ORIGIN is a specific origin, use it.
  // 3. Otherwise, echo request Origin (useful for localhost/IP during dev).
  const envOrigin = process.env.CORS_ORIGIN;
  let originToSet = '*';

  if (envOrigin && envOrigin !== '*') {
    originToSet = envOrigin;
  } else if (envOrigin === '*') {
    // If wildcard is requested but credentials are enabled, echo the request Origin
    // so cookies/credentials can be used by the browser.
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

  // Only set credentials when origin is not '*' and when CORS_CREDENTIALS is enabled
  const allowCredentials = process.env.CORS_CREDENTIALS === 'true' && originToSet !== '*';
  if (allowCredentials) {
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  // Vary on Origin to prevent caching intermediaries serving responses with wrong CORS headers
  res.header('Vary', 'Origin');

  res.header('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
};
