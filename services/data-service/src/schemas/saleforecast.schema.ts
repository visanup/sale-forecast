import { z } from 'zod';

const anchorMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'anchor_month must be in yyyy-MM format');

export const salesForecastQuerySchema = z.object({
  anchor_month: anchorMonthSchema,
  company_code: z.string().trim().min(1).optional(),
  company_desc: z.string().trim().min(1).optional(),
  material_code: z.string().trim().min(1).optional(),
  material_desc: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional()
});

export const salesForecastCreateSchema = z.object({
  anchor_month: anchorMonthSchema,
  company_code: z.string().trim().min(1).optional(),
  company_desc: z.string().trim().min(1).optional(),
  material_code: z.string().trim().min(1).optional(),
  material_desc: z.string().trim().min(1).optional(),
  forecast_qty: z.number({ coerce: true }),
  metadata: z.record(z.any()).optional()
});

export const salesForecastUpdateSchema = salesForecastCreateSchema.partial({
  anchor_month: true
}).extend({
  anchor_month: anchorMonthSchema.optional()
});
