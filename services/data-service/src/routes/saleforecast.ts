import { Router } from 'express';
import {
  salesForecastQuerySchema,
  salesForecastCreateSchema,
  salesForecastUpdateSchema
} from '../schemas/saleforecast.schema.js';
import {
  listSalesForecast,
  createSalesForecast,
  updateSalesForecast,
  deleteSalesForecast
} from '../services/saleforecast.service.js';
import { writeAuditLog } from '../services/audit.service.js';

export const salesForecastRouter = Router();

salesForecastRouter.get('/', async (req, res) => {
  const parsed = salesForecastQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
  }

  const clientId = (req as any).apiClientId as string | undefined;

  try {
    const records = await listSalesForecast(parsed.data);
    await writeAuditLog({
      service: 'data-service',
      endpoint: '/v1/saleforecast',
      action: 'GET',
      recordId: null,
      performedBy: clientId || null,
      metadata: { query: parsed.data, resultCount: records.length }
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

  const clientId = (req as any).apiClientId as string | undefined;

  try {
    const record = await createSalesForecast(parsed.data);
    await writeAuditLog({
      service: 'data-service',
      endpoint: '/v1/saleforecast',
      action: 'POST',
      recordId: record.id,
      performedBy: clientId || null,
      metadata: { body: parsed.data }
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

  const clientId = (req as any).apiClientId as string | undefined;

  try {
    const record = await updateSalesForecast(recordId, parsed.data);
    await writeAuditLog({
      service: 'data-service',
      endpoint: '/v1/saleforecast',
      action: 'PUT',
      recordId: record.id,
      performedBy: clientId || null,
      metadata: { body: parsed.data }
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

  const clientId = (req as any).apiClientId as string | undefined;

  try {
    const record = await deleteSalesForecast(recordId);
    await writeAuditLog({
      service: 'data-service',
      endpoint: '/v1/saleforecast',
      action: 'DELETE',
      recordId: record.id,
      performedBy: clientId || null
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
