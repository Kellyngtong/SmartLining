import 'dotenv/config';

export const environment = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  // Default to 0.0.0.0 in development so the server is reachable on the LAN
  HOST: process.env.HOST || '0.0.0.0',

  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  CORS_CREDENTIALS: process.env.CORS_CREDENTIALS === 'true',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // WebSocket
  WEBSOCKET_PORT: parseInt(process.env.WEBSOCKET_PORT || '3001', 10),

  // Features
  ENABLE_SOCKET_IO: process.env.ENABLE_SOCKET_IO === 'true',
  // API URL (optional) - can be used to expose the host/ip for clients
  API_URL: process.env.API_URL || undefined,
};

export const isDevelopment = environment.NODE_ENV === 'development';
export const isProduction = environment.NODE_ENV === 'production';
