import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';

type AuditParams = {
  service: string;
  endpoint: string;
  action: string;
  recordId?: string | null;
  performedBy?: string | null;
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
        metadata: metadataValue
      }
    });
  } catch (error) {
    // Intentionally swallow errors to avoid breaking request flow,
    // but surface to stderr for operators.
    console.error('failed_to_write_audit_log', error);
  }
}
