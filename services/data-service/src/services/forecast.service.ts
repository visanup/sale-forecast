import { queryUnsafe } from '../db.js';

export async function listForecast(paramsIn: {
  company?: string;
  dept?: string;
  material?: string;
  skuId?: string;
  salesOrgId?: string;
  dc?: string;
  from?: string;
  to?: string;
  run?: string;
}) {
  const { company, dept, material, skuId, salesOrgId, dc, from, to, run } = paramsIn;
  const conditions: string[] = [];
  const params: any[] = [];
  if (company) { params.push(company); conditions.push('c.company_code = $' + params.length); }
  if (dept) { params.push(dept); conditions.push('d.dept_code = $' + params.length); }
  if (material) { params.push(material); conditions.push('mat.material_code = $' + params.length); }
  if (skuId) { params.push(Number(skuId)); conditions.push('f.sku_id = $' + params.length); }
  if (salesOrgId) { params.push(Number(salesOrgId)); conditions.push('f.sales_org_id = $' + params.length); }
  if (dc) { params.push(dc); conditions.push('dc.dc_code = $' + params.length); }
  if (from) { params.push(from + '-01'); conditions.push('f.month_id >= $' + params.length); }
  if (to) { params.push(to + '-01'); conditions.push('f.month_id <= $' + params.length); }
  if (run && run !== 'latest') { params.push(Number(run)); conditions.push('f.run_id = $' + params.length); }

  let runJoin = '';
  if (run === 'latest') {
    runJoin = 'JOIN LATERAL (SELECT run_id FROM forecast_run ORDER BY run_id DESC LIMIT 1) r ON true';
    conditions.push('f.run_id = r.run_id');
  }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const sql = `
    SELECT f.month_id, c.company_code, d.dept_code, mat.material_code,
           f.sku_id, f.sales_org_id, f.dc_id,
           f.forecast_qty, f.unit_price_snapshot, f.revenue_snapshot, f.run_id
    FROM fact_forecast f
    ${runJoin}
    JOIN dim_company c ON c.company_id = f.company_id
    JOIN dim_dept d ON d.dept_id = f.dept_id
    JOIN dim_sku s ON s.sku_id = f.sku_id
    JOIN dim_material mat ON mat.material_id = s.material_id
    JOIN dim_distribution_channel dc ON dc.dc_id = f.dc_id
    ${where}
    ORDER BY f.month_id, c.company_code, mat.material_code
    LIMIT 1000`;
  return await queryUnsafe<any>(sql, params);
}

export async function aggregateForecast(paramsIn: {
  groups: string[];
  metric: 'forecast_qty' | 'revenue_snapshot';
  from: string;
  to: string;
  run?: string;
}) {
  const { groups, metric, from, to, run } = paramsIn;
  const groupCols: Record<string, string> = {
    company: 'c.company_code',
    dept: 'd.dept_code',
    material: 'mat.material_code',
    sku: 'f.sku_id',
    month: 'f.month_id',
    run: 'f.run_id'
  };
  const selected = groups.map(g => groupCols[g]).filter(Boolean);
  if (!selected.length) throw new Error('invalid group');
  const params: any[] = [from + '-01', to + '-01'];
  let runFilter = '';
  if (run && run !== 'latest') { params.push(Number(run)); runFilter = `AND f.run_id = $${params.length}`; }
  if (run === 'latest') { runFilter = `AND f.run_id = (SELECT run_id FROM forecast_run ORDER BY run_id DESC LIMIT 1)`; }
  const sql = `
    SELECT ${selected.join(', ')}, SUM(${metric}) AS value
    FROM fact_forecast f
    JOIN dim_company c ON c.company_id = f.company_id
    JOIN dim_dept d ON d.dept_id = f.dept_id
    JOIN dim_sku s ON s.sku_id = f.sku_id
    JOIN dim_material mat ON mat.material_id = s.material_id
    WHERE f.month_id BETWEEN $1 AND $2 ${runFilter}
    GROUP BY ${selected.join(', ')}
    ORDER BY ${selected.join(', ')}`;
  return await queryUnsafe<any>(sql, params);
}

