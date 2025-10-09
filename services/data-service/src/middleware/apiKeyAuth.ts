import fetch from 'node-fetch';
import { config } from '../config/config.js';
import { Request, Response, NextFunction } from 'express';

export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const key = req.header('X-API-Key');
  if (!key) return res.status(401).json({ error: { code: 'UNAUTHORIZED' } });

  if (config.staticApiKey && key === config.staticApiKey) {
    (req as any).apiClientId = 'static-key';
    (req as any).apiScope = ['read', 'write'];
    return next();
  }

  if (!config.internalSecret) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'api validation not configured' } });
  }

  try {
    const resp = await fetch(config.authValidateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': config.internalSecret },
      body: JSON.stringify({ apiKey: key })
    });
    if (!resp.ok) return res.status(502).json({ error: { code: 'BAD_GATEWAY' } });
    const data = (await resp.json()) as { valid: boolean; clientId: string; scope: unknown };
    if (!data.valid) return res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
    (req as any).apiClientId = data.clientId;
    (req as any).apiScope = data.scope;
    return next();
  } catch (e) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  }
}
