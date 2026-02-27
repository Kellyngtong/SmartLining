import 'dotenv/config';
import express from 'express';
import path from 'path';
import { environment, isDevelopment } from './config/environment';
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
import queueInfoController from './controllers/queue-info.controller';
import analyticsController from './controllers/analytics.controller';
import turnoController from './controllers/turno.controller';
import clienteController from './controllers/cliente.controller';
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

// Rate limiting middleware (skip in development to avoid blocking local dev/testing)
if (!isDevelopment) {
  app.use(
    createRateLimitMiddleware(environment.RATE_LIMIT_WINDOW_MS, environment.RATE_LIMIT_MAX_REQUESTS)
  );
} else {
  logger.info('⚠️ Rate limiter disabled in development mode');
}

// ============================================
// Static Files Serving (Frontend)
// ============================================

const publicPath = path.join(__dirname, '../../public');
app.use(express.static(publicPath));

// ============================================
// Routes Setup
// ============================================

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/colas', colaController);
app.use('/api/queue-info', queueInfoController);
app.use('/api/analytics', analyticsController);
logger.info('🔎 Analytics routes mounted at /api/analytics');
// Route to fetch the current ticket associated to cookie `turno_id`.
app.get('/api/turnos/me', async (req, res) => {
  try {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/\bturno_id=([^;\s]+)/);
    const turnoIdStr = match ? match[1] : null;
    if (!turnoIdStr)
      return res.status(400).json({ success: false, error: 'No turno cookie present' });
    const id = parseInt(turnoIdStr, 10);
    if (isNaN(id))
      return res.status(400).json({ success: false, error: 'Invalid turno id in cookie' });

    const turno = await prisma.turno.findUnique({
      where: { id_turno: id },
      include: { cliente: true },
    });
    if (!turno) return res.status(404).json({ success: false, error: 'Ticket not found' });

    // Compute simple ETA using average as in queue-info
    const colaId = turno.id_cola;
    const turnosActivos = await prisma.turno.findMany({
      where: { id_cola: colaId, estado: { in: ['EN_ESPERA', 'EN_ATENCION'] } },
      orderBy: { fecha_hora_creacion: 'asc' },
    });
    const turnosEnEspera = turnosActivos.filter((t) => t.estado === 'EN_ESPERA');
    const miPosicion = turnosEnEspera.findIndex((t) => t.id_turno === turno.id_turno) + 1 || 1;

    let tiempoPromedioPorTurno = 5;
    try {
      const agg = await prisma.atencion.aggregate({
        _avg: { duracion_atencion: true },
        where: { duracion_atencion: { not: null }, turno: { id_cola: colaId } },
      });
      const avgSeconds = agg._avg?.duracion_atencion ?? null;
      if (avgSeconds && avgSeconds > 0) {
        tiempoPromedioPorTurno = Math.max(1, Math.round((avgSeconds / 60) * 100) / 100);
      }
    } catch (e) {
      // ignore
    }
    const tiempoEstimado = miPosicion > 0 ? (miPosicion - 1) * tiempoPromedioPorTurno : 0;

    return res.json({
      success: true,
      data: {
        turno,
        queue: { id_cola: colaId },
        userInfo: {
          turnoId: turno.id_turno,
          numeroDeTurno: turno.numero_turno,
          clienteNombre: turno.cliente?.nombre,
          estado: turno.estado,
          miPosicion,
          tiempoEstimadoMinutos: tiempoEstimado,
        },
      },
    });
  } catch (error) {
    logger.error('Error in /api/turnos/me route', error);
    return res.status(500).json({ success: false, error: 'Error fetching ticket' });
  }
});

app.use('/api/turnos', turnoController);
app.use('/api/clientes', clienteController);
app.use('/api/usuarios', usuarioController);
app.use('/api/eventos', eventoController);
app.use('/api/horarios-cola', horarioColaController);
app.use('/api/atenciones', atencionController);
app.use('/api/valoraciones', valoracionController);

// Debug helpers: collect routes including parent mount prefixes
function collectRoutes(appInstance: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stack: any[] = appInstance._router?.stack || [];
  const routes: string[] = [];

  const getPrefixFromLayer = (layer: any) => {
    if (!layer || !layer.regexp) return '';
    // crude sanitization of regexp to a readable prefix
    try {
      let s = layer.regexp.source || '';
      s = s.replace(/\\\//g, '/');
      s = s.replace(/\^|\$|\\\/?\?\:|\(\?:\^|\)\??/g, '');
      s = s.replace(/\(\?:\(.*\)\)/g, '');
      if (s && s !== '') return s;
    } catch (e) {
      // ignore and return empty
    }
    return '';
  };

  const traverse = (stackList: any[], prefix = '') => {
    stackList.forEach((layer) => {
      if (layer.route && layer.route.path) {
        const methods =
          Object.keys(layer.route.methods || {})
            .join(',')
            .toUpperCase() || 'ALL';
        routes.push(`${methods} ${prefix}${layer.route.path}`);
      } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        const layerPrefix = getPrefixFromLayer(layer) || '';
        traverse(layer.handle.stack, prefix + layerPrefix);
      }
    });
  };

  traverse(stack, '');
  return routes;
}

// Debug: list registered routes (only in development)
if (environment.NODE_ENV === 'development') {
  app.get('/api/_routes', (req, res) => {
    const routes = collectRoutes(app);
    res.json({ routes });
  });
}

// Force debug route (always available) to list mounted routes
app.get('/api/_routes_force', (req, res) => {
  const routes = collectRoutes(app);
  res.json({ routes });
});

// SPA fallback: todas las rutas no-API van al index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// ============================================
// Global Error Handler
// ============================================
// Express error middleware: log error, respond 500, but do not crash process
// (Must be defined before the 404 catch-all)
app.use((err: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error in request', err && (err.stack || err));
  try {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    } else {
      next(err);
    }
  } catch (e) {
    // If response handling fails, at least log and continue
    logger.error('Error while sending error response', e);
  }
});

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

let server: import('http').Server;

const startServer = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ Database connected successfully');

    const listenHost = environment.HOST || '0.0.0.0';

    server = app.listen(environment.PORT, listenHost);

    server.on('listening', () => {
      const displayHost = listenHost === '0.0.0.0' ? 'localhost' : listenHost;

      logger.info(`
╔════════════════════════════════════════╗
║  SmartLining Server Starting...        ║
╠════════════════════════════════════════╣
║  Environment: ${environment.NODE_ENV.toUpperCase().padEnd(27)}║
║  Host: ${`${displayHost}:${environment.PORT}`.padEnd(37)}║
║  Database: ${environment.DATABASE_URL ? 'Connected' : 'Not configured'}║
╚════════════════════════════════════════╝
      `);

      logger.info(`🚀 Server is ready at http://${displayHost}:${environment.PORT}`);
      logger.info(`📡 API routes available at http://${displayHost}:${environment.PORT}/api`);
    });

    server.on('error', (err) => {
      logger.error('Server error:', err);
    });
  } catch (error: unknown) {
    logger.error(
      '❌ Failed to start server (startup error)',
      error instanceof Error ? error.stack || error.message : error
    );
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

// Prevent process from exiting on unhandled exceptions/rejections during development
process.on('uncaughtException', (err: unknown) => {
  logger.error(
    'Uncaught Exception - process will not exit',
    err instanceof Error ? err.stack || err.message : err
  );
  // Intentionally do not call process.exit to keep server up for debugging
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error(
    'Unhandled Rejection - promise rejected and not handled',
    reason instanceof Error ? reason.stack || reason.message : reason
  );
  // Intentionally do not call process.exit
});

// Start the server
startServer();

export default app;
