import { useState } from 'react';
import { ingestApi } from '../services/api';

type Line = {
  company_code: string;
  dept_code?: string;
  dc_code?: string;
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
};

function emptyLine(): Line {
  return { company_code: '', material_code: '', material_desc: '', uom_code: '', pack_size: '' };
}

export function ManualEntryPage() {
  const [anchorMonth, setAnchorMonth] = useState<string>('');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function updateLine(idx: number, key: keyof Line, value: string) {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [key]: value } : l));
  }

  function updateNum(idx: number, key: keyof Line, value: string) {
    const num = value === '' ? undefined : Number(value);
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [key]: num } : l));
  }

  async function submit() {
    setMessage(null);
    if (!anchorMonth) { setMessage('Please select anchor month'); return; }
    if (lines.some(l => !l.company_code || !l.material_code)) { setMessage('company_code and material_code are required'); return; }
    setSubmitting(true);
    try {
      const res = await ingestApi.manual({ anchorMonth, lines });
      setMessage(`Submitted. runId=${res.runId}`);
      setLines([emptyLine()]);
    } catch (e: any) {
      setMessage(e.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="card p-6 space-y-4">
        <h1 className="text-2xl font-bold">Manual Entry</h1>
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
      </section>

      <section className="card p-4 overflow-auto">
        <div className="min-w-[1100px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-neutral-200 dark:border-neutral-800">
                {['company_code','dept_code','dc_code','material_code','material_desc','pack_size','uom_code','n-2','n-1','n','n+1','n+2','n+3','price'].map(h => (
                  <th key={h} className="py-2 pr-4 font-semibold text-neutral-700 dark:text-neutral-300">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((r, i) => (
                <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800/60 hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40">
                  <td className="py-1 pr-4"><input className="input px-2 py-1" value={r.company_code} onChange={e=>updateLine(i,'company_code',e.target.value)} /></td>
                  <td className="py-1 pr-4"><input className="input px-2 py-1" value={r.dept_code||''} onChange={e=>updateLine(i,'dept_code',e.target.value)} /></td>
                  <td className="py-1 pr-4"><input className="input px-2 py-1" value={r.dc_code||''} onChange={e=>updateLine(i,'dc_code',e.target.value)} /></td>
                  <td className="py-1 pr-4"><input className="input px-2 py-1" value={r.material_code} onChange={e=>updateLine(i,'material_code',e.target.value)} /></td>
                  <td className="py-1 pr-4"><input className="input px-2 py-1" value={r.material_desc||''} onChange={e=>updateLine(i,'material_desc',e.target.value)} /></td>
                  <td className="py-1 pr-4"><input className="input px-2 py-1" value={r.pack_size||''} onChange={e=>updateLine(i,'pack_size',e.target.value)} /></td>
                  <td className="py-1 pr-4"><input className="input px-2 py-1" value={r.uom_code||''} onChange={e=>updateLine(i,'uom_code',e.target.value)} /></td>
                  <td className="py-1 pr-4"><input className="input px-2 py-1" type="number" value={r.n_2 ?? ''} onChange={e=>updateNum(i,'n_2',e.target.value)} /></td>
                  <td className="py-1 pr-4"><input className="input px-2 py-1" type="number" value={r.n_1 ?? ''} onChange={e=>updateNum(i,'n_1',e.target.value)} /></td>
                  <td className="py-1 pr-4"><input className="input px-2 py-1" type="number" value={r.n ?? ''} onChange={e=>updateNum(i,'n',e.target.value)} /></td>
                  <td className="py-1 pr-4"><input className="input px-2 py-1" type="number" value={r.n1 ?? ''} onChange={e=>updateNum(i,'n1',e.target.value)} /></td>
                  <td className="py-1 pr-4"><input className="input px-2 py-1" type="number" value={r.n2 ?? ''} onChange={e=>updateNum(i,'n2',e.target.value)} /></td>
                  <td className="py-1 pr-4"><input className="input px-2 py-1" type="number" value={r.n3 ?? ''} onChange={e=>updateNum(i,'n3',e.target.value)} /></td>
                  <td className="py-1 pr-4"><input className="input px-2 py-1" type="number" value={r.price ?? ''} onChange={e=>updateNum(i,'price',e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex gap-3">
        <button className="btn-primary" disabled={submitting} onClick={submit}>Submit</button>
        <button className="px-4 py-2 rounded-lg border" onClick={()=>setLines([emptyLine()])}>Reset</button>
      </div>
    </div>
  );
}


