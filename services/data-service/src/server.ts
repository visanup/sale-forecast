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
import { salesForecastRouter } from './routes/saleforecast.js';
import { auditLogsRouter } from './routes/auditLogs.js';
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
      },
      "/v1/audit-logs": {
        "get": {
          "summary": "List audit logs",
          "security": [{ "ApiKeyAuth": [] }],
          "parameters": [
            { "name": "service", "in": "query", "schema": { "type": "string" } },
            { "name": "endpoint", "in": "query", "schema": { "type": "string" } },
            { "name": "action", "in": "query", "schema": { "type": "string" } },
            { "name": "performed_by", "in": "query", "schema": { "type": "string" } },
            { "name": "since", "in": "query", "schema": { "type": "string", "format": "date-time" } },
            { "name": "until", "in": "query", "schema": { "type": "string", "format": "date-time" } },
            { "name": "limit", "in": "query", "schema": { "type": "integer", "minimum": 1, "maximum": 500, "default": 100 } },
            { "name": "cursor", "in": "query", "schema": { "type": "string", "description": "Fetch logs with id less than this cursor" } }
          ],
          "responses": { "200": { "description": "OK" } }
        }
      },
      "/v1/saleforecast": {
        "get": {
          "summary": "List sales forecast records",
          "security": [{ "ApiKeyAuth": [] }],
          "parameters": [
            { "name": "anchor_month", "in": "query", "required": true, "schema": { "type": "string", "pattern": "^\\d{4}-(0[1-9]|1[0-2])$" } },
            { "name": "company_code", "in": "query", "schema": { "type": "string" } },
            { "name": "company_desc", "in": "query", "schema": { "type": "string" } },
            { "name": "material_code", "in": "query", "schema": { "type": "string" } },
            { "name": "material_desc", "in": "query", "schema": { "type": "string" } }
          ],
          "responses": { "200": { "description": "OK" } }
        },
        "post": {
          "summary": "Create sales forecast record",
          "security": [{ "ApiKeyAuth": [] }],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": ["anchor_month", "forecast_qty"],
                  "properties": {
                    "anchor_month": { "type": "string", "pattern": "^\\d{4}-(0[1-9]|1[0-2])$" },
                    "company_code": { "type": "string" },
                    "company_desc": { "type": "string" },
                    "material_code": { "type": "string" },
                    "material_desc": { "type": "string" },
                    "forecast_qty": { "type": "number" },
                    "metadata": { "type": "object", "additionalProperties": true }
                  }
                }
              }
            }
          },
          "responses": { "201": { "description": "Created" } }
        }
      },
      "/v1/saleforecast/{recordId}": {
        "put": {
          "summary": "Update sales forecast record",
          "security": [{ "ApiKeyAuth": [] }],
          "parameters": [
            { "name": "recordId", "in": "path", "required": true, "schema": { "type": "string" } }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "anchor_month": { "type": "string", "pattern": "^\\d{4}-(0[1-9]|1[0-2])$" },
                    "company_code": { "type": "string" },
                    "company_desc": { "type": "string" },
                    "material_code": { "type": "string" },
                    "material_desc": { "type": "string" },
                    "forecast_qty": { "type": "number" },
                    "metadata": { "type": "object", "additionalProperties": true }
                  }
                }
              }
            }
          },
          "responses": { "200": { "description": "OK" }, "404": { "description": "Not Found" } }
        },
        "delete": {
          "summary": "Delete sales forecast record",
          "security": [{ "ApiKeyAuth": [] }],
          "parameters": [
            { "name": "recordId", "in": "path", "required": true, "schema": { "type": "string" } }
          ],
          "responses": { "200": { "description": "OK" }, "404": { "description": "Not Found" } }
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

app.get('/docs', (_req, res) => res.redirect('https://example.com/docs')); // placeholder

// Protect data routes with API key validation
app.use('/v1/forecast', apiKeyAuth, forecastRouter);
app.use('/v1/prices', apiKeyAuth, pricesRouter);
app.use('/v1/audit-logs', apiKeyAuth, auditLogsRouter);
app.use('/v1/logs', apiKeyAuth, logsRouter);
app.use('/v1/saleforecast', apiKeyAuth, salesForecastRouter);

app.listen(config.port, () => logger.info({ port: config.port }, 'data-service listening'));
