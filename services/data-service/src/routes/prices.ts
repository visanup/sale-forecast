import { Router } from 'express';
import { z } from 'zod';
import { queryUnsafe } from '../db';

export const pricesRouter = Router();

const schema = z.object({
  company: z.string().optional(),
  skuId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional()
});

pricesRouter.get('/', async (req, res) => {
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
  const { company, skuId, from, to } = parsed.data;
  const conditions: string[] = [];
  const params: any[] = [];
  if (company) { params.push(company); conditions.push('c.company_code = $' + params.length); }
  if (skuId) { params.push(Number(skuId)); conditions.push('p.sku_id = $' + params.length); }
  if (from) { params.push(from + '-01'); conditions.push('p.month_id >= CAST($' + params.length + ' AS date)'); }
  if (to) { params.push(to + '-01'); conditions.push('p.month_id <= CAST($' + params.length + ' AS date)'); }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const rows = await queryUnsafe<any>(
    `SELECT c.company_code, p.sku_id, p.month_id, p.price
     FROM fact_price p
     JOIN dim_company c ON c.company_id = p.company_id
     ${where}
     ORDER BY p.month_id, c.company_code, p.sku_id
     LIMIT 1000`,
    params
  );
  return res.json({ data: rows, paging: { next: null } });
});


