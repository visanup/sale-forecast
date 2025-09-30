import { useState } from 'react';
import { FileUpload } from '../components/FileUpload';
import { ingestApi } from '../services/api';
import * as XLSX from 'xlsx';

export function AdminImportPage() {
  const [anchorMonth, setAnchorMonth] = useState('');
  const [preview, setPreview] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function handleFile(file: File) {
    setMessage(null);
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    setPreview(json.slice(0, 20));
  }

  async function upload(file: File) {
    try {
      const res = await ingestApi.upload(file, anchorMonth || new Date().toISOString().slice(0,7));
      setMessage(`Uploaded. runId=${res.runId}`);
    } catch (e: any) {
      setMessage(e.message || 'Upload failed');
    }
  }

  return (
    <div className="space-y-6">
      <section className="card p-6 space-y-4">
        <h1 className="text-2xl font-bold">Admin Import (Seed Masters)</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Use the same Excel layout; dimensions will be upserted server-side.</p>
        <div className="flex gap-3 items-end">
          <div>
            <label className="text-sm">Anchor month</label>
            <input className="input mt-1" type="month" value={anchorMonth} onChange={e=>setAnchorMonth(e.target.value)} />
          </div>
          <FileUpload label="Choose Excel" onFile={async (f)=>{ await handleFile(f); await upload(f); }} />
        </div>
        {message && <div className="text-sm text-neutral-600 dark:text-neutral-300">{message}</div>}
      </section>

      {preview.length > 0 && (
        <section className="card p-4 overflow-auto">
          <div className="min-w-[1000px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-neutral-200 dark:border-neutral-800">
                  {Object.keys(preview[0]).map(h => (
                    <th key={h} className="py-2 pr-4 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800/60">
                    {Object.keys(preview[0]).map(h => (
                      <td key={h} className="py-1 pr-4">{String(r[h] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}


