import { z } from 'zod';

export const manualLineSchema = z.object({
  company_code: z.string(),
  company_desc: z.string().optional(),
  Company_code: z.string().optional(),
  dept_code: z.string(),
  dc_code: z.string(),
  division: z.string().optional(),
  sales_organization: z.string().optional(),
  sales_office: z.string().optional(),
  sales_group: z.string().optional(),
  sales_representative: z.string().optional(),
  material_code: z.string(),
  pack_size: z.string(),
  uom_code: z.string(),
  months: z.array(z.object({ month: z.string(), qty: z.number().nonnegative(), price: z.number().nonnegative().optional() }))
});

export const manualPayloadSchema = z.object({
  anchorMonth: z.string(),
  lines: z.array(manualLineSchema).min(1)
});

