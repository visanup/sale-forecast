import express, { RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

import { authRoutes } from './routes/auth.routes';
import { healthRoutes } from './routes/health.routes';
import { internalRoutes } from './routes/internal.routes';
import { apiKeyRoutes } from './routes/apiKey.routes';
import { profileRoutes } from './routes/profile.routes';
import { adminRouter } from './routes/admin';
import { errorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logging.middleware';
import { config } from './config/config';
import { createRedisLogger } from './utils/redis-logger';

// Initialize Redis logger
export const logger = createRedisLogger('auth-service', config.logLevel);

const app = express();

// Basic middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: config.corsCredentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Logging
app.use(morgan('combined'));
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests'
    }
  }
});
app.use(limiter);

// Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Auth Service API',
      description: 'Authentication and Authorization Service for Microplate AI',
      version: '1.0.0'
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.ts', './src/schemas/*.ts']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use(
  '/docs',
  swaggerUi.serve as unknown as RequestHandler,
  swaggerUi.setup(swaggerSpec, { explorer: true }) as unknown as RequestHandler
);

// Routes
app.use('/', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/api-keys', apiKeyRoutes);
app.use('/admin', adminRouter);
app.use('/internal', internalRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  });
});

// Start server
const start = async () => {
  try {
    app.listen(config.port, '0.0.0.0', () => {
      console.log(`Auth service running on port ${config.port}`);
      console.log(`API documentation available at http://localhost:${config.port}/docs`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

start();
