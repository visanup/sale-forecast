import { useState } from 'react';
import * as XLSX from 'xlsx';
import { FileUpload } from '../components/FileUpload';
import { EditableGrid } from '../components/EditableGrid';
import { ManualEntryForm } from '../components/ManualEntryForm';
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
  Target
} from 'lucide-react';

type RowObject = Record<string, string | number | null>;

export function HomePage() {
  const [tab, setTab] = useState<'upload'|'manual'>('upload');
  const [rows, setRows] = useState<RowObject[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: RowObject[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      setRows(json);
      const hdr = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })[0] as string[];
      setHeaders(hdr || Object.keys(json[0] || {}));
    };
    reader.readAsArrayBuffer(file);
  }

  function onCellEdit(rIndex: number, key: string, value: string) {
    setRows(prev => prev.map((r, idx) => idx === rIndex ? { ...r, [key]: value } : r));
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
          </div>
        </div>

        {/* Data Preview */}
        {tab === 'upload' && rows.length > 0 && (
          <div className="mt-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
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
        )}

      </div>
    </div>
  );
}


