import type { Prisma } from '@prisma/client';
import { Router, type Request, type Response, type RequestHandler } from 'express';
import multer from 'multer';
import { manualPayloadSchema } from '../schemas/ingest.schema.js';
import { createRun, insertForecastRows, upsertDimensions, writeSalesForecastHistory } from '../services/ingest.service.js';
import xlsx from 'xlsx';
import { writeAuditLog } from '../services/audit.service.js';
import { resolveRequestActor, withActorMetadata } from '../utils/requestActor.js';
import { assertMonthlyAccessUnlocked, MonthlyAccessLockedError } from '../services/monthlyAccessGuard.js';

export const ingestRouter = Router();
const upload = multer();
const uploadSingle: RequestHandler = upload.single('file') as unknown as RequestHandler;
const DEFAULT_DC_CODE = 'NA';
const DEFAULT_DC_DESC = 'N/A';

type ColumnType = 'string' | 'number';

const COLUMN_TYPE_MAP: Record<string, ColumnType> = {
  'หน่วยงาน': 'string',
  'ชื่อบริษัท': 'string',
  'SAP Code': 'string',
  'SAP_Code': 'string',
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
  const actor = resolveRequestActor(req as any);

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
    await assertMonthlyAccessUnlocked(anchorMonth, actor);
    const run = await createRun(anchorMonth, 'upload');
    const processedRows = rows.length;
    let factRowsInserted = 0;
    for (const [rowIndex, r] of rows.entries()) {
      const companyName = normalizeString(r['ชื่อบริษัท'] ?? r['companyName']);
      const companyDesc = normalizeString(r['company_desc'] ?? companyName);
      const companyCode = normalizeString(
        r['company_code'] ?? r['customer_code'] ?? r['SAP Code'] ?? r['CUSTOMER_CODE']
      );
      const deptCode = normalizeString(r['หน่วยงาน'] ?? r['dept_code']);
      // Default Distribution Channel if not provided in the new template
      const dcCode = normalizeString(r['Distribution Channel'] ?? r['dc_code']) ?? DEFAULT_DC_CODE;
      const materialDesc = normalizeString(r['ชื่อสินค้า'] ?? r['material_desc']);
      const materialCode = normalizeString(
        r['material_code'] ?? r['materialCode'] ?? r['SAPCode'] ?? materialDesc ?? r['SKU'] ?? r['sku']
      );
      const packSize = normalizeString(r['Pack Size'] ?? r['pack_size']);
      const uomCode = normalizeString(r['หน่วย'] ?? r['uom_code']);
      const missingFields: string[] = [];
      if (!companyCode) missingFields.push('company_code');
      if (!deptCode) missingFields.push('dept_code');
      if (!dcCode) missingFields.push('Distribution Channel');
      if (!materialCode) missingFields.push('material_code');
      if (!packSize) missingFields.push('pack_size');
      if (!uomCode) missingFields.push('uom_code');
      if (missingFields.length > 0) {
        const rowNumber = rowIndex + 1; // match the on-screen preview numbering
        throw new Error(
          `missing required lookup fields in uploaded row (row ${rowNumber}: ${missingFields.join(', ')})`
        );
      }
      const line = {
        company_code: companyCode,
        company_desc: companyDesc ?? companyName ?? companyCode,
        dept_code: deptCode,
        dc_code: dcCode,
        dc_desc:
          normalizeString(r['Distribution Channel Description'] ?? r['dc_desc']) ??
          (dcCode || DEFAULT_DC_DESC),
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
      };const offsets = ['n-2','n-1','n','n+1','n+2','n+3'];
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
        factRowsInserted: createdCount,
        actor
      });
      factRowsInserted += createdCount;
    }
    const logger = (req as any)?.log;
    logger?.info(
      {
        anchorMonth,
        runId: Number(run.run_id),
        processedRows,
        insertedRows: processedRows,
        factRowsInserted
      },
      'upload processed successfully'
    );

    const baseMetadata: Prisma.InputJsonObject = {
      anchorMonth,
      processedRows,
      insertedRows: processedRows,
      factRowsInserted,
      runId: run.run_id.toString(),
      source: 'upload'
    };
    await writeAuditLog({
      service: 'ingest-service',
      endpoint: '/v1/upload',
      action: 'POST',
      recordId: run.run_id.toString(),
      performedBy: actor.performedBy,
      userId: actor.user?.id ?? null,
      userEmail: actor.user?.email ?? null,
      userUsername: actor.user?.username ?? null,
      clientId: actor.clientId ?? null,
      metadata: withActorMetadata(baseMetadata, actor)
    });

    return res.status(202).json({
      runId: Number(run.run_id),
      insertedCount: processedRows,
      processedRows,
      factRowsInserted
    });
  } catch (e: any) {
    if (e instanceof MonthlyAccessLockedError) {
      return res.status(403).json({ error: { code: e.code, message: e.message } });
    }
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
  const actor = resolveRequestActor(req as any);

  try {
    await assertMonthlyAccessUnlocked(anchorMonth, actor);
    const run = await createRun(anchorMonth, 'manual');
    let factRowsInserted = 0;

    for (const line of lines) {
      const resolvedDcCode =
        typeof line.dc_code === 'string' && line.dc_code.trim().length > 0
          ? line.dc_code.trim()
          : DEFAULT_DC_CODE;
      const resolvedDcDesc =
        typeof line.dc_desc === 'string' && line.dc_desc.trim().length > 0
          ? line.dc_desc.trim()
          : resolvedDcCode || DEFAULT_DC_DESC;
      const normalizedLine = {
        ...line,
        dc_code: resolvedDcCode,
        dc_desc: resolvedDcDesc
      };
      const dim = await upsertDimensions(normalizedLine);
      const createdCount = await insertForecastRows(run.run_id, normalizedLine, dim, anchorMonth);
      await writeSalesForecastHistory({
        anchorMonth,
        line: normalizedLine,
        dim,
        runId: run.run_id,
        source: 'manual',
        factRowsInserted: createdCount,
        actor
      });
      factRowsInserted += createdCount;
    }

    const baseMetadata: Prisma.InputJsonObject = {
      anchorMonth,
      lineCount: lines.length,
      insertedRows: lines.length,
      factRowsInserted,
      runId: run.run_id.toString(),
      source: 'manual'
    };
    await writeAuditLog({
      service: 'ingest-service',
      endpoint: '/v1/manual',
      action: 'POST',
      recordId: run.run_id.toString(),
      performedBy: actor.performedBy,
      userId: actor.user?.id ?? null,
      userEmail: actor.user?.email ?? null,
      userUsername: actor.user?.username ?? null,
      clientId: actor.clientId ?? null,
      metadata: withActorMetadata(baseMetadata, actor)
    });

    return res.status(201).json({ runId: Number(run.run_id) });
  } catch (error: any) {
    if (error instanceof MonthlyAccessLockedError) {
      return res.status(403).json({ error: { code: error.code, message: error.message } });
    }
    console.error('manual_upload_failed', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error?.message || 'Manual entry failed' } });
  }
});
