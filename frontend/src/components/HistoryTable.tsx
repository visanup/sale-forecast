import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Pencil, Trash2 } from 'lucide-react';
import { SalesForecastRecord } from '../services/api';
import { DimSource } from '../services/dimSource';

type MonthColumnKey = 'n_2' | 'n_1' | 'n' | 'n1' | 'n2' | 'n3';

type HistoryDisplayRow = {
  id: string;
  dept_code: string;
  company_desc: string;
  company_code: string;
  sap_code_alt: string;
  material_desc: string;
  pack_size: string;
  uom_code: string;
  n_2: string;
  n_1: string;
  n: string;
  n1: string;
  n2: string;
  n3: string;
  price: string;
  division: string;
  sales_organization: string;
  sales_office: string;
  sales_group: string;
  sales_representative: string;
  dc_code: string;
  last_user: string;
  action: string;
  performed_at: string;
};

type TableColumn =
  | { key: keyof HistoryDisplayRow; label: string; type?: 'number' | 'text' }
  | { key: keyof HistoryDisplayRow; label: string; className?: string };

const MONTH_COLUMNS: Array<{ key: MonthColumnKey; label: string; delta: number }> = [
  { key: 'n_2', label: 'n-2', delta: -2 },
  { key: 'n_1', label: 'n-1', delta: -1 },
  { key: 'n', label: 'n', delta: 0 },
  { key: 'n1', label: 'n+1', delta: 1 },
  { key: 'n2', label: 'n+2', delta: 2 },
  { key: 'n3', label: 'n+3', delta: 3 }
];

const TABLE_COLUMNS: TableColumn[] = [
  { key: 'dept_code', label: 'หน่วยงาน' },
  { key: 'company_desc', label: 'ชื่อบริษัท' },
  { key: 'company_code', label: 'customer_code' },
  { key: 'sap_code_alt', label: 'material_code' },
  { key: 'material_desc', label: 'ชื่อสินค้า' },
  { key: 'pack_size', label: 'Pack Size' },
  { key: 'uom_code', label: 'หน่วย' },
  ...MONTH_COLUMNS.map((col) => ({ key: col.key, label: col.label, type: 'number' as const })),
  { key: 'price', label: 'Price', type: 'number' },
  { key: 'division', label: 'Division' },
  { key: 'sales_organization', label: 'Sales Organization' },
  { key: 'sales_office', label: 'Sales Office' },
  { key: 'sales_group', label: 'Sales Group' },
  { key: 'sales_representative', label: 'Sales Representative' },
  { key: 'dc_code', label: 'Distribution Channel' },
  { key: 'last_user', label: 'Last_User' },
  { key: 'action', label: 'Action' },
  { key: 'performed_at', label: 'Update_At' }
];

type ResizableColumnKey = keyof HistoryDisplayRow | '__index' | '__actions';

const COLUMN_MIN_WIDTH = 80;

const HIGHLIGHT_HEADER_KEYS = new Set<keyof HistoryDisplayRow>([
  'dept_code',
  'company_desc',
  'company_code',
  'sap_code_alt'
]);

const DEFAULT_COLUMN_WIDTHS: Partial<Record<ResizableColumnKey, number>> = {
  __index: 70,
  __actions: 140,
  dept_code: 150,
  company_desc: 220,
  company_code: 150,
  sap_code_alt: 160,
  material_desc: 220,
  pack_size: 130,
  uom_code: 120,
  price: 120,
  division: 140,
  sales_organization: 150,
  sales_office: 150,
  sales_group: 150,
  sales_representative: 180,
  dc_code: 150,
  n_2: 110,
  n_1: 110,
  n: 110,
  n1: 110,
  n2: 110,
  n3: 110,
  last_user: 200,
  action: 160,
  performed_at: 220
};

const PAGE_SIZE = 15;

function monthDiff(anchor: string, target: string): number {
  const [ay, am] = anchor.split('-').map(Number);
  const [ty, tm] = target.split('-').map(Number);
  if (!Number.isFinite(ay) || !Number.isFinite(am) || !Number.isFinite(ty) || !Number.isFinite(tm)) {
    return Number.NaN;
  }
  return (ty - ay) * 12 + (tm - am);
}

function formatNumber(value: number | undefined | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function toDisplayString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function formatActionLabel(value: unknown): string {
  if (typeof value === 'string') {
    const normalized = value.trim().toUpperCase();
    if (normalized === 'INSERT') return 'CREATED';
    if (normalized === 'PUT' || normalized === 'UPDATE') return 'UPDATED';
    return value.trim();
  }
  return toDisplayString(value);
}

function resolvePriceFromMetadata(metadata: Record<string, unknown>): number | undefined {
  const candidates = ['price', 'unit_price', 'unit_price_snapshot'].map((key) => metadata[key]);
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === 'string') {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

type DisplayRowOptions = {
  companyCodeOverride?: string;
};

function normalizeText(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.trim().toLocaleLowerCase();
}

function buildDisplayRow(record: SalesForecastRecord, options?: DisplayRowOptions): HistoryDisplayRow {
  const metadata = record.metadata ?? {};
  const metadataRecord = metadata as Record<string, unknown>;

  const monthsMap: Record<MonthColumnKey, string> = {
    n_2: '',
    n_1: '',
    n: '',
    n1: '',
    n2: '',
    n3: ''
  };

  let derivedPrice: number | undefined;
  const months = Array.isArray(metadata.months) ? metadata.months : [];
  for (const entry of months) {
    if (!entry || typeof entry.month !== 'string') continue;
    const delta = monthDiff(record.anchor_month, entry.month);
    const column = MONTH_COLUMNS.find((col) => col.delta === delta);
    if (!column) continue;
    if (typeof entry.qty === 'number' && Number.isFinite(entry.qty)) {
      monthsMap[column.key] = formatNumber(entry.qty);
    } else if (typeof entry.qty === 'string') {
      const parsed = Number(entry.qty);
      if (Number.isFinite(parsed)) {
        monthsMap[column.key] = formatNumber(parsed);
      }
    }
    if (derivedPrice === undefined && entry.price !== undefined && entry.price !== null) {
      const priceValue = typeof entry.price === 'number' ? entry.price : Number(entry.price);
      if (Number.isFinite(priceValue)) {
        derivedPrice = Number(priceValue);
      }
    }
  }

  if (derivedPrice === undefined) {
    derivedPrice = resolvePriceFromMetadata(metadataRecord);
  }

  const sapCode = toDisplayString(record.material_code);
  const companyCode = (() => {
    const displayCompany = toDisplayString(record.company_code);
    if (displayCompany) return displayCompany;
    const metadataCompany = metadataRecord.company_code;
    if (typeof metadataCompany === 'string') return metadataCompany;
    if (typeof metadataCompany === 'number') return String(metadataCompany);
    return '';
  })();
  const sapCodeAlternateSource = ['SAPCode', 'company_code', 'sapCode']
    .map((key) => metadataRecord[key])
    .find((value) => typeof value === 'string' && value.trim().length > 0) as string | undefined;
  const sapCodeAlt = sapCodeAlternateSource ?? sapCode;
  const lastActor = record.last_actor;

  const formattedPerformedAt = (() => {
    if (!record.last_performed_at) return '';
    const date = new Date(record.last_performed_at);
    if (Number.isNaN(date.getTime())) return toDisplayString(record.last_performed_at);
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  })();

  return {
    id: record.id,
    dept_code: toDisplayString(metadata.dept_code),
    company_desc: toDisplayString(record.company_desc),
    company_code: options?.companyCodeOverride ?? companyCode,
    sap_code_alt: sapCodeAlt,
    material_desc: toDisplayString(record.material_desc),
    pack_size: toDisplayString(metadata.pack_size),
    uom_code: toDisplayString(metadata.uom_code),
    n_2: monthsMap.n_2,
    n_1: monthsMap.n_1,
    n: monthsMap.n,
    n1: monthsMap.n1,
    n2: monthsMap.n2,
    n3: monthsMap.n3,
    price: formatNumber(derivedPrice),
    division: toDisplayString(metadata.division),
    sales_organization: toDisplayString(metadata.sales_organization),
    sales_office: toDisplayString(metadata.sales_office),
    sales_group: toDisplayString(metadata.sales_group),
    sales_representative: toDisplayString(metadata.sales_representative),
    dc_code: toDisplayString(metadata.dc_code),
    last_user: toDisplayString(lastActor?.user_username),
    action: formatActionLabel(record.last_action),
    performed_at: formattedPerformedAt
  };
}

type HistoryTableProps = {
  records: SalesForecastRecord[];
  onEdit: (record: SalesForecastRecord) => void;
  onDelete: (record: SalesForecastRecord) => void;
  busyRowId?: string | null;
  deletingRowId?: string | null;
};

export function HistoryTable({ records, onEdit, onDelete, busyRowId, deletingRowId }: HistoryTableProps) {
  const [companyCodeLookup, setCompanyCodeLookup] = useState<Record<string, string>>({});

  useEffect(() => {
    const seen = new Set<string>();
    const candidates: Array<{ key: string; raw: string }> = [];
    for (const record of records) {
      const normalized = normalizeText(record.company_desc);
      if (!normalized) continue;
      if (companyCodeLookup[normalized] !== undefined) continue;
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      candidates.push({ key: normalized, raw: record.company_desc ?? '' });
    }
    if (candidates.length === 0) return;

    let cancelled = false;

    (async () => {
      const results = await Promise.all(
        candidates.map(async ({ key, raw }) => {
          try {
            const matches = await DimSource.fetchCompanies({ search: raw, limit: 5 });
            if (!matches || matches.length === 0) {
              return { key, code: undefined as string | undefined };
            }
            const normalizedRaw = normalizeText(raw);
            const exact = matches.find((item) => normalizeText(item.description ?? item.label ?? item.code) === normalizedRaw);
            const code = exact?.code ?? matches[0]?.code;
            return { key, code: code ?? undefined };
          } catch {
            return { key, code: undefined as string | undefined };
          }
        })
      );

      if (cancelled) return;
      setCompanyCodeLookup((prev) => {
        const next = { ...prev };
        for (const { key, code } of results) {
          if (!code) continue;
          if (next[key] === code) continue;
          next[key] = code;
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [records, companyCodeLookup]);

  const rows = useMemo(
    () =>
      records.map((rec) => {
        const normalized = normalizeText(rec.company_desc);
        const override = normalized ? companyCodeLookup[normalized] : undefined;
        return { display: buildDisplayRow(rec, { companyCodeOverride: override }), original: rec };
      }),
    [records, companyCodeLookup]
  );
  const [columnWidths, setColumnWidths] = useState<Partial<Record<ResizableColumnKey, number>>>({});
  const [page, setPage] = useState(1);
  const resizingColumnRef = useRef<{
    key: ResizableColumnKey;
    startX: number;
    startWidth: number;
  } | null>(null);

  const getDefaultWidth = useCallback(
    (key: ResizableColumnKey) => DEFAULT_COLUMN_WIDTHS[key] ?? 160,
    []
  );

  const getColumnWidth = useCallback(
    (key: ResizableColumnKey) => columnWidths[key] ?? getDefaultWidth(key),
    [columnWidths, getDefaultWidth]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      const current = resizingColumnRef.current;
      if (!current) return;
      const delta = event.clientX - current.startX;
      const nextWidth = Math.max(COLUMN_MIN_WIDTH, current.startWidth + delta);
      setColumnWidths((prev) => ({
        ...prev,
        [current.key]: nextWidth
      }));
    },
    []
  );

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
    (key: ResizableColumnKey, event: ReactMouseEvent<HTMLDivElement>) => {
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

  const indexWidth = getColumnWidth('__index');
  const actionsWidth = getColumnWidth('__actions');
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [rows.length]);

  useEffect(() => {
    setPage((current) => {
      const next = Math.min(Math.max(current, 1), totalPages);
      return next === current ? current : next;
    });
  }, [totalPages]);

  const paginatedRows = useMemo(() => {
    if (rows.length === 0) return [];
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, Math.min(start + PAGE_SIZE, rows.length));
  }, [rows, page]);

  const startIndex = (page - 1) * PAGE_SIZE;
  const showingFrom = rows.length === 0 ? 0 : startIndex + 1;
  const showingTo = rows.length === 0 ? 0 : Math.min(rows.length, startIndex + paginatedRows.length);
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  return (
    <section className="rounded-xl border border-slate-300 bg-white shadow-inner dark:border-slate-700 dark:bg-slate-900">
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[1600px] border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
        <thead className="text-slate-700 dark:text-slate-200">
          <tr className="border-b border-slate-300 dark:border-slate-700">
            <th
              className="sticky left-0 top-0 z-20 border border-slate-300 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition-colors duration-200 dark:border-slate-600 dark:text-white"
              style={{ width: indexWidth, minWidth: indexWidth, background: 'linear-gradient(135deg, #6366f1, #0ea5e9, #10b981)' }}
            >
              <div className="relative flex items-center justify-center">
                #
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none bg-transparent hover:bg-blue-500/40"
                  onMouseDown={(event) => startResizing('__index', event)}
                  role="presentation"
                />
              </div>
            </th>
            <th
              className="sticky top-0 z-20 border border-slate-300 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition-colors duration-200 dark:border-slate-600 dark:text-white"
              style={{
                left: indexWidth,
                width: actionsWidth,
                minWidth: actionsWidth,
                background: 'linear-gradient(135deg, #6366f1, #0ea5e9, #10b981)'
              }}
            >
              <div className="relative flex items-center justify-center">
                Actions
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none bg-transparent hover:bg-blue-500/40"
                  onMouseDown={(event) => startResizing('__actions', event)}
                  role="presentation"
                />
              </div>
            </th>
            {TABLE_COLUMNS.map((column) => {
              const columnKey = column.key as keyof HistoryDisplayRow;
              const highlight = HIGHLIGHT_HEADER_KEYS.has(columnKey);
              const headerClassName = [
                // Make all non-frozen-left headers sticky to freeze header row
                'sticky top-0 z-10 border border-slate-300 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide transition-colors duration-200 dark:border-slate-600',
                highlight
                  ? 'bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-500 text-white shadow-sm dark:from-slate-700 dark:via-indigo-600 dark:to-emerald-500'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
              ].join(' ');
              return (
                <th
                  key={column.key as string}
                  className={headerClassName}
                  style={{
                    width: getColumnWidth(column.key),
                    minWidth: getColumnWidth(column.key)
                  }}
                >
                  <span className="block whitespace-pre-wrap break-words">{column.label}</span>
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none bg-transparent hover:bg-blue-500/40"
                    onMouseDown={(event) => startResizing(column.key, event)}
                    role="presentation"
                  />
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                className="border border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300"
                colSpan={TABLE_COLUMNS.length + 2}
              >
                No data to display
              </td>
            </tr>
          ) : (
            paginatedRows.map((row, index) => (
              <tr
                key={row.display.id || `${startIndex + index}`}
                className="border-b border-slate-200 bg-white odd:bg-white even:bg-slate-50 hover:bg-emerald-50/60 dark:border-slate-700 dark:bg-slate-900 dark:even:bg-slate-900/40 dark:hover:bg-slate-800"
              >
                <th
                  className="sticky left-0 z-10 border border-slate-300 bg-slate-100 px-4 py-2 text-center text-xs font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                  style={{ width: indexWidth, minWidth: indexWidth }}
                >
                  {startIndex + index + 1}
                </th>
                <td
                  className="sticky z-10 whitespace-nowrap border border-slate-300 bg-white px-4 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                  style={{ left: indexWidth, width: actionsWidth, minWidth: actionsWidth }}
                >
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-blue-400 dark:focus:ring-offset-slate-900"
                      onClick={() => onEdit(row.original)}
                      disabled={busyRowId === row.original.id || deletingRowId === row.original.id}
                      aria-label="Edit row"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white shadow transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-red-400 dark:focus:ring-offset-slate-900"
                      onClick={() => onDelete(row.original)}
                      disabled={busyRowId === row.original.id || deletingRowId === row.original.id}
                      aria-label={deletingRowId === row.original.id ? 'Deleting row' : 'Delete row'}
                    >
                      {deletingRowId === row.original.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </td>
                {TABLE_COLUMNS.map((column) => {
                  const value = row.display[column.key];
                  return (
                    <td
                      key={`${row.display.id}-${String(column.key)}`}
                      className="border border-slate-200 px-4 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"
                      style={{
                        width: getColumnWidth(column.key),
                        minWidth: getColumnWidth(column.key)
                      }}
                    >
                      <span className="block whitespace-pre-wrap break-words leading-relaxed">
                        {value && value !== '' ? value : '-'}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
        </table>
      </div>
      {rows.length > 0 && (
        <div className="border-t border-slate-200 bg-slate-50/80 px-6 py-4 text-sm text-slate-600 shadow-inner dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-center text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-left">
              Showing {showingFrom}-{showingTo} of {rows.length} records · {paginatedRows.length} per page
            </span>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-500 dark:hover:text-emerald-300 dark:focus:ring-emerald-400/40 disabled:dark:border-slate-700 disabled:dark:text-slate-500"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={!canGoPrev}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <div className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
                <span className="uppercase tracking-wide text-slate-400 dark:text-slate-500">Page</span>
                <span className="text-base font-bold text-blue-600 dark:text-emerald-300">{page}</span>
                <span className="text-slate-400 dark:text-slate-500">/</span>
                <span>{totalPages}</span>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-500 dark:hover:text-emerald-300 dark:focus:ring-emerald-400/40 disabled:dark:border-slate-700 disabled:dark:text-slate-500"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={!canGoNext}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
