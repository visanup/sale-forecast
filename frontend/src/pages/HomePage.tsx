import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { FileUpload } from '../components/FileUpload';
import { EditableGrid } from '../components/EditableGrid';
import { ManualEntryForm } from '../components/ManualEntryForm';
import { HistoryTable } from '../components/HistoryTable';
import { MasterDataShowcase } from '../components/MasterDataShowcase';
import {
  Upload,
  Edit3,
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  Database,
  Zap,
  Shield,
  Users,
  Target,
  History,
  LayoutGrid,
  Download,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  X,
  Undo2
} from 'lucide-react';
import {
  ingestApi,
  dataApi,
  dimApi,
  monthlyAccessMaterialApi,
  type SalesForecastRecord,
  type SalesForecastMetadata,
  type SalesForecastMonthsEntry
} from '../services/api';
import { DimSource, type DimCompany, type DimDept, type DimMaterial } from '../services/dimSource';
import { useErrorLog } from '../hooks/useErrorLog';
import { useAuth } from '../hooks/useAuth';
import type { AuthenticatedUser } from '../contexts/AuthContext';
import {
  buildUpdatedConfirmationMetadata,
  getHistoryConfirmationSnapshot
} from '../utils/historyConfirmation';
import { confirmCrossMonth, getCurrentAnchorMonth } from '../utils/anchorMonth';
import { formatLineErrorMessage } from '../utils/errorLine';

type ColumnType = 'string' | 'number';
type RowObject = Record<string, string | number | null>;
type WorkbookSheet = { name: string; sheet: XLSX.WorkSheet };
type ValidationIssue = { row: number; column: string; expected: ColumnType; actual: string };
type MasterValidationResult = {
  errorMessages: string[];
  warningMessages: string[];
  errorIssues: Array<{ row: number; field: string; value: string }>;
  warningIssues: Array<{ row: number; field: string; value: string }>;
  skuLookupFailures: Array<{ materialCode: string; message: string }>;
  monthlyAccessLookupFailure?: string;
};
type ConfirmAction = 'confirm' | 'unconfirm';

const EXPECTED_COLUMN_TYPES: Record<string, ColumnType> = {
  'หน่วยงาน': 'string',
  'ชื่อบริษัท': 'string',
  'customer_code': 'string',
  'material_code': 'string',
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

const COLUMN_HEADER_RENAMES: Record<string, string> = {
  'SAP Code': 'customer_code',
  'SAP CODE': 'customer_code',
  SAPCode: 'material_code',
  SAPCODE: 'material_code'
};

const MAX_VALIDATION_ERRORS = 10;
const MASTER_LOOKUP_LIMIT = 100;

const MASTER_DEPT_KEYS = ['หน่วยงาน', 'dept_code', 'DEPT_CODE'];
const MASTER_COMPANY_CODE_KEYS = [
  'customer_code',
  'company_code',
  'CUSTOMER_CODE',
  'SAP Code',
  'SAP_CODE'
];
const MASTER_COMPANY_DESC_KEYS = [
  'ชื่อบริษัท',
  'company_desc',
  'companyDesc',
  'company_name',
  'companyName'
];
const MASTER_MATERIAL_CODE_KEYS = [
  'material_code',
  'materialCode',
  'MATERIAL_CODE',
  'SAPCode',
  'SAP_CODE'
];
const MASTER_MATERIAL_DESC_KEYS = ['ชื่อสินค้า', 'material_desc', 'materialDesc', 'MATERIAL_DESC'];
const MASTER_PACK_SIZE_KEYS = ['Pack Size', 'pack_size', 'packSize', 'PACK_SIZE'];
const MASTER_UOM_KEYS = ['หน่วย', 'uom_code', 'uomCode', 'UOM', 'UOM_CODE'];
const MONTHLY_ACCESS_CODE_FIELD = 'monthly_access_control_material';
const MONTHLY_ACCESS_DESC_FIELD = 'monthly_access_control_material_desc';

const monthlyAccessMaterialCache = new Map<string, Promise<Map<string, string | null>>>();

function normalizeLookupValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  const fallback = String(value).trim();
  return fallback.length ? fallback : null;
}

function normalizeMatchKey(value: string): string {
  return value.trim().toLowerCase();
}

function pickRowValue(row: RowObject, keys: string[]): string | null {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
    const value = normalizeLookupValue(row[key]);
    if (value) return value;
  }
  return null;
}

async function loadDimMap<T>(
  codes: Set<string>,
  fetcher: (params: { search?: string; limit?: number }) => Promise<T[]>,
  extractCode: (item: T) => string | null
) {
  const map = new Map<string, T>();
  await Promise.all(
    Array.from(codes.values()).map(async (code) => {
      const items = await fetcher({ search: code, limit: MASTER_LOOKUP_LIMIT });
      const normalizedCode = normalizeMatchKey(code);
      const match = items.find((item) => normalizeMatchKey(extractCode(item) ?? '') === normalizedCode);
      if (match) {
        map.set(normalizedCode, match);
      }
    })
  );
  return map;
}

async function loadSkuMap(materialCodes: Set<string>) {
  const map = new Map<string, Set<string> | null>();
  const failures: Array<{ materialCode: string; message: string }> = [];
  await Promise.all(
    Array.from(materialCodes.values()).map(async (code) => {
      const normalizedCode = normalizeMatchKey(code);
      try {
        const response = await dimApi.skus({ search: code, limit: MASTER_LOOKUP_LIMIT });
        const combos = new Set<string>();
        (response?.data ?? []).forEach((item: any) => {
          const itemCode = item?.materialCode ?? item?.material_code ?? '';
          if (normalizeMatchKey(String(itemCode)) !== normalizedCode) return;
          const packSize = normalizeLookupValue(item?.packSize ?? item?.pack_size);
          const uomCode = normalizeLookupValue(item?.uomCode ?? item?.uom_code);
          if (!packSize || !uomCode) return;
          combos.add(`${normalizeMatchKey(packSize)}|${normalizeMatchKey(uomCode)}`);
        });
        map.set(normalizedCode, combos);
      } catch (error: any) {
        map.set(normalizedCode, null);
        failures.push({
          materialCode: code,
          message: error?.message || 'failed to load sku master data'
        });
      }
    })
  );
  return { map, failures };
}

async function loadMonthlyAccessMaterialMap(anchorMonth: string): Promise<Map<string, string | null>> {
  const normalizedMonth = anchorMonth.trim();
  const cached = monthlyAccessMaterialCache.get(normalizedMonth);
  if (cached) return cached;
  const request = (async () => {
    const map = new Map<string, string | null>();
    let cursor: string | undefined;
    do {
      const response = await monthlyAccessMaterialApi.list({
        anchor_month: normalizedMonth,
        limit: MASTER_LOOKUP_LIMIT,
        cursor
      });
      (response?.data ?? []).forEach((item) => {
        const code = normalizeLookupValue(item.material_code);
        if (!code) return;
        const desc = normalizeLookupValue(item.material_desc);
        map.set(normalizeMatchKey(code), desc);
      });
      cursor = response?.paging?.next ?? undefined;
    } while (cursor);
    return map;
  })();
  monthlyAccessMaterialCache.set(normalizedMonth, request);
  try {
    return await request;
  } catch (error) {
    monthlyAccessMaterialCache.delete(normalizedMonth);
    throw error;
  }
}

async function validateRowsAgainstMaster(
  rows: RowObject[],
  anchorMonth?: string
): Promise<MasterValidationResult> {
  const errorIssues: MasterValidationResult['errorIssues'] = [];
  const warningIssues: MasterValidationResult['warningIssues'] = [];

  const rowInfo = rows.map((row, index) => {
    const deptCode = pickRowValue(row, MASTER_DEPT_KEYS);
    const companyCode = pickRowValue(row, MASTER_COMPANY_CODE_KEYS);
    const companyDesc = pickRowValue(row, MASTER_COMPANY_DESC_KEYS);
    const materialCode = pickRowValue(row, MASTER_MATERIAL_CODE_KEYS);
    const materialDesc = pickRowValue(row, MASTER_MATERIAL_DESC_KEYS);
    const packSize = pickRowValue(row, MASTER_PACK_SIZE_KEYS);
    const uomCode = pickRowValue(row, MASTER_UOM_KEYS);
    return {
      rowNumber: index + 2,
      deptCode,
      companyCode,
      companyDesc,
      materialCode,
      materialDesc,
      packSize,
      uomCode
    };
  });

  const deptCodes = new Set(rowInfo.map((item) => item.deptCode).filter(Boolean) as string[]);
  const companyCodes = new Set(rowInfo.map((item) => item.companyCode).filter(Boolean) as string[]);
  const materialCodes = new Set(rowInfo.map((item) => item.materialCode).filter(Boolean) as string[]);

  const [deptMap, companyMap, materialMap, skuLookup] = await Promise.all([
    loadDimMap<DimDept>(deptCodes, DimSource.fetchDepts, (item) => item.code ?? null),
    loadDimMap<DimCompany>(companyCodes, DimSource.fetchCompanies, (item) => item.code ?? null),
    loadDimMap<DimMaterial>(materialCodes, DimSource.fetchMaterials, (item) => item.code ?? null),
    loadSkuMap(materialCodes)
  ]);
  let monthlyAccessMap: Map<string, string | null> | null = null;
  let monthlyAccessLookupFailure: string | undefined;
  if (anchorMonth && anchorMonth.trim().length > 0) {
    try {
      monthlyAccessMap = await loadMonthlyAccessMaterialMap(anchorMonth);
    } catch (error: any) {
      monthlyAccessLookupFailure =
        error?.message || 'failed to load monthly_access_control_material data';
    }
  }

  rowInfo.forEach((row) => {
    if (!row.deptCode || !deptMap.has(normalizeMatchKey(row.deptCode))) {
      errorIssues.push({
        row: row.rowNumber,
        field: 'หน่วยงาน',
        value: row.deptCode ?? ''
      });
    }

    if (!row.companyCode || !companyMap.has(normalizeMatchKey(row.companyCode))) {
      errorIssues.push({
        row: row.rowNumber,
        field: 'CUSTOMER_CODE',
        value: row.companyCode ?? ''
      });
    } else {
      const company = companyMap.get(normalizeMatchKey(row.companyCode));
      const masterDesc = normalizeLookupValue(company?.description ?? company?.label);
      const companyDesc = row.companyDesc ?? '';
      if (!companyDesc || !masterDesc || normalizeMatchKey(companyDesc) !== normalizeMatchKey(masterDesc)) {
        errorIssues.push({
          row: row.rowNumber,
          field: 'ชื่อบริษัท',
          value: companyDesc
        });
      }
    }

    if (!row.materialCode || !materialMap.has(normalizeMatchKey(row.materialCode))) {
      warningIssues.push({
        row: row.rowNumber,
        field: 'MATERIAL_CODE',
        value: row.materialCode ?? ''
      });
    } else {
      const material = materialMap.get(normalizeMatchKey(row.materialCode));
      const masterDesc = normalizeLookupValue(material?.description ?? material?.label);
      const materialDesc = row.materialDesc ?? '';
      if (!materialDesc || !masterDesc || normalizeMatchKey(materialDesc) !== normalizeMatchKey(masterDesc)) {
        warningIssues.push({
          row: row.rowNumber,
          field: 'ชื่อสินค้า',
          value: materialDesc
        });
      }

      const packSize = row.packSize ?? '';
      const uomCode = row.uomCode ?? '';
      if (!packSize || !uomCode) {
        warningIssues.push({
          row: row.rowNumber,
          field: 'PACK SIZE/หน่วย',
          value: `${packSize || '-'} / ${uomCode || '-'}`
        });
      } else {
        const combos = skuLookup.map.get(normalizeMatchKey(row.materialCode));
        if (combos) {
          const comboKey = `${normalizeMatchKey(packSize)}|${normalizeMatchKey(uomCode)}`;
          if (!combos.has(comboKey)) {
            warningIssues.push({
              row: row.rowNumber,
              field: 'PACK SIZE/หน่วย',
              value: `${packSize} / ${uomCode}`
            });
          }
        }
      }
    }

    if (monthlyAccessMap && row.materialCode) {
      const normalizedCode = normalizeMatchKey(row.materialCode);
      const hasAccess = monthlyAccessMap.has(normalizedCode);
      const accessDesc = monthlyAccessMap.get(normalizedCode);
      if (!hasAccess) {
        warningIssues.push({
          row: row.rowNumber,
          field: MONTHLY_ACCESS_CODE_FIELD,
          value: row.materialCode
        });
      } else if (accessDesc) {
        const materialDesc = row.materialDesc ?? '';
        if (!materialDesc || normalizeMatchKey(materialDesc) !== normalizeMatchKey(accessDesc)) {
          warningIssues.push({
            row: row.rowNumber,
            field: MONTHLY_ACCESS_DESC_FIELD,
            value: materialDesc
          });
        }
      }
    }
  });

  const errorMessages = errorIssues.map(
    (issue) => `แถวที่ ${issue.row}: ${issue.field} "${issue.value}" ไม่ตรงกับ Master`
  );
  const warningMessages = warningIssues.map((issue) => {
    if (issue.field === MONTHLY_ACCESS_CODE_FIELD) {
      return `แถวที่ ${issue.row}: material_code "${issue.value}" ไม่พบใน monthly_access_control_material`;
    }
    if (issue.field === MONTHLY_ACCESS_DESC_FIELD) {
      return `แถวที่ ${issue.row}: material_desc "${issue.value}" ไม่ตรงกับ monthly_access_control_material`;
    }
    return `แถวที่ ${issue.row}: ${issue.field} "${issue.value}" ไม่ตรงกับ Master`;
  });

  return {
    errorMessages,
    warningMessages,
    errorIssues,
    warningIssues,
    skuLookupFailures: skuLookup.failures,
    monthlyAccessLookupFailure
  };
}

function describeValueType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function collectValidationIssues(rows: RowObject[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  rows.forEach((row, index) => {
    for (const [column, expectedType] of Object.entries(EXPECTED_COLUMN_TYPES)) {
      if (!(column in row)) continue;
      const value = row[column];
      if (value === '' || value === null || value === undefined) continue;

      const isNumberValue = typeof value === 'number' && Number.isFinite(value);
      const isStringValue =
        typeof value === 'string' ||
        (expectedType === 'string' && typeof value === 'number' && Number.isFinite(value));
      const isExpected = expectedType === 'number' ? isNumberValue : isStringValue;

      if (!isExpected) {
        issues.push({
          row: index + 2,
          column,
          expected: expectedType,
          actual: describeValueType(value)
        });
      }
    }
  });
  return issues;
}

function normalizeRows(rows: RowObject[]): RowObject[] {
  return rows.map((row) => {
    const normalized: RowObject = { ...row };
    for (const [column, expectedType] of Object.entries(EXPECTED_COLUMN_TYPES)) {
      if (!(column in normalized)) continue;
      const value = normalized[column];
      if (value === '' || value === null || value === undefined) continue;

      if (expectedType === 'string' && typeof value === 'number' && Number.isFinite(value)) {
        normalized[column] = String(value);
        continue;
      }

      if (expectedType === 'number' && typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') continue;
        const numericValue = Number(trimmed.replace(/,/g, ''));
        if (!Number.isNaN(numericValue)) {
          normalized[column] = numericValue;
        }
      }
    }
    return normalized;
  });
}

function buildMatrixFromRows(
  headers: string[],
  rows: RowObject[]
): Array<Array<string | number | null>> {
  const effectiveHeaders =
    headers.length > 0
      ? headers
      : rows.length > 0
        ? Object.keys(rows[0] || {})
        : [];
  if (effectiveHeaders.length === 0) {
    return [];
  }

  const matrix: Array<Array<string | number | null>> = [effectiveHeaders];
  rows.forEach((row) => {
    const rowValues = effectiveHeaders.map((header) => {
      const value = row[header];
      if (value === null || value === undefined || value === '') {
        return '';
      }
      return value;
    });
    matrix.push(rowValues);
  });
  return matrix;
}

function buildUploadFileFromMatrix(params: {
  baseFile: File;
  matrix: Array<Array<string | number | null>>;
  primarySheetName: string;
  extraSheets: WorkbookSheet[];
}): File {
  if (params.matrix.length === 0) {
    return params.baseFile;
  }

  const workbook = XLSX.utils.book_new();
  const sheetName = params.primarySheetName || 'Sheet1';
  const sheet = XLSX.utils.aoa_to_sheet(params.matrix);
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  params.extraSheets.forEach(({ name, sheet }) => {
    if (name && sheet) {
      XLSX.utils.book_append_sheet(workbook, sheet, name);
    }
  });

  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  const fileType =
    params.baseFile.type && params.baseFile.type.trim() !== ''
      ? params.baseFile.type
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  return new File([buffer], params.baseFile.name, { type: fileType });
}

function renameRowKeys(row: RowObject): RowObject {
  const next: RowObject = {};
  for (const [key, value] of Object.entries(row)) {
    const nextKey = COLUMN_HEADER_RENAMES[key] ?? key;
    if (nextKey in next) {
      if (next[nextKey] === '' || next[nextKey] === null || next[nextKey] === undefined) {
        next[nextKey] = value;
      }
    } else {
      next[nextKey] = value;
    }
  }
  return next;
}

function formatValidationIssue(issue: ValidationIssue): string {
  const expectedLabel = issue.expected === 'string' ? 'string' : 'number';
  return `แถวที่ ${issue.row} คอลัมน์ "${issue.column}" ควรเป็น ${expectedLabel} แต่พบ ${issue.actual}`;
}

const HISTORY_MONTH_FIELDS = [
  { key: 'n1', label: 'n+1', delta: 1 },
  { key: 'n2', label: 'n+2', delta: 2 },
  { key: 'n3', label: 'n+3', delta: 3 }
] as const;

const HISTORY_EXPORT_COLUMNS = [
  { key: 'record_id', label: 'record_id' },
  { key: 'anchor_month', label: 'anchor_month' },
  { key: 'dept_code', label: 'dept_code' },
  { key: 'company_desc', label: 'company_desc' },
  { key: 'company_code', label: 'company_code' },
  { key: 'material_code', label: 'material_code' },
  { key: 'material_desc', label: 'material_desc' },
  { key: 'pack_size', label: 'pack_size' },
  { key: 'uom_code', label: 'uom_code' },
  { key: 'n1', label: 'n+1' },
  { key: 'n2', label: 'n+2' },
  { key: 'n3', label: 'n+3' },
  { key: 'last_action', label: 'last_action' },
  { key: 'user_email', label: 'user_email' },
  { key: 'last_performed_at', label: 'last_performed_at' },
  { key: 'confirm_status', label: 'confirm_status' },
  { key: 'confirmed_by', label: 'confirmed_by' },
  { key: 'confirmed_at', label: 'confirmed_at' },
  { key: 'metadata_source', label: 'metadata_source' }
] as const;

type HistoryExportColumnKey = (typeof HISTORY_EXPORT_COLUMNS)[number]['key'];
type HistoryExportRow = Record<HistoryExportColumnKey, string>;

type HistoryFormState = {
  anchorMonth: string;
  companyCode: string;
  companyDesc: string;
  deptCode: string;
  materialCode: string;
  materialDesc: string;
  packSize: string;
  uomCode: string;
  price: string;
  n1: string;
  n2: string;
  n3: string;
};

type HistoryActionNotice = {
  kind: 'error' | 'success';
  message: string;
};

function toInputString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') return value;
  return '';
}

function monthDiff(anchor: string, target: string): number {
  const [ay, am] = anchor.split('-').map(Number);
  const [ty, tm] = target.split('-').map(Number);
  if (!Number.isFinite(ay) || !Number.isFinite(am) || !Number.isFinite(ty) || !Number.isFinite(tm)) {
    return Number.NaN;
  }
  return (ty - ay) * 12 + (tm - am);
}

function addMonthString(anchor: string, offset: number): string {
  const [y, m] = anchor.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return anchor;
  const date = new Date(Date.UTC(y, m - 1 + offset, 1));
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${yy}-${mm}`;
}

const ADMIN_ROLE_NAME = 'ADMIN';
const USER_ACTION_WHITELIST = new Set(['POST', 'PUT', 'PATCH', 'UPSERT', 'INSERT', 'UPDATE']);

function normalizeRoleName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toUpperCase() : null;
}

function userHasAdminRole(user: AuthenticatedUser | null | undefined): boolean {
  if (!user) return false;
  const normalizedRoles = new Set<string>();
  if (Array.isArray(user.roles)) {
    for (const role of user.roles) {
      const normalized = normalizeRoleName(role);
      if (normalized) normalizedRoles.add(normalized);
    }
  }
  const fallbackRole = normalizeRoleName((user as any)?.role);
  if (fallbackRole) normalizedRoles.add(fallbackRole);
  return normalizedRoles.has(ADMIN_ROLE_NAME);
}

// last_actor is hydrated from the audit_log table; use it to scope records to the
// authenticated user so that bulk actions only touch their own history entries.
function recordBelongsToUser(record: SalesForecastRecord, user: AuthenticatedUser): boolean {
  const actor = record.last_actor;
  if (!actor) return false;

  const matchesUserId = Boolean(actor.user_id && user.id && actor.user_id === user.id);
  const matchesUsername = Boolean(
    actor.user_username &&
      user.username &&
      actor.user_username.toLowerCase() === user.username.toLowerCase()
  );
  const matchesEmail = Boolean(
    actor.user_email && user.email && actor.user_email.toLowerCase() === user.email.toLowerCase()
  );

  let matchesPerformedBy = false;
  if (typeof actor.performed_by === 'string' && actor.performed_by.trim().length > 0) {
    const performedByLower = actor.performed_by.toLowerCase();
    if (user.username && performedByLower.includes(user.username.toLowerCase())) {
      matchesPerformedBy = true;
    } else if (user.email && performedByLower.includes(user.email.toLowerCase())) {
      matchesPerformedBy = true;
    } else if (user.id && performedByLower.includes(user.id.toLowerCase())) {
      matchesPerformedBy = true;
    }
  }

  if (!(matchesUserId || matchesUsername || matchesEmail || matchesPerformedBy)) {
    return false;
  }

  const action = typeof record.last_action === 'string' ? record.last_action.trim().toUpperCase() : '';
  if (!action) return true;
  return USER_ACTION_WHITELIST.has(action);
}

function resolveConfirmationActor(user: AuthenticatedUser | null | undefined): string | null {
  if (!user) return null;
  const candidates = [user.username, user.email, user.id];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return null;
}

function extractPriceString(metadata: SalesForecastMetadata | null | undefined): string {
  if (!metadata) return '';
  const months = Array.isArray(metadata.months) ? metadata.months : [];
  for (const entry of months) {
    const price = entry?.price;
    const numeric = typeof price === 'number' ? price : Number(price);
    if (Number.isFinite(numeric)) {
      return String(numeric);
    }
  }
  const fallback = metadata.price ?? metadata.unit_price ?? metadata.unit_price_snapshot;
  const numeric = typeof fallback === 'number' ? fallback : Number(fallback as any);
  if (Number.isFinite(numeric)) return String(numeric);
  return '';
}

function toExportString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return '';
}

function toIsoTimestamp(value: unknown): string {
  if (typeof value !== 'string') return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}

function mapHistoryRecordToExportRow(record: SalesForecastRecord): HistoryExportRow {
  const metadata = record.metadata ?? {};
  const metadataRecord = metadata as Record<string, unknown>;
  const confirmation = getHistoryConfirmationSnapshot(record);

  const monthsMap: Record<typeof HISTORY_MONTH_FIELDS[number]['key'], string> = {
    n1: '',
    n2: '',
    n3: ''
  };

  if (Array.isArray(metadata.months)) {
    for (const entry of metadata.months) {
      if (!entry || typeof entry.month !== 'string') continue;
      const delta = monthDiff(record.anchor_month, entry.month);
      const monthField = HISTORY_MONTH_FIELDS.find((field) => field.delta === delta);
      if (!monthField) continue;
      const qtyValue =
        typeof entry.qty === 'number' && Number.isFinite(entry.qty)
          ? String(entry.qty)
          : typeof entry.qty === 'string'
            ? entry.qty
            : '';
      if (qtyValue) {
        monthsMap[monthField.key] = qtyValue;
      }
    }
  }

  return {
    record_id: toExportString(record.id),
    anchor_month: toExportString(record.anchor_month),
    dept_code: toExportString(metadataRecord.dept_code),
    company_desc: toExportString(record.company_desc),
    company_code: toExportString(record.company_code),
    material_code: toExportString(record.material_code),
    material_desc: toExportString(record.material_desc),
    pack_size: toExportString(metadataRecord.pack_size),
    uom_code: toExportString(metadataRecord.uom_code),
    n1: monthsMap.n1,
    n2: monthsMap.n2,
    n3: monthsMap.n3,
    confirm_status: confirmation.confirmed ? 'CONFIRMED' : 'PENDING',
    confirmed_by: toExportString(confirmation.confirmedBy),
    confirmed_at: toIsoTimestamp(confirmation.confirmedAt),
    last_action: toExportString(record.last_action),
    last_performed_at: toIsoTimestamp(record.last_performed_at),
    user_email: toExportString(record.last_actor?.user_email),
    metadata_source: toExportString(metadataRecord.source)
  };
}

function escapeCsvValue(value: string): string {
  const normalized = value ?? '';
  if (/[",\r\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function buildHistoryCsv(records: SalesForecastRecord[]): string {
  const header = HISTORY_EXPORT_COLUMNS.map((column) => escapeCsvValue(column.label)).join(',');
  const lines = records.map((record) => {
    const row = mapHistoryRecordToExportRow(record);
    return HISTORY_EXPORT_COLUMNS.map((column) => escapeCsvValue(row[column.key])).join(',');
  });
  return [header, ...lines].join('\r\n');
}

function triggerCsvDownload(filename: string, content: string): void {
  const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
  const blob = new Blob([bom, content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildHistoryFormFromRecord(record: SalesForecastRecord): HistoryFormState {
  const metadata = record.metadata ?? {};
  const monthValues: Record<typeof HISTORY_MONTH_FIELDS[number]['key'], string> = {
    n1: '',
    n2: '',
    n3: ''
  };

  const months = Array.isArray(metadata.months) ? metadata.months : [];
  for (const entry of months) {
    if (!entry || typeof entry.month !== 'string') continue;
    const delta = monthDiff(record.anchor_month, entry.month);
    const field = HISTORY_MONTH_FIELDS.find((item) => item.delta === delta);
    if (!field) continue;
    const qty = typeof entry.qty === 'number' ? entry.qty : Number(entry.qty);
    if (Number.isFinite(qty)) {
      monthValues[field.key] = String(qty);
    }
  }

  return {
    anchorMonth: record.anchor_month,
    companyCode: record.company_code ?? '',
    companyDesc: record.company_desc ?? '',
    deptCode: toInputString(metadata.dept_code),
    materialCode: record.material_code ?? '',
    materialDesc: record.material_desc ?? '',
    packSize: toInputString(metadata.pack_size),
    uomCode: toInputString(metadata.uom_code),
    price: extractPriceString(metadata),
    n1: monthValues.n1,
    n2: monthValues.n2,
    n3: monthValues.n3
  };
}

function parseNumericInput(value: string): number | null {
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) return null;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function buildMetadataFromForm(record: SalesForecastRecord, form: HistoryFormState): {
  metadata: SalesForecastMetadata;
  forecastQty: number | null;
} {
  const existingMetadata = record.metadata ?? {};
  const base: SalesForecastMetadata = {
    ...existingMetadata,
    version: typeof existingMetadata.version === 'number' ? existingMetadata.version : 1,
    source: existingMetadata.source || 'manual-edit',
    dim_ids: existingMetadata.dim_ids || undefined
  };

  const priceNumber = parseNumericInput(form.price);
  const existingMonths = Array.isArray(existingMetadata.months)
    ? (existingMetadata.months as SalesForecastMonthsEntry[])
    : [];
  const existingByMonth = new Map<string, SalesForecastMonthsEntry>();
  for (const entry of existingMonths) {
    if (entry && typeof entry.month === 'string') {
      existingByMonth.set(entry.month, entry);
    }
  }

  const months = HISTORY_MONTH_FIELDS.reduce<Array<{ month: string; qty: number; price?: number }>>((acc, item) => {
    const qty = parseNumericInput(form[item.key]);
    if (qty === null) {
      return acc;
    }
    const monthString = addMonthString(form.anchorMonth, item.delta);
    const entry: { month: string; qty: number; price?: number } = { month: monthString, qty };
    if (priceNumber !== null) {
      entry.price = priceNumber;
    } else {
      const existing = existingByMonth.get(monthString);
      const existingPrice = existing && (existing as any).price;
      const numeric = typeof existingPrice === 'number' ? existingPrice : Number(existingPrice);
      if (Number.isFinite(numeric)) {
        entry.price = Number(numeric);
      }
    }
    acc.push(entry);
    return acc;
  }, []);

  const forecastQty =
    typeof record.forecast_qty === 'number' && Number.isFinite(record.forecast_qty)
      ? record.forecast_qty
      : null;

  const metadata: SalesForecastMetadata = {
    ...base,
    months,
    dept_code: form.deptCode || null,
    pack_size: form.packSize || null,
    uom_code: form.uomCode || null,
    fact_rows_inserted: base.fact_rows_inserted
  };

  if (priceNumber !== null) {
    metadata.price = priceNumber;
  } else {
    delete metadata.price;
  }

  return { metadata, forecastQty };
}

export function HomePage() {
  const { logError } = useErrorLog();
  const { user } = useAuth();
  const isAdminUser = userHasAdminRole(user);
  const defaultAnchorMonth = getCurrentAnchorMonth();
  const [tab, setTab] = useState<'upload' | 'manual' | 'history' | 'master'>('upload');
  const [rows, setRows] = useState<RowObject[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [workbookPrimarySheetName, setWorkbookPrimarySheetName] = useState('Sheet1');
  const [workbookExtraSheets, setWorkbookExtraSheets] = useState<WorkbookSheet[]>([]);
  const [anchorMonth, setAnchorMonth] = useState<string>(defaultAnchorMonth);
  const [isUploading, setIsUploading] = useState(false);
  const [hasUploadedCurrentFile, setHasUploadedCurrentFile] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<'success' | 'error' | 'info'>('info');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationOverflowCount, setValidationOverflowCount] = useState(0);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [validationWarningOverflowCount, setValidationWarningOverflowCount] = useState(0);
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);
  const [historyAnchorMonth, setHistoryAnchorMonth] = useState<string>(defaultAnchorMonth);
  const [historySearch, setHistorySearch] = useState('');
  const [historyRecords, setHistoryRecords] = useState<SalesForecastRecord[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyFetched, setHistoryFetched] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyEditRecord, setHistoryEditRecord] = useState<SalesForecastRecord | null>(null);
  const [historyEditForm, setHistoryEditForm] = useState<HistoryFormState | null>(null);
  const [historyActionNotice, setHistoryActionNotice] = useState<HistoryActionNotice | null>(null);
  const [historyProcessingId, setHistoryProcessingId] = useState<string | null>(null);
  const [historyDeletingId, setHistoryDeletingId] = useState<string | null>(null);
  const [historyExporting, setHistoryExporting] = useState(false);
  const [historyBulkDeleting, setHistoryBulkDeleting] = useState(false);
  const [historyConfirmingId, setHistoryConfirmingId] = useState<string | null>(null);
  const [historyBulkConfirmingAction, setHistoryBulkConfirmingAction] = useState<ConfirmAction | null>(null);

  const deletableRecords = useMemo(() => {
    if (!user) return [] as SalesForecastRecord[];
    return historyRecords.filter((r) => recordBelongsToUser(r, user));
  }, [historyRecords, user]);

  const confirmationStats = useMemo(
    () =>
      historyRecords.reduce(
        (acc, record) => {
          const snapshot = getHistoryConfirmationSnapshot(record);
          if (snapshot.confirmed) {
            acc.confirmed += 1;
          } else {
            acc.pending += 1;
          }
          return acc;
        },
        { confirmed: 0, pending: 0 }
      ),
    [historyRecords]
  );

  function handleFile(file: File) {
    setMessage(null);
    setValidationErrors([]);
    setValidationOverflowCount(0);
    setValidationWarnings([]);
    setValidationWarningOverflowCount(0);
    setWarningAcknowledged(false);
    setHasUploadedCurrentFile(false);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const START_ROW_INDEX = 2; // skip first two rows; third row contains headers
      const json: RowObject[] = XLSX.utils.sheet_to_json(ws, {
        defval: '',
        raw: false,
        range: START_ROW_INDEX
      });
      const renamedJson = json.map(renameRowKeys);
      const normalizedRows = normalizeRows(renamedJson);
      const sheetRows = XLSX.utils.sheet_to_json<Array<string | number | null>>(ws, {
        header: 1,
        range: START_ROW_INDEX
      }) as Array<Array<string | number | null>>;
      const headerRow = (sheetRows[0] || []).map((value) =>
        value === undefined || value === null ? '' : String(value)
      );
      const displayHeaderRow = headerRow.map((value) => COLUMN_HEADER_RENAMES[value] ?? value);
      const effectiveHeaders =
        displayHeaderRow.length > 0 ? displayHeaderRow : Object.keys(normalizedRows[0] || {});
      setHeaders(effectiveHeaders);
      const sanitizedMatrix =
        sheetRows.length > 0 ? [effectiveHeaders, ...sheetRows.slice(1)] : [];
      const primarySheetName = wb.SheetNames[0] || 'Sheet1';
      const extraSheets: WorkbookSheet[] = wb.SheetNames.slice(1).map((sheetName) => ({
        name: sheetName,
        sheet: wb.Sheets[sheetName]
      }));

      const issues = collectValidationIssues(normalizedRows);
      if (issues.length > 0) {
        console.error('uploadValidationErrors', issues);
        const formatted = issues.slice(0, MAX_VALIDATION_ERRORS).map(formatValidationIssue);
        setValidationErrors(formatted);
        setValidationOverflowCount(Math.max(issues.length - formatted.length, 0));
        setValidationWarnings([]);
        setValidationWarningOverflowCount(0);
        setRows([]);
        setSelectedFile(null);
        setWorkbookPrimarySheetName('Sheet1');
        setWorkbookExtraSheets([]);
        setMessageKind('error');
        setMessage(`พบปัญหาในการตรวจสอบข้อมูลทั้งหมด ${issues.length} จุด กรุณาแก้ไขไฟล์ก่อนอัปโหลดอีกครั้ง`);
        logError({
          message: 'ตรวจสอบไฟล์ที่อัปโหลดไม่ผ่าน',
          source: 'HomePage:handleFile',
          details: `พบข้อผิดพลาด ${issues.length} จุดจากไฟล์ที่นำเข้า`,
          context: issues.slice(0, MAX_VALIDATION_ERRORS)
        });
        return;
      }

      const normalizedFile = (() => {
        if (sanitizedMatrix.length === 0) return file;
        try {
          const normalizedWb = XLSX.utils.book_new();
          const normalizedSheet = XLSX.utils.aoa_to_sheet(sanitizedMatrix);
          XLSX.utils.book_append_sheet(normalizedWb, normalizedSheet, primarySheetName);
          extraSheets.forEach(({ name, sheet }) => {
            XLSX.utils.book_append_sheet(normalizedWb, sheet, name);
          });
          const normalizedBuffer = XLSX.write(normalizedWb, { type: 'array', bookType: 'xlsx' });
          const fileType =
            file.type && file.type.trim() !== ''
              ? file.type
              : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          return new File([normalizedBuffer], file.name, { type: fileType });
        } catch (err) {
          console.warn('uploadNormalizationFallback', err);
          return file;
        }
      })();

      setRows(normalizedRows);
      setSelectedFile(normalizedFile);
      setWorkbookPrimarySheetName(primarySheetName);
      setWorkbookExtraSheets(extraSheets);
      setValidationErrors([]);
      setValidationOverflowCount(0);
      setValidationWarnings([]);
      setValidationWarningOverflowCount(0);
      setMessageKind('success');
      setMessage('ตรวจสอบรูปแบบไฟล์เรียบร้อย กด Submit เพื่ออัปโหลด');
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleUpload() {
    if (hasUploadedCurrentFile) {
      console.warn('ingestUploadAlreadyCompleted');
      setMessageKind('error');
      setMessage('Upload failed: this data was already ingested. Please load a new file before submitting again.');
      return;
    }
    if (!selectedFile) {
      setMessageKind('error');
      setMessage('กรุณาเลือกไฟล์ก่อน');
      return;
    }
    if (validationErrors.length > 0) {
      setMessageKind('error');
      setMessage('กรุณาแก้ไขข้อมูลให้ถูกต้องก่อนอัปโหลด');
      return;
    }
    const normalizedRowsForUpload = normalizeRows(rows);
    const targetAnchorMonth = anchorMonth || getCurrentAnchorMonth();
    let masterValidation: MasterValidationResult;
    try {
      masterValidation = await validateRowsAgainstMaster(normalizedRowsForUpload, targetAnchorMonth);
    } catch (error: any) {
      const fallbackMessage = 'ไม่สามารถตรวจสอบข้อมูลกับ Master ได้ กรุณาลองใหม่อีกครั้ง';
      logError({
        message: 'ไม่สามารถตรวจสอบข้อมูล Master',
        source: 'HomePage:handleUpload:masterValidation',
        details: typeof error?.stack === 'string' ? error.stack : undefined,
        context: { fileName: selectedFile.name }
      });
      setMessageKind('error');
      setMessage(fallbackMessage);
      return;
    }

    if (masterValidation.skuLookupFailures.length > 0) {
      logError({
        message: 'ไม่สามารถตรวจสอบ Pack Size/หน่วย จาก Master ได้บางรายการ',
        source: 'HomePage:handleUpload:skuLookup',
        severity: 'warning',
        context: masterValidation.skuLookupFailures
      });
    }
    if (masterValidation.monthlyAccessLookupFailure) {
      logError({
        message: 'ไม่สามารถตรวจสอบ monthly_access_control_material ได้',
        source: 'HomePage:handleUpload:monthlyAccessMaterial',
        severity: 'warning',
        context: { error: masterValidation.monthlyAccessLookupFailure }
      });
    }

    if (masterValidation.errorMessages.length > 0) {
      const formatted = masterValidation.errorMessages.slice(0, MAX_VALIDATION_ERRORS);
      setValidationErrors(formatted);
      setValidationOverflowCount(
        Math.max(masterValidation.errorMessages.length - formatted.length, 0)
      );
      setValidationWarnings([]);
      setValidationWarningOverflowCount(0);
      setMessageKind('error');
      setMessage(
        `พบข้อมูลไม่ตรงกับ Master ${masterValidation.errorMessages.length} จุด กรุณาแก้ไขก่อนอัปโหลด`
      );
      logError({
        message: 'พบข้อมูลไม่ตรงกับ Master (Error)',
        source: 'HomePage:handleUpload:masterValidation',
        context: masterValidation.errorIssues.slice(0, 50)
      });
      return;
    }

    if (masterValidation.warningMessages.length > 0) {
      const formatted = masterValidation.warningMessages.slice(0, MAX_VALIDATION_ERRORS);
      setValidationWarnings(formatted);
      setValidationWarningOverflowCount(
        Math.max(masterValidation.warningMessages.length - formatted.length, 0)
      );
      logError({
        message: 'พบข้อมูลไม่ตรงกับ Master (Warning)',
        source: 'HomePage:handleUpload:masterValidation',
        severity: 'warning',
        context: masterValidation.warningIssues.slice(0, 50)
      });
    } else {
      setValidationWarnings([]);
      setValidationWarningOverflowCount(0);
      setWarningAcknowledged(false);
    }
    if (masterValidation.warningMessages.length > 0 && !warningAcknowledged) {
      const confirmed = window.confirm(
        `พบข้อมูลไม่ตรงกับ Master (Warning) ${masterValidation.warningMessages.length} จุด ต้องการยืนยันการอัปโหลดหรือไม่?`
      );
      if (!confirmed) {
        setMessageKind('info');
        setMessage('ยกเลิกการอัปโหลดข้อมูล');
        return;
      }
      setWarningAcknowledged(true);
    }
    if (!confirmCrossMonth(targetAnchorMonth, { contextLabel: 'Upload Data' })) {
      setMessageKind('info');
      setMessage('ยกเลิกการอัปโหลดข้อมูล');
      return;
    }
    const uploadHeaders =
      headers.length > 0 ? headers : Object.keys(normalizedRowsForUpload[0] || {});
    const uploadMatrix = buildMatrixFromRows(uploadHeaders, normalizedRowsForUpload);
    const fileToUpload =
      uploadMatrix.length > 0
        ? buildUploadFileFromMatrix({
            baseFile: selectedFile,
            matrix: uploadMatrix,
            primarySheetName: workbookPrimarySheetName,
            extraSheets: workbookExtraSheets
          })
        : selectedFile;
    const previewRowCount = rows.length;
    setIsUploading(true);
    setMessageKind('info');
    setMessage('กำลังอัปโหลด...');
    try {
      const result = await ingestApi.upload(fileToUpload, targetAnchorMonth);
      const processedRows =
        typeof result.processedRows === 'number' ? result.processedRows : previewRowCount;
      const insertedRows =
        typeof result.insertedCount === 'number' ? result.insertedCount : processedRows;
      const factRowsInserted =
        typeof result.factRowsInserted === 'number' ? result.factRowsInserted : undefined;
      console.info('ingestUploadSuccess', {
        runId: result.runId,
        processedRows,
        insertedRows,
        factRowsInserted
      });
      setMessageKind('success');
      const successParts: string[] = [
        'Upload success!',
        `Processed ${processedRows} row${processedRows === 1 ? '' : 's'}`
      ];
      if (insertedRows !== undefined) {
        successParts.push(`Saved ${insertedRows} data row${insertedRows === 1 ? '' : 's'}`);
      }
      if (
        factRowsInserted !== undefined &&
        insertedRows !== undefined &&
        factRowsInserted !== insertedRows
      ) {
        //successParts.push(`Created ${factRowsInserted} forecast record${factRowsInserted === 1 ? '' : 's'}`);
      }
      successParts.push(`Run ID: ${result.runId}`);
      setMessage(successParts.join(' | '));
      setHasUploadedCurrentFile(true);
    } catch (error: any) {
      const errorMessage = error?.message || 'Upload failed';
      const friendlyMessage = formatLineErrorMessage(errorMessage, 'Upload failed');
      logError({
        message: friendlyMessage,
        source: 'HomePage:handleUpload',
        details: typeof error?.stack === 'string' ? error.stack : undefined,
        context: {
          anchorMonth: targetAnchorMonth,
          fileName: selectedFile.name
        }
      });
      setMessageKind('error');
      setMessage(friendlyMessage);
    } finally {
      setIsUploading(false);
    }
  }

  function onCellEdit(rIndex: number, key: string, value: string) {
    setRows(prev => prev.map((r, idx) => idx === rIndex ? { ...r, [key]: value } : r));
  }

  async function fetchHistory() {
    if (!historyAnchorMonth) {
      setHistoryError('กรุณาเลือก Anchor Month');
      return;
    }

    setIsHistoryLoading(true);
    setHistoryError(null);

    try {
      const response = await dataApi.salesForecastHistory({
        anchor_month: historyAnchorMonth,
        search: historySearch.trim() || undefined
      });
      const data = response?.data ?? [];
      let filteredRecords: SalesForecastRecord[] = data;
      if (!isAdminUser) {
        if (user) {
          filteredRecords = data.filter((record) => recordBelongsToUser(record, user));
        } else {
          filteredRecords = [];
        }
      }
      setHistoryRecords(filteredRecords);
      setHistoryFetched(true);
      setHistoryActionNotice(null);
    } catch (error: any) {
      const errorMessage = error?.message || 'ไม่สามารถดึงข้อมูลได้';
      logError({
        message: errorMessage,
        source: 'HomePage:fetchHistory',
        details: typeof error?.stack === 'string' ? error.stack : undefined,
        context: {
          anchorMonth: historyAnchorMonth,
          search: historySearch.trim() || undefined
        }
      });
      setHistoryRecords([]);
      setHistoryFetched(false);
      setHistoryError(errorMessage);
    } finally {
      setIsHistoryLoading(false);
    }
  }

  function resetHistoryFilters() {
    const defaultAnchor = getCurrentAnchorMonth();
    setHistoryAnchorMonth(defaultAnchor);
    setHistorySearch('');
    setHistoryRecords([]);
    setHistoryError(null);
    setHistoryFetched(false);
    setHistoryActionNotice(null);
  }

  function openHistoryEditor(record: SalesForecastRecord) {
    setHistoryEditRecord(record);
    setHistoryEditForm(buildHistoryFormFromRecord(record));
    setHistoryActionNotice(null);
  }

  function closeHistoryEditor() {
    setHistoryEditRecord(null);
    setHistoryEditForm(null);
  }

  function updateHistoryForm<K extends keyof HistoryFormState>(key: K, value: string) {
    setHistoryEditForm(prev => (prev ? { ...prev, [key]: value } : prev));
  }

  async function submitHistoryEdit() {
    if (!historyEditRecord || !historyEditForm) return;

    setHistoryProcessingId(historyEditRecord.id);
    setHistoryActionNotice(null);
    try {
      const { metadata, forecastQty } = buildMetadataFromForm(historyEditRecord, historyEditForm);
      if (!metadata.months || metadata.months.length === 0) {
        setHistoryActionNotice({
          kind: 'error',
          message: 'กรุณาระบุปริมาณอย่างน้อยหนึ่งเดือน'
        });
        setHistoryProcessingId(null);
        return;
      }
      await dataApi.salesForecastUpdate(historyEditRecord.id, {
        anchor_month: historyEditForm.anchorMonth,
        company_code: historyEditForm.companyCode || null,
        company_desc: historyEditForm.companyDesc || null,
        material_code: historyEditForm.materialCode || null,
        material_desc: historyEditForm.materialDesc || null,
        forecast_qty: forecastQty,
        metadata
      });
      closeHistoryEditor();
      await fetchHistory();
      setHistoryActionNotice({
        kind: 'success',
        message: 'แก้ไขข้อมูลเรียบร้อยแล้ว'
      });
    } catch (error: any) {
      const errorMessage = error?.message || 'ไม่สามารถบันทึกข้อมูลได้';
      logError({
        message: errorMessage,
        source: 'HomePage:submitHistoryEdit',
        details: typeof error?.stack === 'string' ? error.stack : undefined,
        context: {
          recordId: historyEditRecord.id,
          anchorMonth: historyEditForm.anchorMonth
        }
      });
      setHistoryActionNotice({
        kind: 'error',
        message: errorMessage
      });
    } finally {
      setHistoryProcessingId(null);
    }
  }

  async function handleHistoryDelete(record: SalesForecastRecord) {
    const confirmDelete = window.confirm('ยืนยันการลบข้อมูลแถวนี้หรือไม่?');
    if (!confirmDelete) return;

    setHistoryDeletingId(record.id);
    setHistoryActionNotice(null);
    try {
      await dataApi.salesForecastDelete(record.id);
      if (historyEditRecord?.id === record.id) {
        closeHistoryEditor();
      }
      await fetchHistory();
      setHistoryActionNotice({
        kind: 'success',
        message: 'ลบข้อมูลเรียบร้อยแล้ว'
      });
    } catch (error: any) {
      const errorMessage = error?.message || 'ไม่สามารถลบข้อมูลได้';
      logError({
        message: errorMessage,
        source: 'HomePage:handleHistoryDelete',
        details: typeof error?.stack === 'string' ? error.stack : undefined,
        context: { recordId: record.id }
      });
      setHistoryActionNotice({
        kind: 'error',
        message: errorMessage
      });
    } finally {
      setHistoryDeletingId(null);
    }
  }

  async function handleHistoryConfirmToggle(record: SalesForecastRecord, action: ConfirmAction) {
    const targetConfirmed = action === 'confirm';
    const snapshot = getHistoryConfirmationSnapshot(record);
    if (snapshot.confirmed === targetConfirmed) return;

    setHistoryConfirmingId(record.id);
    setHistoryActionNotice(null);
    try {
      const actorLabel =
        resolveConfirmationActor(user) ||
        snapshot.confirmedBy ||
        record.last_actor?.user_username ||
        record.last_actor?.performed_by ||
        null;

      const metadata = buildUpdatedConfirmationMetadata(record.metadata, {
        confirmed: targetConfirmed,
        actor: actorLabel
      });
      await dataApi.salesForecastUpdate(record.id, { metadata });
      await fetchHistory();
      setHistoryActionNotice({
        kind: 'success',
        message: targetConfirmed ? 'Confirm ข้อมูลเรียบร้อยแล้ว' : 'ยกเลิก Confirm แถวนี้เรียบร้อยแล้ว'
      });
    } catch (error: any) {
      const errorMessage =
        error?.message ||
        (targetConfirmed ? 'ไม่สามารถ Confirm แถวนี้ได้ กรุณาลองใหม่' : 'ไม่สามารถยกเลิก Confirm แถวนี้ได้');
      logError({
        message: errorMessage,
        source: 'HomePage:handleHistoryConfirmToggle',
        details: typeof error?.stack === 'string' ? error.stack : undefined,
        context: { recordId: record.id, action }
      });
      setHistoryActionNotice({
        kind: 'error',
        message: errorMessage
      });
    } finally {
      setHistoryConfirmingId(null);
    }
  }

  async function handleBulkConfirmation(action: ConfirmAction) {
    if (historyBulkConfirmingAction || historyBulkDeleting || isHistoryLoading) return;
    const targetConfirmed = action === 'confirm';
    const targets = historyRecords.filter(
      (record) => getHistoryConfirmationSnapshot(record).confirmed !== targetConfirmed
    );
    if (targets.length === 0) return;

    const confirmMessage = targetConfirmed
      ? `ยืนยันการ Confirm ${targets.length} รายการตามตัวกรองปัจจุบันหรือไม่?`
      : `ยืนยันการยกเลิก Confirm ${targets.length} รายการตามตัวกรองปัจจุบันหรือไม่?`;
    if (!window.confirm(confirmMessage)) return;

    setHistoryBulkConfirmingAction(action);
    setHistoryActionNotice(null);

    try {
      const actorLabel = resolveConfirmationActor(user);
      const BATCH_SIZE = 25;
      const DELAY_MS = 250;
      const failures: Array<{ id: string; message: string }> = [];
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      for (let start = 0; start < targets.length; start += BATCH_SIZE) {
        const batch = targets.slice(start, start + BATCH_SIZE);
        await Promise.all(
          batch.map(async (record) => {
            try {
              const metadata = buildUpdatedConfirmationMetadata(record.metadata, {
                confirmed: targetConfirmed,
                actor: actorLabel
              });
              await dataApi.salesForecastUpdate(record.id, { metadata });
            } catch (error: any) {
              failures.push({
                id: record.id,
                message: error?.message || 'Failed to update confirmation state'
              });
            }
          })
        );
        if (start + BATCH_SIZE < targets.length) {
          await sleep(DELAY_MS);
        }
      }

      await fetchHistory();

      if (failures.length > 0) {
        const errorMessage = `${failures.length} รายการไม่สามารถ${
          targetConfirmed ? 'Confirm' : 'ยกเลิก Confirm'
        }ได้`;
        logError({
          message: errorMessage,
          source: 'HomePage:handleBulkConfirmation',
          details: JSON.stringify(failures.slice(0, 10)),
          context: { action, failuresCount: failures.length }
        });
        setHistoryActionNotice({
          kind: 'error',
          message: errorMessage
        });
      } else {
        setHistoryActionNotice({
          kind: 'success',
          message: targetConfirmed
            ? `Confirm ข้อมูล ${targets.length} รายการเรียบร้อยแล้ว`
            : `ยกเลิก Confirm ${targets.length} รายการเรียบร้อยแล้ว`
        });
      }
    } catch (error: any) {
      const errorMessage =
        error?.message ||
        (action === 'confirm'
          ? 'ไม่สามารถ Confirm ข้อมูลตามตัวกรองได้'
          : 'ไม่สามารถยกเลิก Confirm ข้อมูลตามตัวกรองได้');
      logError({
        message: errorMessage,
        source: 'HomePage:handleBulkConfirmation:unexpected',
        details: typeof error?.stack === 'string' ? error.stack : undefined,
        context: { action }
      });
      setHistoryActionNotice({
        kind: 'error',
        message: errorMessage
      });
    } finally {
      setHistoryBulkConfirmingAction(null);
    }
  }

  async function exportHistoryCsv() {
    if (historyRecords.length === 0 || historyExporting) return;
    setHistoryActionNotice(null);
    setHistoryExporting(true);
    try {
      const csv = buildHistoryCsv(historyRecords);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const anchorSuffix = historyAnchorMonth ? historyAnchorMonth.replace(/[^0-9A-Za-z_-]/g, '') : 'all';
      const filename = `history-${anchorSuffix}-${timestamp}.csv`;
      triggerCsvDownload(filename, csv);
    } catch (error: any) {
      const errorMessage = error?.message || 'ไม่สามารถส่งออกข้อมูลได้';
      logError({
        message: errorMessage,
        source: 'HomePage:exportHistoryCsv',
        details: typeof error?.stack === 'string' ? error.stack : undefined,
        context: { anchorMonth: historyAnchorMonth, recordCount: historyRecords.length }
      });
      setHistoryActionNotice({
        kind: 'error',
        message: errorMessage
      });
    } finally {
      setHistoryExporting(false);
    }
  }

  async function handleBulkDeleteMyAnchorMonth() {
    // Safety net: bulk delete must only run for signed-in non-admin users.
    if (isAdminUser || !user) return;
    const MAX_BULK_DELETE = 50000;
    // deletableRecords is already derived from recordBelongsToUser, but we defensively
    // re-evaluate here to ensure we only act on records attributed to this user.
    const userScopedRecords = deletableRecords.filter((record) => recordBelongsToUser(record, user));
    const totalAll = userScopedRecords.length;
    if (totalAll === 0) return;

    const toDeleteRecords = userScopedRecords.slice(0, MAX_BULK_DELETE);
    const total = toDeleteRecords.length;

    const confirmed = window.confirm(
      `${totalAll > MAX_BULK_DELETE ? `ระบบจะลบได้สูงสุด ${MAX_BULK_DELETE} รายการในครั้งเดียว (มี ${totalAll} รายการ)` : ''}\nยืนยันการลบข้อมูลของคุณทั้งหมดสำหรับ Anchor Month ${historyAnchorMonth} จำนวน ${total} รายการหรือไม่?`
    );
    if (!confirmed) return;

    setHistoryActionNotice(null);
    setHistoryBulkDeleting(true);
    try {
      const ids = toDeleteRecords.map((r) => r.id);

      const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
      const CHUNK_SIZE = 100; // ลบเป็นชุดละ 100 รายการต่อ Job

      // ลดความเร็วเริ่มต้น และค่อยๆ เร่งเมื่อไม่โดน 429
      let basePaceMs = 750; // ช่วงว่างขั้นต่ำระหว่างคำขอ (ช้าลง)
      let nextSlotAt = Date.now();
      let cooldownUntil = 0; // หยุดยิงชั่วคราวถ้าเซิร์ฟเวอร์สั่งพัก
      const reserveSlot = async (extraDelay = 0) => {
        const now = Date.now();
        let wait = Math.max(0, nextSlotAt - now);
        if (cooldownUntil > now) wait = Math.max(wait, cooldownUntil - now);
        wait += extraDelay;
        if (wait > 0) await sleep(wait);
        nextSlotAt = Date.now() + basePaceMs;
      };

      let concurrency = 1; // เริ่มลบทีละคำขอ
      const MAX_CONCURRENCY = 3; // เร็วสุดไม่เกิน 3 พร้อมกัน
      const MIN_CONCURRENCY = 1;
      let active = 0;
      const acquire = async () => {
        while (active >= concurrency) await sleep(10);
        active++;
      };
      const release = () => {
        active = Math.max(0, active - 1);
      };

      let successes = 0;
      let hadRateLimit = false;

      const attemptDelete = async (id: string) => {
        await acquire();
        try {
          let backoff = 1200; // เริ่ม backoff ช้าลงเมื่อเจอ 429
          for (let attempt = 0; attempt < 8; attempt++) {
            try {
              await reserveSlot(0);
              await dataApi.salesForecastDelete(id, { timeoutMs: 15000 });
              successes++;
              // เร่งความเร็วแบบค่อยเป็นค่อยไปเมื่อไปได้สวย
              if (successes >= 80 && concurrency < MAX_CONCURRENCY) {
                concurrency++;
                basePaceMs = Math.max(500, Math.floor(basePaceMs * 0.9));
                successes = 0;
              }
              return;
            } catch (err: any) {
              const status = Number(err?.status || 0);
              const retryAfterMs = Number(err?.retryAfterMs || 0);
              const msg = String(err?.message || '');
              if (status === 404) {
                successes++;
                if (successes >= 80 && concurrency < MAX_CONCURRENCY) {
                  concurrency++;
                  basePaceMs = Math.max(500, Math.floor(basePaceMs * 0.9));
                  successes = 0;
                }
                return;
              }
              const retryable = status === 429 || /Too\s*Many|429|timeout|abort|network|Rate\s*limit/i.test(msg);
              if (!retryable) throw err;

              hadRateLimit = hadRateLimit || status === 429;
              const jitter = Math.floor(Math.random() * 200);
              const cooldown = Math.max(retryAfterMs, backoff) + jitter;
              // ปรับลงทันทีเมื่อโดน 429
              if (status === 429) {
                concurrency = Math.max(MIN_CONCURRENCY, Math.ceil(concurrency / 2));
                basePaceMs = Math.min(2000, Math.floor(basePaceMs * 1.6) + 150);
                // บังคับคูลดาวน์อย่างน้อย 2 วินาทีเมื่อโดน 429
                const minCooldown = 2000;
                cooldownUntil = Math.max(cooldownUntil, Date.now() + minCooldown);
              }
              cooldownUntil = Math.max(cooldownUntil, Date.now() + cooldown);
              await reserveSlot(0);
              backoff = Math.min(8000, Math.floor(backoff * 1.6) + 180);
            }
          }
          // last try
          await reserveSlot(0);
          try {
            await dataApi.salesForecastDelete(id, { timeoutMs: 15000 });
            successes++;
            if (successes >= 80 && concurrency < MAX_CONCURRENCY) {
              concurrency++;
              basePaceMs = Math.max(500, Math.floor(basePaceMs * 0.9));
              successes = 0;
            }
          } catch (err: any) {
            if (Number(err?.status || 0) === 404) {
              successes++;
              if (successes >= 80 && concurrency < MAX_CONCURRENCY) {
                concurrency++;
                basePaceMs = Math.max(500, Math.floor(basePaceMs * 0.9));
                successes = 0;
              }
            } else {
              throw err;
            }
          }
        } finally {
          release();
        }
      };

      const runPool = async (batch: string[]) => {
        let cursor = 0;
        // สร้าง worker ตามเพดานสูงสุด แต่คุมจำนวน active ด้วย semaphore + concurrency ที่ปรับได้
        const workers = Array.from({ length: MAX_CONCURRENCY }, async () => {
          while (true) {
            const i = cursor++;
            if (i >= batch.length) break;
            await attemptDelete(batch[i]);
          }
        });
        await Promise.all(workers);
      };

      for (let start = 0; start < ids.length; start += CHUNK_SIZE) {
        const batch = ids.slice(start, start + CHUNK_SIZE);
        await runPool(batch);
        // พักระหว่าง Job: ยาวขึ้นเพื่อเลี่ยง 429
        if (start + CHUNK_SIZE < ids.length) {
          await sleep(hadRateLimit ? 3000 : 1200);
          hadRateLimit = false;
        }
      }

      await fetchHistory();
      setHistoryActionNotice({
        kind: 'success',
        message: `ลบข้อมูลแล้ว ${total} รายการ สำหรับเดือน ${historyAnchorMonth}`
      });
    } catch (error: any) {
      const errorMessage = error?.message || 'ลบข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
      logError({
        message: errorMessage,
        source: 'HomePage:handleBulkDeleteMyAnchorMonth',
        details: typeof error?.stack === 'string' ? error.stack : undefined,
        context: { anchorMonth: historyAnchorMonth, total: deletableRecords.length }
      });
      setHistoryActionNotice({ kind: 'error', message: errorMessage });
    } finally {
      setHistoryBulkDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200/70 dark:border-gray-700/70">
            <nav className="flex">
              <button 
                className={`flex items-center gap-3 px-8 py-4 text-sm font-medium transition-all duration-200 ${
                  tab === 'upload' 
                    ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50 dark:bg-brand-900/20' 
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-gray-700/50'
                }`}
                onClick={() => setTab('upload')}
              >
                <Upload className="w-5 h-5" />
                Upload Data
              </button>
              <button 
                className={`flex items-center gap-3 px-8 py-4 text-sm font-medium transition-all duration-200 ${
                  tab === 'manual' 
                    ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50 dark:bg-brand-900/20' 
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-gray-700/50'
                }`}
                onClick={() => setTab('manual')}
              >
                <Edit3 className="w-5 h-5" />
                Manual Entry
              </button>
              <button
                className={`flex items-center gap-3 px-8 py-4 text-sm font-medium transition-all duration-200 ${
                  tab === 'history'
                    ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50 dark:bg-brand-900/20'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-gray-700/50'
                }`}
                onClick={() => setTab('history')}
              >
                <History className="w-5 h-5" />
                Preview History Data
              </button>
              <button
                className={`flex items-center gap-3 px-8 py-4 text-sm font-medium transition-all duration-200 ${
                  tab === 'master'
                    ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50 dark:bg-brand-900/20'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-gray-700/50'
                }`}
                onClick={() => setTab('master')}
              >
                <LayoutGrid className="w-5 h-5" />
                Master Display
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {tab === 'upload' && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-brand-600 to-blue-600 rounded-xl">
                    <FileSpreadsheet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Demand Data</h2>
                    <p className="text-gray-600 dark:text-gray-400">Upload Excel (.xlsx) files and preview or edit before processing</p>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Anchor Month (yyyy-mm)
                  </label>
                  <input
                    type="month"
                    value={anchorMonth}
                    onChange={e => setAnchorMonth(e.target.value)}
                    className="input"
                  />
                </div>
                <FileUpload onFile={handleFile} />
              </div>
            )}
            
            {tab === 'manual' && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manual Data Entry</h2>
                    <p className="text-gray-600 dark:text-gray-400">Enter demand data manually for immediate processing</p>
                  </div>
                </div>
                <ManualEntryForm />
              </div>
            )}

            {tab === 'history' && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl">
                    <History className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Preview History Data</h2>
                    <p className="text-gray-600 dark:text-gray-400">ค้นหาข้อมูลคาดการณ์ที่บันทึกไว้ตามตัวกรอง</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)]">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Anchor Month (yyyy-mm)
                    </label>
                    <input
                      type="month"
                      value={historyAnchorMonth}
                      onChange={(e) => setHistoryAnchorMonth(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      ค้นหาข้อมูล (by หน่วยงาน, ชื่อบริษัท, ลูกค้า, วัตถุดิบ, Last_User)
                    </label>
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="input"
                      placeholder="พิมพ์คำค้น เช่น Betagro, MAT-001, AA001 หรือชื่อ Last_User"
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {!isAdminUser && (
                    <button
                      type="button"
                      onClick={handleBulkDeleteMyAnchorMonth}
                      disabled={historyBulkDeleting || deletableRecords.length === 0 || isHistoryLoading}
                      className="inline-flex items-center gap-2 rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:border-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 dark:border-red-600 dark:bg-slate-900 dark:text-red-300 dark:hover:border-red-500 dark:hover:text-red-200 dark:focus:ring-red-400/40 disabled:dark:border-slate-700 disabled:dark:text-slate-500"
                      title="Delete all of my records for the selected month"
                    >
                      {historyBulkDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      )}
                      <span>Delete All (My Records)</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleBulkConfirmation('confirm')}
                    disabled={
                      confirmationStats.pending === 0 ||
                      historyRecords.length === 0 ||
                      isHistoryLoading ||
                      historyBulkDeleting ||
                      historyBulkConfirmingAction === 'confirm'
                    }
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200 dark:hover:border-emerald-500 dark:hover:text-emerald-100 dark:focus:ring-emerald-500/40 disabled:dark:border-slate-700 disabled:dark:text-slate-500"
                    title="Confirm records that match the current filters"
                  >
                    {historyBulkConfirmingAction === 'confirm' ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>
                      {historyBulkConfirmingAction === 'confirm'
                        ? 'Confirming...'
                        : `Confirm Filtered (${confirmationStats.pending})`}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkConfirmation('unconfirm')}
                    disabled={
                      confirmationStats.confirmed === 0 ||
                      historyRecords.length === 0 ||
                      isHistoryLoading ||
                      historyBulkDeleting ||
                      historyBulkConfirmingAction === 'unconfirm'
                    }
                    className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:border-amber-400 hover:text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-200 dark:hover:border-amber-500 dark:hover:text-amber-100 dark:focus:ring-amber-500/40 disabled:dark:border-slate-700 disabled:dark:text-slate-500"
                    title="ยกเลิก Confirm สำหรับรายการที่กรองอยู่"
                  >
                    {historyBulkConfirmingAction === 'unconfirm' ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Undo2 className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>
                      {historyBulkConfirmingAction === 'unconfirm'
                        ? 'Cancelling...'
                        : `Cancel Confirm (${confirmationStats.confirmed})`}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={exportHistoryCsv}
                    disabled={historyRecords.length === 0 || historyExporting}
                    className="group relative inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand-500 via-purple-500 to-blue-500 p-[1px] text-sm font-semibold shadow-lg transition hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-brand-400/60 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="flex items-center gap-2 rounded-full bg-white px-5 py-2 text-brand-600 transition group-hover:bg-transparent group-hover:text-white dark:bg-slate-950/90 dark:text-brand-100">
                      {historyExporting ? (
                        <Loader2 className="h-4 w-4 animate-spin text-brand-500 group-hover:text-white dark:text-brand-200" />
                      ) : (
                        <Download className="h-4 w-4 text-brand-500 transition group-hover:text-white dark:text-brand-200" />
                      )}
                      <span>{historyExporting ? "Generating..." : "Export CSV"}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={fetchHistory}
                    disabled={isHistoryLoading}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    {isHistoryLoading ? 'กำลังดึงข้อมูล...' : 'ค้นหาข้อมูล'}
                  </button>
                  <button
                    type="button"
                    onClick={resetHistoryFilters}
                    disabled={isHistoryLoading}
                    className="btn-outline"
                  >
                    ล้างตัวกรอง
                  </button>
                </div>

                {historyError && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200">
                    {historyError}
                  </div>
                )}

                {!historyError && historyActionNotice && (
                  <div
                    className={`mt-4 rounded-xl border px-4 py-4 text-sm shadow-sm transition-all duration-200 ${
                      historyActionNotice.kind === 'error'
                        ? 'border-red-200/70 bg-red-50/90 text-red-700 dark:border-red-900/50 dark:bg-red-900/30 dark:text-red-200'
                        : 'border-emerald-200/70 bg-emerald-50/90 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200'
                    }`}
                    role={historyActionNotice.kind === 'error' ? 'alert' : 'status'}
                    aria-live="polite"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full ${
                          historyActionNotice.kind === 'error'
                            ? 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-200'
                            : 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200'
                        }`}
                      >
                        {historyActionNotice.kind === 'error' ? (
                          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        )}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium leading-relaxed">
                          {historyActionNotice.message}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setHistoryActionNotice(null)}
                        className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:text-slate-500 dark:hover:bg-slate-700/60 dark:hover:text-slate-200 dark:focus:ring-slate-600"
                        aria-label="ปิดข้อความแจ้งเตือน"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}

                {historyFetched && !historyError && historyRecords.length === 0 && !isHistoryLoading && (
                  <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700 dark:border-yellow-900/60 dark:bg-yellow-900/30 dark:text-yellow-200">
                    ไม่พบข้อมูลตามตัวกรองที่เลือก
                  </div>
                )}

                <div className="mt-6">
                  <HistoryTable
                    records={historyRecords}
                    onEdit={openHistoryEditor}
                    onDelete={handleHistoryDelete}
                    onConfirmToggle={handleHistoryConfirmToggle}
                    busyRowId={historyProcessingId}
                    deletingRowId={historyDeletingId}
                    confirmingRowId={historyConfirmingId}
                    bulkConfirming={Boolean(historyBulkConfirmingAction)}
                  />
                </div>

                {/* {historyEditRecord && historyEditForm && (
                  <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
                    <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">*/}
                {historyEditRecord && historyEditForm && (
                  <div className="fixed inset-0 z-40 flex items-stretch justify-center bg-black/40 p-0 md:p-4">
                    <div className="h-full w-full max-w-none overflow-y-auto rounded-none bg-white p-6 shadow-2xl md:h-auto md:max-h-[92vh] md:max-w-4xl md:rounded-2xl dark:bg-slate-900">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">แก้ไขข้อมูลยอดขาย</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">ID: {historyEditRecord.id}</p>
                        </div>
                        <button
                          type="button"
                          className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                          onClick={closeHistoryEditor}
                          disabled={historyProcessingId === historyEditRecord.id}
                        >
                          ปิด
                        </button>
                      </div>

                      <form
                        className="mt-4 space-y-6"
                        onSubmit={(e) => {
                          e.preventDefault();
                          submitHistoryEdit();
                        }}
                      >
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            Anchor Month
                            <input
                              type="month"
                              className="input mt-1"
                              value={historyEditForm.anchorMonth}
                              onChange={(e) => updateHistoryForm('anchorMonth', e.target.value)}
                              required
                              disabled={historyProcessingId === historyEditRecord.id}
                            />
                          </label>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            Company Code
                            <input
                              type="text"
                              className="input mt-1"
                              value={historyEditForm.companyCode}
                              onChange={(e) => updateHistoryForm('companyCode', e.target.value)}
                              disabled={historyProcessingId === historyEditRecord.id}
                            />
                          </label>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            ชื่อบริษัท
                            <input
                              type="text"
                              className="input mt-1"
                              value={historyEditForm.companyDesc}
                              onChange={(e) => updateHistoryForm('companyDesc', e.target.value)}
                              disabled={historyProcessingId === historyEditRecord.id}
                            />
                          </label>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            หน่วยงาน
                            <input
                              type="text"
                              className="input mt-1"
                              value={historyEditForm.deptCode}
                              onChange={(e) => updateHistoryForm('deptCode', e.target.value)}
                              disabled={historyProcessingId === historyEditRecord.id}
                            />
                          </label>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            Material Code
                            <input
                              type="text"
                              className="input mt-1"
                              value={historyEditForm.materialCode}
                              onChange={(e) => updateHistoryForm('materialCode', e.target.value)}
                              disabled={historyProcessingId === historyEditRecord.id}
                            />
                          </label>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            ชื่อสินค้า
                            <input
                              type="text"
                              className="input mt-1"
                              value={historyEditForm.materialDesc}
                              onChange={(e) => updateHistoryForm('materialDesc', e.target.value)}
                              disabled={historyProcessingId === historyEditRecord.id}
                            />
                          </label>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            Pack Size
                            <input
                              type="text"
                              className="input mt-1"
                              value={historyEditForm.packSize}
                              onChange={(e) => updateHistoryForm('packSize', e.target.value)}
                              disabled={historyProcessingId === historyEditRecord.id}
                            />
                          </label>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            หน่วย
                            <input
                              type="text"
                              className="input mt-1"
                              value={historyEditForm.uomCode}
                              onChange={(e) => updateHistoryForm('uomCode', e.target.value)}
                              disabled={historyProcessingId === historyEditRecord.id}
                            />
                          </label>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            Price
                            <input
                              type="number"
                              step="0.01"
                              className="input mt-1"
                              value={historyEditForm.price}
                              onChange={(e) => updateHistoryForm('price', e.target.value)}
                              disabled={historyProcessingId === historyEditRecord.id}
                            />
                          </label>
                        </div>

                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                          {HISTORY_MONTH_FIELDS.map((field) => (
                            <label key={field.key} className="text-sm font-medium text-slate-600 dark:text-slate-300">
                              {field.label}
                              <input
                                type="number"
                                step="1"
                                min="0"
                                className="input mt-1"
                                value={historyEditForm[field.key]}
                                onChange={(e) => updateHistoryForm(field.key, e.target.value)}
                                disabled={historyProcessingId === historyEditRecord.id}
                              />
                            </label>
                          ))}
                        </div>

                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            className="btn-outline"
                            onClick={closeHistoryEditor}
                            disabled={historyProcessingId === historyEditRecord.id}
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="submit"
                            className="btn-primary"
                            disabled={historyProcessingId === historyEditRecord.id}
                          >
                            {historyProcessingId === historyEditRecord.id ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'master' && (
              <div className="space-y-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-brand-600 to-purple-600 rounded-xl shadow-lg">
                    <LayoutGrid className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Master Data Display</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      สำรวจข้อมูล Master จากระบบฐานข้อมูล Demand Forecasting ครบทุกมิติ ทั้งบริษัท หน่วยงาน ช่องทางจำหน่าย
                      วัตถุดิบ SKU หน่วยนับ และโครงสร้างฝ่ายขาย
                    </p>
                  </div>
                </div>
                <MasterDataShowcase />
              </div>
            )}
          </div>
        </div>

        {/* Data Preview */}
        {tab === 'upload' && rows.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 px-8 py-4 border-b border-gray-200/70 dark:border-gray-700/70">
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Data Preview</h3>
                  <span className="ml-auto px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm font-medium rounded-full">
                    {rows.length} rows
                  </span>
                </div>
              </div>
              <div className="p-0 max-h-[70vh] overflow-x-auto overflow-y-auto">
                <EditableGrid headers={headers} rows={rows} onEdit={onCellEdit} />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleUpload}
                disabled={isUploading || !selectedFile}
                className="btn-primary"
              >
                {isUploading ? 'Uploading…' : 'Submit to Ingest'}
              </button>
              {selectedFile && (
                <span className="text-sm text-gray-600 dark:text-gray-400">{selectedFile.name}</span>
              )}
            </div>

            {message && (
              <div
                className={`rounded-lg px-4 py-3 text-sm ${
                  messageKind === 'success'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                    : messageKind === 'error'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                }`}
              >
                {message}
              </div>
            )}

            {validationErrors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200">
                <p className="font-medium">รายละเอียดปัญหาที่พบ:</p>
                <ul className="mt-2 space-y-1">
                  {validationErrors.map((err, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="font-semibold text-red-600 dark:text-red-300">•</span>
                      <span>{err}</span>
                    </li>
                  ))}
                </ul>
                {validationOverflowCount > 0 && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-300">
                    และยังมีปัญหาเพิ่มเติมอีก {validationOverflowCount} จุด
                  </p>
                )}
              </div>
            )}
            {validationWarnings.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/30 dark:text-amber-200">
                <p className="font-medium">รายละเอียดคำเตือน:</p>
                <ul className="mt-2 space-y-1">
                  {validationWarnings.map((warn, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="font-semibold text-amber-600 dark:text-amber-300">•</span>
                      <span>{warn}</span>
                    </li>
                  ))}
                </ul>
                {validationWarningOverflowCount > 0 && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
                    และยังมีคำเตือนเพิ่มเติมอีก {validationWarningOverflowCount} จุด
                  </p>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
