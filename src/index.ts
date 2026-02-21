import 'reflect-metadata';
import 'express-async-errors';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
// import { AppDataSource } from "./config/database"; // ✅ (ANTERIOR - TypeORM)
import { initializeDatabase, closeDatabase, getPoolStats } from './db'; // ✅ (NUEVO - Drizzle)
import { cacheService } from './services/cache.service';
import { errorHandler } from './middlewares/error.middleware';
import { notFoundHandler } from './middlewares/notFound.middleware';
import { rateLimiter } from './middlewares/rateLimit.middleware';
import logger from './utils/logger';
import { config } from './config/env'; // ⬅️ te faltaba en tu snippet, dices que ya existe
import { swaggerSpec } from './config/swagger';

// Routers
import authRouter from './modules/auth/auth.routes';
import condominiosRouter from './modules/condominios/condominios.routes';
import unidadesRouter from './modules/unidades/unidades.routes';
import usuariosRouter from './modules/usuarios/usuarios.routes';
import pagosRouter from './modules/pagos/pagos.routes';
import reservacionesRouter from './modules/reservaciones/reservaciones.routes';
import asambleasRouter from './modules/asambleas/asambleas.routes';
import comitesRouter from './modules/comites/comites.routes';
import reglamentosRouter from './modules/reglamentos/reglamentos.routes';
import mantenimientoRouter from './modules/mantenimiento/mantenimiento.routes';
import trabajadoresRouter from './modules/trabajadores/trabajadores.routes';
import residentesRouter from './modules/residentes/residentes.routes';
import areasComunesRouter from './modules/areas-comunes/areas-comunes.routes';
import gastosRouter from './modules/gastos/gastos.routes';
import proveedoresRouter from './modules/proveedores/proveedores.routes';
import contratosRouter from './modules/contratos/contratos.routes';
import mensajesRouter from './modules/mensajes/mensajes.routes';
import documentosRouter from './modules/documentos/documentos.routes';
import encuestasRouter from './modules/encuestas/encuestas.routes';
import familiaresRouter from './modules/familiares/familiares.routes';
import visitasRouter from './modules/visitas/visitas.routes';

function initializeMiddlewares(app: Application): void {
  app.disable('x-powered-by');

  // Si tu app está detrás de proxy/load balancer (Heroku, Render, Nginx, etc.)
  // ayuda a que rate-limit / IP funcione mejor:
  app.set('trust proxy', 1);

  // Helmet with CSP relaxed for Swagger UI
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    })
  );
  app.use(cors());

  app.use(compression());

  if (config.nodeEnv === 'development') {
    app.use(morgan('dev'));
  }

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Idealmente NO rate-limit al health
  // (en tu versión decías que podrías moverlo)
  // Lo dejamos para después del health route en initializeRoutes.
}

function initializeRoutes(app: Application): void {
  const apiPrefix = config.apiPrefix;

  // Health check (sin rate limiter)
  app.get('/health', async (req, res) => {
    const cacheHealth = await cacheService.healthCheck();
    res.status(200).json({
      status: 'OK',
      env: config.nodeEnv,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      cache: cacheHealth,
    });
  });

  // Swagger documentation (sin rate limiter)
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Colmena API Documentation',
    })
  );

  // Swagger JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Rate limiting para todo lo demás
  app.use(rateLimiter);

  // API Routes
  app.use(`${apiPrefix}/auth`, authRouter);
  app.use(`${apiPrefix}/condominios`, condominiosRouter);
  app.use(`${apiPrefix}/unidades`, unidadesRouter);
  app.use(`${apiPrefix}/usuarios`, usuariosRouter);
  app.use(`${apiPrefix}/pagos`, pagosRouter);
  app.use(`${apiPrefix}/reservaciones`, reservacionesRouter);
  app.use(`${apiPrefix}/asambleas`, asambleasRouter);
  app.use(`${apiPrefix}/comites`, comitesRouter);
  app.use(`${apiPrefix}/reglamentos`, reglamentosRouter);
  app.use(`${apiPrefix}/mantenimiento`, mantenimientoRouter);
  app.use(`${apiPrefix}/trabajadores`, trabajadoresRouter);
  app.use(`${apiPrefix}/residentes`, residentesRouter);
  app.use(`${apiPrefix}/areas-comunes`, areasComunesRouter);
  app.use(`${apiPrefix}/gastos`, gastosRouter);
  app.use(`${apiPrefix}/proveedores`, proveedoresRouter);
  app.use(`${apiPrefix}/contratos`, contratosRouter);
  app.use(`${apiPrefix}/mensajes`, mensajesRouter);
  app.use(`${apiPrefix}/documentos`, documentosRouter);
  app.use(`${apiPrefix}/encuestas`, encuestasRouter);
  app.use(`${apiPrefix}/familiares`, familiaresRouter);
  app.use(`${apiPrefix}/visitas`, visitasRouter);

  app.use(notFoundHandler);
}

function initializeErrorHandling(app: Application): void {
  app.use(errorHandler);
}

/**
 * Crea la instancia de Express totalmente configurada (middlewares + rutas + errores)
 * No arranca el servidor ni toca la base de datos.
 */
export function createApp(): Application {
  const app = express();
  initializeMiddlewares(app);
  initializeRoutes(app);
  initializeErrorHandling(app);
  return app;
}

/**
 * Bootstrap principal: conecta DB y levanta el servidor HTTP
 */
async function startServer(): Promise<void> {
  try {
    // ✅ NUEVO (Drizzle)
    await initializeDatabase();

    // Initialize Redis cache
    await cacheService.initialize();

    const app = createApp();

    const server = app.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port}`);
      logger.info(
        `📚 API available at http://localhost:${config.port}${config.apiPrefix}`
      );
      logger.info(`🏥 Health check at http://localhost:${config.port}/health`);
      logger.info(
        `📖 Swagger docs at http://localhost:${config.port}/api-docs`
      );
    });

    server.on('error', (error) => {
      logger.error('❌ Server error:', error);
    });

    // Shutdown limpio (opcional pero recomendado)
    const shutdown = async (signal: string) => {
      logger.info(`🛑 Received ${signal}. Shutting down gracefully...`);

      // Log current pool stats before shutdown
      const poolStats = getPoolStats();
      logger.info(
        `📊 Current pool stats - Total: ${poolStats.total}, Idle: ${poolStats.idle}, Waiting: ${poolStats.waiting}`
      );

      server.close(async () => {
        try {
          await closeDatabase();
          await cacheService.close();
          logger.info('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds if graceful shutdown fails
      setTimeout(() => {
        logger.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error('❌ Unhandled server startup error:', err);
    process.exit(1);
  }
}

startServer().catch((err) => {
  logger.error('❌ Fatal error on startup:', err);
  process.exit(1);
});
