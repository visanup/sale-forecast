import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fetch from 'node-fetch';
import crypto from 'crypto';
import { pinoHttp } from 'pino-http';
import cors from 'cors';
import helmet from 'helmet';
import { ingestRouter } from './routes/ingest.js';
import { createRedisLogger } from './utils/redis-logger.js';

const logger = createRedisLogger('ingest-service', process.env['LOG_LEVEL'] || 'info');
const app = express();
app.use(pinoHttp({
  logger,
  genReqId: (req: Request, _res: Response) => (req.headers['x-request-id'] as string) || crypto.randomUUID()
}));

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

const STATIC_API_KEY = process.env['API_KEY'] || '';
const AUTH_VALIDATE_URL = process.env['AUTH_VALIDATE_URL'] || '';
const INTERNAL_SHARED_SECRET = process.env['INTERNAL_SHARED_SECRET'] || '';

type ApiKeyValidationResult = {
  valid: boolean;
  clientId?: string | null;
  scope?: unknown;
};

async function validateApiKey(key: string, requestId: string): Promise<ApiKeyValidationResult> {
  if (!key) return { valid: false };
  if (STATIC_API_KEY && key === STATIC_API_KEY) {
    return { valid: true, clientId: 'static-key' };
  }
  try {
    if (!AUTH_VALIDATE_URL) {
      throw new Error('AUTH_VALIDATE_URL not configured');
    }
    if (!INTERNAL_SHARED_SECRET) {
      throw new Error('INTERNAL_SHARED_SECRET not configured');
    }

    const resp = await fetch(AUTH_VALIDATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': INTERNAL_SHARED_SECRET
      },
      body: JSON.stringify({ apiKey: key })
    });

    if (!resp.ok) {
      logger.warn({ requestId, status: resp.status }, 'auth service validation request failed');
      return { valid: false };
    }

    const data = (await resp.json().catch(() => ({}))) as { valid?: boolean; clientId?: string; scope?: unknown };
    if (!data?.valid) {
      return { valid: false };
    }
    return {
      valid: true,
      clientId: data.clientId ?? null,
      scope: data.scope
    };
  } catch (error) {
    logger.error({ requestId, error }, 'failed to validate api key with auth-service');
    throw error;
  }
}

// Simple API key protection for ingest endpoints
app.use('/v1', (req, res, next) => {
  const key = (req.headers['x-api-key'] as string) || '';
  const requestId = (req as any).requestId as string;

  validateApiKey(key, requestId)
    .then((result) => {
      if (!result.valid) {
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'invalid api key' } });
      }
      (req as any).apiClientId = result.clientId ?? null;
      (req as any).apiScope = result.scope;
      next();
    })
    .catch((error) => {
      logger.error({ requestId, error }, 'unexpected error during api key validation');
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'api key validation failed' } });
    });
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
