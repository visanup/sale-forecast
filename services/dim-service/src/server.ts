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
import { dimRouter } from './routes/dim.routes';

const logger = pino({ name: 'dim-service' });
const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
app.use(pinoHttp({ logger, genReqId: (req, res) => (req.headers['x-request-id'] as string) || crypto.randomUUID() }));

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
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const spec = require('../openapi.json');
  res.json(spec);
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'unhandled error');
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'unexpected error' } });
});

app.listen(config.port, () => logger.info({ port: config.port }, 'dim-service listening'));
