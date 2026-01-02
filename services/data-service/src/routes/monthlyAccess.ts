import { Router, type RequestHandler } from 'express';
import multer from 'multer';
import {
  monthlyAccessBulkToggleSchema,
  monthlyAccessMaterialQuerySchema,
  monthlyAccessQuerySchema,
  monthlyAccessSeedSchema,
  monthlyAccessUpdateSchema,
  monthlyAccessUpsertSchema
} from '../schemas/monthlyAccess.schema.js';
import {
  bulkToggleMonthlyAccess,
  listMonthlyAccess,
  updateMonthlyAccess,
  upsertMonthlyAccess
} from '../services/monthlyAccess.service.js';
import {
  importMonthlyAccessMaterials,
  listMonthlyAccessMaterials,
  MaterialImportError
} from '../services/monthlyAccessMaterial.service.js';
import { seedDefaultMonthlyAccess } from '../services/monthlyAccessSeed.service.js';
import { writeAuditLog } from '../services/audit.service.js';
import { resolveRequestActor, withActorMetadata } from '../utils/requestActor.js';

export const monthlyAccessRouter = Router();
const upload = multer();
const uploadSingle: RequestHandler = upload.single('file') as unknown as RequestHandler;

monthlyAccessRouter.get('/', async (req, res) => {
  const parsed = monthlyAccessQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
  }

  try {
    const records = await listMonthlyAccess(parsed.data);
    return res.json({ data: records });
  } catch (error) {
    console.error('monthlyAccess:list_error', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list monthly access rules' } });
  }
});

monthlyAccessRouter.get('/materials', async (req, res) => {
  const parsed = monthlyAccessMaterialQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
  }

  try {
    const result = await listMonthlyAccessMaterials(parsed.data);
    return res.json({ data: result.data, paging: { next: result.nextCursor } });
  } catch (error) {
    if (error instanceof MaterialImportError) {
      return res.status(error.status).json({ error: { code: error.code, message: error.message } });
    }
    const message = error instanceof Error ? error.message : 'Failed to list material access';
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message } });
  }
});

monthlyAccessRouter.post('/materials/import', uploadSingle, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'file required' } });
  }
  const anchorMonth = String((req.body as any)?.anchorMonth || (req.body as any)?.anchor_month || '');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(anchorMonth)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'anchorMonth required' } });
  }

  try {
    const result = await importMonthlyAccessMaterials(req.file.buffer, anchorMonth);
    return res.json({ data: result });
  } catch (error) {
    if (error instanceof MaterialImportError) {
      return res.status(error.status).json({ error: { code: error.code, message: error.message } });
    }
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'import failed' } });
  }
});

monthlyAccessRouter.post('/seed-default', async (req, res) => {
  const parsed = monthlyAccessSeedSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
  }

  try {
    const result = await seedDefaultMonthlyAccess({
      users: parsed.data.users,
      anchorMonths: parsed.data.anchor_months
    });
    return res.json({ data: result });
  } catch (error) {
    console.error('monthlyAccess:seed_default_error', error);
    return res
      .status(500)
      .json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to seed default monthly access entries' } });
  }
});

monthlyAccessRouter.post('/', async (req, res) => {
  const parsed = monthlyAccessUpsertSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
  }

  try {
    const actor = resolveRequestActor(req as any);
    const record = await upsertMonthlyAccess(parsed.data, actor.performedBy);
    await writeAuditLog({
      service: 'data-service',
      endpoint: '/v1/monthly-access',
      action: 'POST',
      recordId: record.id,
      performedBy: actor.performedBy,
      userId: actor.user?.id ?? null,
      userEmail: actor.user?.email ?? null,
      userUsername: actor.user?.username ?? null,
      clientId: actor.clientId ?? null,
      metadata: withActorMetadata(
        {
          body: parsed.data
        },
        actor
      )
    });
    return res.status(201).json({ data: record });
  } catch (error) {
    console.error('monthlyAccess:create_error', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to upsert monthly access rule' } });
  }
});

monthlyAccessRouter.patch('/:recordId', async (req, res) => {
  const recordId = req.params['recordId'];
  if (!recordId || !/^\d+$/.test(recordId)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'recordId must be numeric' } });
  }
  const parsed = monthlyAccessUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
  }

  try {
    const actor = resolveRequestActor(req as any);
    const record = await updateMonthlyAccess(recordId, parsed.data, actor.performedBy);
    await writeAuditLog({
      service: 'data-service',
      endpoint: '/v1/monthly-access',
      action: 'PATCH',
      recordId: record.id,
      performedBy: actor.performedBy,
      userId: actor.user?.id ?? null,
      userEmail: actor.user?.email ?? null,
      userUsername: actor.user?.username ?? null,
      clientId: actor.clientId ?? null,
      metadata: withActorMetadata(
        {
          body: parsed.data
        },
        actor
      )
    });
    return res.json({ data: record });
  } catch (error) {
    console.error('monthlyAccess:update_error', error);
    if ((error as any)?.code === 'P2025') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record not found' } });
    }
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update monthly access rule' } });
  }
});

monthlyAccessRouter.post('/bulk-toggle', async (req, res) => {
  const parsed = monthlyAccessBulkToggleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
  }

  try {
    const actor = resolveRequestActor(req as any);
    const filter = parsed.data.filter ?? {};
    const count = await bulkToggleMonthlyAccess(filter, parsed.data.action, actor.performedBy, parsed.data.ids);
    await writeAuditLog({
      service: 'data-service',
      endpoint: '/v1/monthly-access/bulk-toggle',
      action: 'POST',
      recordId: null,
      performedBy: actor.performedBy,
      userId: actor.user?.id ?? null,
      userEmail: actor.user?.email ?? null,
      userUsername: actor.user?.username ?? null,
      clientId: actor.clientId ?? null,
      metadata: withActorMetadata(
        {
          body: parsed.data,
          affected: count
        },
        actor
      )
    });
    return res.json({ data: { updated: count } });
  } catch (error) {
    console.error('monthlyAccess:bulk_error', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to bulk toggle access rules' } });
  }
});
