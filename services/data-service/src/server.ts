import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import pinoHttp from 'pino-http';
import type { HttpLogger } from 'pino-http';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/config.js';
import { apiKeyAuth } from './middleware/apiKeyAuth.js';
import { forecastRouter } from './routes/forecast.js';
import { pricesRouter } from './routes/prices.js';
import { logsRouter } from './routes/logs.js';
import { createRedisLogger } from './utils/redis-logger.js';

const logger = createRedisLogger('data-service', process.env['LOG_LEVEL'] || 'info');
const app = express();
const pinoHttpFn = pinoHttp as unknown as typeof import('pino-http').default;
const httpLogger = pinoHttpFn({
  logger,
  genReqId: (req: Request, res: Response) => (req.headers['x-request-id'] as string) || crypto.randomUUID()
}) as HttpLogger<Request, Response>;
app.use(httpLogger);

// Basic CORS with whitelist from env
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

// Request ID for tracing
app.use((req, res, next) => {
  const rid = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  res.setHeader('x-request-id', rid);
  (req as any).requestId = rid;
  next();
});

// Very simple rate limit per IP (memory, best-effort)
const RATE_LIMIT_WINDOW_MS = Number(process.env['RATE_LIMIT_WINDOW_MS'] || 60000);
const RATE_LIMIT_MAX = Number(process.env['RATE_LIMIT_MAX'] || 600);
const buckets = new Map<string, { count: number; reset: number }>();
app.use((req, res, next) => {
  const key = (req.headers['x-api-key'] as string) || req.ip || 'ip';
  const now = Date.now();
  const b = buckets.get(key) || { count: 0, reset: now + RATE_LIMIT_WINDOW_MS };
  if (now > b.reset) { b.count = 0; b.reset = now + RATE_LIMIT_WINDOW_MS; }
  b.count += 1; buckets.set(key, b);
  res.setHeader('x-ratelimit-limit', String(RATE_LIMIT_MAX));
  res.setHeader('x-ratelimit-remaining', String(Math.max(0, RATE_LIMIT_MAX - b.count)));
  res.setHeader('x-ratelimit-reset', String(Math.floor(b.reset/1000)));
  if (b.count > RATE_LIMIT_MAX) return res.status(429).json({ error: { code: 'RATE_LIMIT', message: 'Too many requests' } });
  next();
});
app.use(helmet());
app.use(cors({ origin: config.corsOrigins.length ? config.corsOrigins : true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/openapi.json', (_req, res) => {
  const spec = {
    "openapi": "3.0.3",
    "info": { "title": "Data Service API", "version": "v1" },
    "servers": [{ "url": "/" }],
    "paths": {
      "/health": { "get": { "summary": "Health check", "responses": { "200": { "description": "OK" } } } },
      "/v1/prices": {
        "get": {
          "summary": "List prices",
          "security": [{ "ApiKeyAuth": [] }],
          "parameters": [
            { "name": "company", "in": "query", "schema": {"type":"string"} },
            { "name": "skuId", "in": "query", "schema": {"type":"string"} },
            { "name": "from", "in": "query", "schema": {"type":"string", "example":"2025-01"} },
            { "name": "to", "in": "query", "schema": {"type":"string", "example":"2025-12"} }
          ],
          "responses": { "200": { "description": "OK" } }
        }
      },
      "/v1/forecast": {
        "get": { "summary": "List forecast", "security": [{ "ApiKeyAuth": [] }], "responses": { "200": { "description": "OK" } } }
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

app.get('/docs', (_req, res) => res.redirect('https://example.com/docs')); // placeholder

// Protect data routes with API key validation
app.use('/v1/forecast', apiKeyAuth, forecastRouter);
app.use('/v1/prices', apiKeyAuth, pricesRouter);
app.use('/v1/logs', apiKeyAuth, logsRouter);

app.listen(config.port, () => logger.info({ port: config.port }, 'data-service listening'));
