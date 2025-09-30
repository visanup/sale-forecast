import { useState } from 'react';
import { ingestApi, dimApi } from '../services/api';
import { useEffect } from 'react';

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

function emptyLine(): Line { return { company_code: '', material_code: '', material_desc: '', uom_code: '', pack_size: '' }; }

export function ManualEntryForm() {
  const [anchorMonth, setAnchorMonth] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [dcs, setDcs] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);

  useEffect(() => {
    // prefetch master lists; in real world add pagination/search
    Promise.all([
      dimApi.companies().catch(()=>({ data: [] })),
      dimApi.depts().catch(()=>({ data: [] })),
      dimApi.distributionChannels().catch(()=>({ data: [] })),
      dimApi.materials().catch(()=>({ data: [] }))
    ]).then(([c,d,dc,m]) => {
      setCompanies(c.data || []);
      setDepts(d.data || []);
      setDcs(dc.data || []);
      setMaterials(m.data || []);
    });
  }, []);
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

  const columns: { key: keyof Line | 'n-2' | 'n-1' | 'n+1' | 'n+2' | 'n+3'; label: string; type?: 'text' | 'number' | 'select'; options?: any[]; optionLabel?: (o:any)=>string; optionValue?: (o:any)=>string }[] = [
    { key: 'dept_code', label: 'หน่วยงาน', type: 'select', options: depts, optionLabel: (o)=>o.dept_name || o.dept_code, optionValue: (o)=>o.dept_code },
    { key: 'company_code', label: 'บริษัท', type: 'select', options: companies, optionLabel: (o)=>o.company_name || o.company_code, optionValue: (o)=>o.company_code },
    { key: 'dc_code', label: 'Distribution Channel', type: 'select', options: dcs, optionLabel: (o)=>o.dc_name || o.dc_code, optionValue: (o)=>o.dc_code },
    { key: 'material_code', label: 'SAP Code', type: 'select', options: materials, optionLabel: (o)=>`${o.material_code} - ${o.material_desc || ''}`.trim(), optionValue: (o)=>o.material_code },
    { key: 'material_desc', label: 'ชื่อสินค้า' },
    { key: 'pack_size', label: 'Pack Size' },
    { key: 'uom_code', label: 'หน่วย' },
    { key: 'n_2', label: 'n-2', type: 'number' },
    { key: 'n_1', label: 'n-1', type: 'number' },
    { key: 'n', label: 'n', type: 'number' },
    { key: 'n1', label: 'n+1', type: 'number' },
    { key: 'n2', label: 'n+2', type: 'number' },
    { key: 'n3', label: 'n+3', type: 'number' },
    { key: 'price', label: 'Price', type: 'number' }
  ];

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

      <div className="overflow-auto card p-4">
        <div className="min-w-[1100px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-neutral-200 dark:border-neutral-800">
                {columns.map(c => (
                  <th key={String(c.key)} className="py-2 pr-4 font-semibold text-neutral-700 dark:text-neutral-300">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((r, i) => (
                <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800/60 hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40">
                  {columns.map(c => (
                    <td key={String(c.key)} className="py-1 pr-4">
                      {c.type === 'number' ? (
                        <input className="input px-2 py-1" type="number" value={
                          c.key === 'n_2' ? (r.n_2 ?? '') :
                          c.key === 'n_1' ? (r.n_1 ?? '') :
                          c.key === 'n' ? (r.n ?? '') :
                          c.key === 'n1' ? (r.n1 ?? '') :
                          c.key === 'n2' ? (r.n2 ?? '') :
                          c.key === 'n3' ? (r.n3 ?? '') :
                          c.key === 'price' ? (r.price ?? '') : ''
                        } onChange={e=>
                          c.key === 'n_2' ? updateNum(i,'n_2',e.target.value) :
                          c.key === 'n_1' ? updateNum(i,'n_1',e.target.value) :
                          c.key === 'n' ? updateNum(i,'n',e.target.value) :
                          c.key === 'n1' ? updateNum(i,'n1',e.target.value) :
                          c.key === 'n2' ? updateNum(i,'n2',e.target.value) :
                          c.key === 'n3' ? updateNum(i,'n3',e.target.value) :
                          updateNum(i,'price',e.target.value)
                        } />
                      ) : c.type === 'select' ? (
                        <select className="input px-2 py-1" value={(r as any)[c.key] || ''} onChange={e=>updateLine(i, c.key as keyof Line, e.target.value)}>
                          <option value="">- Select -</option>
                          {(c.options||[]).map((o,idx)=> (
                            <option key={idx} value={c.optionValue? c.optionValue(o): (o.value ?? o.code)}>{c.optionLabel? c.optionLabel(o): (o.label ?? o.name)}</option>
                          ))}
                        </select>
                      ) : (
                        <input className="input px-2 py-1" value={(r as any)[c.key] || ''} onChange={e=>updateLine(i, c.key as keyof Line, e.target.value)} />
                      )}
                    </td>
                  ))}
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


