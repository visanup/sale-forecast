import { PrismaClient, Prisma } from '@prisma/client';
import type { RequestActor } from '../utils/requestActor.js';
import { withActorMetadata } from '../utils/requestActor.js';
import { writeAuditLog } from './audit.service.js';

export const prisma = new PrismaClient();

type SalesForecastHistorySource = 'upload' | 'manual';

function toAnchorDate(anchorMonth: string) {
  return new Date(`${anchorMonth}-01T00:00:00.000Z`);
}

function pickForecastQuantity(anchorMonth: string, months: Array<{ month: string; qty: number }>) {
  const anchorEntry = months.find((m) => m.month === anchorMonth);
  if (anchorEntry && Number.isFinite(anchorEntry.qty)) {
    return Number(anchorEntry.qty);
  }
  const fallback = months.reduce((total, entry) => {
    if (!Number.isFinite(entry.qty)) return total;
    return total + Number(entry.qty);
  }, 0);
  return Number.isFinite(fallback) ? fallback : 0;
}

async function recordSalesForecastHistory(params: {
  anchorMonth: string;
  line: any;
  dim: Awaited<ReturnType<typeof upsertDimensions>>;
  runId: bigint;
  source: SalesForecastHistorySource;
  factRowsInserted: number;
  actor?: RequestActor;
}) {
  const { anchorMonth, line, dim, runId, source, factRowsInserted, actor } = params;
  if (!line?.months || line.months.length === 0) return;

  try {
    const months = line.months.map((entry: any) => {
      const base: { month: string; qty: number; price?: number } = {
        month: entry.month,
        qty: Number(entry.qty)
      };
      if (entry.price !== undefined && Number.isFinite(entry.price)) {
        base.price = Number(entry.price);
      }
      return base;
    });

    const forecastQty = pickForecastQuantity(anchorMonth, months);

    const companyDesc = line.company_desc ?? dim.company?.company_desc ?? null;
    const materialDesc = line.material_desc ?? dim.material?.material_desc ?? null;

    const metadata: Prisma.InputJsonValue = {
      version: 1,
      source,
      run_id: runId?.toString(),
      months,
      dept_code: line.dept_code ?? dim.dept?.dept_code ?? null,
      dc_code: line.dc_code ?? dim.dc?.dc_code ?? null,
      division: line.division ?? null,
      sales_organization: line.sales_organization ?? null,
      sales_office: line.sales_office ?? null,
      sales_group: line.sales_group ?? null,
      sales_representative: line.sales_representative ?? null,
      pack_size: line.pack_size ?? null,
      uom_code: line.uom_code ?? null,
      fact_rows_inserted: factRowsInserted,
      dim_ids: {
        company_id: dim.company?.company_id?.toString(),
        dept_id: dim.dept?.dept_id?.toString(),
        sku_id: dim.sku?.sku_id?.toString(),
        sales_org_id: dim.salesOrg?.sales_org_id?.toString(),
        dc_id: dim.dc?.dc_id?.toString()
      }
    };

    const record = await prisma.saleforecast.create({
      data: {
        anchor_month: toAnchorDate(anchorMonth),
        company_code: line.company_code ?? null,
        company_desc: companyDesc,
        material_code: line.material_code ?? null,
        material_desc: materialDesc,
        forecast_qty: new Prisma.Decimal(Number.isFinite(forecastQty) ? forecastQty : 0),
        metadata
      }
    });

    const baseAuditMetadata: Prisma.InputJsonObject = {
      anchorMonth,
      runId: runId.toString(),
      source,
      company_code: line.company_code ?? null,
      material_code: line.material_code ?? null,
      factRowsInserted: factRowsInserted
    };

    const auditMetadata = withActorMetadata(baseAuditMetadata, actor ?? { performedBy: null, clientId: null });

    await writeAuditLog({
      service: 'ingest-service',
      endpoint: source === 'upload' ? '/v1/upload' : '/v1/manual',
      action: 'INSERT',
      recordId: record.id.toString(),
      performedBy: actor?.performedBy ?? null,
      userId: actor?.user?.id ?? null,
      userEmail: actor?.user?.email ?? null,
      userUsername: actor?.user?.username ?? null,
      clientId: actor?.clientId ?? null,
      metadata: auditMetadata
    });
  } catch (error) {
    console.error('record_sales_forecast_history_failed', {
      anchorMonth,
      company_code: line?.company_code,
      material_code: line?.material_code,
      error
    });
  }
}

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

export async function insertForecastRows(runId: bigint, line: any, dim: any, anchorMonth: string): Promise<number> {
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
    const result = await prisma.fact_forecast.createMany({ data: rows, skipDuplicates: true });
    return result.count;
  }
  return 0;
}

export async function writeSalesForecastHistory(params: {
  anchorMonth: string;
  line: any;
  dim: Awaited<ReturnType<typeof upsertDimensions>>;
  runId: bigint;
  source: SalesForecastHistorySource;
  factRowsInserted: number;
  actor?: RequestActor;
}) {
  await recordSalesForecastHistory(params);
}
