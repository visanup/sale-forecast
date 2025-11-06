import { useEffect, useMemo, useState } from 'react';
import { Building2, BriefcaseBusiness, Network, PackageSearch, Globe2, Gauge, Sparkle } from 'lucide-react';
import { dimApi } from '../services/api';

type SectionKey =
  | 'companies'
  | 'depts'
  | 'distributionChannels'
  | 'materials'
  | 'salesOrgs'
  | 'skus'
  | 'uoms';

type MasterRow = Record<string, string>;

type SectionConfig = {
  key: SectionKey;
  title: string;
  description: string;
  accentFrom: string;
  accentTo: string;
  icon: React.ElementType;
  columns: Array<{ key: string; label: string; align?: 'left' | 'right' }>;
};

type MasterDataState = Record<Exclude<SectionKey, 'uoms'>, MasterRow[]>;

const SECTION_CONFIGS: SectionConfig[] = [
  {
    key: 'companies',
    title: 'Company Directory',
    description: 'รายชื่อบริษัทลูกค้าในระบบ',
    accentFrom: 'from-emerald-500',
    accentTo: 'to-lime-500',
    icon: Building2,
    columns: [
      { key: 'code', label: 'Company Code' },
      { key: 'name', label: 'Description' }
    ]
  },
  {
    key: 'depts',
    title: 'Department Master',
    description: 'กลุ่มหน่วยงานที่เกี่ยวข้อง',
    accentFrom: 'from-sky-500',
    accentTo: 'to-indigo-500',
    icon: BriefcaseBusiness,
    columns: [{ key: 'code', label: 'Department Code' }]
  },
  {
    key: 'distributionChannels',
    title: 'Distribution Channels',
    description: 'ช่องทางจัดจำหน่ายแต่ละประเภท',
    accentFrom: 'from-violet-500',
    accentTo: 'to-fuchsia-500',
    icon: Network,
    columns: [
      { key: 'code', label: 'Channel Code' },
      { key: 'name', label: 'Description' }
    ]
  },
  {
    key: 'materials',
    title: 'Material Catalog',
    description: 'รายการวัตถุดิบ/สินค้า (รวม Pack Size และ UOM จาก SKU)',
    accentFrom: 'from-amber-500',
    accentTo: 'to-rose-500',
    icon: PackageSearch,
    columns: [
      { key: 'code', label: 'Material Code' },
      { key: 'name', label: 'Description' },
      { key: 'pack', label: 'Pack Size' },
      { key: 'uom', label: 'UOM' }
    ]
  },
  {
    key: 'salesOrgs',
    title: 'Sales Organization',
    description: 'Division / Sales Org / Sales Office',
    accentFrom: 'from-blue-500',
    accentTo: 'to-cyan-500',
    icon: Globe2,
    columns: [
      { key: 'division', label: 'Division' },
      { key: 'org', label: 'Sales Org' },
      { key: 'office', label: 'Sales Office' },
      { key: 'group', label: 'Sales Group' },
      { key: 'rep', label: 'Sales Representative' }
    ]
  },
  // Note: SKU table will be merged into Material Catalog view
  {
    key: 'uoms',
    title: 'Unit of Measure',
    description: 'หน่วยนับตามตาราง dim_uom',
    accentFrom: 'from-slate-500',
    accentTo: 'to-slate-700',
    icon: Gauge,
    columns: [
      { key: 'uom', label: 'UOM Code' },
      { key: 'usage', label: 'Used In' }
    ]
  }
];

const MASTER_LIMIT = 50;

export function MasterDataShowcase() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [rows, setRows] = useState<MasterDataState>({
    companies: [],
    depts: [],
    distributionChannels: [],
    materials: [],
    salesOrgs: [],
    skus: []
  });

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    async function fetchMasterData() {
      try {
        const [{ data: companies = [] } = {} as any, { data: depts = [] } = {} as any, { data: dcs = [] } = {} as any, { data: materials = [] } = {} as any, { data: salesOrgs = [] } = {} as any, { data: skus = [] } = {} as any] =
          await Promise.all([
            dimApi.companies({ limit: MASTER_LIMIT, signal: controller.signal }),
            dimApi.depts({ limit: MASTER_LIMIT, signal: controller.signal }),
            dimApi.distributionChannels({ limit: MASTER_LIMIT, signal: controller.signal }),
            dimApi.materials({ limit: MASTER_LIMIT, signal: controller.signal }),
            dimApi.salesOrgs({ limit: MASTER_LIMIT, signal: controller.signal }),
            dimApi.skus({ limit: MASTER_LIMIT, signal: controller.signal })
          ]);

        const nextRows: MasterDataState = {
          companies: companies.map((item: any) => ({
            code: item?.companyCode ?? item?.company_code ?? item?.code ?? '-',
            name: item?.companyDesc ?? item?.company_desc ?? item?.name ?? '—'
          })),
          depts: depts.map((item: any) => ({
            code: item?.deptCode ?? item?.dept_code ?? item?.code ?? '-'
          })),
          distributionChannels: dcs.map((item: any) => ({
            code: item?.dcCode ?? item?.dc_code ?? item?.code ?? '-',
            name: item?.dcDesc ?? item?.dc_desc ?? item?.description ?? '—'
          })),
          materials: materials.map((item: any) => ({
            code: item?.materialCode ?? item?.material_code ?? item?.code ?? '-',
            name: item?.materialDesc ?? item?.material_desc ?? item?.description ?? '—',
            pack: item?.packSize ?? item?.pack_size ?? '—',
            uom: item?.uom ?? item?.uomCode ?? item?.uom_code ?? '—'
          })),
          salesOrgs: salesOrgs.map((item: any) => ({
            division: item?.division ?? '—',
            org: item?.salesOrganization ?? item?.sales_organization ?? '—',
            office: item?.salesOffice ?? item?.sales_office ?? '—',
            group: item?.salesGroup ?? item?.sales_group ?? '—',
            rep: item?.salesRepresentative ?? item?.sales_representative ?? '—'
          })),
          skus: skus.map((item: any) => ({
            sku: item?.skuId ?? item?.sku_id ?? '-',
            material: item?.materialCode ?? item?.material_code ?? '-',
            pack: item?.packSize ?? item?.pack_size ?? '—',
            uom: item?.uomCode ?? item?.uom_code ?? '—'
          }))
        };

        setRows(nextRows);
      } catch (fetchError: any) {
        if (fetchError?.name === 'AbortError') return;
        setError(fetchError?.message || 'ไม่สามารถดึงข้อมูล Master Data ได้');
      } finally {
        setLoading(false);
      }
    }

    fetchMasterData();

    return () => controller.abort();
  }, []);

  // Merge Material table with SKU details (by material code)
  const mergedMaterialRows: MasterRow[] = useMemo(() => {
    if (!rows.materials.length) return rows.materials;
    const byMaterial = new Map<string, { packs: Set<string>; uoms: Set<string> }>();
    for (const sku of rows.skus) {
      const materialCode = (sku.material || '').toString().trim();
      if (!materialCode) continue;
      const cur = byMaterial.get(materialCode) || { packs: new Set<string>(), uoms: new Set<string>() };
      if (sku.pack && sku.pack !== '—') cur.packs.add(String(sku.pack));
      if (sku.uom && sku.uom !== '—') cur.uoms.add(String(sku.uom));
      byMaterial.set(materialCode, cur);
    }
    return rows.materials.map((mat) => {
      const info = byMaterial.get(mat.code) || { packs: new Set<string>(), uoms: new Set<string>() };
      const packFromSku = info.packs.size ? Array.from(info.packs).join(', ') : '—';
      const uomFromSku = info.uoms.size ? Array.from(info.uoms).join(', ') : '—';
      const pack = mat.pack && mat.pack !== '—' ? mat.pack : packFromSku;
      const uom = mat.uom && mat.uom !== '—' ? mat.uom : uomFromSku;
      return { ...mat, pack, uom } as MasterRow;
    });
  }, [rows.materials, rows.skus]);

  const uomRows: MasterRow[] = useMemo(() => {
    const usage = new Map<string, number>();
    rows.skus.forEach((sku) => {
      const code = sku.uom?.trim() || '—';
      usage.set(code, (usage.get(code) ?? 0) + 1);
    });
    return Array.from(usage.entries())
      .map(([uom, count]) => ({
        uom,
        usage: count === 1 ? '1 SKU' : `${count} SKUs`
      }))
      .sort((a, b) => b.uom.localeCompare(a.uom));
  }, [rows.skus]);

  const totals = useMemo(
    () => ({
      companies: rows.companies.length,
      depts: rows.depts.length,
      distributionChannels: rows.distributionChannels.length,
      materials: rows.materials.length,
      salesOrgs: rows.salesOrgs.length,
      skus: rows.skus.length,
      uoms: uomRows.length
    }),
    [rows, uomRows]
  );

  const filterText = filter.trim().toLowerCase();

  function applyFilter(data: MasterRow[]): MasterRow[] {
    if (!filterText) return data;
    return data.filter((row) =>
      Object.values(row)
        .filter((value): value is string => typeof value === 'string')
        .some((value) => value.toLowerCase().includes(filterText))
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50/80 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:border-brand-900/40 dark:bg-brand-900/20 dark:text-brand-200">
            <Sparkle className="h-4 w-4" />
            Master Data Overview
          </div>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
            Premium Master Data Display
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            สำรวจข้อมูลสำคัญจากระบบ Demand Forecasting ครอบคลุมทุกมิติ ทั้งบริษัท หน่วยงาน ช่องทางจำหน่าย
            วัตถุดิบ SKU และหน่วยนับ
          </p>
        </div>
        <div className="flex w-full max-w-sm items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:ring-brand-500">
          <input
            type="text"
            className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none dark:text-slate-200 dark:placeholder:text-slate-500"
            placeholder="ค้นหาโค้ดหรือคำอธิบาย เช่น 1001, Frozen, DC01"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SECTION_CONFIGS.filter((s) => s.key !== 'skus').map((section) => (
          <div
            key={section.key}
            className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-lg backdrop-blur-md dark:border-slate-700/40 dark:bg-slate-900/80"
          >
            <div
              className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r ${section.accentFrom} ${section.accentTo} px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white`}
            >
              <section.icon className="h-4 w-4" />
              {section.title.split(' ')[0]}
            </div>
            <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">
              {totals[section.key as keyof typeof totals].toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{section.description}</p>
          </div>
        ))}
      </div>

      {loading && (
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-3xl border border-slate-200 bg-white/60 shadow-inner dark:border-slate-800 dark:bg-slate-900/50"
            ></div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 px-6 py-4 text-sm text-red-700 shadow-inner dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-8 lg:grid-cols-2">
          {SECTION_CONFIGS.filter((s) => s.key !== 'skus').map((section) => {
            const sourceRows =
              section.key === 'uoms'
                ? uomRows
                : section.key === 'materials'
                ? mergedMaterialRows
                : rows[section.key as Exclude<SectionKey, 'uoms'>] ?? [];
            const data = applyFilter(sourceRows);

            return (
              <div
                key={section.key}
                className="overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-2xl backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/85"
              >
                <div
                  className={`flex items-center gap-4 border-b border-white/20 bg-gradient-to-r ${section.accentFrom} ${section.accentTo} px-6 py-4 text-white dark:border-slate-800/40`}
                >
                  <section.icon className="h-6 w-6" />
                  <div>
                    <h3 className="text-lg font-semibold">{section.title}</h3>
                    <p className="text-xs text-white/80">{section.description}</p>
                  </div>
                </div>
                <div className="max-h-80 overflow-auto p-6">
                  {data.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">ไม่มีข้อมูลที่ตรงกับคำค้นหา</p>
                  ) : (
                    <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                      <thead>
                        <tr>
                          {section.columns.map((column) => (
                            <th
                              key={column.key}
                              className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 ${
                                column.align === 'right' ? 'text-right' : 'text-left'
                              }`}
                            >
                              {column.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {data.slice(0, MASTER_LIMIT).map((row, rowIndex) => (
                          <tr key={`${section.key}-${rowIndex}`} className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            {section.columns.map((column) => (
                              <td
                                key={column.key}
                                className={`px-3 py-2 text-slate-700 dark:text-slate-200 ${
                                  column.align === 'right' ? 'text-right' : 'text-left'
                                }`}
                              >
                                {row[column.key] ?? '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
