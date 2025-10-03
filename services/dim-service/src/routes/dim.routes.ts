import type { Request, Response } from 'express';
import { Router } from 'express';
import fetch from 'node-fetch';
import { dimensionListQuerySchema } from '../schemas/dimension.schema.js';
import { config } from '../config/config.js';
import {
  listCompanies,
  listDepts,
  listDistributionChannels,
  listMaterials,
  listSkus,
  listSalesOrgs,
  listMonths,
  mapServiceError
} from '../services/dimension.service.js';

const router = Router();

type DimensionListFn = (params: Parameters<typeof listCompanies>[0]) => Promise<{ data: unknown[]; nextCursor: string | null }>;

function createHandler(fn: DimensionListFn) {
  return async (req: Request, res: Response) => {
    const parsed = dimensionListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
    }
    try {
      const result = await fn(parsed.data);
      return res.json({ data: result.data, paging: { next: result.nextCursor } });
    } catch (error) {
      const { status, body } = mapServiceError(error);
      return res.status(status).json(body);
    }
  };
}

router.get('/companies', createHandler(listCompanies));
router.get('/depts', createHandler(listDepts));
router.get('/distribution-channels', createHandler(listDistributionChannels));
router.get('/materials', createHandler(listMaterials));
router.get('/skus', createHandler(listSkus));
router.get('/sales-orgs', createHandler(listSalesOrgs));
router.get('/months', createHandler(listMonths));
router.post('/import', async (req: Request, res: Response) => {
  const apiKey = req.header('X-API-Key') || '';
  const headers: Record<string, string> = {
    'X-API-Key': apiKey
  };
  const contentType = req.headers['content-type'];
  if (typeof contentType === 'string') {
    headers['Content-Type'] = contentType;
  }
  const requestId = (req as any).requestId || req.header('X-Request-ID');
  if (requestId) {
    headers['X-Request-ID'] = requestId;
  }

  try {
    const init: any = {
      method: 'POST',
      headers,
      body: req as any,
      duplex: 'half'
    };
    const upstream = await fetch(config.ingestUploadUrl, init);
    const responseBuffer = Buffer.from(await upstream.arrayBuffer());
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'content-length') return;
      res.setHeader(key, value);
    });
    return res.status(upstream.status).send(responseBuffer);
  } catch (error) {
    return res.status(502).json({ error: { code: 'DIM_UPLOAD_PROXY_FAILED', message: 'failed to forward upload to ingest service' } });
  }
});

export const dimRouter = router;
