import { z } from 'zod';

export const forecastListSchema = z.object({
  company: z.string().optional(),
  dept: z.string().optional(),
  material: z.string().optional(),
  skuId: z.string().optional(),
  salesOrgId: z.string().optional(),
  dc: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  run: z.string().optional()
});

export const forecastAggSchema = z.object({
  group: z.string(),
  metric: z.enum(['forecast_qty', 'revenue_snapshot']).default('revenue_snapshot'),
  from: z.string(),
  to: z.string(),
  run: z.string().optional()
});

