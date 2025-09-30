import type { Request, Response } from 'express';
import { Router } from 'express';
import { dimensionListQuerySchema } from '../schemas/dimension.schema';
import {
  listCompanies,
  listDepts,
  listDistributionChannels,
  listMaterials,
  listSkus,
  listSalesOrgs,
  listMonths,
  mapServiceError
} from '../services/dimension.service';

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

export const dimRouter = router;
