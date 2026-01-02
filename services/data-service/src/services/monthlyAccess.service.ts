import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';

export type MonthlyAccessFilters = {
  search?: string;
  anchor_month?: string;
  status?: 'locked' | 'unlocked';
  user_email?: string;
};

export type MonthlyAccessUpsertPayload = {
  user_email: string;
  anchor_month: string;
  user_id?: string | null;
  user_name?: string | null;
  is_locked?: boolean;
};

export type MonthlyAccessUpdatePayload = {
  is_locked?: boolean;
};

export function anchorMonthToDate(anchorMonth: string) {
  return new Date(`${anchorMonth}-01T00:00:00.000Z`);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function serialize(record: any) {
  return {
    id: record.id.toString(),
    user_email: record.user_email,
    user_id: record.user_id,
    user_name: record.user_name,
    anchor_month: record.anchor_month.toISOString().slice(0, 7),
    is_locked: Boolean(record.is_locked),
    locked_by: record.locked_by,
    locked_at: record.locked_at ? record.locked_at.toISOString() : null,
    notes: record.notes,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString()
  };
}

export async function listMonthlyAccess(filters: MonthlyAccessFilters) {
  const where: Prisma.monthly_access_controlWhereInput = {};

  if (filters.anchor_month) {
    where.anchor_month = { equals: anchorMonthToDate(filters.anchor_month) };
  }
  if (filters.user_email) {
    where.user_email = normalizeEmail(filters.user_email);
  }
  if (filters.status) {
    where.is_locked = filters.status === 'locked';
  }
  if (filters.search) {
    const search = filters.search.trim();
    if (search.length > 0) {
      where.OR = [
        { user_email: { contains: search, mode: 'insensitive' } },
        { user_id: { contains: search, mode: 'insensitive' } },
        { user_name: { contains: search, mode: 'insensitive' } }
      ];
    }
  }

  const records = await prisma.monthly_access_control.findMany({
    where,
    orderBy: [
      { anchor_month: 'desc' },
      { user_email: 'asc' }
    ]
  });

  return records.map(serialize);
}

export async function upsertMonthlyAccess(payload: MonthlyAccessUpsertPayload, actor?: string | null) {
  const email = normalizeEmail(payload.user_email);
  const data: Prisma.monthly_access_controlUpsertArgs['create'] = {
    user_email: email,
    user_id: payload.user_id?.trim() || null,
    user_name: payload.user_name?.trim() || null,
    anchor_month: anchorMonthToDate(payload.anchor_month),
    is_locked: Boolean(payload.is_locked),
    locked_by: payload.is_locked ? actor ?? null : null,
    locked_at: payload.is_locked ? new Date() : null
  };

  const result = await prisma.monthly_access_control.upsert({
    where: {
      user_email_anchor_month: {
        user_email: data.user_email,
        anchor_month: data.anchor_month
      }
    },
    update: {
      user_id: data.user_id,
      user_name: data.user_name,
      is_locked: data.is_locked,
      locked_by: payload.is_locked ? actor ?? null : null,
      locked_at: payload.is_locked ? new Date() : null
    },
    create: data
  });

  return serialize(result);
}

export async function updateMonthlyAccess(recordId: string, payload: MonthlyAccessUpdatePayload, actor?: string | null) {
  const updateData: Prisma.monthly_access_controlUpdateInput = {};

  if (payload.is_locked !== undefined) {
    updateData.is_locked = payload.is_locked;
    updateData.locked_by = payload.is_locked ? actor ?? null : null;
    updateData.locked_at = payload.is_locked ? new Date() : null;
  }

  const record = await prisma.monthly_access_control.update({
    where: { id: BigInt(recordId) },
    data: updateData
  });

  return serialize(record);
}

export async function bulkToggleMonthlyAccess(
  filters: MonthlyAccessFilters,
  action: 'LOCK' | 'UNLOCK',
  actor?: string | null,
  ids?: string[]
) {
  const where: Prisma.monthly_access_controlWhereInput = {};
  if (filters.anchor_month) {
    where.anchor_month = { equals: anchorMonthToDate(filters.anchor_month) };
  }
  if (filters.user_email) {
    where.user_email = normalizeEmail(filters.user_email);
  }
  if (filters.search) {
    const search = filters.search.trim();
    if (search.length > 0) {
      where.OR = [
        { user_email: { contains: search, mode: 'insensitive' } },
        { user_id: { contains: search, mode: 'insensitive' } },
        { user_name: { contains: search, mode: 'insensitive' } }
      ];
    }
  }
  if (filters.status) {
    where.is_locked = filters.status === 'locked';
  }
  if (ids && ids.length > 0) {
    where.id = { in: ids.map((id) => BigInt(id)) };
  }

  const result = await prisma.monthly_access_control.updateMany({
    where,
    data: {
      is_locked: action === 'LOCK',
      locked_by: action === 'LOCK' ? actor ?? null : null,
      locked_at: action === 'LOCK' ? new Date() : null
    }
  });

  return result.count;
}
