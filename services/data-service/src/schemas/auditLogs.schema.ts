import { z } from 'zod';

const isoDateRefinement = z
  .string()
  .refine((value) => {
    const parsed = Date.parse(value);
    return !Number.isNaN(parsed);
  }, 'Value must be a valid ISO 8601 timestamp');

export const auditLogsQuerySchema = z.object({
  service: z.string().trim().min(1).optional(),
  endpoint: z.string().trim().min(1).optional(),
  action: z.string().trim().min(1).optional(),
  performed_by: z.string().trim().min(1).optional(),
  since: isoDateRefinement.optional(),
  until: isoDateRefinement.optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  cursor: z
    .string()
    .regex(/^\d+$/, 'cursor must be a numeric audit log id')
    .optional()
});

