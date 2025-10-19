import { Router, type Request, type Response, type RequestHandler } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { manualPayloadSchema } from '../schemas/ingest.schema.js';
import { createRun, insertForecastRows, upsertDimensions, writeSalesForecastHistory } from '../services/ingest.service.js';
import xlsx from 'xlsx';

export const ingestRouter = Router();
const upload = multer();
const uploadSingle: RequestHandler = upload.single('file') as unknown as RequestHandler;

type ColumnType = 'string' | 'number';

const COLUMN_TYPE_MAP: Record<string, ColumnType> = {
  'หน่วยงาน': 'string',
  'ชื่อบริษัท': 'string',
  'SAP Code': 'string',
  'SAPCode': 'string',
  'ชื่อสินค้า': 'string',
  'Pack Size': 'string',
  'หน่วย': 'string',
  'n-2': 'number',
  'n-1': 'number',
  'n': 'number',
  'n+1': 'number',
  'n+2': 'number',
  'n+3': 'number',
  'Price': 'number',
  'Division': 'string',
  'Sales Organization': 'string',
  'Sales Office': 'string',
  'Sales Group': 'string',
  'Sales Representative': 'string',
  'Distribution Channel': 'string'
};

function normalizeString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  const fallback = String(value).trim();
  return fallback.length ? fallback : undefined;
}

ingestRouter.post('/upload', uploadSingle, async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'file required' } });
  const anchorMonth = req.body?.anchorMonth as string;
  if (!anchorMonth) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'anchorMonth required' } });
  try {
    const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = xlsx.utils.sheet_to_json(ws);
    const validationErrors: Array<{ row: number; column: string; expected: ColumnType; actual: string }> = [];

    rows.forEach((row, index) => {
      for (const [column, expectedType] of Object.entries(COLUMN_TYPE_MAP)) {
        if (!(column in row)) continue;
        let value = row[column];
        if (value === '' || value === null || value === undefined) continue;

        if (expectedType === 'string' && typeof value === 'number' && Number.isFinite(value)) {
          const stringified = String(value);
          row[column] = stringified;
          value = stringified;
        }

        const actualType = typeof value;
        const isExpected =
          expectedType === 'number'
            ? actualType === 'number' && Number.isFinite(value)
            : actualType === 'string';

        if (!isExpected) {
          validationErrors.push({
            row: index + 2, // Account for header row in Excel
            column,
            expected: expectedType,
            actual: actualType
          });
        }
      }
    });

    if (validationErrors.length > 0) {
      const logger = (req as any)?.log;
      logger?.error(
        { anchorMonth, validationErrors, totalRows: rows.length },
        'upload validation failed'
      );
      const formatted = validationErrors
        .slice(0, 10)
        .map(
          (err) =>
            `แถวที่ ${err.row} คอลัมน์ "${err.column}" ควรเป็น ${err.expected} แต่พบ ${err.actual}`
        );
      const moreCount = validationErrors.length - formatted.length;
      const message =
        formatted.join('; ') +
        (moreCount > 0 ? `; และพบปัญหาเพิ่มเติมอีก ${moreCount} จุด` : '');
      return res.status(400).json({
        error: { code: 'INVALID_FORMAT', message: message || 'invalid column types detected' }
      });
    }
    // Map header fields per docs here (simplified):
    const run = await createRun(anchorMonth, 'upload');
    let insertedCount = 0;
    for (const r of rows) {
      const companyName = normalizeString(r['ชื่อบริษัท'] ?? r['company_desc']);
      const companyCode = normalizeString(r['company_code'] ?? r['companyCode'] ?? companyName);
      const deptCode = normalizeString(r['หน่วยงาน'] ?? r['dept_code']);
      const dcCode = normalizeString(r['Distribution Channel'] ?? r['dc_code']);
      const materialCode = normalizeString(r['SAP Code'] ?? r['SAPCode'] ?? r['material_code']);
      const materialDesc = normalizeString(r['ชื่อสินค้า'] ?? r['material_desc']);
      const packSize = normalizeString(r['Pack Size'] ?? r['pack_size']);
      const uomCode = normalizeString(r['หน่วย'] ?? r['uom_code']);
      if (!companyCode || !deptCode || !dcCode || !materialCode || !packSize || !uomCode) {
        throw new Error('missing required lookup fields in uploaded row');
      }
      const line = {
        company_code: companyCode,
        company_desc: companyName ?? companyCode,
        dept_code: deptCode,
        dc_code: dcCode,
        dc_desc: normalizeString(r['Distribution Channel Description'] ?? r['dc_desc']) ?? dcCode,
        division: normalizeString(r['Division']),
        sales_organization: normalizeString(r['Sales Organization']),
        sales_office: normalizeString(r['Sales Office']),
        sales_group: normalizeString(r['Sales Group']),
        sales_representative: normalizeString(r['Sales Representative']),
        material_code: materialCode,
        material_desc: materialDesc ?? materialCode,
        pack_size: packSize,
        uom_code: uomCode,
        months: [] as any[]
      };
      const offsets = ['n-2','n-1','n','n+1','n+2','n+3'];
      const base = anchorMonth;
      const delta = { 'n-2': -2, 'n-1': -1, 'n': 0, 'n+1': 1, 'n+2': 2, 'n+3': 3 } as Record<string, number>;
      for (const k of offsets) {
        if (r[k] !== undefined && r[k] !== null && r[k] !== '') {
          const qty = Number(r[k]);
          if (!Number.isFinite(qty)) continue;
          const priceValue = r['Price'];
          const price = priceValue === undefined || priceValue === null || priceValue === '' ? undefined : Number(priceValue);
          const priceNumber = price !== undefined && Number.isFinite(price) ? price : undefined;
          line.months.push({ month: addMonth(base, delta[k]), qty, price: priceNumber });
        }
      }
      const dim = await upsertDimensions(line);
      const createdCount = await insertForecastRows(run.run_id, line, dim, anchorMonth);
      await writeSalesForecastHistory({
        anchorMonth,
        line,
        dim,
        runId: run.run_id,
        source: 'upload',
        factRowsInserted: createdCount
      });
      insertedCount += createdCount;
    }
    const logger = (req as any)?.log;
    logger?.info(
      { anchorMonth, runId: Number(run.run_id), processedRows: rows.length, insertedCount },
      'upload processed successfully'
    );
    return res.status(202).json({ runId: Number(run.run_id), insertedCount });
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
    const createdCount = await insertForecastRows(run.run_id, line, dim, anchorMonth);
    await writeSalesForecastHistory({
      anchorMonth,
      line,
      dim,
      runId: run.run_id,
      source: 'manual',
      factRowsInserted: createdCount
    });
  }
  return res.status(201).json({ runId: Number(run.run_id) });
});
