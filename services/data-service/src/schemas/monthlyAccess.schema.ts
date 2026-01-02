import { z } from 'zod';

const anchorMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'anchor_month must be yyyy-MM');

export const monthlyAccessQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  anchor_month: anchorMonthSchema.optional(),
  status: z.enum(['locked', 'unlocked']).optional(),
  user_email: z.string().trim().email().optional()
});

export const monthlyAccessUpsertSchema = z.object({
  user_email: z.string().trim().email(),
  user_id: z.string().trim().min(1).optional(),
  user_name: z.string().trim().min(1).optional(),
  anchor_month: anchorMonthSchema,
  is_locked: z.boolean().optional()
});

export const monthlyAccessUpdateSchema = z
  .object({
    is_locked: z.boolean().optional()
  })
  .refine((val) => Object.keys(val).length > 0, { message: 'At least one field is required' });

export const monthlyAccessBulkToggleSchema = z
  .object({
    action: z.enum(['LOCK', 'UNLOCK']),
    ids: z.array(z.string().regex(/^\d+$/)).min(1).optional(),
    filter: monthlyAccessQuerySchema.optional()
  })
  .refine((val) => Boolean(val.ids?.length) || Boolean(val.filter), {
    message: 'ids or filter must be provided'
  });

const monthlyAccessSeedUserSchema = z.object({
  user_email: z.string().trim().email(),
  user_id: z.string().trim().min(1).optional(),
  user_name: z.string().trim().min(1).optional()
});

export const monthlyAccessSeedSchema = z.object({
  users: z.array(monthlyAccessSeedUserSchema).min(1).optional(),
  anchor_months: z.array(anchorMonthSchema).min(1).max(6).optional()
});

export const monthlyAccessMaterialQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  anchor_month: anchorMonthSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().regex(/^\d+$/).optional()
});
