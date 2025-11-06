import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';

type SalesForecastFilters = {
  anchor_month: string;
  company_code?: string;
  company_desc?: string;
  material_code?: string;
  material_desc?: string;
  search?: string;
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

type AuditLogActor = {
  action: string;
  performed_at: Date;
  performed_by: string | null;
  user_id: string | null;
  user_email: string | null;
  user_username: string | null;
  client_id: string | null;
};

function buildActorPayload(audit?: AuditLogActor) {
  if (!audit) return null;
  return {
    performed_by: audit.performed_by,
    user_id: audit.user_id,
    user_email: audit.user_email,
    user_username: audit.user_username,
    client_id: audit.client_id
  };
}

function serializeForecast(record: any, audit?: AuditLogActor) {
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
    updated_at: record.updated_at.toISOString(),
    last_action: audit?.action ?? null,
    last_performed_at: audit ? audit.performed_at.toISOString() : null,
    last_actor: buildActorPayload(audit)
  };
}

export async function listSalesForecast(filters: SalesForecastFilters) {
  const where: Prisma.saleforecastWhereInput = {
    anchor_month: anchorMonthToDate(filters.anchor_month)
  };

  if (filters.company_code) where.company_code = filters.company_code;
  if (filters.company_desc) where.company_desc = filters.company_desc;
  if (filters.material_code) where.material_code = filters.material_code;
  if (filters.material_desc) where.material_desc = filters.material_desc;

  if (filters.search) {
    const search = filters.search.trim();
    if (search.length > 0) {
      const orConditions: Prisma.saleforecastWhereInput[] = [
        { company_code: { contains: search, mode: 'insensitive' } },
        { company_desc: { contains: search, mode: 'insensitive' } },
        { material_code: { contains: search, mode: 'insensitive' } },
        { material_desc: { contains: search, mode: 'insensitive' } }
      ];

      const metadataPaths: string[][] = [
        ['dept_code'],
        ['dept_desc'],
        ['department'],
        ['department_code']
      ];

      for (const path of metadataPaths) {
        orConditions.push({
          metadata: {
            path,
            string_contains: search
          }
        });
      }

      where.OR = orConditions;
    }
  }

  const records = await prisma.saleforecast.findMany({
    where,
    orderBy: [
      { company_code: 'asc' },
      { material_code: 'asc' },
      { id: 'asc' }
    ],
    take: 50000
  });

  const recordIds = records.map((record) => record.id.toString());
  const auditMap = new Map<string, AuditLogActor>();

  if (recordIds.length > 0) {
    const audits = await prisma.audit_logs.findMany({
      where: {
        record_id: { in: recordIds },
        service: { in: ['data-service', 'ingest-service'] }
      },
      orderBy: [
        { record_id: 'asc' },
        { id: 'desc' }
      ]
    });

    for (const audit of audits) {
      const key = audit.record_id;
      if (!key) continue;
      if (!auditMap.has(key)) {
        auditMap.set(key, {
          action: audit.action,
          performed_at: audit.performed_at,
          performed_by: audit.performed_by,
          user_id: audit.user_id,
          user_email: audit.user_email,
          user_username: audit.user_username,
          client_id: audit.client_id
        });
      }
    }
  }

  return records.map((record) => serializeForecast(record, auditMap.get(record.id.toString())));
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
