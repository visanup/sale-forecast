import { z } from 'zod';
import { config } from '../config/config';

export const dimensionListQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().max(config.maxPageLimit).default(config.defaultPageLimit),
  cursor: z.string().optional()
});

export type DimensionListQuery = z.infer<typeof dimensionListQuerySchema>;
