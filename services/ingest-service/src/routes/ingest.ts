import { Router, type Request, type Response, type RequestHandler } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { manualPayloadSchema } from '../schemas/ingest.schema';
import { createRun, insertForecastRows, upsertDimensions } from '../services/ingest.service';
import xlsx from 'xlsx';

export const ingestRouter = Router();
const upload = multer();
const uploadSingle: RequestHandler = upload.single('file') as unknown as RequestHandler;

ingestRouter.post('/upload', uploadSingle, async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'file required' } });
  const anchorMonth = req.body?.anchorMonth as string;
  if (!anchorMonth) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'anchorMonth required' } });
  try {
    const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = xlsx.utils.sheet_to_json(ws);
    // Map header fields per docs here (simplified):
    const run = await createRun(anchorMonth, 'upload');
    for (const r of rows) {
      const line = {
        company_code: r['ชื่อบริษัท'] || r['company_code'],
        dept_code: r['หน่วยงาน'] || r['dept_code'],
        dc_code: r['Distribution Channel'] || r['dc_code'],
        division: r['Division'],
        sales_organization: r['Sales Organization'],
        sales_office: r['Sales Office'],
        sales_group: r['Sales Group'],
        sales_representative: r['Sales Representative'],
        material_code: r['SAP Code'] || r['material_code'],
        material_desc: r['ชื่อสินค้า'] || r['material_desc'],
        pack_size: r['Pack Size'],
        uom_code: r['หน่วย'] || r['uom_code'],
        months: [] as any[]
      };
      const offsets = ['n-2','n-1','n','n+1','n+2','n+3'];
      const base = anchorMonth;
      const delta = { 'n-2': -2, 'n-1': -1, 'n': 0, 'n+1': 1, 'n+2': 2, 'n+3': 3 } as Record<string, number>;
      for (const k of offsets) {
        if (r[k] !== undefined && r[k] !== null && r[k] !== '') {
          line.months.push({ month: addMonth(base, delta[k]), qty: Number(r[k]), price: r['Price'] ? Number(r['Price']) : undefined });
        }
      }
      const dim = await upsertDimensions(line);
      await insertForecastRows(run.run_id, line, dim, anchorMonth);
    }
    return res.status(202).json({ runId: Number(run.run_id) });
  } catch (e: any) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: e.message } });
  }
});

function addMonth(yyyyMm: string, offset: number): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + offset, 1));
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${yy}-${mm}`;
}

ingestRouter.post('/manual', async (req, res) => {
  const parsed = manualPayloadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
  const { anchorMonth, lines } = parsed.data;
  const run = await createRun(anchorMonth, 'manual');
  for (const line of lines) {
    const dim = await upsertDimensions(line);
    await insertForecastRows(run.run_id, line, dim, anchorMonth);
  }
  return res.status(201).json({ runId: Number(run.run_id) });
});


