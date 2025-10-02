import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import pinoHttp from 'pino-http';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/config';
import { apiKeyAuth } from './middleware/apiKeyAuth';
import { dimRouter } from './routes/dim.routes';
import { createRedisLogger } from './utils/redis-logger';

const logger = createRedisLogger('dim-service', process.env['LOG_LEVEL'] || 'info');
const app = express();
app.use(pinoHttp({ logger, genReqId: (req, res) => (req.headers['x-request-id'] as string) || crypto.randomUUID() }));

const ALLOW_ORIGINS = (process.env['ALLOW_ORIGINS'] || '*').split(',').map(s=>s.trim());
app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;
  if (!origin || ALLOW_ORIGINS.includes('*') || ALLOW_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.use((req, res, next) => {
  const rid = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  res.setHeader('x-request-id', rid);
  (req as any).requestId = rid;
  next();
});

app.use(helmet());
app.use(cors({ origin: config.corsOrigins.length ? config.corsOrigins : true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/v1/dim', apiKeyAuth, dimRouter);

app.get('/openapi.json', (_req, res) => {
  const spec = {
    "openapi": "3.0.3",
    "info": { "title": "Dim Service API", "version": "v1" },
    "servers": [{ "url": "/" }],
    "paths": {
      "/health": { "get": { "summary": "Health check", "responses": { "200": { "description": "OK" } } } },
      "/v1/dim/companies": {
        "get": {
          "summary": "List companies",
          "security": [{ "ApiKeyAuth": [] }],
          "responses": { "200": { "description": "OK" } }
        }
      },
      "/v1/dim/depts": {
        "get": {
          "summary": "List departments",
          "security": [{ "ApiKeyAuth": [] }],
          "responses": { "200": { "description": "OK" } }
        }
      },
      "/v1/dim/distribution-channels": {
        "get": {
          "summary": "List distribution channels",
          "security": [{ "ApiKeyAuth": [] }],
          "responses": { "200": { "description": "OK" } }
        }
      },
      "/v1/dim/materials": {
        "get": {
          "summary": "List materials",
          "security": [{ "ApiKeyAuth": [] }],
          "responses": { "200": { "description": "OK" } }
        }
      }
    },
    "components": {
      "securitySchemes": {
        "ApiKeyAuth": {
          "type": "apiKey",
          "in": "header",
          "name": "x-api-key"
        }
      }
    }
  };
  res.json(spec);
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'unhandled error');
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'unexpected error' } });
});

app.listen(config.port, () => logger.info({ port: config.port }, 'dim-service listening'));
