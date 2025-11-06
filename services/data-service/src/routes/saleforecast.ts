import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import {
  salesForecastQuerySchema,
  salesForecastCreateSchema,
  salesForecastUpdateSchema
} from '../schemas/saleforecast.schema.js';
import { listSalesForecast, createSalesForecast, updateSalesForecast, deleteSalesForecast } from '../services/saleforecast.service.js';
import { writeAuditLog } from '../services/audit.service.js';
import { resolveRequestActor, withActorMetadata } from '../utils/requestActor.js';

export const salesForecastRouter = Router();

salesForecastRouter.get('/', async (req, res) => {
  const parsed = salesForecastQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
  }

  try {
    const records = await listSalesForecast(parsed.data);
    const actor = resolveRequestActor(req as any);
    const baseMetadata: Prisma.InputJsonObject = {
      query: parsed.data as unknown as Prisma.InputJsonValue,
      resultCount: records.length
    };
    const metadata = withActorMetadata(baseMetadata, actor);

    await writeAuditLog({
      service: 'data-service',
      endpoint: '/v1/saleforecast',
      action: 'GET',
      recordId: null,
      performedBy: actor.performedBy,
      userId: actor.user?.id ?? null,
      userEmail: actor.user?.email ?? null,
      userUsername: actor.user?.username ?? null,
      clientId: actor.clientId ?? null,
      metadata
    });

    return res.json({ data: records, paging: { next: null } });
  } catch (error) {
    console.error('saleforecast:get_error', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch saleforecast' } });
  }
});

salesForecastRouter.post('/', async (req, res) => {
  const parsed = salesForecastCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
  }

  try {
    const record = await createSalesForecast(parsed.data);
    const actor = resolveRequestActor(req as any);
    const baseMetadata: Prisma.InputJsonObject = {
      body: parsed.data as unknown as Prisma.InputJsonValue
    };
    const metadata = withActorMetadata(baseMetadata, actor);

    await writeAuditLog({
      service: 'data-service',
      endpoint: '/v1/saleforecast',
      action: 'POST',
      recordId: record.id,
      performedBy: actor.performedBy,
      userId: actor.user?.id ?? null,
      userEmail: actor.user?.email ?? null,
      userUsername: actor.user?.username ?? null,
      clientId: actor.clientId ?? null,
      metadata
    });
    return res.status(201).json({ data: record });
  } catch (error) {
    console.error('saleforecast:post_error', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create saleforecast' } });
  }
});

salesForecastRouter.put('/:recordId', async (req, res) => {
  const recordId = req.params['recordId'];
  if (!recordId || !/^\d+$/.test(recordId)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'recordId must be numeric' } });
  }
  const parsed = salesForecastUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
  }
  if (Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'At least one field is required' } });
  }

  try {
    const record = await updateSalesForecast(recordId, parsed.data);
    const actor = resolveRequestActor(req as any);
    const baseMetadata: Prisma.InputJsonObject = {
      body: parsed.data as unknown as Prisma.InputJsonValue
    };
    const metadata = withActorMetadata(baseMetadata, actor);

    await writeAuditLog({
      service: 'data-service',
      endpoint: '/v1/saleforecast',
      action: 'PUT',
      recordId: record.id,
      performedBy: actor.performedBy,
      userId: actor.user?.id ?? null,
      userEmail: actor.user?.email ?? null,
      userUsername: actor.user?.username ?? null,
      clientId: actor.clientId ?? null,
      metadata
    });
    return res.json({ data: record });
  } catch (error) {
    console.error('saleforecast:put_error', error);
    if ((error as any)?.code === 'P2025') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record not found' } });
    }
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update saleforecast' } });
  }
});

salesForecastRouter.delete('/:recordId', async (req, res) => {
  const recordId = req.params['recordId'];
  if (!recordId || !/^\d+$/.test(recordId)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'recordId must be numeric' } });
  }

  try {
    const record = await deleteSalesForecast(recordId);
    const actor = resolveRequestActor(req as any);
    const baseMetadata: Prisma.InputJsonObject = {};

    await writeAuditLog({
      service: 'data-service',
      endpoint: '/v1/saleforecast',
      action: 'DELETE',
      recordId: record.id,
      performedBy: actor.performedBy,
      userId: actor.user?.id ?? null,
      userEmail: actor.user?.email ?? null,
      userUsername: actor.user?.username ?? null,
      clientId: actor.clientId ?? null,
      metadata: withActorMetadata(baseMetadata, actor)
    });
    return res.json({ data: record });
  } catch (error) {
    console.error('saleforecast:delete_error', error);
    if ((error as any)?.code === 'P2025') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record not found' } });
    }
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete saleforecast' } });
  }
});
