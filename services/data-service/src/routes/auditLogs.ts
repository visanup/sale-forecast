//services\data-service\src\routes\auditLogs.ts
import { Router } from 'express';
import { auditLogsQuerySchema } from '../schemas/auditLogs.schema.js';
import { listAuditLogs } from '../services/auditLogs.service.js';

export const auditLogsRouter = Router();

auditLogsRouter.get('/', async (req, res) => {
  const parsed = auditLogsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
  }

  try {
    const result = await listAuditLogs(parsed.data);
    return res.json(result);
  } catch (error) {
    console.error('audit-logs:get_error', error);
    return res
      .status(500)
      .json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch audit logs' } });
  }
});

