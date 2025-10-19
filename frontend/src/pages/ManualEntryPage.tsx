import { useEffect, useMemo, useState } from 'react';
import { ingestApi, dimApi } from '../services/api';
import ComboInput from '@/components/ComboInput';

type Line = {
  company_code: string;
  dept_code: string;
  dc_code: string;
  division?: string;
  sales_organization?: string;
  sales_office?: string;
  sales_group?: string;
  sales_representative?: string;
  material_code: string;
  material_desc?: string;
  pack_size?: string;
  uom_code: string;
  n_2?: number; n_1?: number; n?: number; n1?: number; n2?: number; n3?: number;
  price?: number;
};

type SelectOption = { code: string; label: string; searchValues: string[] };
type MaterialOption = SelectOption & { desc?: string; packSize?: string; uom?: string };

function emptyLine(): Line {
  return {
    company_code: '',
    dept_code: '',
    dc_code: '',
    material_code: '',
    material_desc: '',
    pack_size: '',
    uom_code: ''
  };
}

export function ManualEntryPage() {
  const [anchorMonth, setAnchorMonth] = useState<string>('');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [companies, setCompanies] = useState<SelectOption[]>([]);
  const [departments, setDepartments] = useState<SelectOption[]>([]);
  const [distributionChannels, setDistributionChannels] = useState<SelectOption[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const comboInputClass = 'input px-3 py-2 min-w-[180px]';

  useEffect(() => {
    let cancelled = false;

    const firstAvailable = (source: any, keys: string[]): string | undefined => {
      for (const key of keys) {
        const value = source?.[key];
        if (value !== undefined && value !== null && value !== '') {
          return String(value);
        }
      }
      return undefined;
    };

    const collectSearchValues = (item: any, extraKeys: string[]) => {
      const values = new Set<string>();
      extraKeys.forEach(key => {
        const val = item?.[key];
        if (val !== undefined && val !== null && val !== '') {
          values.add(String(val));
        }
      });
      Object.values(item ?? {}).forEach(val => {
        if (val === undefined || val === null) return;
        if (typeof val === 'string' || typeof val === 'number') {
          values.add(String(val));
        }
      });
      return Array.from(values);
    };

    const buildOptions = (items: any[], codeKeys: string[], labelKeys: string[]): SelectOption[] => {
      const options: SelectOption[] = [];
      items.forEach(item => {
        const code = firstAvailable(item, codeKeys);
        if (!code) return;
        const labelRaw = firstAvailable(item, labelKeys);
        const display = labelRaw && labelRaw !== code ? `${code} - ${labelRaw}` : code;
        options.push({
          code,
          label: display,
          searchValues: collectSearchValues(item, [...codeKeys, ...labelKeys, 'code', 'name', 'description'])
        });
      });
      return options;
    };

    const buildMaterialOptions = (items: any[]): MaterialOption[] => {
      const options: MaterialOption[] = [];
      items.forEach(item => {
        const code = firstAvailable(item, ['material_code', 'materialCode', 'sap_code', 'sapCode', 'code', 'id']);
        if (!code) return;
        const desc = firstAvailable(item, ['material_desc', 'materialDesc', 'description', 'name']);
        const pack = firstAvailable(item, ['pack_size', 'packSize']);
        const uom = firstAvailable(item, ['uom_code', 'uomCode', 'uom']);
        const label = desc ? `${code} - ${desc}` : code;
        options.push({
          code,
          label,
          desc,
          packSize: pack,
          uom,
          searchValues: collectSearchValues(item, [
            'material_code',
            'materialCode',
            'material_desc',
            'materialDesc',
            'description',
            'name',
            'pack_size',
            'packSize',
            'uom_code',
            'uomCode',
            'uom'
          ])
        });
      });
      return options;
    };

    Promise.allSettled([dimApi.companies(), dimApi.depts(), dimApi.distributionChannels(), dimApi.materials()]).then(
      results => {
        if (cancelled) return;
        let failures = 0;
        const [companiesResult, deptsResult, dcsResult, materialsResult] = results;

        if (companiesResult.status === 'fulfilled') {
          setCompanies(
            buildOptions(
              companiesResult.value?.data || [],
              ['company_code', 'companyCode', 'code', 'companyId', 'id'],
              ['company_desc', 'companyDesc', 'company_name', 'companyName', 'description', 'name']
            )
          );
        } else {
          failures += 1;
        }

        if (deptsResult.status === 'fulfilled') {
          setDepartments(
            buildOptions(
              deptsResult.value?.data || [],
              ['dept_code', 'deptCode', 'code', 'department_code', 'departmentCode', 'deptId', 'id'],
              ['dept_desc', 'deptDesc', 'dept_name', 'description', 'name']
            )
          );
        } else {
          failures += 1;
        }

        if (dcsResult.status === 'fulfilled') {
          setDistributionChannels(
            buildOptions(
              dcsResult.value?.data || [],
              ['dc_code', 'dcCode', 'distribution_channel_code', 'distributionChannelCode', 'code', 'id'],
              ['dc_desc', 'dcDesc', 'dc_name', 'description', 'name']
            )
          );
        } else {
          failures += 1;
        }

        if (materialsResult.status === 'fulfilled') {
          setMaterials(buildMaterialOptions(materialsResult.value?.data || []));
        } else {
          failures += 1;
        }

        if (failures > 0) {
          setLookupError(
            'Some master data could not be loaded. You can still type values manually if necessary.'
          );
        } else {
          setLookupError(null);
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const companyOptions = useMemo(
    () => companies.map(option => ({ value: option.code, label: option.label, searchValues: option.searchValues })),
    [companies]
  );
  const departmentOptions = useMemo(
    () => departments.map(option => ({ value: option.code, label: option.label, searchValues: option.searchValues })),
    [departments]
  );
  const distributionOptions = useMemo(
    () =>
      distributionChannels.map(option => ({
        value: option.code,
        label: option.label,
        searchValues: option.searchValues
      })),
    [distributionChannels]
  );
  const materialOptions = useMemo(
    () =>
      materials.map(option => ({
        value: option.code,
        label: option.label,
        searchValues: option.searchValues
      })),
    [materials]
  );

  function handleMaterialChange(idx: number, code: string) {
    setLines(prev =>
      prev.map((line, i) => {
        if (i !== idx) return line;
        const material = materials.find(m => m.code === code);
        const next: Line = { ...line, material_code: code };
        if (material) {
          if (material.desc) next.material_desc = material.desc;
          if (material.packSize) next.pack_size = material.packSize;
          if (material.uom) next.uom_code = material.uom;
        }
        return next;
      })
    );
  }

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
      const payloadLines = lines.map(line => ({
        company_code: line.company_code || '',
        dept_code: line.dept_code ?? '',
        dc_code: line.dc_code ?? '',
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
        price: line.price
      }));
      const res = await ingestApi.manual({ anchorMonth, lines: payloadLines });
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
        {lookupError && <div className="text-sm text-red-600 dark:text-red-400">{lookupError}</div>}
      </section>

      <section className="card p-4 overflow-x-auto">
        <div className="min-w-[1400px]">
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
                  <td className="py-1 pr-4">
                    <ComboInput
                      value={r.company_code}
                      onChange={(val: string) => updateLine(i, 'company_code', val)}
                      options={companyOptions}
                      inputClassName={comboInputClass}
                      historyKey="manual-entry-company"
                    />
                  </td>
                  <td className="py-1 pr-4">
                    <ComboInput
                      value={r.dept_code}
                      onChange={(val: string) => updateLine(i, 'dept_code', val)}
                      options={departmentOptions}
                      inputClassName={comboInputClass}
                      historyKey="manual-entry-dept"
                    />
                  </td>
                  <td className="py-1 pr-4">
                    <ComboInput
                      value={r.dc_code}
                      onChange={(val: string) => updateLine(i, 'dc_code', val)}
                      options={distributionOptions}
                      inputClassName={comboInputClass}
                      historyKey="manual-entry-dc"
                    />
                  </td>
                  <td className="py-1 pr-4">
                    <ComboInput
                      value={r.material_code}
                      onChange={(val: string) => handleMaterialChange(i, val)}
                      options={materialOptions}
                      inputClassName={comboInputClass}
                      historyKey="manual-entry-material"
                    />
                  </td>
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
