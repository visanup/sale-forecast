import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function upsertDimensions(input: any) {
  // Upsert minimal dims used by a single line (company, dept, dc, material/uom/sku, sales_org)
  const company = await prisma.dim_company.upsert({
    where: { company_code: input.company_code },
    update: { company_desc: input.company_desc },
    create: { company_code: input.company_code, company_desc: input.company_desc }
  });
  const dept = await prisma.dim_dept.upsert({
    where: { dept_code: input.dept_code },
    update: {},
    create: { dept_code: input.dept_code }
  });
  const dc = await prisma.dim_distribution_channel.upsert({
    where: { dc_code: input.dc_code },
    update: { dc_desc: input.dc_desc },
    create: { dc_code: input.dc_code, dc_desc: input.dc_desc }
  });
  const uom = await prisma.dim_uom.upsert({
    where: { uom_code: input.uom_code },
    update: {},
    create: { uom_code: input.uom_code }
  });
  const material = await prisma.dim_material.upsert({
    where: { material_code: input.material_code },
    update: { material_desc: input.material_desc },
    create: { material_code: input.material_code, material_desc: input.material_desc }
  });
  const sku = await prisma.dim_sku.upsert({
    where: { material_id_pack_size_uom_id: { material_id: material.material_id, pack_size: input.pack_size, uom_id: uom.uom_id } },
    update: {},
    create: { material_id: material.material_id, pack_size: input.pack_size, uom_id: uom.uom_id }
  });
  const salesOrg = await prisma.dim_sales_org.upsert({
    where: {
      division_sales_organization_sales_office_sales_group_sales_representative: {
        division: input.division || null,
        sales_organization: input.sales_organization || null,
        sales_office: input.sales_office || null,
        sales_group: input.sales_group || null,
        sales_representative: input.sales_representative || null
      }
    },
    update: {},
    create: {
      division: input.division || null,
      sales_organization: input.sales_organization || null,
      sales_office: input.sales_office || null,
      sales_group: input.sales_group || null,
      sales_representative: input.sales_representative || null
    }
  });

  return { company, dept, dc, uom, material, sku, salesOrg };
}

export async function createRun(anchorMonth: string, method: string, notes?: string) {
  // Schema currently only supports anchor_month + created_at; keep method/notes for future extension.
  const run = await prisma.forecast_run.create({
    data: {
      anchor_month: new Date(anchorMonth + '-01')
    }
  });
  return run;
}

export function monthOffset(base: string, offset: number): Date {
  const [y, m] = base.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + offset, 1));
  return d;
}

export async function insertForecastRows(runId: bigint, line: any, dim: any, anchorMonth: string) {
  const rows: any[] = [];
  for (const it of line.months) {
    const month = new Date(it.month + '-01');
    rows.push({
      run_id: runId,
      company_id: dim.company.company_id,
      dept_id: dim.dept.dept_id,
      sku_id: dim.sku.sku_id,
      sales_org_id: dim.salesOrg.sales_org_id,
      dc_id: dim.dc.dc_id,
      month_id: month,
      forecast_qty: it.qty,
      unit_price_snapshot: it.price ?? null,
      revenue_snapshot: it.price ? it.price * it.qty : null
    });
  }
  if (rows.length) {
    // Bulk insert via createMany; for upsert-on-conflict use $executeRaw with ON CONFLICT
    await prisma.fact_forecast.createMany({ data: rows, skipDuplicates: true });
  }
}

