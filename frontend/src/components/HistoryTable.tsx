import { SalesForecastRecord } from '../services/api';

type MonthColumnKey = 'n_2' | 'n_1' | 'n' | 'n1' | 'n2' | 'n3';

type HistoryDisplayRow = {
  id: string;
  dept_code: string;
  company_desc: string;
  sap_code: string;
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
  { key: 'sap_code', label: 'SAP Code' },
  { key: 'sap_code_alt', label: 'SAPCode' },
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
  { key: 'dc_code', label: 'Distribution Channel' }
];

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

function buildDisplayRow(record: SalesForecastRecord): HistoryDisplayRow {
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
  const sapCodeAlternateSource = ['SAPCode', 'sap_code', 'sapCode']
    .map((key) => metadataRecord[key])
    .find((value) => typeof value === 'string' && value.trim().length > 0) as string | undefined;
  const sapCodeAlt = sapCodeAlternateSource ?? sapCode;

  return {
    id: record.id,
    dept_code: toDisplayString(metadata.dept_code),
    company_desc: toDisplayString(record.company_desc),
    sap_code: sapCode,
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
    dc_code: toDisplayString(metadata.dc_code)
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
  const rows = records.map((rec) => ({ display: buildDisplayRow(rec), original: rec }));

  return (
    <section className="overflow-auto rounded-xl border border-slate-300 bg-white shadow-inner dark:border-slate-700 dark:bg-slate-900">
      <table className="min-w-[1200px] border-collapse text-sm">
        <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <tr className="border-b border-slate-300 dark:border-slate-700">
            <th className="sticky left-0 top-0 z-20 border border-slate-300 bg-slate-200 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide dark:border-slate-600 dark:bg-slate-700">
              #
            </th>
            <th className="sticky left-14 top-0 z-20 border border-slate-300 bg-slate-200 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide dark:border-slate-600 dark:bg-slate-700">
              Actions
            </th>
            {TABLE_COLUMNS.map((column) => (
              <th
                key={column.key as string}
                className="border border-slate-300 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide dark:border-slate-600"
              >
                {column.label}
              </th>
            ))}
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
            rows.map((row, index) => (
              <tr
                key={row.display.id || index}
                className="border-b border-slate-200 bg-white odd:bg-white even:bg-slate-50 hover:bg-emerald-50/60 dark:border-slate-700 dark:bg-slate-900 dark:even:bg-slate-900/40 dark:hover:bg-slate-800"
              >
                <th className="sticky left-0 z-10 border border-slate-300 bg-slate-100 px-4 py-2 text-center text-xs font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                  {index + 1}
                </th>
                <td className="sticky left-14 z-10 whitespace-nowrap border border-slate-300 bg-white px-4 py-2 text-sm dark:border-slate-600 dark:bg-slate-900">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow disabled:cursor-not-allowed disabled:bg-blue-400"
                      onClick={() => onEdit(row.original)}
                      disabled={busyRowId === row.original.id || deletingRowId === row.original.id}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white shadow disabled:cursor-not-allowed disabled:bg-red-400"
                      onClick={() => onDelete(row.original)}
                      disabled={busyRowId === row.original.id || deletingRowId === row.original.id}
                    >
                      {deletingRowId === row.original.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </td>
                {TABLE_COLUMNS.map((column) => {
                  const value = row.display[column.key];
                  return (
                    <td
                      key={`${row.display.id}-${String(column.key)}`}
                      className="border border-slate-200 px-4 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"
                    >
                      {value && value !== '' ? value : '-'}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
