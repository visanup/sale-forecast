import { Router } from 'express';
import { forecastListSchema, forecastAggSchema } from '../schemas/forecast.schema';
import { listForecast, aggregateForecast } from '../services/forecast.service';

export const forecastRouter = Router();

forecastRouter.get('/', async (req, res) => {
  const parsed = forecastListSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
  const rows = await listForecast(parsed.data as any);
  
  // Convert BigInt to string to avoid serialization error
  const serializedRows = rows.map((row: any) => {
    const serialized: any = {};
    for (const [key, value] of Object.entries(row)) {
      serialized[key] = typeof value === 'bigint' ? value.toString() : value;
    }
    return serialized;
  });
  
  return res.json({ data: serializedRows, paging: { next: null } });
});

forecastRouter.get('/aggregate', async (req, res) => {
  const parsed = forecastAggSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
  const { group, metric, from, to, run } = parsed.data;
  const groups = group.split(',').map(s => s.trim()).filter(Boolean);
  try {
    const rows = await aggregateForecast({ groups, metric, from, to, run } as any);
    
    // Convert BigInt to string to avoid serialization error
    const serializedRows = rows.map((row: any) => {
      const serialized: any = {};
      for (const [key, value] of Object.entries(row)) {
        serialized[key] = typeof value === 'bigint' ? value.toString() : value;
      }
      return serialized;
    });
    
    return res.json({ data: serializedRows });
  } catch {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'invalid group' } });
  }
});


