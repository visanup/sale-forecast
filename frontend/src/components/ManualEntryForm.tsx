import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ClipboardEvent as ReactClipboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { dimApi, ingestApi, monthlyAccessMaterialApi } from '../services/api';
import { useErrorLog } from '../hooks/useErrorLog';
import { MinusCircle } from 'lucide-react';
import {
  DimSource,
  type DimCompany,
  type DimDept,
  type DimMaterial
} from '../services/dimSource';
import ComboInput, { type ComboOption } from './ComboInput';
import { confirmCrossMonth, getCurrentAnchorMonth } from '../utils/anchorMonth';
import { formatLineErrorMessage } from '../utils/errorLine';

type Line = {
  dept_code: string;
  company_desc?: string;
  company_code: string;
  material_code: string;
  material_desc?: string;
  pack_size?: string;
  uom_code?: string;
  n1?: number;
  n2?: number;
  n3?: number;
};

function emptyLine(): Line {
  return {
    dept_code: '',
    company_desc: '',
    company_code: '',
    material_code: '',
    material_desc: '',
    pack_size: '',
    uom_code: ''
  };
}

type ColumnKey = keyof Line;

type ComboColumn = {
  key: keyof Line;
  label: string;
  type: 'combo';
  options: ComboOption<any>[];
  onSearch: (query: string) => Promise<ComboOption<any>[]>;
  historyKey: string;
  placeholder?: string;
  onSelectOption?: (rowIndex: number, option: ComboOption<any>) => void;
};

type NumberColumn = {
  key: ColumnKey;
  label: string;
  type: 'number';
};

type TextColumn = {
  key: keyof Line;
  label: string;
  type?: 'text';
};

type ColumnDefinition = ComboColumn | NumberColumn | TextColumn;
function isComboColumn(column: ColumnDefinition): column is ComboColumn {
  return column.type === 'combo';
}
type ManualResizableColumnKey = Extract<ColumnDefinition['key'], string>;

const MANUAL_COLUMN_MIN_WIDTH = 100;

const DEFAULT_MANUAL_COLUMN_WIDTHS: Partial<Record<ManualResizableColumnKey, number>> = {
  dept_code: 160,
  company_desc: 220,
  company_code: 160,
  material_code: 180,
  material_desc: 220,
  pack_size: 140,
  uom_code: 130,
  n1: 120,
  n2: 120,
  n3: 120
};

const COLUMN_KEY_ALIASES: Record<string, keyof Line> = {
  'n+1': 'n1',
  'n+2': 'n2',
  'n+3': 'n3'
};
function resolveLineKey(key: ColumnDefinition['key']): keyof Line {
  const alias = COLUMN_KEY_ALIASES[String(key)];
  return alias ?? (key as keyof Line);
}

const REQUIRED_LINE_FIELDS: Array<{ key: keyof Line; label: string }> = [
  { key: 'dept_code', label: 'หน่วยงาน' },
  { key: 'company_code', label: 'SAP Code' },
  { key: 'material_code', label: 'SAPCode' },
  { key: 'pack_size', label: 'Pack Size' },
  { key: 'uom_code', label: 'หน่วย' }
];
const MONTHLY_ACCESS_CODE_FIELD = 'monthly_access_control_material';
const MONTHLY_ACCESS_DESC_FIELD = 'monthly_access_control_material_desc';

const MASTER_LOOKUP_LIMIT = 100;

function normalizeLookupValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  const fallback = String(value).trim();
  return fallback.length ? fallback : null;
}

function normalizeMatchKey(value: string): string {
  return value.trim().toLowerCase();
}

function findCachedMatch<T extends { code: string }>(cache: Map<string, T>, code: string): T | null {
  const normalized = normalizeMatchKey(code);
  for (const item of cache.values()) {
    if (normalizeMatchKey(item.code) === normalized) return item;
  }
  return null;
}

function buildValueOptions(values: Iterable<string>): ComboOption[] {
  const map = new Map<string, ComboOption>();
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (!map.has(trimmed)) {
      map.set(trimmed, { value: trimmed, label: trimmed, searchValues: [trimmed] });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.value.localeCompare(b.value));
}

function mergeValueOptions(...groups: ComboOption[][]): ComboOption[] {
  const values: string[] = [];
  groups.forEach(options => options.forEach(option => values.push(option.value)));
  return buildValueOptions(values);
}

function extractCustomerCode(company: DimCompany | undefined | null): string | null {
  if (!company) return null;
  const raw = company.raw as Record<string, unknown> | undefined;
  const candidates: unknown[] = [];
  if (raw && typeof raw === 'object') {
    candidates.push(
      (raw as any)?.customerCode,
      (raw as any)?.customer_code,
      (raw as any)?.customerId,
      (raw as any)?.customer_id,
      (raw as any)?.customer,
      (raw as any)?.sapCustomerCode,
      (raw as any)?.sap_customer_code,
      (raw as any)?.sapCode,
      (raw as any)?.sap_code
    );
  }
  candidates.push(company.code);
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue;
    const text =
      typeof candidate === 'number'
        ? String(candidate)
        : typeof candidate === 'string'
          ? candidate
          : String(candidate);
    const trimmed = text.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

export function ManualEntryForm() {
  const { logError } = useErrorLog();
  const [anchorMonth, setAnchorMonth] = useState(() => getCurrentAnchorMonth());
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [companyCache, setCompanyCache] = useState<Map<string, DimCompany>>(() => new Map());
  const [deptCache, setDeptCache] = useState<Map<string, DimDept>>(() => new Map());
  const [materialCache, setMaterialCache] = useState<Map<string, DimMaterial>>(() => new Map());
  const skuCacheRef = useRef<Map<string, Set<string> | null>>(new Map());
  const monthlyAccessCacheRef = useRef<Map<string, Map<string, string | null>>>(new Map());
  const monthlyAccessPromiseRef = useRef<Map<string, Promise<Map<string, string | null>>>>(new Map());
  const skuOptionsCacheRef = useRef<Map<string, { packSizes: ComboOption[]; uoms: ComboOption[] }>>(
    new Map()
  );
  const skuOptionsPromiseRef = useRef<Map<string, Promise<{ packSizes: ComboOption[]; uoms: ComboOption[] }>>>(
    new Map()
  );
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<Partial<Record<ManualResizableColumnKey, number>>>({});
  const [focusedCell, setFocusedCell] = useState<{ row: number; column: number } | null>(null);
  const resizingColumnRef = useRef<{
    key: ManualResizableColumnKey;
    startX: number;
    startWidth: number;
  } | null>(null);

  const captureError = useCallback(
    (scope: string, error: unknown, fallbackMessage: string, extra?: Record<string, unknown>) => {
      console.error(scope, error);
      const errorObject = error instanceof Error ? error : undefined;
      logError({
        message: fallbackMessage,
        source: `ManualEntryForm:${scope}`,
        details: errorObject?.stack ?? errorObject?.message,
        context: extra
          ? { ...extra, errorMessage: errorObject?.message ?? String(error) }
          : { errorMessage: errorObject?.message ?? String(error) }
      });
    },
    [logError]
  );

  const getDefaultWidth = useCallback(
    (key: ManualResizableColumnKey) => DEFAULT_MANUAL_COLUMN_WIDTHS[key] ?? 160,
    []
  );
  const getColumnWidth = useCallback(
    (key: ManualResizableColumnKey) => columnWidths[key] ?? getDefaultWidth(key),
    [columnWidths, getDefaultWidth]
  );

  const handleMouseMove = useCallback((event: MouseEvent) => {
    const current = resizingColumnRef.current;
    if (!current) return;
    const delta = event.clientX - current.startX;
    const nextWidth = Math.max(MANUAL_COLUMN_MIN_WIDTH, current.startWidth + delta);
    setColumnWidths(prev => ({
      ...prev,
      [current.key]: nextWidth
    }));
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!resizingColumnRef.current) return;
    resizingColumnRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const startResizing = useCallback(
    (key: ManualResizableColumnKey, event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      resizingColumnRef.current = {
        key,
        startX: event.clientX,
        startWidth: getColumnWidth(key)
      };
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [getColumnWidth, handleMouseMove, handleMouseUp]
  );

  const mergeCompanyCache = useCallback((items: DimCompany[]) => {
    if (!items.length) return;
    setCompanyCache(prev => {
      const next = new Map(prev);
      items.forEach(item => {
        if (item.code) next.set(item.code, item);
      });
      return next;
    });
  }, []);

  const mergeDeptCache = useCallback((items: DimDept[]) => {
    if (!items.length) return;
    setDeptCache(prev => {
      const next = new Map(prev);
      items.forEach(item => {
        if (item.code) next.set(item.code, item);
      });
      return next;
    });
  }, []);

  const mergeMaterialCache = useCallback((items: DimMaterial[]) => {
    if (!items.length) return;
    setMaterialCache(prev => {
      const next = new Map(prev);
      items.forEach(item => {
        if (item.code) next.set(item.code, item);
      });
      return next;
    });
  }, []);

  const toCompanyOption = useCallback(
    (item: DimCompany): ComboOption<DimCompany> => ({
      value: item.code,
      label: item.label ?? item.code,
      searchValues: [item.description ?? '', item.code],
      data: item
    }),
    []
  );

  const toDeptOption = useCallback(
    (item: DimDept): ComboOption<DimDept> => ({
      value: item.code,
      label: item.label ?? item.code,
      searchValues: [item.code, item.label ?? ''],
      data: item
    }),
    []
  );

  const toMaterialOption = useCallback(
    (item: DimMaterial): ComboOption<DimMaterial> => ({
      value: item.code,
      label: item.label ?? item.code,
      searchValues: [
        item.code,
        item.label ?? '',
        item.description ?? '',
        item.packSize ?? '',
        item.uom ?? ''
      ],
      data: item
    }),
    []
  );

  const searchCompanies = useCallback(
    async (query: string) => {
      try {
        const items = await DimSource.fetchCompanies({ search: query || undefined, limit: 25 });
        mergeCompanyCache(items);
        return items.map(toCompanyOption);
      } catch (error) {
        captureError('fetchCompanies', error, 'ไม่สามารถค้นหาบริษัทได้', { query });
        return [];
      }
    },
    [captureError, mergeCompanyCache, toCompanyOption]
  );

  const searchDepts = useCallback(
    async (query: string) => {
      try {
        const items = await DimSource.fetchDepts({ search: query || undefined, limit: 25 });
        mergeDeptCache(items);
        return items.map(toDeptOption);
      } catch (error) {
        captureError('fetchDepartments', error, 'ไม่สามารถค้นหาหน่วยงานได้', { query });
        return [];
      }
    },
    [captureError, mergeDeptCache, toDeptOption]
  );

  const searchMaterials = useCallback(
    async (query: string) => {
      try {
        const items = await DimSource.fetchMaterials({ search: query || undefined, limit: 25 });
        mergeMaterialCache(items);
        return items.map(toMaterialOption);
      } catch (error) {
        captureError('fetchMaterials', error, 'ไม่สามารถค้นหาวัตถุดิบได้', { query });
        return [];
      }
    },
    [captureError, mergeMaterialCache, toMaterialOption]
  );

  const companyOptions = useMemo(
    () => Array.from(companyCache.values()).map(toCompanyOption),
    [companyCache, toCompanyOption]
  );
  const deptOptions = useMemo(
    () => Array.from(deptCache.values()).map(toDeptOption),
    [deptCache, toDeptOption]
  );
  const materialOptions = useMemo(
    () => Array.from(materialCache.values()).map(toMaterialOption),
    [materialCache, toMaterialOption]
  );
  const packSizeOptions = useMemo(() => {
    const values: string[] = [];
    materialCache.forEach(material => {
      const packSize = normalizeLookupValue(material.packSize);
      if (packSize) values.push(packSize);
    });
    return buildValueOptions(values);
  }, [materialCache]);
  const uomOptions = useMemo(() => {
    const values: string[] = [];
    materialCache.forEach(material => {
      const uom = normalizeLookupValue(material.uom);
      if (uom) values.push(uom);
    });
    return buildValueOptions(values);
  }, [materialCache]);

  const fetchSkuOptions = useCallback(
    async (query: string) => {
      const normalized = normalizeMatchKey(query || '__all__');
      const cached = skuOptionsCacheRef.current.get(normalized);
      if (cached) return cached;
      const pending = skuOptionsPromiseRef.current.get(normalized);
      if (pending) return pending;
      const request = (async () => {
        try {
          const response = await dimApi.skus({ search: query || undefined, limit: MASTER_LOOKUP_LIMIT });
          const packSizes: string[] = [];
          const uoms: string[] = [];
          (response?.data ?? []).forEach((item: any) => {
            const packSize = normalizeLookupValue(item?.packSize ?? item?.pack_size);
            const uom = normalizeLookupValue(item?.uomCode ?? item?.uom_code ?? item?.uom);
            if (packSize) packSizes.push(packSize);
            if (uom) uoms.push(uom);
          });
          const result = {
            packSizes: buildValueOptions(packSizes),
            uoms: buildValueOptions(uoms)
          };
          skuOptionsCacheRef.current.set(normalized, result);
          return result;
        } catch (error) {
          captureError('fetchSkuOptions', error, 'ไม่สามารถดึงรายการ Pack Size/หน่วย ได้', { query });
          return { packSizes: [], uoms: [] };
        } finally {
          skuOptionsPromiseRef.current.delete(normalized);
        }
      })();
      skuOptionsPromiseRef.current.set(normalized, request);
      return request;
    },
    [captureError]
  );
  const searchPackSizes = useCallback(
    async (query: string) => {
      const skuResult = await fetchSkuOptions(query);
      const combined = mergeValueOptions(packSizeOptions, skuResult.packSizes);
      if (!query) return combined;
      const normalized = normalizeMatchKey(query);
      return combined.filter(option => normalizeMatchKey(option.value).includes(normalized));
    },
    [fetchSkuOptions, packSizeOptions]
  );
  const searchUoms = useCallback(
    async (query: string) => {
      const skuResult = await fetchSkuOptions(query);
      const combined = mergeValueOptions(uomOptions, skuResult.uoms);
      if (!query) return combined;
      const normalized = normalizeMatchKey(query);
      return combined.filter(option => normalizeMatchKey(option.value).includes(normalized));
    },
    [fetchSkuOptions, uomOptions]
  );

  useEffect(() => {
    let active = true;
    const preload = async () => {
      try {
        await Promise.all([searchCompanies(''), searchDepts(''), searchMaterials('')]);
      } catch (error) {
        captureError('preloadDimensions', error, 'ไม่สามารถโหลดข้อมูลอ้างอิงได้ล่วงหน้า');
      }
    };
    if (active) {
      preload();
    }
    return () => {
      active = false;
    };
  }, [captureError, searchCompanies, searchDepts, searchMaterials]);

  const resolveCompanyByCode = async (code: string): Promise<DimCompany | null> => {
    const cached = findCachedMatch(companyCache, code);
    if (cached) return cached;
    const items = await DimSource.fetchCompanies({ search: code, limit: MASTER_LOOKUP_LIMIT });
    if (items.length) mergeCompanyCache(items);
    const normalized = normalizeMatchKey(code);
    return items.find((item) => normalizeMatchKey(item.code) === normalized) ?? null;
  };

  const resolveDeptByCode = async (code: string): Promise<DimDept | null> => {
    const cached = findCachedMatch(deptCache, code);
    if (cached) return cached;
    const items = await DimSource.fetchDepts({ search: code, limit: MASTER_LOOKUP_LIMIT });
    if (items.length) mergeDeptCache(items);
    const normalized = normalizeMatchKey(code);
    return items.find((item) => normalizeMatchKey(item.code) === normalized) ?? null;
  };

  const resolveMaterialByCode = async (code: string): Promise<DimMaterial | null> => {
    const cached = findCachedMatch(materialCache, code);
    if (cached) return cached;
    const items = await DimSource.fetchMaterials({ search: code, limit: MASTER_LOOKUP_LIMIT });
    if (items.length) mergeMaterialCache(items);
    const normalized = normalizeMatchKey(code);
    return items.find((item) => normalizeMatchKey(item.code) === normalized) ?? null;
  };

  const resolveSkuCombos = async (materialCode: string): Promise<Set<string> | null> => {
    const normalizedCode = normalizeMatchKey(materialCode);
    const cached = skuCacheRef.current.get(normalizedCode);
    if (skuCacheRef.current.has(normalizedCode)) return cached ?? null;
    try {
      const response = await dimApi.skus({ search: materialCode, limit: MASTER_LOOKUP_LIMIT });
      const combos = new Set<string>();
      (response?.data ?? []).forEach((item: any) => {
        const code = item?.materialCode ?? item?.material_code ?? '';
        if (normalizeMatchKey(String(code)) !== normalizedCode) return;
        const packSize = normalizeLookupValue(item?.packSize ?? item?.pack_size);
        const uomCode = normalizeLookupValue(item?.uomCode ?? item?.uom_code);
        if (!packSize || !uomCode) return;
        combos.add(`${normalizeMatchKey(packSize)}|${normalizeMatchKey(uomCode)}`);
      });
      skuCacheRef.current.set(normalizedCode, combos);
      return combos;
    } catch (error: any) {
      logError({
        message: 'ไม่สามารถตรวจสอบ Pack Size/หน่วย จาก Master ได้บางรายการ',
        source: 'ManualEntryForm:skuLookup',
        severity: 'warning',
        context: {
          materialCode,
          error: error?.message || String(error)
        }
      });
      skuCacheRef.current.set(normalizedCode, null);
      return null;
    }
  };

  const loadMonthlyAccessMaterialMap = useCallback(
    async (anchorMonth: string): Promise<Map<string, string | null>> => {
      const normalizedMonth = anchorMonth.trim();
      if (!normalizedMonth) return new Map();
      const cached = monthlyAccessCacheRef.current.get(normalizedMonth);
      if (cached) return cached;
      const pending = monthlyAccessPromiseRef.current.get(normalizedMonth);
      if (pending) return pending;
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
      monthlyAccessPromiseRef.current.set(normalizedMonth, request);
      try {
        const result = await request;
        monthlyAccessCacheRef.current.set(normalizedMonth, result);
        return result;
      } catch (error) {
        monthlyAccessCacheRef.current.delete(normalizedMonth);
        throw error;
      } finally {
        monthlyAccessPromiseRef.current.delete(normalizedMonth);
      }
    },
    []
  );

  async function validateLinesAgainstMaster(linesToValidate: Line[]) {
    const errorIssues: Array<{ row: number; field: string; value: string }> = [];
    const warningIssues: Array<{ row: number; field: string; value: string }> = [];

    const deptCodes = new Set<string>();
    const companyCodes = new Set<string>();
    const materialCodes = new Set<string>();

    linesToValidate.forEach((line) => {
      const deptCode = normalizeLookupValue(line.dept_code);
      const companyCode = normalizeLookupValue(line.company_code);
      const materialCode = normalizeLookupValue(line.material_code);
      if (deptCode) deptCodes.add(deptCode);
      if (companyCode) companyCodes.add(companyCode);
      if (materialCode) materialCodes.add(materialCode);
    });

    let deptMap = new Map<string, DimDept>();
    let companyMap = new Map<string, DimCompany>();
    let materialMap = new Map<string, DimMaterial>();
    let skuMap = new Map<string, Set<string> | null>();
    let monthlyAccessMap: Map<string, string | null> | null = null;
    let monthlyAccessLookupFailure: string | undefined;

    try {
      const [deptMatches, companyMatches, materialMatches, skuMatches] = await Promise.all([
        Promise.all(
          Array.from(deptCodes.values()).map(async (code) => [code, await resolveDeptByCode(code)] as const)
        ),
        Promise.all(
          Array.from(companyCodes.values()).map(async (code) => [code, await resolveCompanyByCode(code)] as const)
        ),
        Promise.all(
          Array.from(materialCodes.values()).map(async (code) => [code, await resolveMaterialByCode(code)] as const)
        ),
        Promise.all(
          Array.from(materialCodes.values()).map(async (code) => [code, await resolveSkuCombos(code)] as const)
        )
      ]);

      deptMatches.forEach(([code, match]) => {
        if (match) deptMap.set(normalizeMatchKey(code), match);
      });
      companyMatches.forEach(([code, match]) => {
        if (match) companyMap.set(normalizeMatchKey(code), match);
      });
      materialMatches.forEach(([code, match]) => {
        if (match) materialMap.set(normalizeMatchKey(code), match);
      });
      skuMatches.forEach(([code, match]) => {
        skuMap.set(normalizeMatchKey(code), match);
      });
      try {
        monthlyAccessMap = await loadMonthlyAccessMaterialMap(anchorMonth);
      } catch (error: any) {
        monthlyAccessLookupFailure =
          error?.message || 'failed to load monthly_access_control_material data';
      }
    } catch (error) {
      throw error;
    }

    linesToValidate.forEach((line, index) => {
      const rowNumber = index + 1;
      const deptCode = normalizeLookupValue(line.dept_code) ?? '';
      const companyCode = normalizeLookupValue(line.company_code) ?? '';
      const companyDesc = normalizeLookupValue(line.company_desc) ?? '';
      const materialCode = normalizeLookupValue(line.material_code) ?? '';
      const materialDesc = normalizeLookupValue(line.material_desc) ?? '';
      const packSize = normalizeLookupValue(line.pack_size) ?? '';
      const uomCode = normalizeLookupValue(line.uom_code) ?? '';

      if (!deptCode || !deptMap.has(normalizeMatchKey(deptCode))) {
        errorIssues.push({ row: rowNumber, field: 'หน่วยงาน', value: deptCode });
      }

      if (!companyCode || !companyMap.has(normalizeMatchKey(companyCode))) {
        errorIssues.push({ row: rowNumber, field: 'CUSTOMER_CODE', value: companyCode });
      } else {
        const company = companyMap.get(normalizeMatchKey(companyCode));
        const masterDesc = normalizeLookupValue(company?.description ?? company?.label);
        if (!companyDesc || !masterDesc || normalizeMatchKey(companyDesc) !== normalizeMatchKey(masterDesc)) {
          errorIssues.push({ row: rowNumber, field: 'ชื่อบริษัท', value: companyDesc });
        }
      }

      if (!materialCode || !materialMap.has(normalizeMatchKey(materialCode))) {
        warningIssues.push({ row: rowNumber, field: 'MATERIAL_CODE', value: materialCode });
      } else {
        const material = materialMap.get(normalizeMatchKey(materialCode));
        const masterDesc = normalizeLookupValue(material?.description ?? material?.label);
        if (!materialDesc || !masterDesc || normalizeMatchKey(materialDesc) !== normalizeMatchKey(masterDesc)) {
          warningIssues.push({ row: rowNumber, field: 'ชื่อสินค้า', value: materialDesc });
        }

        if (!packSize || !uomCode) {
          warningIssues.push({
            row: rowNumber,
            field: 'PACK SIZE/หน่วย',
            value: `${packSize || '-'} / ${uomCode || '-'}`
          });
        } else {
          const combos = skuMap.get(normalizeMatchKey(materialCode));
          if (combos) {
            const comboKey = `${normalizeMatchKey(packSize)}|${normalizeMatchKey(uomCode)}`;
            if (!combos.has(comboKey)) {
              warningIssues.push({
                row: rowNumber,
                field: 'PACK SIZE/หน่วย',
                value: `${packSize} / ${uomCode}`
              });
            }
          }
        }
      }

      if (monthlyAccessMap && materialCode) {
        const normalizedCode = normalizeMatchKey(materialCode);
        const hasAccess = monthlyAccessMap.has(normalizedCode);
        const accessDesc = monthlyAccessMap.get(normalizedCode);
        if (!hasAccess) {
          warningIssues.push({
            row: rowNumber,
            field: MONTHLY_ACCESS_CODE_FIELD,
            value: materialCode
          });
        } else if (accessDesc) {
          if (!materialDesc || normalizeMatchKey(materialDesc) !== normalizeMatchKey(accessDesc)) {
            warningIssues.push({
              row: rowNumber,
              field: MONTHLY_ACCESS_DESC_FIELD,
              value: materialDesc || '-'
            });
          }
        }
      }
    });

    const errorMessages = errorIssues.map(
      (issue) => `บรรทัดที่ ${issue.row}: ${issue.field} "${issue.value}" ไม่ตรงกับ Master`
    );
    const warningMessages = warningIssues.map((issue) => {
      if (issue.field === MONTHLY_ACCESS_CODE_FIELD) {
        return `บรรทัดที่ ${issue.row}: material_code "${issue.value}" ไม่พบใน monthly_access_control_material`;
      }
      if (issue.field === MONTHLY_ACCESS_DESC_FIELD) {
        return `บรรทัดที่ ${issue.row}: material_desc "${issue.value}" ไม่ตรงกับ monthly_access_control_material`;
      }
      return `บรรทัดที่ ${issue.row}: ${issue.field} "${issue.value}" ไม่ตรงกับ Master`;
    });

    return {
      errorMessages,
      warningMessages,
      errorIssues,
      warningIssues,
      monthlyAccessLookupFailure
    };
  }

  function updateLine(idx: number, key: keyof Line, value: string) {
    const trimmed = value.trim();
    setLines(prev =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        return { ...l, [key]: trimmed };
      })
    );
  }
  function updateNum(idx: number, key: keyof Line, value: string) {
    const num = value === '' ? undefined : Number(value);
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [key]: num } : l));
  }

  const removeLine = useCallback((index: number) => {
    setLines(prev => {
      if (prev.length <= 1) {
        return [emptyLine()];
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // ---------- Submit ----------
  async function submit() {
    setMessage(null);

    const stringFields: Array<keyof Line> = [
      'company_code',
      'company_desc',
      'dept_code',
      'material_code',
      'material_desc',
      'pack_size',
      'uom_code'
    ];

    const sanitizedLines = lines.map(line => {
      const next: Line = { ...line };
      const mutable = next as Record<keyof Line, unknown>;
      stringFields.forEach(field => {
        const value = mutable[field];
        if (typeof value === 'string') {
          mutable[field] = value.trim();
        }
      });
      return next;
    });

    setLines(sanitizedLines);

    if (!anchorMonth) {
      setMessage('Please select anchor month');
      return;
    }

    for (let i = 0; i < sanitizedLines.length; i += 1) {
      const line = sanitizedLines[i];
      const missingFields = REQUIRED_LINE_FIELDS.filter(({ key }) => {
        const value = line[key];
        if (typeof value === 'string') {
          return value.trim().length === 0;
        }
        return value === undefined || value === null;
      });
      if (missingFields.length > 0) {
        setMessage(
          `บรรทัดที่ ${i + 1} ขาดข้อมูล: ${missingFields.map((field) => field.label).join(', ')}`
        );
        return;
      }
    }

    let masterValidation: Awaited<ReturnType<typeof validateLinesAgainstMaster>>;
    try {
      masterValidation = await validateLinesAgainstMaster(sanitizedLines);
    } catch (error: any) {
      const fallbackMessage = 'ไม่สามารถตรวจสอบข้อมูลกับ Master ได้ กรุณาลองใหม่อีกครั้ง';
      captureError('masterValidation', error, fallbackMessage, { lines: sanitizedLines.length });
      setMessage(fallbackMessage);
      return;
    }
    if (masterValidation.monthlyAccessLookupFailure) {
      logError({
        message: 'ไม่สามารถตรวจสอบ monthly_access_control_material ได้',
        source: 'ManualEntryForm:monthlyAccessMaterial',
        severity: 'warning',
        context: { error: masterValidation.monthlyAccessLookupFailure }
      });
    }

    if (masterValidation.errorMessages.length > 0) {
      const preview = masterValidation.errorMessages.slice(0, 5).join('; ');
      setMessage(
        `พบข้อมูลไม่ตรงกับ Master ${masterValidation.errorMessages.length} จุด: ${preview}`
      );
      logError({
        message: 'พบข้อมูลไม่ตรงกับ Master (Error)',
        source: 'ManualEntryForm:masterValidation',
        context: masterValidation.errorIssues.slice(0, 50)
      });
      return;
    }

    if (masterValidation.warningMessages.length > 0) {
      logError({
        message: 'พบข้อมูลไม่ตรงกับ Master (Warning)',
        source: 'ManualEntryForm:masterValidation',
        severity: 'warning',
        context: masterValidation.warningIssues.slice(0, 50)
      });
      const confirmed = window.confirm(
        `พบข้อมูลไม่ตรงกับ Master (Warning) ${masterValidation.warningMessages.length} จุด ต้องการยืนยันการส่งข้อมูลหรือไม่?`
      );
      if (!confirmed) {
        setMessage('ยกเลิกการส่งข้อมูล');
        return;
      }
    }

    if (!confirmCrossMonth(anchorMonth, { contextLabel: 'Manual Entry' })) {
      setMessage('ยกเลิกการส่งข้อมูล');
      return;
    }

    setSubmitting(true);
    try {
      const payloadLines = sanitizedLines.map(line => {
        const companyDesc = line.company_desc?.trim();
        const resolvedCompanyDesc = companyDesc && companyDesc.length > 0 ? companyDesc : line.company_code;
        const materialDesc = line.material_desc?.trim();
        const resolvedMaterialDesc = materialDesc && materialDesc.length > 0 ? materialDesc : line.material_code;

        return {
          company_code: line.company_code,
          company_desc: resolvedCompanyDesc,
          dept_code: line.dept_code,
          material_code: line.material_code,
          material_desc: resolvedMaterialDesc,
          pack_size: line.pack_size ?? '',
          uom_code: line.uom_code ?? '',
          n1: line.n1,
          n2: line.n2,
          n3: line.n3
        };
      });

      const res = await ingestApi.manual({ anchorMonth, lines: payloadLines });
      setMessage(`Submitted. runId=${res.runId}`);
      setLines([emptyLine()]);
    } catch (e: any) {
      const friendlyMessage = formatLineErrorMessage(e?.message, 'ส่งข้อมูลไม่สำเร็จ');
      captureError('submitManual', e, friendlyMessage, {
        anchorMonth,
        lines: sanitizedLines.length
      });
      setMessage(friendlyMessage);
    } finally {
      setSubmitting(false);
    }
  }
  // ---------- End Submit ----------

  const handleMaterialOptionSelect = useCallback(
    (rowIndex: number, option: ComboOption<DimMaterial>) => {
      const material = option.data;
      if (!material) return;
      setLines(prev =>
        prev.map((line, idx) => {
          if (idx !== rowIndex) return line;
          const next: Line = { ...line, material_code: material.code };
          if (material.description) next.material_desc = material.description;
          if (material.packSize) next.pack_size = material.packSize;
          if (material.uom) next.uom_code = material.uom;
          return next;
        })
      );
    },
    []
  );

  const handleCompanyOptionSelect = useCallback(
    (rowIndex: number, option: ComboOption<DimCompany>) => {
      const company = option.data;
      if (!company) return;
      const customerCode = extractCustomerCode(company);
      setLines(prev =>
        prev.map((line, idx) => {
          if (idx !== rowIndex) return line;
          const companyDesc =
            (company.description && typeof company.description === 'string'
              ? company.description.trim()
              : null) ||
            (company.label && typeof company.label === 'string' ? company.label.trim() : null) ||
            company.code.trim();
          const next: Line = {
            ...line,
            company_code: (customerCode || company.code).trim(),
            company_desc: companyDesc
          };
          return next;
        })
      );
    },
    []
  );

  const handleCompanyCodeOptionSelect = useCallback(
    (rowIndex: number, option: ComboOption<DimCompany>) => {
      const company = option.data;
      setLines(prev =>
        prev.map((line, idx) => {
          if (idx !== rowIndex) return line;
          if (!company) {
            return {
              ...line,
              company_code: (option.value || line.company_code || '').trim()
            } as Line;
          }
          const customerCode = extractCustomerCode(company);
          const next: Line = {
            ...line,
            company_code: (customerCode || company.code).trim()
          };
          return next;
        })
      );
    },
    []
  );

  const columns: ColumnDefinition[] = useMemo(
    () => [
      {
        key: 'dept_code',
        label: 'หน่วยงาน',
        type: 'combo',
        options: deptOptions,
        onSearch: searchDepts,
        historyKey: 'manual:dept',
        placeholder: 'เลือกหน่วยงาน'
      },
      {
        key: 'company_desc',
        label: 'ชื่อบริษัท',
        type: 'combo',
        options: companyOptions,
        onSearch: searchCompanies,
        historyKey: 'manual:company',
        placeholder: 'เลือกชื่อบริษัท',
        onSelectOption: handleCompanyOptionSelect
      },
      {
        key: 'company_code',
        label: 'SAP Code',
        type: 'combo',
        options: companyOptions,
        onSearch: searchCompanies,
        historyKey: 'manual:company',
        placeholder: 'ระบุ SAP Code ของลูกค้า',
        onSelectOption: handleCompanyCodeOptionSelect
      },
      {
        key: 'material_code',
        label: 'SAPCode',
        type: 'combo',
        options: materialOptions,
        onSearch: searchMaterials,
        historyKey: 'manual:material',
        placeholder: 'ค้นหา SAP Code',
        onSelectOption: handleMaterialOptionSelect
      },
      { key: 'material_desc', label: 'ชื่อสินค้า' },
      {
        key: 'pack_size',
        label: 'Pack Size',
        type: 'combo',
        options: packSizeOptions,
        onSearch: searchPackSizes,
        historyKey: 'manual:pack-size',
        placeholder: 'เลือก Pack Size'
      },
      {
        key: 'uom_code',
        label: 'หน่วย',
        type: 'combo',
        options: uomOptions,
        onSearch: searchUoms,
        historyKey: 'manual:uom',
        placeholder: 'เลือกหน่วย'
      },

      // --- series ---
      { key: 'n1', label: 'n+1', type: 'number' },
      { key: 'n2', label: 'n+2', type: 'number' },
      { key: 'n3', label: 'n+3', type: 'number' }
    ],
    [
      companyOptions,
      deptOptions,
      materialOptions,
      packSizeOptions,
      uomOptions,
      searchCompanies,
      searchDepts,
      searchMaterials,
      searchPackSizes,
      searchUoms,
      handleMaterialOptionSelect,
      handleCompanyOptionSelect,
      handleCompanyCodeOptionSelect
    ]
  );

  const handlePaste = useCallback(
    (event: ReactClipboardEvent<HTMLDivElement>) => {
      if (!focusedCell) return;

      const clipboardText = event.clipboardData?.getData('text');
      if (!clipboardText) return;

      const normalized = clipboardText.replace(/\r\n?/g, '\n');
      const matrix = normalized.split('\n').map(row => row.split('\t'));

      while (matrix.length && matrix[matrix.length - 1].every(value => value.trim() === '')) {
        matrix.pop();
      }
      while (matrix.length && matrix[0].every(value => value.trim() === '')) {
        matrix.shift();
      }
      if (!matrix.length) return;

      const isMultiCell = matrix.length > 1 || matrix[0].length > 1;
      if (!isMultiCell) return;

      const cell = focusedCell;
      const startColumn = cell.column;
      const dataRows = matrix.slice();

      if (dataRows.length > 0) {
        const headerCandidate = dataRows[0];
        const looksLikeHeader = headerCandidate.every((value, offset) => {
          const column = columns[startColumn + offset];
          if (!column) return false;
          const normalizedValue = value.trim().toLowerCase();
          if (!normalizedValue) return false;
          const label = String(column.label ?? '').trim().toLowerCase();
          const key = String(column.key ?? '').trim().toLowerCase();
          return normalizedValue === label || normalizedValue === key;
        });
        if (looksLikeHeader) dataRows.shift();
      }
      if (!dataRows.length) return;

      event.preventDefault();

      setLines(prev => {
        const next = [...prev];
        let changed = false;
        let targetRow = cell.row;

        dataRows.forEach(rowValues => {
          const allBlank = rowValues.every(value => value.trim() === '');

          if (targetRow >= next.length) {
            if (allBlank) {
              targetRow += 1;
              return;
            }
            next.push(emptyLine());
            changed = true;
          }
          if (targetRow >= next.length) {
            targetRow += 1;
            return;
          }

          const current = { ...next[targetRow] };
          const mutable = current as Record<string, string | number | undefined>;
          let rowChanged = false;
          let targetColumn = startColumn;

          rowValues.forEach(value => {
            const column = columns[targetColumn];
            targetColumn += 1;
            if (!column) return;

            const lineKey = resolveLineKey(column.key);

            if ((column as NumberColumn).type === 'number') {
              const trimmed = value.trim();
              if (!trimmed) {
                if (mutable[lineKey] !== undefined) {
                  mutable[lineKey] = undefined;
                  rowChanged = true;
                }
                return;
              }
              const numeric = Number(trimmed.replace(/,/g, ''));
              if (Number.isNaN(numeric)) return;

              if (mutable[lineKey] !== numeric) {
                mutable[lineKey] = numeric;
                rowChanged = true;
              }
            } else {
              const nextValue = value.trim();
              const prevRaw = mutable[lineKey];
              const prevString =
                typeof prevRaw === 'string'
                  ? prevRaw
                  : prevRaw === undefined || prevRaw === null
                    ? ''
                    : String(prevRaw);

              if (prevString !== nextValue) {
                mutable[lineKey] = nextValue;
                rowChanged = true;
              }
            }
          });

          if (rowChanged) {
            next[targetRow] = current;
            changed = true;
          }
          targetRow += 1;
        });

        return changed ? next : prev;
      });
    },
    [columns, focusedCell]
  );

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4 items-end">
        <div>
          <label className="text-sm">Anchor month</label>
          <input className="input mt-1" type="month" value={anchorMonth} onChange={e=>setAnchorMonth(e.target.value)} />
        </div>
        <div className="sm:col-span-2 flex gap-2">
          <button className="btn-primary" onClick={()=>setLines(l=>[...l, emptyLine()])}>Add line</button>
          <button className="px-4 py-2 rounded-lg border" onClick={()=>setLines([emptyLine()])}>Clear</button>
        </div>
      </div>

      {message && <div className="text-sm text-neutral-600 dark:text-neutral-300">{message}</div>}

      {/* กรอบตาราง: กว้างขึ้นและไม่สูงเกินหน้าจอ */}
      <div
        className="max-h-[80vh] max-w-[95vw] mx-auto overflow-x-auto overflow-y-visible rounded-lg border border-slate-300 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        onPaste={handlePaste}
      >
        <div className="min-w-[1400px]">
          <table className="w-full table-fixed border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className="bg-slate-100 text-left text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <th
                  className="border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-center dark:border-slate-700"
                  style={{ width: 72, minWidth: 72 }}
                >
                  ลบ
                </th>
                {columns.map(c => {
                  const columnKey = c.key as ManualResizableColumnKey;
                  const width = getColumnWidth(columnKey);
                  return (
                    <th
                      key={String(c.key)}
                      className="relative border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide dark:border-slate-700"
                      style={{ width, minWidth: width }}
                    >
                      <span className="block whitespace-pre-wrap break-words">{c.label}</span>
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none bg-transparent hover:bg-blue-500/40"
                        onMouseDown={event => startResizing(columnKey, event)}
                        role="presentation"
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {lines.map((r, i) => (
                <tr
                  key={i}
                  className="border-b border-slate-200 bg-white odd:bg-white even:bg-slate-50/60 hover:bg-emerald-50/40 dark:border-slate-700 dark:bg-slate-900 dark:even:bg-slate-900/40 dark:hover:bg-slate-800"
                >
                  <td className="border border-slate-200 px-2 py-1 text-center align-middle dark:border-slate-700">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 p-2 text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-rose-300/60 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-rose-500/40"
                      onClick={() => removeLine(i)}
                      disabled={lines.length <= 1}
                      title="ลบแถวนี้"
                    >
                      <MinusCircle className="h-4 w-4" />
                    </button>
                  </td>

                  {columns.map((c, columnIndex) => {
                    const columnKey = c.key as ManualResizableColumnKey;
                    const width = getColumnWidth(columnKey);
                    return (
                      <td
                        key={String(c.key)}
                        className="border border-slate-200 px-2 py-1 align-top text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"
                        style={{ width, minWidth: width }}
                        onFocusCapture={() => setFocusedCell({ row: i, column: columnIndex })}
                      >
                        <div className="flex h-full min-h-[2.5rem] flex-col justify-center whitespace-pre-wrap break-words">
                          {c.type === 'number' ? (
                            <input
                              className="input w-full px-2 py-1"
                              type="number"
                              min="0"
                              value={
                                c.key === 'n1'
                                  ? (r.n1 ?? '')
                                  : c.key === 'n2'
                                    ? (r.n2 ?? '')
                                    : c.key === 'n3'
                                      ? (r.n3 ?? '')
                                      : ''
                              }
                              onChange={e =>
                                c.key === 'n1'
                                  ? updateNum(i, 'n1', e.target.value)
                                  : c.key === 'n2'
                                    ? updateNum(i, 'n2', e.target.value)
                                    : updateNum(i, 'n3', e.target.value)
                              }
                            />
                          ) : isComboColumn(c) ? (
                            <ComboInput
                              value={(r as any)[c.key] || ''}
                              onChange={value => updateLine(i, c.key, value)}
                              options={c.options}
                              onSearch={c.onSearch}
                              historyKey={c.historyKey}
                              placeholder={c.placeholder}
                              onSelectOption={option => c.onSelectOption?.(i, option)}
                              inputClassName="input w-full px-2 py-1"
                              showHistory={false}
                            />
                          ) : (
                            <input
                              className="input w-full px-2 py-1"
                              value={(r as any)[c.key] || ''}
                              onChange={e => updateLine(i, c.key as keyof Line, e.target.value)}
                            />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-3">
        <button className="btn-primary" disabled={submitting} onClick={submit}>Submit</button>
        <button className="px-4 py-2 rounded-lg border" onClick={()=>setLines([emptyLine()])}>Reset</button>
      </div>
    </div>
  );
}
