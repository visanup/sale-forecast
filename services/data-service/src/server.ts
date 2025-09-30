import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import pino from 'pino';
import pinoHttp from 'pino-http';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import { config } from './config/config';
import { apiKeyAuth } from './middleware/apiKeyAuth';
import { forecastRouter } from './routes/forecast';
import { pricesRouter } from './routes/prices';

const logger = pino({ name: 'data-service' });
const app = express();

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
app.use(pinoHttp({ logger, genReqId: (req, res) => (req.headers['x-request-id'] as string) || crypto.randomUUID() }));

// Basic CORS with whitelist from env
const ALLOW_ORIGINS = (process.env.ALLOW_ORIGINS || '*').split(',').map(s=>s.trim());
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
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 600);
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
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const spec = require('../openapi.json');
  res.json(spec);
});

app.get('/docs', (_req, res) => res.redirect('https://example.com/docs')); // placeholder

// Protect data routes with API key validation
app.use('/v1/forecast', apiKeyAuth, forecastRouter);
app.use('/v1/prices', apiKeyAuth, pricesRouter);

app.listen(config.port, () => logger.info({ port: config.port }, 'data-service listening'));


