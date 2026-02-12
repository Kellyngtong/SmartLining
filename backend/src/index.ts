import express from 'express';
import path from 'path';
import { environment } from './config/environment';
import { logger } from './config/logger';
import prisma from './config/prisma';

// Middleware imports
import { corsMiddleware } from './middleware/cors.middleware';
import { requestLoggerMiddleware } from './middleware/logger.middleware';
import { createRateLimitMiddleware } from './middleware/rateLimit.middleware';

// Route imports
import authRoutes from './routes/auth.routes';
import healthRoutes from './routes/health.routes';
import colaController from './controllers/cola.controller';
import turnoController from './controllers/turno.controller';
import usuarioController from './controllers/usuario.controller';
import eventoController from './controllers/evento.controller';
import horarioColaController from './controllers/horarioCola.controller';
import atencionController from './controllers/atencion.controller';
import valoracionController from './controllers/valoracion.controller';

const app = express();

// ============================================
// Middleware Setup
// ============================================

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS middleware
app.use(corsMiddleware);

// Request logger middleware
app.use(requestLoggerMiddleware);

// Rate limiting middleware
app.use(
  createRateLimitMiddleware(environment.RATE_LIMIT_WINDOW_MS, environment.RATE_LIMIT_MAX_REQUESTS)
);

// ============================================
// Static Files Serving (Frontend)
// ============================================

const publicPath = path.join(__dirname, '../../public');
app.use(express.static(publicPath));

// ============================================
// Routes Setup
// ============================================

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/colas', colaController);
app.use('/api/turnos', turnoController);
app.use('/api/usuarios', usuarioController);
app.use('/api/eventos', eventoController);
app.use('/api/horarios-cola', horarioColaController);
app.use('/api/atenciones', atencionController);
app.use('/api/valoraciones', valoracionController);

// SPA fallback: todas las rutas no-API van al index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// ============================================
// Global Error Handler
// ============================================

app.use((req, res) => {
  // Para rutas no API, servir index.html (SPA)
  if (!req.path.startsWith('/api')) {
    return res.sendFile(path.join(publicPath, 'index.html'));
  }

  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// ============================================
// Server Startup
// ============================================

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ Database connected successfully');

    // Start Express server (listen on 0.0.0.0 in containers, but report as localhost)
    const listenHost = process.env.DOCKER ? '0.0.0.0' : environment.HOST;
    app.listen(environment.PORT, listenHost, () => {
      logger.info(`
╔════════════════════════════════════════╗
║  SmartLining Server Starting...        ║
╠════════════════════════════════════════╣
║  Environment: ${environment.NODE_ENV.toUpperCase().padEnd(27)}║
║  Host: ${`${environment.HOST}:${environment.PORT}`.padEnd(37)}║
║  Database: ${environment.DATABASE_URL ? 'Connected' : 'Not configured'} ${environment.DATABASE_URL ? '' : ''.padEnd(18)}║
╚════════════════════════════════════════╝
      `);

      logger.info(`🚀 Server is ready at http://${environment.HOST}:${environment.PORT}`);
      logger.info(`📡 API routes available at http://${environment.HOST}:${environment.PORT}/api`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start the server
startServer();

export default app;
