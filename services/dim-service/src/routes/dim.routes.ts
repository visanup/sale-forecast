import type { Request, Response, RequestHandler } from 'express';
import { Router } from 'express';
import multer from 'multer';
import { dimensionListQuerySchema } from '../schemas/dimension.schema.js';
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
import {
  importCompaniesFromCsv,
  importDeptsFromCsv,
  importMaterialSkuUomFromCsv,
  ImportValidationError
} from '../services/dimensionImport.service.js';

const router = Router();
const upload = multer();
const uploadSingle: RequestHandler = upload.single('file') as unknown as RequestHandler;

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

async function handleCsvImport(
  req: Request,
  res: Response,
  importer: (buffer: Buffer) => Promise<{ imported: number }>
) {
  if (!req.file) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'file required' } });
  }
  try {
    const result = await importer(req.file.buffer);
    return res.json({ data: result });
  } catch (error) {
    if (error instanceof ImportValidationError) {
      return res.status(error.status).json({ error: { code: error.code, message: error.message } });
    }
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'import failed' } });
  }
}

router.post('/depts/import', uploadSingle, (req, res) => handleCsvImport(req, res, importDeptsFromCsv));
router.post('/companies/import', uploadSingle, (req, res) =>
  handleCsvImport(req, res, importCompaniesFromCsv)
);
router.post('/material-sku-uom/import', uploadSingle, (req, res) =>
  handleCsvImport(req, res, importMaterialSkuUomFromCsv)
);

router.post('/import', uploadSingle, async (req: Request, res: Response) => {
  const target = String((req.body as any)?.target || '');
  switch (target) {
    case 'depts':
      return handleCsvImport(req, res, importDeptsFromCsv);
    case 'companies':
      return handleCsvImport(req, res, importCompaniesFromCsv);
    case 'material-sku-uom':
      return handleCsvImport(req, res, importMaterialSkuUomFromCsv);
    default:
      return res
        .status(400)
        .json({ error: { code: 'BAD_REQUEST', message: 'target must be provided' } });
  }
});

export const dimRouter = router;
