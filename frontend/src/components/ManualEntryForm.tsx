import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ClipboardEvent as ReactClipboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { ingestApi } from '../services/api';
import { useErrorLog } from '../hooks/useErrorLog';
import { MinusCircle } from 'lucide-react';
import {
  DimSource,
  type DimCompany,
  type DimDept,
  type DimDistributionChannel,
  type DimMaterial
} from '../services/dimSource';
import ComboInput, { type ComboOption } from './ComboInput';

type Line = {
  company_code: string;
  company_desc?: string;
  dept_code?: string;
  dc_code?: string; // ใช้เก็บ customer_code (ตามโค้ดเดิมของคุณ)
  division?: string;
  sales_organization?: string;
  sales_office?: string;
  sales_group?: string;
  sales_representative?: string;
  material_code: string;
  material_desc?: string;
  pack_size?: string;
  uom_code?: string;
  n_2?: number; n_1?: number; n?: number; n1?: number; n2?: number; n3?: number;
  price?: number;
  distributionChannels?: string; // ใช้เก็บ Distribution Channel ที่แท้จริง
};

function emptyLine(): Line {
  return {
    company_code: '',
    company_desc: '',
    dept_code: '',
    dc_code: '',
    material_code: '',
    material_desc: '',
    pack_size: '',
    uom_code: ''
  };
}

type ColumnKey = keyof Line | 'n-2' | 'n-1' | 'n+1' | 'n+2' | 'n+3';

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
  company_code: 160,
  dept_code: 160,
  dc_code: 170,
  division: 150,
  sales_organization: 180,
  sales_office: 160,
  sales_group: 160,
  sales_representative: 190,
  material_code: 180,
  material_desc: 220,
  pack_size: 140,
  uom_code: 130,
  n_2: 120,
  n_1: 120,
  n: 120,
  n1: 120,
  n2: 120,
  n3: 120,
  price: 130,
  distributionChannels: 190
};

const COLUMN_KEY_ALIASES: Record<string, keyof Line> = {
  'n-2': 'n_2',
  'n-1': 'n_1',
  'n+1': 'n1',
  'n+2': 'n2',
  'n+3': 'n3'
};
function resolveLineKey(key: ColumnDefinition['key']): keyof Line {
  const alias = COLUMN_KEY_ALIASES[String(key)];
  return alias ?? (key as keyof Line);
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
  const [anchorMonth, setAnchorMonth] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [companyCache, setCompanyCache] = useState<Map<string, DimCompany>>(() => new Map());
  const [deptCache, setDeptCache] = useState<Map<string, DimDept>>(() => new Map());
  const [dcCache, setDcCache] = useState<Map<string, DimDistributionChannel>>(() => new Map());
  const [materialCache, setMaterialCache] = useState<Map<string, DimMaterial>>(() => new Map());
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

  const mergeDcCache = useCallback((items: DimDistributionChannel[]) => {
    if (!items.length) return;
    setDcCache(prev => {
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

  const toDcOption = useCallback(
    (item: DimDistributionChannel): ComboOption<DimDistributionChannel> => ({
      value: item.code,
      label: item.label ?? item.code,
      searchValues: [item.code, item.label ?? '', item.description ?? ''],
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

  const searchDistributionChannels = useCallback(
    async (query: string) => {
      try {
        const items = await DimSource.fetchDistributionChannels({ search: query || undefined, limit: 25 });
        mergeDcCache(items);
        return items.map(toDcOption);
      } catch (error) {
        captureError('fetchDistributionChannels', error, 'ไม่สามารถค้นหา Distribution Channel ได้', { query });
        return [];
      }
    },
    [captureError, mergeDcCache, toDcOption]
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
  const dcOptions = useMemo(() => Array.from(dcCache.values()).map(toDcOption), [dcCache, toDcOption]);
  const materialOptions = useMemo(
    () => Array.from(materialCache.values()).map(toMaterialOption),
    [materialCache, toMaterialOption]
  );

  useEffect(() => {
    let active = true;
    const preload = async () => {
      try {
        await Promise.all([
          searchCompanies(''),
          searchDepts(''),
          searchDistributionChannels(''),
          searchMaterials('')
        ]);
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
  }, [captureError, searchCompanies, searchDepts, searchDistributionChannels, searchMaterials]);

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
      'dc_code',
      'division',
      'sales_organization',
      'sales_office',
      'sales_group',
      'sales_representative',
      'material_code',
      'material_desc',
      'pack_size',
      'uom_code',
      'distributionChannels'
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
    if (sanitizedLines.some(l => !l.material_code)) {
      setMessage('material_code is required');
      return;
    }

    setSubmitting(true);
    try {
      const payloadLines = sanitizedLines.map(line => {
        const rawCompanyCode = line.company_code?.trim() ?? '';
        const customerCode = line.dc_code?.trim() ?? '';
        const resolvedCustomerCode = customerCode || rawCompanyCode;

        // ใช้ distributionChannels ถ้ามี ไม่งั้นว่าง (อย่าไปชนกับ dc_code ซึ่งใช้เป็น customer_code)
        const distributionChannel = (line.distributionChannels ?? '').trim();

        const companyDesc = line.company_desc?.trim();
        const resolvedCompanyDesc =
          companyDesc && companyDesc.length > 0 ? companyDesc : rawCompanyCode || resolvedCustomerCode;

        return {
          company_code: resolvedCustomerCode,
          company_desc: resolvedCompanyDesc,
          Company_code: resolvedCustomerCode,
          dept_code: line.dept_code ?? '',
          dc_code: distributionChannel, // ช่องส่งออกสำหรับ API ฝั่งคุณตั้งชื่อแบบนี้
          division: line.division,
          sales_organization: line.sales_organization,
          sales_office: line.sales_office,
          sales_group: line.sales_group,
          sales_representative: line.sales_representative,
          material_code: line.material_code || '',
          material_desc: line.material_desc ?? '',
          pack_size: line.pack_size ?? '',
          uom_code: line.uom_code ?? '',
          n_2: line.n_2,
          n_1: line.n_1,
          n: line.n,
          n1: line.n1,
          n2: line.n2,
          n3: line.n3,
          price: line.price,
          distributionChannels: line.distributionChannels ?? ''
        };
      });

      const res = await ingestApi.manual({ anchorMonth, lines: payloadLines });
      setMessage(`Submitted. runId=${res.runId}`);
      setLines([emptyLine()]);
    } catch (e: any) {
      captureError('submitManual', e, 'ส่งข้อมูลไม่สำเร็จ', {
        anchorMonth,
        lines: sanitizedLines.length
      });
      setMessage(e?.message || 'Submit failed');
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
            company_code: company.code.trim(),
            company_desc: companyDesc
          };
          if (customerCode) {
            // เก็บไว้ที่ dc_code ตามความหมายเดิมของโปรเจ็กต์คุณ (customer_code)
            next.dc_code = customerCode.trim();
          }
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

  const handleDistributionChannelSelect = useCallback(
    (rowIndex: number, option: ComboOption<DimDistributionChannel>) => {
      const dc = option?.data;
      setLines(prev =>
        prev.map((line, idx) => {
          if (idx !== rowIndex) return line;
          return {
            ...line,
            distributionChannels: (dc?.code || option?.value || '').trim()
          };
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
        label: 'customer_code',
        type: 'combo',
        options: companyOptions,
        onSearch: searchCompanies,
        historyKey: 'manual:company',
        placeholder: 'เลือกรหัสลูกค้า',
        onSelectOption: handleCompanyCodeOptionSelect
      },
      {
        key: 'material_code',
        label: 'material_code',
        type: 'combo',
        options: materialOptions,
        onSearch: searchMaterials,
        historyKey: 'manual:material',
        placeholder: 'ค้นหา SAP Code',
        onSelectOption: handleMaterialOptionSelect
      },
      { key: 'material_desc', label: 'ชื่อสินค้า' },
      { key: 'pack_size', label: 'Pack Size' },
      { key: 'uom_code', label: 'หน่วย' },

      // --- series ---
      { key: 'n_2', label: 'n-2', type: 'number' },
      { key: 'n_1', label: 'n-1', type: 'number' },
      { key: 'n', label: 'n', type: 'number' },
      { key: 'n1', label: 'n+1', type: 'number' },
      { key: 'n2', label: 'n+2', type: 'number' },
      { key: 'n3', label: 'n+3', type: 'number' },
      { key: 'price', label: 'Price', type: 'number' },

      // --- sales meta ---
      { key: 'division', label: 'Division' },
      { key: 'sales_organization', label: 'Sales Organization' },
      { key: 'sales_office', label: 'Sales Office' },
      { key: 'sales_group', label: 'Sales Group' },
      { key: 'sales_representative', label: 'Sales Representative' },

      // --- Distribution Channel (แก้ให้เป็น combo) ---
      {
        key: 'distributionChannels',
        label: 'Distribution Channel',
        type: 'combo',
        options: dcOptions,
        onSearch: searchDistributionChannels,
        historyKey: 'manual:distributionChannel',
        placeholder: 'เลือก/ค้นหา Distribution Channel',
        onSelectOption: handleDistributionChannelSelect
      }
    ],
    [
      companyOptions,
      deptOptions,
      dcOptions,
      materialOptions,
      searchCompanies,
      searchDepts,
      searchDistributionChannels,
      searchMaterials,
      handleMaterialOptionSelect,
      handleCompanyOptionSelect,
      handleCompanyCodeOptionSelect,
      handleDistributionChannelSelect
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
                                c.key === 'n_2' ? (r.n_2 ?? '') :
                                c.key === 'n_1' ? (r.n_1 ?? '') :
                                c.key === 'n' ? (r.n ?? '') :
                                c.key === 'n1' ? (r.n1 ?? '') :
                                c.key === 'n2' ? (r.n2 ?? '') :
                                c.key === 'n3' ? (r.n3 ?? '') :
                                c.key === 'price' ? (r.price ?? '') : ''
                              }
                              onChange={e =>
                                c.key === 'n_2' ? updateNum(i, 'n_2', e.target.value) :
                                c.key === 'n_1' ? updateNum(i, 'n_1', e.target.value) :
                                c.key === 'n' ? updateNum(i, 'n', e.target.value) :
                                c.key === 'n1' ? updateNum(i, 'n1', e.target.value) :
                                c.key === 'n2' ? updateNum(i, 'n2', e.target.value) :
                                c.key === 'n3' ? updateNum(i, 'n3', e.target.value) :
                                updateNum(i, 'price', e.target.value)
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
