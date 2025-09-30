import type { Request, Response, NextFunction } from 'express';
import fetch from 'node-fetch';
import { config } from '../config/config';

type AuthedRequest = Request & { apiClientId?: string; apiScope?: string };

export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
	const key = req.header('X-API-Key');
	if (!key) {
		return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'missing api key' } });
	}
	try {
		const resp = await fetch(config.authValidateUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Internal-Secret': config.internalSecret
			},
			body: JSON.stringify({ apiKey: key })
		});

		if (!resp.ok) {
			return res.status(502).json({ error: { code: 'BAD_GATEWAY', message: 'auth service error' } });
		}
		const data = (await resp.json()) as { valid?: boolean; clientId?: string; scope?: string };
		if (!data.valid) {
			return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'invalid api key' } });
		}
		const r = req as AuthedRequest;
		r.apiClientId = data.clientId;
		r.apiScope = data.scope;
		return next();
	} catch (error) {
		return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'failed to validate api key' } });
	}
}
