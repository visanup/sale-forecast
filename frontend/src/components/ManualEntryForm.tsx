import { useCallback, useEffect, useMemo, useState } from 'react';
import { ingestApi } from '../services/api';
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
  distributionChannels?: string;
};

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

export function ManualEntryForm() {
  const [anchorMonth, setAnchorMonth] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [companyCache, setCompanyCache] = useState<Map<string, DimCompany>>(() => new Map());
  const [deptCache, setDeptCache] = useState<Map<string, DimDept>>(() => new Map());
  const [dcCache, setDcCache] = useState<Map<string, DimDistributionChannel>>(() => new Map());
  const [materialCache, setMaterialCache] = useState<Map<string, DimMaterial>>(() => new Map());
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
        console.error('Failed to fetch companies', error);
        return [];
      }
    },
    [mergeCompanyCache, toCompanyOption]
  );

  const searchDepts = useCallback(
    async (query: string) => {
      try {
        const items = await DimSource.fetchDepts({ search: query || undefined, limit: 25 });
        mergeDeptCache(items);
        return items.map(toDeptOption);
      } catch (error) {
        console.error('Failed to fetch departments', error);
        return [];
      }
    },
    [mergeDeptCache, toDeptOption]
  );

  const searchDistributionChannels = useCallback(
    async (query: string) => {
      try {
        const items = await DimSource.fetchDistributionChannels({ search: query || undefined, limit: 25 });
        mergeDcCache(items);
        return items.map(toDcOption);
      } catch (error) {
        console.error('Failed to fetch distribution channels', error);
        return [];
      }
    },
    [mergeDcCache, toDcOption]
  );

  const searchMaterials = useCallback(
    async (query: string) => {
      try {
        const items = await DimSource.fetchMaterials({ search: query || undefined, limit: 25 });
        mergeMaterialCache(items);
        return items.map(toMaterialOption);
      } catch (error) {
        console.error('Failed to fetch materials', error);
        return [];
      }
    },
    [mergeMaterialCache, toMaterialOption]
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
        console.error('Failed to preload dimension data', error);
      }
    };
    if (active) {
      preload();
    }
    return () => {
      active = false;
    };
  }, [searchCompanies, searchDepts, searchDistributionChannels, searchMaterials]);

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

  const handleMaterialOptionSelect = useCallback(
    (rowIndex: number, option: ComboOption<DimMaterial>) => {
      const material = option.data;
      if (!material) return;
      setLines(prev =>
        prev.map((line, idx) => {
          if (idx !== rowIndex) return line;
          const next: Line = { ...line, material_code: material.code };
          if (material.description) {
            next.material_desc = material.description;
          }
          if (material.packSize) {
            next.pack_size = material.packSize;
          }
          if (material.uom) {
            next.uom_code = material.uom;
          }
          return next;
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
        key: 'company_code',
        label: 'บริษัท',
        type: 'combo',
        options: companyOptions,
        onSearch: searchCompanies,
        historyKey: 'manual:company',
        placeholder: 'เลือกบริษัท'
      },
      {
        key: 'dc_code',
        label: 'Distribution Channel',
        type: 'combo',
        options: dcOptions,
        onSearch: searchDistributionChannels,
        historyKey: 'manual:dc',
        placeholder: 'ค้นหา Channel'
      },
      {
        key: 'material_code',
        label: 'SAP Code',
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
      { key: 'n_2', label: 'n-2', type: 'number' },
      { key: 'n_1', label: 'n-1', type: 'number' },
      { key: 'n', label: 'n', type: 'number' },
      { key: 'n1', label: 'n+1', type: 'number' },
      { key: 'n2', label: 'n+2', type: 'number' },
      { key: 'n3', label: 'n+3', type: 'number' },
      { key: 'price', label: 'Price', type: 'number' },
      { key: 'division', label: 'division' },
      { key: 'sales_organization', label: 'sales_organization' },
      { key: 'sales_office', label: 'sales_office' },
      { key: 'sales_group', label: 'sales_group' },
      { key: 'sales_representative', label: 'sales_representative' },
      { key: 'distributionChannels', label: 'distributionChannels' },
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
      handleMaterialOptionSelect
    ]
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
                      ) : isComboColumn(c) ? (
                        <ComboInput
                          value={(r as any)[c.key] || ''}
                          onChange={value => updateLine(i, c.key, value)}
                          options={c.options}
                          onSearch={c.onSearch}
                          historyKey={c.historyKey}
                          placeholder={c.placeholder}
                          onSelectOption={option => c.onSelectOption?.(i, option)}
                        />
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
