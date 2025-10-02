import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import pinoHttp from 'pino-http';
import cors from 'cors';
import helmet from 'helmet';
import { ingestRouter } from './routes/ingest';
import { createRedisLogger } from './utils/redis-logger';

const logger = createRedisLogger('ingest-service', process.env['LOG_LEVEL'] || 'info');
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

const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 300);
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
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

// Simple API key protection for ingest endpoints
app.use('/v1', (req, res, next) => {
  const requiredKey = process.env.API_KEY || '';
  if (!requiredKey) return res.status(500).json({ error: { code: 'SERVER_CONFIG', message: 'API_KEY not configured' } });
  const key = (req.headers['x-api-key'] as string) || '';
  if (key !== requiredKey) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'invalid api key' } });
  next();
}, ingestRouter);

app.get('/openapi.json', (_req, res) => {
  const spec = {
    "openapi": "3.0.3",
    "info": { "title": "Ingest Service API", "version": "v1" },
    "servers": [{ "url": "/" }],
    "paths": {
      "/health": { "get": { "summary": "Health check", "responses": { "200": { "description": "OK" } } } },
      "/v1/upload": {
        "post": {
          "summary": "Upload Excel file",
          "security": [{ "ApiKeyAuth": [] }],
          "requestBody": {
            "content": {
              "multipart/form-data": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "file": { "type": "string", "format": "binary" },
                    "anchorMonth": { "type": "string", "example": "2025-01" }
                  }
                }
              }
            }
          },
          "responses": { "200": { "description": "OK" } }
        }
      },
      "/v1/manual": {
        "post": {
          "summary": "Manual data entry",
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

const PORT = Number(process.env.PORT || 6602);
app.listen(PORT, () => logger.info({ port: PORT }, 'ingest-service listening'));


