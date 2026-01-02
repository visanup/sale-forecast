import xlsx from 'xlsx';
import { prisma } from '../db.js';
import { anchorMonthToDate } from './monthlyAccess.service.js';

export class MaterialImportError extends Error {
  public readonly status = 400;
  public readonly code = 'BAD_REQUEST';
}

type CsvRow = Record<string, unknown>;

type MonthlyAccessMaterialFilters = {
  search?: string;
  anchor_month?: string;
  limit?: number;
  cursor?: string;
};

type PaginatedResult<T> = {
  data: T[];
  nextCursor: string | null;
};

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function parseCsv(buffer: Buffer): CsvRow[] {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json<CsvRow>(sheet, { defval: '' });
}

function normalizeString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return String(value).trim() || null;
}

function isRowEmpty(row: CsvRow): boolean {
  return Object.values(row).every((value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    return false;
  });
}

function pickValue(row: CsvRow, keys: string[]): string | null {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      const value = normalizeString(row[key]);
      if (value) return value;
    }
  }
  return null;
}

const toStringId = (value: bigint) => value.toString();

function resolveLimit(limit?: number) {
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;
  const clamped = Math.min(Math.max(Math.trunc(limit as number), 1), MAX_LIMIT);
  return clamped;
}

export async function listMonthlyAccessMaterials(filters: MonthlyAccessMaterialFilters): Promise<PaginatedResult<any>> {
  const limit = resolveLimit(filters.limit);
  let cursorFilter: { id: bigint } | undefined;
  if (filters.cursor) {
    try {
      cursorFilter = { id: BigInt(filters.cursor) };
    } catch {
      throw new MaterialImportError('invalid cursor');
    }
  }

  const where: any = {};
  if (filters.anchor_month) {
    where.anchor_month = { equals: anchorMonthToDate(filters.anchor_month) };
  }
  if (filters.search) {
    const search = filters.search.trim();
    if (search.length > 0) {
      where.OR = [
        { material_code: { contains: search, mode: 'insensitive' } },
        { material_desc: { contains: search, mode: 'insensitive' } }
      ];
    }
  }

  const records = await prisma.monthly_access_control_material.findMany({
    where,
    take: limit + 1,
    orderBy: { id: 'asc' },
    ...(cursorFilter ? { skip: 1, cursor: cursorFilter } : {})
  });

  const hasNext = records.length > limit;
  const items = hasNext ? records.slice(0, limit) : records;
  const nextCursor = hasNext ? toStringId(items[items.length - 1].id) : null;

  return {
    data: items.map((item: any) => ({
      id: toStringId(item.id),
      anchor_month: item.anchor_month.toISOString().slice(0, 7),
      material_code: item.material_code,
      material_desc: item.material_desc ?? null,
      created_at: item.created_at.toISOString(),
      updated_at: item.updated_at.toISOString()
    })),
    nextCursor
  };
}

export async function importMonthlyAccessMaterials(buffer: Buffer, anchorMonth: string) {
  const rows = parseCsv(buffer);
  const errors: string[] = [];
  const records = new Map<string, { anchor_month: Date; material_code: string; material_desc: string | null }>();
  const normalizedAnchor = anchorMonthToDate(anchorMonth);

  rows.forEach((row, index) => {
    if (isRowEmpty(row)) return;
    const rowNumber = index + 2;
    const materialCode = pickValue(row, ['material_code', 'materialCode', 'MATERIAL_CODE']);
    if (!materialCode) {
      errors.push(`row ${rowNumber}: missing material_code`);
      return;
    }
    const rowAnchor = pickValue(row, ['anchor_month', 'anchorMonth', 'ANCHOR_MONTH']);
    if (rowAnchor && rowAnchor !== anchorMonth) {
      errors.push(`row ${rowNumber}: anchor_month must match ${anchorMonth}`);
      return;
    }
    const materialDesc = pickValue(row, ['material_desc', 'materialDesc', 'MATERIAL_DESC']);
    const key = `${anchorMonth}-${materialCode}`;
    records.set(key, {
      anchor_month: normalizedAnchor,
      material_code: materialCode,
      material_desc: materialDesc
    });
  });

  if (errors.length > 0) {
    throw new MaterialImportError(errors.slice(0, 5).join('; '));
  }
  if (records.size === 0) {
    throw new MaterialImportError('no rows found');
  }

  const data = Array.from(records.values());

  await prisma.$transaction(async (tx) => {
    await tx.monthly_access_control_material.deleteMany({
      where: { anchor_month: normalizedAnchor }
    });
    await tx.monthly_access_control_material.createMany({ data });
  });

  return { imported: data.length };
}
