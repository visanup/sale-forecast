import { useState } from 'react';
import * as XLSX from 'xlsx';
import { FileUpload } from '../components/FileUpload';
import { EditableGrid } from '../components/EditableGrid';
import { ManualEntryForm } from '../components/ManualEntryForm';
import { HistoryTable } from '../components/HistoryTable';
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
  History
} from 'lucide-react';
import {
  ingestApi,
  dataApi,
  type SalesForecastRecord,
  type SalesForecastMetadata,
  type SalesForecastMonthsEntry
} from '../services/api';

type ColumnType = 'string' | 'number';
type RowObject = Record<string, string | number | null>;
type ValidationIssue = { row: number; column: string; expected: ColumnType; actual: string };

const EXPECTED_COLUMN_TYPES: Record<string, ColumnType> = {
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

const MAX_VALIDATION_ERRORS = 10;

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

function formatValidationIssue(issue: ValidationIssue): string {
  const expectedLabel = issue.expected === 'string' ? 'string' : 'number';
  return `แถวที่ ${issue.row} คอลัมน์ "${issue.column}" ควรเป็น ${expectedLabel} แต่พบ ${issue.actual}`;
}

const HISTORY_MONTH_FIELDS = [
  { key: 'n_2', label: 'n-2', delta: -2 },
  { key: 'n_1', label: 'n-1', delta: -1 },
  { key: 'n', label: 'n', delta: 0 },
  { key: 'n1', label: 'n+1', delta: 1 },
  { key: 'n2', label: 'n+2', delta: 2 },
  { key: 'n3', label: 'n+3', delta: 3 }
] as const;

type HistoryFormState = {
  anchorMonth: string;
  companyCode: string;
  companyDesc: string;
  deptCode: string;
  dcCode: string;
  division: string;
  salesOrganization: string;
  salesOffice: string;
  salesGroup: string;
  salesRepresentative: string;
  materialCode: string;
  materialDesc: string;
  packSize: string;
  uomCode: string;
  price: string;
  n_2: string;
  n_1: string;
  n: string;
  n1: string;
  n2: string;
  n3: string;
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

function buildHistoryFormFromRecord(record: SalesForecastRecord): HistoryFormState {
  const metadata = record.metadata ?? {};
  const monthValues: Record<typeof HISTORY_MONTH_FIELDS[number]['key'], string> = {
    n_2: '',
    n_1: '',
    n: '',
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
    dcCode: toInputString(metadata.dc_code),
    division: toInputString(metadata.division),
    salesOrganization: toInputString(metadata.sales_organization),
    salesOffice: toInputString(metadata.sales_office),
    salesGroup: toInputString(metadata.sales_group),
    salesRepresentative: toInputString(metadata.sales_representative),
    materialCode: record.material_code ?? '',
    materialDesc: record.material_desc ?? '',
    packSize: toInputString(metadata.pack_size),
    uomCode: toInputString(metadata.uom_code),
    price: extractPriceString(metadata),
    n_2: monthValues.n_2,
    n_1: monthValues.n_1,
    n: monthValues.n,
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

  const forecastQty = parseNumericInput(form.n);

  const metadata: SalesForecastMetadata = {
    ...base,
    months,
    dept_code: form.deptCode || null,
    dc_code: form.dcCode || null,
    division: form.division || null,
    sales_organization: form.salesOrganization || null,
    sales_office: form.salesOffice || null,
    sales_group: form.salesGroup || null,
    sales_representative: form.salesRepresentative || null,
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
  const [tab, setTab] = useState<'upload' | 'manual' | 'history'>('upload');
  const [rows, setRows] = useState<RowObject[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [anchorMonth, setAnchorMonth] = useState<string>(new Date().toISOString().slice(0,7));
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<'success' | 'error' | 'info'>('info');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationOverflowCount, setValidationOverflowCount] = useState(0);
  const [historyAnchorMonth, setHistoryAnchorMonth] = useState<string>(new Date().toISOString().slice(0,7));
  const [historyCompanyCode, setHistoryCompanyCode] = useState('');
  const [historyCompanyDesc, setHistoryCompanyDesc] = useState('');
  const [historyMaterialCode, setHistoryMaterialCode] = useState('');
  const [historyMaterialDesc, setHistoryMaterialDesc] = useState('');
  const [historyRecords, setHistoryRecords] = useState<SalesForecastRecord[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyFetched, setHistoryFetched] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyEditRecord, setHistoryEditRecord] = useState<SalesForecastRecord | null>(null);
  const [historyEditForm, setHistoryEditForm] = useState<HistoryFormState | null>(null);
  const [historyActionError, setHistoryActionError] = useState<string | null>(null);
  const [historyProcessingId, setHistoryProcessingId] = useState<string | null>(null);
  const [historyDeletingId, setHistoryDeletingId] = useState<string | null>(null);

  function handleFile(file: File) {
    setMessage(null);
    setValidationErrors([]);
    setValidationOverflowCount(0);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: RowObject[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
      const normalizedRows = normalizeRows(json);
      const hdr = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })[0] as string[];
      setHeaders(hdr || Object.keys(normalizedRows[0] || {}));

      const issues = collectValidationIssues(normalizedRows);
      if (issues.length > 0) {
        console.error('uploadValidationErrors', issues);
        const formatted = issues.slice(0, MAX_VALIDATION_ERRORS).map(formatValidationIssue);
        setValidationErrors(formatted);
        setValidationOverflowCount(Math.max(issues.length - formatted.length, 0));
        setRows([]);
        setSelectedFile(null);
        setMessageKind('error');
        setMessage(`พบปัญหาในการตรวจสอบข้อมูลทั้งหมด ${issues.length} จุด กรุณาแก้ไขไฟล์ก่อนอัปโหลดอีกครั้ง`);
        return;
      }

      setRows(normalizedRows);
      setSelectedFile(file);
      setValidationErrors([]);
      setValidationOverflowCount(0);
      setMessageKind('success');
      setMessage('ตรวจสอบไฟล์เรียบร้อย สามารถอัปโหลดได้');
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleUpload() {
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
    setIsUploading(true);
    setMessageKind('info');
    setMessage('กำลังอัปโหลด...');
    try {
      const result = await ingestApi.upload(selectedFile, anchorMonth || new Date().toISOString().slice(0,7));
      const insertedCount = typeof result.insertedCount === 'number' ? result.insertedCount : undefined;
      console.info('ingestUploadSuccess', { runId: result.runId, insertedCount });
      setMessageKind('success');
      setMessage(
        insertedCount !== undefined
          ? `Upload สำเร็จ! บันทึกข้อมูล ${insertedCount} รายการ (Run ID: ${result.runId})`
          : `Upload สำเร็จ! Run ID: ${result.runId}`
      );
    } catch (error: any) {
      setMessageKind('error');
      setMessage(error?.message || 'Upload ล้มเหลว');
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
        company_code: historyCompanyCode.trim() || undefined,
        company_desc: historyCompanyDesc.trim() || undefined,
        material_code: historyMaterialCode.trim() || undefined,
        material_desc: historyMaterialDesc.trim() || undefined
      });
      const data = response?.data ?? [];
      setHistoryRecords(data);
      setHistoryFetched(true);
      setHistoryActionError(null);
    } catch (error: any) {
      setHistoryRecords([]);
      setHistoryFetched(false);
      setHistoryError(error?.message || 'ไม่สามารถดึงข้อมูลได้');
    } finally {
      setIsHistoryLoading(false);
    }
  }

  function resetHistoryFilters() {
    const defaultAnchor = new Date().toISOString().slice(0, 7);
    setHistoryAnchorMonth(defaultAnchor);
    setHistoryCompanyCode('');
    setHistoryCompanyDesc('');
    setHistoryMaterialCode('');
    setHistoryMaterialDesc('');
    setHistoryRecords([]);
    setHistoryError(null);
    setHistoryFetched(false);
    setHistoryActionError(null);
  }

  function openHistoryEditor(record: SalesForecastRecord) {
    setHistoryEditRecord(record);
    setHistoryEditForm(buildHistoryFormFromRecord(record));
    setHistoryActionError(null);
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
    setHistoryActionError(null);
    try {
      const { metadata, forecastQty } = buildMetadataFromForm(historyEditRecord, historyEditForm);
      if (!metadata.months || metadata.months.length === 0) {
        setHistoryActionError('กรุณาระบุปริมาณอย่างน้อยหนึ่งเดือน');
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
    } catch (error: any) {
      setHistoryActionError(error?.message || 'ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setHistoryProcessingId(null);
    }
  }

  async function handleHistoryDelete(record: SalesForecastRecord) {
    const confirmDelete = window.confirm('ยืนยันการลบข้อมูลแถวนี้หรือไม่?');
    if (!confirmDelete) return;

    setHistoryDeletingId(record.id);
    setHistoryActionError(null);
    try {
      await dataApi.salesForecastDelete(record.id);
      if (historyEditRecord?.id === record.id) {
        closeHistoryEditor();
      }
      await fetchHistory();
    } catch (error: any) {
      setHistoryActionError(error?.message || 'ไม่สามารถลบข้อมูลได้');
    } finally {
      setHistoryDeletingId(null);
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

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                      Company Code
                    </label>
                    <input
                      type="text"
                      value={historyCompanyCode}
                      onChange={(e) => setHistoryCompanyCode(e.target.value)}
                      className="input"
                      placeholder="เช่น 1001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Company Description
                    </label>
                    <input
                      type="text"
                      value={historyCompanyDesc}
                      onChange={(e) => setHistoryCompanyDesc(e.target.value)}
                      className="input"
                      placeholder="เช่น Betagro"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Material Code
                    </label>
                    <input
                      type="text"
                      value={historyMaterialCode}
                      onChange={(e) => setHistoryMaterialCode(e.target.value)}
                      className="input"
                      placeholder="เช่น MAT-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Material Description
                    </label>
                    <input
                      type="text"
                      value={historyMaterialDesc}
                      onChange={(e) => setHistoryMaterialDesc(e.target.value)}
                      className="input"
                      placeholder="เช่น Frozen Chicken"
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
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
                  {historyRecords.length > 0 && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      พบข้อมูล {historyRecords.length} รายการ
                    </span>
                  )}
                </div>

                {historyError && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200">
                    {historyError}
                  </div>
                )}

                {!historyError && historyActionError && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200">
                    {historyActionError}
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
                    busyRowId={historyProcessingId}
                    deletingRowId={historyDeletingId}
                  />
                </div>

                {historyEditRecord && historyEditForm && (
                  <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
                    <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
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
                            Distribution Channel
                            <input
                              type="text"
                              className="input mt-1"
                              value={historyEditForm.dcCode}
                              onChange={(e) => updateHistoryForm('dcCode', e.target.value)}
                              disabled={historyProcessingId === historyEditRecord.id}
                            />
                          </label>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            Division
                            <input
                              type="text"
                              className="input mt-1"
                              value={historyEditForm.division}
                              onChange={(e) => updateHistoryForm('division', e.target.value)}
                              disabled={historyProcessingId === historyEditRecord.id}
                            />
                          </label>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            Sales Organization
                            <input
                              type="text"
                              className="input mt-1"
                              value={historyEditForm.salesOrganization}
                              onChange={(e) => updateHistoryForm('salesOrganization', e.target.value)}
                              disabled={historyProcessingId === historyEditRecord.id}
                            />
                          </label>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            Sales Office
                            <input
                              type="text"
                              className="input mt-1"
                              value={historyEditForm.salesOffice}
                              onChange={(e) => updateHistoryForm('salesOffice', e.target.value)}
                              disabled={historyProcessingId === historyEditRecord.id}
                            />
                          </label>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            Sales Group
                            <input
                              type="text"
                              className="input mt-1"
                              value={historyEditForm.salesGroup}
                              onChange={(e) => updateHistoryForm('salesGroup', e.target.value)}
                              disabled={historyProcessingId === historyEditRecord.id}
                            />
                          </label>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            Sales Representative
                            <input
                              type="text"
                              className="input mt-1"
                              value={historyEditForm.salesRepresentative}
                              onChange={(e) => updateHistoryForm('salesRepresentative', e.target.value)}
                              disabled={historyProcessingId === historyEditRecord.id}
                            />
                          </label>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            SAP Code
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
                                step="0.01"
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
              <div className="p-0">
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
          </div>
        )}

      </div>
    </div>
  );
}
