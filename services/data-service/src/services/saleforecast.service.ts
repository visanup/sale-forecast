import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';

type SalesForecastFilters = {
  anchor_month: string;
  company_code?: string;
  company_desc?: string;
  material_code?: string;
  material_desc?: string;
};

type SalesForecastPayload = {
  anchor_month?: string;
  company_code?: string | null;
  company_desc?: string | null;
  material_code?: string | null;
  material_desc?: string | null;
  forecast_qty?: number;
  metadata?: Prisma.InputJsonValue | null;
};

function anchorMonthToDate(anchorMonth: string) {
  return new Date(`${anchorMonth}-01T00:00:00.000Z`);
}

function serializeForecast(record: any) {
  const forecastQty = record.forecast_qty
    ? Number(record.forecast_qty.toString())
    : null;
  return {
    id: record.id.toString(),
    anchor_month: record.anchor_month.toISOString().slice(0, 7),
    company_code: record.company_code,
    company_desc: record.company_desc,
    material_code: record.material_code,
    material_desc: record.material_desc,
    forecast_qty: forecastQty,
    metadata: record.metadata,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString()
  };
}

export async function listSalesForecast(filters: SalesForecastFilters) {
  const where: Record<string, unknown> = {
    anchor_month: anchorMonthToDate(filters.anchor_month)
  };

  if (filters.company_code) where['company_code'] = filters.company_code;
  if (filters.company_desc) where['company_desc'] = filters.company_desc;
  if (filters.material_code) where['material_code'] = filters.material_code;
  if (filters.material_desc) where['material_desc'] = filters.material_desc;

  const records = await prisma.saleforecast.findMany({
    where,
    orderBy: [
      { company_code: 'asc' },
      { material_code: 'asc' },
      { id: 'asc' }
    ],
    take: 1000
  });

  return records.map(serializeForecast);
}

export async function createSalesForecast(payload: SalesForecastPayload) {
  if (!payload.anchor_month) throw new Error('anchor_month is required');
  if (typeof payload.forecast_qty !== 'number') throw new Error('forecast_qty is required');

  const metadataValue =
    payload.metadata === undefined
      ? undefined
      : payload.metadata === null
        ? Prisma.JsonNull
        : payload.metadata;
  const record = await prisma.saleforecast.create({
    data: {
      anchor_month: anchorMonthToDate(payload.anchor_month),
      company_code: payload.company_code || null,
      company_desc: payload.company_desc || null,
      material_code: payload.material_code || null,
      material_desc: payload.material_desc || null,
      forecast_qty: new Prisma.Decimal(payload.forecast_qty),
      metadata: metadataValue
    }
  });

  return serializeForecast(record);
}

export async function updateSalesForecast(recordId: string, payload: SalesForecastPayload) {
  const updateData: Record<string, unknown> = {};

  if (payload.anchor_month) updateData['anchor_month'] = anchorMonthToDate(payload.anchor_month);
  if (payload.company_code !== undefined) updateData['company_code'] = payload.company_code || null;
  if (payload.company_desc !== undefined) updateData['company_desc'] = payload.company_desc || null;
  if (payload.material_code !== undefined) updateData['material_code'] = payload.material_code || null;
  if (payload.material_desc !== undefined) updateData['material_desc'] = payload.material_desc || null;
  if (payload.forecast_qty !== undefined) updateData['forecast_qty'] = new Prisma.Decimal(payload.forecast_qty);
  if (payload.metadata !== undefined) {
    updateData['metadata'] =
      payload.metadata === null ? Prisma.JsonNull : payload.metadata;
  }

  const record = await prisma.saleforecast.update({
    where: { id: BigInt(recordId) },
    data: updateData
  });

  return serializeForecast(record);
}

export async function deleteSalesForecast(recordId: string) {
  const record = await prisma.saleforecast.delete({
    where: { id: BigInt(recordId) }
  });
  return serializeForecast(record);
}
