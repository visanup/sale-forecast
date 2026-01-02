import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { FileUpload } from '../components/FileUpload';
import { dimApi, monthlyAccessMaterialApi, type MonthlyAccessMaterialRecord } from '../services/api';
import {
  Building2,
  Layers,
  Package,
  Shield,
  Upload,
  Download,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText
} from 'lucide-react';

const DEFAULT_LIMIT = 25;
const EXPORT_LIMIT = 100;
const DEFAULT_ANCHOR_MONTH = new Date().toISOString().slice(0, 7);

type TabKey = 'dept' | 'company' | 'material' | 'access-material';

type ColumnConfig = {
  key: string;
  label: string;
};

type TabDefinition = {
  key: TabKey;
  title: string;
  description: string;
  icon: typeof Building2;
  columns: ColumnConfig[];
  exportFileName: string;
};

type PreviewRow = Record<string, string | number | null>;

type TabState = {
  rows: PreviewRow[];
  loading: boolean;
  error: string | null;
  search: string;
  limit: number;
  cursor: string | null;
  cursorStack: Array<string | null>;
  nextCursor: string | null;
  file: File | null;
  anchorMonth: string;
  importing: boolean;
  exporting: boolean;
  notice: { kind: 'success' | 'error'; message: string } | null;
};

const TAB_DEFINITIONS: TabDefinition[] = [
  {
    key: 'dept',
    title: 'dim_dept',
    description: 'Manage department master data via CSV.',
    icon: Layers,
    columns: [{ key: 'dept_code', label: 'dept_code' }],
    exportFileName: 'dim_dept.csv'
  },
  {
    key: 'company',
    title: 'dim_company',
    description: 'Manage company master data via CSV.',
    icon: Building2,
    columns: [
      { key: 'company_code', label: 'company_code' },
      { key: 'company_desc', label: 'company_desc' }
    ],
    exportFileName: 'dim_company.csv'
  },
  {
    key: 'material',
    title: 'dim_material + dim_sku + dim_uom',
    description: 'Manage material, SKU, and UOM from a single CSV.',
    icon: Package,
    columns: [
      { key: 'material_code', label: 'material_code' },
      { key: 'material_desc', label: 'material_desc' },
      { key: 'pack_size', label: 'pack_size' },
      { key: 'uom_code', label: 'uom_code' }
    ],
    exportFileName: 'dim_material_sku_uom.csv'
  },
  {
    key: 'access-material',
    title: 'monthly_access_control_material',
    description: 'Control allowed materials per anchor_month via CSV.',
    icon: Shield,
    columns: [
      { key: 'anchor_month', label: 'anchor_month' },
      { key: 'material_code', label: 'material_code' },
      { key: 'material_desc', label: 'material_desc' }
    ],
    exportFileName: 'monthly_access_control_material.csv'
  }
];

const createTabState = (): TabState => ({
  rows: [],
  loading: false,
  error: null,
  search: '',
  limit: DEFAULT_LIMIT,
  cursor: null,
  cursorStack: [],
  nextCursor: null,
  file: null,
  anchorMonth: DEFAULT_ANCHOR_MONTH,
  importing: false,
  exporting: false,
  notice: null
});

function formatAnchorMonth(value?: string | null) {
  if (!value) return '';
  const trimmed = value.trim();
  return trimmed.length >= 7 ? trimmed.slice(0, 7) : trimmed;
}

const ANCHOR_MONTH_HEADERS = new Set(['anchor_month', 'anchorMonth', 'ANCHOR_MONTH']);

function normalizeAnchorMonthCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const raw =
    typeof value === 'string'
      ? value.trim()
      : typeof value === 'number' && Number.isFinite(value)
        ? String(Math.trunc(value))
        : String(value).trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}`;
  }
  return raw;
}

async function normalizeMonthlyAccessCsv(file: File): Promise<File> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return file;
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<Array<string | number | null>>(sheet, {
      header: 1,
      defval: ''
    });
    if (matrix.length === 0) return file;
    const headerRow = matrix[0] || [];
    const anchorIndex = headerRow.findIndex((cell) =>
      ANCHOR_MONTH_HEADERS.has(String(cell ?? '').trim())
    );
    if (anchorIndex === -1) return file;

    const nextMatrix = matrix.map((row, index) => {
      if (index === 0) return row;
      const nextRow = [...row];
      const normalized = normalizeAnchorMonthCell(row[anchorIndex]);
      if (normalized) nextRow[anchorIndex] = normalized;
      return nextRow;
    });

    const nextSheet = XLSX.utils.aoa_to_sheet(nextMatrix);
    const nextWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(nextWorkbook, nextSheet, sheetName);
    const csv = XLSX.write(nextWorkbook, { bookType: 'csv', type: 'string' });
    const csvWithBom = `\ufeff${csv}`;
    return new File([csvWithBom], file.name, { type: file.type || 'text/csv' });
  } catch {
    return file;
  }
}

function formatCell(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

export function AdminImportPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('dept');
  const [tabState, setTabState] = useState<Record<TabKey, TabState>>({
    dept: createTabState(),
    company: createTabState(),
    material: createTabState(),
    'access-material': createTabState()
  });
  const [materialMap, setMaterialMap] = useState<Record<string, string | null>>({});
  const [materialMapLoading, setMaterialMapLoading] = useState(false);
  const [materialMapReady, setMaterialMapReady] = useState(false);

  const activeDefinition = useMemo(
    () => TAB_DEFINITIONS.find((tab) => tab.key === activeTab)!,
    [activeTab]
  );

  const activeState = tabState[activeTab];

  const updateTabState = (key: TabKey, updater: Partial<TabState> | ((state: TabState) => TabState)) => {
    setTabState((prev) => {
      const current = prev[key];
      const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
      return { ...prev, [key]: next };
    });
  };

  const ensureMaterialMap = async (options?: { force?: boolean }) => {
    if (!options?.force && (materialMapReady || materialMapLoading)) return materialMap;
    setMaterialMapLoading(true);
    try {
      const materials = await fetchAllPages((cursor) =>
        dimApi.materials({ limit: EXPORT_LIMIT, cursor })
      );
      const nextMap: Record<string, string | null> = {};
      materials.forEach((item: any) => {
        const code = item.materialCode ?? item.material_code;
        if (!code) return;
        nextMap[String(code)] = item.materialDesc ?? item.material_desc ?? null;
      });
      setMaterialMap(nextMap);
      setMaterialMapReady(true);
      return nextMap;
    } finally {
      setMaterialMapLoading(false);
    }
  };

  useEffect(() => {
    loadPreview(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeState.search, activeState.limit, activeState.cursor]);

  async function fetchAllPages<T>(
    fetchPage: (cursor?: string) => Promise<{ data: T[]; paging?: { next?: string | null } }>
  ) {
    const results: T[] = [];
    let cursor: string | undefined;
    do {
      const response = await fetchPage(cursor);
      results.push(...(response.data || []));
      cursor = response.paging?.next || undefined;
    } while (cursor);
    return results;
  }

  async function loadPreview(
    tabKey: TabKey,
    overrideState?: TabState,
    options?: { materialMapOverride?: Record<string, string | null> }
  ) {
    const state = overrideState ?? tabState[tabKey];
    updateTabState(tabKey, { loading: true, error: null });
    try {
      const { rows, nextCursor } = await fetchPreviewRows(tabKey, state, options);
      updateTabState(tabKey, { rows, nextCursor });
    } catch (error: any) {
      updateTabState(tabKey, {
        rows: [],
        nextCursor: null,
        error: error?.message || 'Failed to load data.'
      });
    } finally {
      updateTabState(tabKey, { loading: false });
    }
  }

  async function fetchPreviewRows(
    tabKey: TabKey,
    state: TabState,
    options?: { materialMapOverride?: Record<string, string | null> }
  ) {
    switch (tabKey) {
      case 'dept': {
        const response = await dimApi.depts({
          search: state.search || undefined,
          limit: state.limit,
          cursor: state.cursor || undefined
        });
        const rows = (response.data || []).map((item: any) => ({
          dept_code: item.deptCode ?? item.dept_code ?? ''
        }));
        return { rows, nextCursor: response.paging?.next || null };
      }
      case 'company': {
        const response = await dimApi.companies({
          search: state.search || undefined,
          limit: state.limit,
          cursor: state.cursor || undefined
        });
        const rows = (response.data || []).map((item: any) => ({
          company_code: item.companyCode ?? item.company_code ?? '',
          company_desc: item.companyDesc ?? item.company_desc ?? ''
        }));
        return { rows, nextCursor: response.paging?.next || null };
      }
      case 'material': {
        const response = await dimApi.skus({
          search: state.search || undefined,
          limit: state.limit,
          cursor: state.cursor || undefined
        });
        const map = options?.materialMapOverride ?? (await ensureMaterialMap());
        const rows = (response.data || []).map((item: any) => {
          const code = item.materialCode ?? item.material_code ?? '';
          return {
            material_code: code,
            material_desc: code ? map[code] ?? '' : '',
            pack_size: item.packSize ?? item.pack_size ?? '',
            uom_code: item.uomCode ?? item.uom_code ?? ''
          };
        });
        return { rows, nextCursor: response.paging?.next || null };
      }
      case 'access-material': {
        const response = await monthlyAccessMaterialApi.list({
          search: state.search || undefined,
          limit: state.limit,
          cursor: state.cursor || undefined
        });
        const rows = (response.data || []).map((item: MonthlyAccessMaterialRecord) => ({
          anchor_month: formatAnchorMonth(item.anchor_month),
          material_code: item.material_code ?? '',
          material_desc: item.material_desc ?? ''
        }));
        return { rows, nextCursor: response.paging?.next || null };
      }
      default:
        return { rows: [], nextCursor: null };
    }
  }

  async function handleImport(tabKey: TabKey) {
    const state = tabState[tabKey];
    if (!state.file) return;
    if (tabKey === 'access-material' && !state.anchorMonth) {
      updateTabState(tabKey, {
        notice: { kind: 'error', message: 'Anchor month is required.' }
      });
      return;
    }
    const confirmed = window.confirm(
      'Import will replace all existing data with this CSV. Continue?'
    );
    if (!confirmed) return;
    updateTabState(tabKey, { importing: true, notice: null });
    try {
      if (tabKey === 'dept') {
        await dimApi.importDeptsCsv(state.file);
      } else if (tabKey === 'company') {
        await dimApi.importCompaniesCsv(state.file);
      } else if (tabKey === 'material') {
        await dimApi.importMaterialsCsv(state.file);
      } else if (tabKey === 'access-material') {
        const normalizedFile = await normalizeMonthlyAccessCsv(state.file);
        await monthlyAccessMaterialApi.importCsv(normalizedFile, state.anchorMonth);
      }
      updateTabState(tabKey, {
        importing: false,
        file: null,
        notice: { kind: 'success', message: 'Import completed.' },
        cursor: null,
        cursorStack: [],
        nextCursor: null
      });
      const resetState = { ...state, cursor: null, cursorStack: [], nextCursor: null };
      if (tabKey === 'material') {
        const refreshedMap = await ensureMaterialMap({ force: true });
        await loadPreview(tabKey, resetState, { materialMapOverride: refreshedMap });
      } else {
        await loadPreview(tabKey, resetState);
      }
    } catch (error: any) {
      updateTabState(tabKey, {
        importing: false,
        notice: { kind: 'error', message: error?.message || 'Import failed.' }
      });
    }
  }

  async function handleExport(tabKey: TabKey) {
    updateTabState(tabKey, { exporting: true, notice: null });
    try {
      const rows = await buildExportRows(tabKey);
      const definition = TAB_DEFINITIONS.find((tab) => tab.key === tabKey)!;
      downloadCsv(definition.exportFileName, rows, definition.columns);
      updateTabState(tabKey, {
        exporting: false,
        notice: { kind: 'success', message: `Exported ${rows.length} rows` }
      });
    } catch (error: any) {
      updateTabState(tabKey, {
        exporting: false,
        notice: { kind: 'error', message: error?.message || 'Export failed.' }
      });
    }
  }

  async function buildExportRows(tabKey: TabKey): Promise<PreviewRow[]> {
    switch (tabKey) {
      case 'dept': {
        const data = await fetchAllPages((cursor) =>
          dimApi.depts({ limit: EXPORT_LIMIT, cursor })
        );
        return data.map((item: any) => ({
          dept_code: item.deptCode ?? item.dept_code ?? ''
        }));
      }
      case 'company': {
        const data = await fetchAllPages((cursor) =>
          dimApi.companies({ limit: EXPORT_LIMIT, cursor })
        );
        return data.map((item: any) => ({
          company_code: item.companyCode ?? item.company_code ?? '',
          company_desc: item.companyDesc ?? item.company_desc ?? ''
        }));
      }
      case 'material': {
        const [skus, map] = await Promise.all([
          fetchAllPages((cursor) => dimApi.skus({ limit: EXPORT_LIMIT, cursor })),
          ensureMaterialMap()
        ]);
        return skus.map((item: any) => {
          const code = item.materialCode ?? item.material_code ?? '';
          return {
            material_code: code,
            material_desc: code ? map[code] ?? '' : '',
            pack_size: item.packSize ?? item.pack_size ?? '',
            uom_code: item.uomCode ?? item.uom_code ?? ''
          };
        });
      }
      case 'access-material': {
        const data = await fetchAllPages((cursor) =>
          monthlyAccessMaterialApi.list({ limit: EXPORT_LIMIT, cursor })
        );
        return data.map((item: MonthlyAccessMaterialRecord) => ({
          anchor_month: formatAnchorMonth(item.anchor_month),
          material_code: item.material_code ?? '',
          material_desc: item.material_desc ?? ''
        }));
      }
      default:
        return [];
    }
  }

  function handleFileSelect(tabKey: TabKey, file: File) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      updateTabState(tabKey, {
        notice: { kind: 'error', message: 'Please choose a .csv file only.' },
        file: null
      });
      return;
    }
    updateTabState(tabKey, { file, notice: null });
  }

  function handleSearchChange(value: string) {
    updateTabState(activeTab, (state) => ({
      ...state,
      search: value,
      cursor: null,
      cursorStack: [],
      nextCursor: null
    }));
  }

  function handleLimitChange(value: number) {
    updateTabState(activeTab, (state) => ({
      ...state,
      limit: value,
      cursor: null,
      cursorStack: [],
      nextCursor: null
    }));
  }

  function handleNextPage() {
    if (!activeState.nextCursor) return;
    updateTabState(activeTab, (state) => ({
      ...state,
      cursorStack: [...state.cursorStack, state.cursor],
      cursor: state.nextCursor
    }));
  }

  function handlePrevPage() {
    updateTabState(activeTab, (state) => {
      if (state.cursorStack.length === 0) return state;
      const nextStack = state.cursorStack.slice(0, -1);
      const prevCursor = state.cursorStack[state.cursorStack.length - 1] ?? null;
      return { ...state, cursorStack: nextStack, cursor: prevCursor };
    });
  }

  function downloadCsv(filename: string, rows: PreviewRow[], columns: ColumnConfig[]) {
    const header = columns.map((col) => col.label);
    const data = rows.map((row) =>
      columns.map((col) => {
        const value = row[col.key];
        return value === null || value === undefined ? '' : value;
      })
    );
    const worksheet = XLSX.utils.aoa_to_sheet([header, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'data');
    const csv = XLSX.write(workbook, { bookType: 'csv', type: 'string' });
    const csvWithBom = `\ufeff${csv}`;
    const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const pageIndex = activeState.cursorStack.length + 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-8 text-white shadow-2xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Admin Workspace</p>
              <h1 className="mt-2 text-3xl font-bold">Admin: Import master</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/70">
                Manage master data via CSV with export, import (replace all), and paginated preview.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 px-6 py-4 text-center">
              <p className="text-xs uppercase tracking-wide text-white/60">Active Menu</p>
              <p className="mt-2 text-lg font-semibold">{activeDefinition.title}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TAB_DEFINITIONS.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    isActive
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500/80 dark:bg-brand-500/10 dark:text-brand-200'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-400/60 dark:hover:text-brand-200'
                  }`}
                  aria-selected={isActive}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      isActive ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="leading-tight">
                    <span className="block text-xs uppercase tracking-wide text-slate-400">Menu</span>
                    <span className="block text-sm font-semibold">{tab.title}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {activeDefinition.title}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {activeDefinition.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleExport(activeTab)}
              className="btn-primary inline-flex items-center gap-2"
              disabled={activeState.exporting}
            >
              {activeState.exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export CSV
            </button>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Import CSV (Replace All)
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  This import replaces all existing rows in the table.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {activeTab === 'access-material' && (
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-200">
                      Anchor month
                      <input
                        type="month"
                        value={activeState.anchorMonth}
                        onChange={(event) =>
                          updateTabState(activeTab, { anchorMonth: event.target.value })
                        }
                        className="mt-1 w-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      />
                    </label>
                  )}
                  <FileUpload
                    accept=".csv,text/csv"
                    label="Choose CSV"
                    onFile={(file) => handleFileSelect(activeTab, file)}
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {activeState.file ? activeState.file.name : 'No file selected'}
                  </span>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => handleImport(activeTab)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    disabled={!activeState.file || activeState.importing}
                  >
                    {activeState.importing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Import CSV
                  </button>
                </div>
              </div>

              {activeState.notice && (
                <div
                  className={`rounded-lg border px-4 py-3 text-sm ${
                    activeState.notice.kind === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-200'
                      : 'border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-200'
                  }`}
                >
                  {activeState.notice.message}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <FileText className="h-4 w-4" />
                CSV Columns
              </div>
              <ul className="mt-3 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                {activeDefinition.columns.map((col) => (
                  <li key={col.key} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500"></span>
                    {col.label}
                  </li>
                ))}
              </ul>
              {activeTab === 'material' && materialMapLoading && (
                <p className="mt-3 text-xs text-slate-400">Loading material descriptions...</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Preview Master Data</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Page {pageIndex} | {activeState.rows.length} rows
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={activeState.search}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search..."
                  className="w-48 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>
              <select
                value={activeState.limit}
                onChange={(event) => handleLimitChange(Number(event.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {[10, 25, 50, 100].map((value) => (
                  <option key={value} value={value}>
                    {value} rows
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activeState.error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-200">
              {activeState.error}
            </div>
          )}

          <div className="mt-4 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
            {activeState.loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading data...
              </div>
            ) : activeState.rows.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">No data found.</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/60">
                  <tr>
                    {activeDefinition.columns.map((column) => (
                      <th key={column.key} className="px-4 py-3 text-left font-semibold">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {activeState.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                      {activeDefinition.columns.map((column) => (
                        <td key={column.key} className="px-4 py-3 text-slate-700 dark:text-slate-200">
                          {formatCell(row[column.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={activeState.cursorStack.length === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={!activeState.nextCursor}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
