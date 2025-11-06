import { Prisma } from '@prisma/client';
import { prisma } from './ingest.service.js';

type AuditParams = {
  service: string;
  endpoint: string;
  action: string;
  recordId?: string | null;
  performedBy?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  userUsername?: string | null;
  clientId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

export async function writeAuditLog(params: AuditParams) {
  try {
    const metadataValue =
      params.metadata === undefined
        ? undefined
        : params.metadata === null
          ? Prisma.JsonNull
          : params.metadata;

    await prisma.audit_logs.create({
      data: {
        service: params.service,
        endpoint: params.endpoint,
        action: params.action,
        record_id: params.recordId ?? null,
        performed_by: params.performedBy ?? null,
        user_id: params.userId ?? null,
        user_email: params.userEmail ?? null,
        user_username: params.userUsername ?? null,
        client_id: params.clientId ?? null,
        metadata: metadataValue
      }
    });
  } catch (error) {
    console.error('failed_to_write_audit_log', error);
  }
}

