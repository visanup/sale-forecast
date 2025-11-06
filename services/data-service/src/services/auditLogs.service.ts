import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';

export type AuditLogsQuery = {
  service?: string;
  endpoint?: string;
  action?: string;
  performed_by?: string;
  since?: string;
  until?: string;
  limit?: number;
  cursor?: string;
};

type AuditLogRecord = {
  id: string;
  service: string;
  endpoint: string;
  action: string;
  record_id: string | null;
  performed_by: string | null;
  user_id: string | null;
  user_email: string | null;
  user_username: string | null;
  client_id: string | null;
  metadata: Prisma.JsonValue | null;
  performed_at: string;
};

function serializeAuditLog(record: {
  id: bigint;
  service: string;
  endpoint: string;
  action: string;
  record_id: string | null;
  performed_by: string | null;
  user_id: string | null;
  user_email: string | null;
  user_username: string | null;
  client_id: string | null;
  metadata: Prisma.JsonValue | null;
  performed_at: Date;
}): AuditLogRecord {
  return {
    id: record.id.toString(),
    service: record.service,
    endpoint: record.endpoint,
    action: record.action,
    record_id: record.record_id,
    performed_by: record.performed_by,
    user_id: record.user_id,
    user_email: record.user_email,
    user_username: record.user_username,
    client_id: record.client_id,
    metadata: record.metadata,
    performed_at: record.performed_at.toISOString()
  };
}

export async function listAuditLogs(query: AuditLogsQuery) {
  const limit = Math.min(query.limit ?? 100, 500);
  const where: Prisma.audit_logsWhereInput = {};

  if (query.service) where.service = query.service;
  if (query.endpoint) where.endpoint = query.endpoint;
  if (query.action) where.action = query.action;
  if (query.performed_by) where.performed_by = query.performed_by;

  if (query.since || query.until) {
    const performedAtFilter: Prisma.DateTimeFilter = {};
    if (query.since) performedAtFilter.gte = new Date(query.since);
    if (query.until) performedAtFilter.lte = new Date(query.until);
    where.performed_at = performedAtFilter;
  }

  if (query.cursor) {
    where.id = { lt: BigInt(query.cursor) };
  }

  const records = await prisma.audit_logs.findMany({
    where,
    orderBy: { id: 'desc' },
    take: limit + 1
  });

  const hasMore = records.length > limit;
  const items = hasMore ? records.slice(0, limit) : records;

  return {
    data: items.map(serializeAuditLog),
    paging: {
      next: hasMore ? records[limit].id.toString() : null
    }
  };
}

