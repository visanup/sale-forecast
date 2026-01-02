import xlsx from 'xlsx';
import { prisma } from '../lib/prisma.js';

export class ImportValidationError extends Error {
  public readonly status = 400;
  public readonly code = 'BAD_REQUEST';
}

type CsvRow = Record<string, unknown>;

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

function requireValue(
  row: CsvRow,
  keys: string[],
  label: string,
  rowIndex: number,
  errors: string[]
) {
  const value = pickValue(row, keys);
  if (!value) {
    errors.push(`row ${rowIndex}: missing ${label}`);
  }
  return value;
}

export async function importDeptsFromCsv(buffer: Buffer) {
  const rows = parseCsv(buffer);
  const errors: string[] = [];
  const codes = new Set<string>();

  rows.forEach((row, index) => {
    if (isRowEmpty(row)) return;
    const code = requireValue(
      row,
      ['dept_code', 'deptCode', 'DEPT_CODE', 'department'],
      'dept_code',
      index + 2,
      errors
    );
    if (code) codes.add(code);
  });

  if (errors.length > 0) {
    throw new ImportValidationError(errors.slice(0, 5).join('; '));
  }
  if (codes.size === 0) {
    throw new ImportValidationError('no rows found');
  }

  const data = Array.from(codes).map((dept_code) => ({ dept_code }));

  await prisma.$transaction(async (tx) => {
    await tx.dim_dept.deleteMany();
    await tx.dim_dept.createMany({ data });
  });

  return { imported: data.length };
}

export async function importCompaniesFromCsv(buffer: Buffer) {
  const rows = parseCsv(buffer);
  const errors: string[] = [];
  const records = new Map<string, { company_code: string; company_desc: string | null }>();

  rows.forEach((row, index) => {
    if (isRowEmpty(row)) return;
    const code = requireValue(
      row,
      ['company_code', 'companyCode', 'COMPANY_CODE'],
      'company_code',
      index + 2,
      errors
    );
    if (!code) return;
    const desc = pickValue(row, ['company_desc', 'companyDesc', 'COMPANY_DESC', 'company_name', 'companyName']);
    records.set(code, { company_code: code, company_desc: desc });
  });

  if (errors.length > 0) {
    throw new ImportValidationError(errors.slice(0, 5).join('; '));
  }
  if (records.size === 0) {
    throw new ImportValidationError('no rows found');
  }

  const data = Array.from(records.values());

  await prisma.$transaction(async (tx) => {
    await tx.dim_company.deleteMany();
    await tx.dim_company.createMany({ data });
  });

  return { imported: data.length };
}

export async function importMaterialSkuUomFromCsv(buffer: Buffer) {
  const rows = parseCsv(buffer);
  const errors: string[] = [];

  const materials = new Map<string, { material_code: string; material_desc: string | null }>();
  const uoms = new Set<string>();
  const skuRows: Array<{ material_code: string; pack_size: string; uom_code: string }> = [];

  rows.forEach((row, index) => {
    if (isRowEmpty(row)) return;
    const rowNumber = index + 2;
    const materialCode = requireValue(
      row,
      ['material_code', 'materialCode', 'MATERIAL_CODE', 'SAP Code', 'SAPCode', 'SAP_CODE'],
      'material_code',
      rowNumber,
      errors
    );
    const packSize = requireValue(
      row,
      ['pack_size', 'packSize', 'PACK_SIZE', 'Pack Size'],
      'pack_size',
      rowNumber,
      errors
    );
    const uomCode = requireValue(
      row,
      ['uom_code', 'uomCode', 'UOM', 'UOM_CODE'],
      'uom_code',
      rowNumber,
      errors
    );

    if (materialCode) {
      const desc = pickValue(row, ['material_desc', 'materialDesc', 'MATERIAL_DESC']);
      if (!materials.has(materialCode)) {
        materials.set(materialCode, { material_code: materialCode, material_desc: desc });
      }
    }
    if (uomCode) uoms.add(uomCode);
    if (materialCode && packSize && uomCode) {
      skuRows.push({ material_code: materialCode, pack_size: packSize, uom_code: uomCode });
    }
  });

  if (errors.length > 0) {
    throw new ImportValidationError(errors.slice(0, 5).join('; '));
  }
  if (materials.size === 0 || uoms.size === 0 || skuRows.length === 0) {
    throw new ImportValidationError('no rows found');
  }

  const materialData = Array.from(materials.values());
  const uomData = Array.from(uoms).map((uom_code) => ({ uom_code }));

  await prisma.$transaction(async (tx) => {
    await tx.dim_sku.deleteMany();
    await tx.dim_material.deleteMany();
    await tx.dim_uom.deleteMany();

    await tx.dim_material.createMany({ data: materialData });
    await tx.dim_uom.createMany({ data: uomData });

    const materialRows = await tx.dim_material.findMany({
      where: { material_code: { in: materialData.map((item) => item.material_code) } }
    });
    const uomRows = await tx.dim_uom.findMany({
      where: { uom_code: { in: uomData.map((item) => item.uom_code) } }
    });

    const materialMap = new Map(materialRows.map((row) => [row.material_code, row.material_id]));
    const uomMap = new Map(uomRows.map((row) => [row.uom_code, row.uom_id]));

    const skuData: Array<{ material_id: bigint; pack_size: string; uom_id: bigint }> = [];
    const skuKeySet = new Set<string>();

    skuRows.forEach((row) => {
      const materialId = materialMap.get(row.material_code);
      const uomId = uomMap.get(row.uom_code);
      if (!materialId || !uomId) return;
      const key = `${materialId}-${row.pack_size}-${uomId}`;
      if (skuKeySet.has(key)) return;
      skuKeySet.add(key);
      skuData.push({ material_id: materialId, pack_size: row.pack_size, uom_id: uomId });
    });

    if (skuData.length === 0) {
      throw new ImportValidationError('no valid sku rows found');
    }

    await tx.dim_sku.createMany({ data: skuData });
  });

  return { imported: skuRows.length };
}
