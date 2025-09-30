import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { config } from '../config/config';
import type { DimensionListQuery } from '../schemas/dimension.schema';

type PaginatedResult<T> = {
	data: T[];
	nextCursor: string | null;
};

class BadRequestError extends Error {
	public readonly status = 400;
	public readonly code = 'BAD_REQUEST';

	constructor(message: string) {
		super(message);
	}
}

const resolveLimit = (limit: number) => {
	if (!Number.isFinite(limit)) return config.defaultPageLimit;
	const clamped = Math.min(Math.max(Math.trunc(limit), 1), config.maxPageLimit);
	return clamped;
};

const toStringId = (value: bigint) => value.toString();

const toIsoDate = (value: Date) => value.toISOString().split('T')[0];

const trimQuery = (value?: string | null) => value?.trim() || undefined;
const monthCursorPattern = /^\d{4}-\d{2}$/;

export async function listCompanies(params: DimensionListQuery): Promise<PaginatedResult<{ companyId: string; companyCode: string; companyDesc: string | null }>> {
	const q = trimQuery(params.q);
	const limit = resolveLimit(params.limit);
	let cursorFilter: { company_id: bigint } | undefined;
	if (params.cursor) {
		try {
			cursorFilter = { company_id: BigInt(params.cursor) };
		} catch {
			throw new BadRequestError('invalid cursor');
		}
	}
	const where = q
		? {
				OR: [
                { company_code: { contains: q, mode: Prisma.QueryMode.insensitive } },
                { company_desc: { contains: q, mode: Prisma.QueryMode.insensitive } }
				]
			}
		: undefined;

	const records = await prisma.dim_company.findMany({
		where,
		take: limit + 1,
		orderBy: { company_id: 'asc' },
		...(cursorFilter ? { skip: 1, cursor: cursorFilter } : {})
	});

	const hasNext = records.length > limit;
	const items = hasNext ? records.slice(0, limit) : records;
	const nextCursor = hasNext ? toStringId(items[items.length - 1].company_id) : null;

	return {
		data: items.map((item: any) => ({
			companyId: toStringId(item.company_id),
			companyCode: item.company_code,
			companyDesc: item.company_desc ?? null
		})),
		nextCursor
	};
}

export async function listDepts(params: DimensionListQuery): Promise<PaginatedResult<{ deptId: string; deptCode: string }>> {
	const q = trimQuery(params.q);
	const limit = resolveLimit(params.limit);
	let cursorFilter: { dept_id: bigint } | undefined;
	if (params.cursor) {
		try {
			cursorFilter = { dept_id: BigInt(params.cursor) };
		} catch {
			throw new BadRequestError('invalid cursor');
		}
	}

	const where = q
		? {
        dept_code: { contains: q, mode: Prisma.QueryMode.insensitive }
			}
		: undefined;

	const records = await prisma.dim_dept.findMany({
		where,
		take: limit + 1,
		orderBy: { dept_id: 'asc' },
		...(cursorFilter ? { skip: 1, cursor: cursorFilter } : {})
	});

	const hasNext = records.length > limit;
	const items = hasNext ? records.slice(0, limit) : records;
	const nextCursor = hasNext ? toStringId(items[items.length - 1].dept_id) : null;

	return {
		data: items.map((item: any) => ({
			deptId: toStringId(item.dept_id),
			deptCode: item.dept_code
		})),
		nextCursor
	};
}

export async function listDistributionChannels(params: DimensionListQuery): Promise<PaginatedResult<{ dcId: string; dcCode: string; dcDesc: string | null }>> {
	const q = trimQuery(params.q);
	const limit = resolveLimit(params.limit);
	let cursorFilter: { dc_id: bigint } | undefined;
	if (params.cursor) {
		try {
			cursorFilter = { dc_id: BigInt(params.cursor) };
		} catch {
			throw new BadRequestError('invalid cursor');
		}
	}

	const where = q
		? {
				OR: [
                { dc_code: { contains: q, mode: Prisma.QueryMode.insensitive } },
                { dc_desc: { contains: q, mode: Prisma.QueryMode.insensitive } }
				]
			}
		: undefined;

	const records = await prisma.dim_distribution_channel.findMany({
		where,
		take: limit + 1,
		orderBy: { dc_id: 'asc' },
		...(cursorFilter ? { skip: 1, cursor: cursorFilter } : {})
	});

	const hasNext = records.length > limit;
	const items = hasNext ? records.slice(0, limit) : records;
	const nextCursor = hasNext ? toStringId(items[items.length - 1].dc_id) : null;

	return {
		data: items.map((item: any) => ({
			dcId: toStringId(item.dc_id),
			dcCode: item.dc_code,
			dcDesc: item.dc_desc ?? null
		})),
		nextCursor
	};
}

export async function listMaterials(params: DimensionListQuery): Promise<PaginatedResult<{ materialId: string; materialCode: string; materialDesc: string | null }>> {
	const q = trimQuery(params.q);
	const limit = resolveLimit(params.limit);
	let cursorFilter: { material_id: bigint } | undefined;
	if (params.cursor) {
		try {
			cursorFilter = { material_id: BigInt(params.cursor) };
		} catch {
			throw new BadRequestError('invalid cursor');
		}
	}

	const where = q
		? {
				OR: [
                { material_code: { contains: q, mode: Prisma.QueryMode.insensitive } },
                { material_desc: { contains: q, mode: Prisma.QueryMode.insensitive } }
				]
			}
		: undefined;

	const records = await prisma.dim_material.findMany({
		where,
		take: limit + 1,
		orderBy: { material_id: 'asc' },
		...(cursorFilter ? { skip: 1, cursor: cursorFilter } : {})
	});

	const hasNext = records.length > limit;
	const items = hasNext ? records.slice(0, limit) : records;
	const nextCursor = hasNext ? toStringId(items[items.length - 1].material_id) : null;

	return {
		data: items.map((item: any) => ({
			materialId: toStringId(item.material_id),
			materialCode: item.material_code,
			materialDesc: item.material_desc ?? null
		})),
		nextCursor
	};
}

export async function listSkus(params: DimensionListQuery): Promise<PaginatedResult<{
	skuId: string;
	materialId: string;
	materialCode: string;
	packSize: string;
	uomId: string;
	uomCode: string;
}>> {
	const q = trimQuery(params.q);
	const limit = resolveLimit(params.limit);
	let cursorFilter: { sku_id: bigint } | undefined;
	if (params.cursor) {
		try {
			cursorFilter = { sku_id: BigInt(params.cursor) };
		} catch {
			throw new BadRequestError('invalid cursor');
		}
	}

	const where = q
		? {
				OR: [
                { pack_size: { contains: q, mode: Prisma.QueryMode.insensitive } },
                { material: { is: { material_code: { contains: q, mode: Prisma.QueryMode.insensitive } } } },
                { material: { is: { material_desc: { contains: q, mode: Prisma.QueryMode.insensitive } } } },
                { uom: { is: { uom_code: { contains: q, mode: Prisma.QueryMode.insensitive } } } }
				]
			}
		: undefined;

	const records = await prisma.dim_sku.findMany({
		where,
		include: {
			material: true,
			uom: true
		},
		take: limit + 1,
		orderBy: { sku_id: 'asc' },
		...(cursorFilter ? { skip: 1, cursor: cursorFilter } : {})
	});

	const hasNext = records.length > limit;
	const items = hasNext ? records.slice(0, limit) : records;
	const nextCursor = hasNext ? toStringId(items[items.length - 1].sku_id) : null;

	return {
		data: items.map((item: any) => ({
		skuId: toStringId(item.sku_id),
		materialId: toStringId(item.material_id),
		materialCode: item.material.material_code,
		packSize: item.pack_size,
		uomId: toStringId(item.uom_id),
		uomCode: item.uom.uom_code
		})),
		nextCursor
	};
}

export async function listSalesOrgs(params: DimensionListQuery): Promise<PaginatedResult<{
	salesOrgId: string;
	division: string | null;
	salesOrganization: string | null;
	salesOffice: string | null;
	salesGroup: string | null;
	salesRepresentative: string | null;
}>> {
	const q = trimQuery(params.q);
	const limit = resolveLimit(params.limit);
	let cursorFilter: { sales_org_id: bigint } | undefined;
	if (params.cursor) {
		try {
			cursorFilter = { sales_org_id: BigInt(params.cursor) };
		} catch {
			throw new BadRequestError('invalid cursor');
		}
	}

	const where = q
		? {
				OR: [
                { division: { contains: q, mode: Prisma.QueryMode.insensitive } },
                { sales_organization: { contains: q, mode: Prisma.QueryMode.insensitive } },
                { sales_office: { contains: q, mode: Prisma.QueryMode.insensitive } },
                { sales_group: { contains: q, mode: Prisma.QueryMode.insensitive } },
                { sales_representative: { contains: q, mode: Prisma.QueryMode.insensitive } }
				]
			}
		: undefined;

	const records = await prisma.dim_sales_org.findMany({
		where,
		take: limit + 1,
		orderBy: { sales_org_id: 'asc' },
		...(cursorFilter ? { skip: 1, cursor: cursorFilter } : {})
	});

	const hasNext = records.length > limit;
	const items = hasNext ? records.slice(0, limit) : records;
	const nextCursor = hasNext ? toStringId(items[items.length - 1].sales_org_id) : null;

	return {
		data: items.map((item: any) => ({
		salesOrgId: toStringId(item.sales_org_id),
		division: item.division ?? null,
		salesOrganization: item.sales_organization ?? null,
		salesOffice: item.sales_office ?? null,
		salesGroup: item.sales_group ?? null,
		salesRepresentative: item.sales_representative ?? null
		})),
		nextCursor
	};
}

export async function listMonths(params: DimensionListQuery): Promise<PaginatedResult<{ month: string; monthId: string }>> {
	const q = trimQuery(params.q);
	const limit = resolveLimit(params.limit);
	let cursorFilter: { yyyy_mm: string } | undefined;
	if (params.cursor) {
		if (!monthCursorPattern.test(params.cursor)) {
			throw new BadRequestError('invalid cursor');
		}
		cursorFilter = { yyyy_mm: params.cursor };
	}

	const where = q
		? {
				OR: [
                { yyyy_mm: { contains: q, mode: Prisma.QueryMode.insensitive } }
				]
			}
		: undefined;

	const records = await prisma.dim_month.findMany({
		where,
		take: limit + 1,
		orderBy: { yyyy_mm: 'asc' },
		...(cursorFilter ? { skip: 1, cursor: cursorFilter } : {})
	});

	const hasNext = records.length > limit;
	const items = hasNext ? records.slice(0, limit) : records;
	const nextCursor = hasNext ? items[items.length - 1].yyyy_mm : null;

	return {
		data: items.map((item: any) => ({
			month: item.yyyy_mm,
			monthId: toIsoDate(item.month_id)
		})),
		nextCursor
	};
}

export function mapServiceError(error: unknown) {
	if (error instanceof BadRequestError) {
		return { status: error.status, body: { error: { code: error.code, message: error.message } } } as const;
	}
	return { status: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'unexpected error' } } } as const;
}
