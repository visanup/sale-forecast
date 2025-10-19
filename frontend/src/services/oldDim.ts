export type LegacyDimCompany = {
  code: string;
  name?: string | null;
  description?: string | null;
  raw?: unknown;
};

export type LegacyDimDept = {
  code: string;
  name?: string | null;
  raw?: unknown;
};

export type LegacyDimDistributionChannel = {
  code: string;
  name?: string | null;
  description?: string | null;
  raw?: unknown;
};

export type LegacyDimMaterial = {
  code: string;
  description?: string | null;
  packSize?: string | null;
  uom?: string | null;
  raw?: unknown;
};

export type LegacyDimQuery = {
  search?: string;
  limit?: number;
  signal?: AbortSignal;
};

const HISTORY_REGEX = /\s+/g;

const defaultBaseUrl = (import.meta.env.VITE_DIM_URL as string | undefined) ?? '';

const OLD_DIM_BASE = normalizeBaseUrl(
  (import.meta.env.VITE_OLD_DIM_URL as string | undefined) || defaultBaseUrl
);

const OLD_DIM_API_KEY =
  (import.meta.env.VITE_OLD_DIM_API_KEY as string | undefined) ||
  (import.meta.env.VITE_DATA_API_KEY as string | undefined) ||
  'changeme';

function normalizeBaseUrl(value: string): string {
  if (!value) {
    return '';
  }
  return value.replace(/\/+$/, '');
}

function buildUrl(path: string, params?: LegacyDimQuery): string {
  if (!OLD_DIM_BASE) {
    throw new Error('Old DIM base URL is not configured');
  }
  const sanitizedPath = path.startsWith('/') ? path.slice(1) : path;
  const url = new URL(`${OLD_DIM_BASE}/${sanitizedPath}`);
  if (params?.search) {
    url.searchParams.set('q', params.search);
  }
  if (params?.limit && Number.isFinite(params.limit)) {
    url.searchParams.set('limit', String(params.limit));
  }
  return url.toString();
}

function sanitizeString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.replace(HISTORY_REGEX, ' ').trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (value === null || value === undefined) return undefined;
  return String(value).replace(HISTORY_REGEX, ' ').trim() || undefined;
}

type LegacyEnvelope<T> = { data?: T; result?: T; results?: T; items?: T; records?: T; payload?: T } | T;

export function asArray<T>(input: LegacyEnvelope<T[]> | undefined | null): T[] {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  const candidates = (['data', 'result', 'results', 'items', 'records', 'payload'] as const).map(
    key => (input as Record<string, unknown>)[key]
  );
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as T[];
    }
  }
  return [];
}

async function requestLegacy<T>(path: string, params?: LegacyDimQuery): Promise<T> {
  const url = buildUrl(path, params);
  const response = await fetch(url, {
    headers: {
      'X-API-Key': OLD_DIM_API_KEY,
      Accept: 'application/json'
    },
    signal: params?.signal
  });

  const json = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) {
    const message =
      ((json as any)?.error?.message as string | undefined) ||
      response.statusText ||
      'Legacy DIM request failed';
    throw new Error(message);
  }
  return json;
}

function mapCompany(record: any): LegacyDimCompany | null {
  const code =
    sanitizeString(
      record?.company_code ??
        record?.companyCode ??
        record?.company ??
        record?.code ??
        record?.COMPANY_CODE ??
        record?.COMPANYCODE
    ) || '';
  if (!code) return null;
  const name =
    sanitizeString(
      record?.company_name ??
        record?.companyName ??
        record?.name ??
        record?.COMPANY_NAME ??
        record?.COMPANYNAME
    ) || null;
  const description =
    sanitizeString(
      record?.company_desc ??
        record?.companyDesc ??
        record?.description ??
        record?.desc ??
        record?.COMPANY_DESC ??
        record?.COMPANYDESC
    ) || null;
  return { code, name, description, raw: record };
}

function mapDept(record: any): LegacyDimDept | null {
  const code =
    sanitizeString(
      record?.dept_code ??
        record?.deptCode ??
        record?.departmentCode ??
        record?.dept ??
        record?.code ??
        record?.DEPT_CODE ??
        record?.DEPTCODE
    ) || '';
  if (!code) return null;
  const name =
    sanitizeString(
      record?.dept_name ?? record?.deptName ?? record?.departmentName ?? record?.name ?? record?.DEPT_NAME
    ) || null;
  return { code, name, raw: record };
}

function mapDistributionChannel(record: any): LegacyDimDistributionChannel | null {
  const code =
    sanitizeString(
      record?.dc_code ??
        record?.dcCode ??
        record?.distributionChannelCode ??
        record?.distribution_channel ??
        record?.code ??
        record?.DC_CODE ??
        record?.DCCODE
    ) || '';
  if (!code) return null;
  const name =
    sanitizeString(
      record?.dc_name ??
        record?.dcName ??
        record?.distributionChannelName ??
        record?.name ??
        record?.DC_NAME
    ) || null;
  const description =
    sanitizeString(
      record?.dc_desc ??
        record?.dcDesc ??
        record?.description ??
        record?.desc ??
        record?.DC_DESC ??
        record?.DCDESC
    ) || null;
  return { code, name, description, raw: record };
}

function mapMaterial(record: any): LegacyDimMaterial | null {
  const code =
    sanitizeString(
      record?.material_code ??
        record?.materialCode ??
        record?.sku ??
        record?.code ??
        record?.MATERIAL_CODE ??
        record?.MATERIALCODE
    ) || '';
  if (!code) return null;
  const description =
    sanitizeString(
      record?.material_desc ??
        record?.materialDesc ??
        record?.description ??
        record?.desc ??
        record?.MATERIAL_DESC ??
        record?.MATERIALDESC
    ) || null;
  const packSize =
    sanitizeString(
      record?.pack_size ??
        record?.packSize ??
        record?.packsize ??
        record?.PACK_SIZE ??
        record?.PACKSIZE
    ) || null;
  const uom =
    sanitizeString(record?.uom ?? record?.uom_code ?? record?.uomCode ?? record?.UOM ?? record?.UOM_CODE) ||
    null;
  return { code, description, packSize, uom, raw: record };
}

export async function fetchCompaniesOld(params?: LegacyDimQuery): Promise<LegacyDimCompany[]> {
  const payload = await requestLegacy<any>('/legacy/companies', params);
  return asArray<any>(payload)
    .map(mapCompany)
    .filter((item): item is LegacyDimCompany => !!item);
}

export async function fetchDeptsOld(params?: LegacyDimQuery): Promise<LegacyDimDept[]> {
  const payload = await requestLegacy<any>('/legacy/depts', params);
  return asArray<any>(payload)
    .map(mapDept)
    .filter((item): item is LegacyDimDept => !!item);
}

export async function fetchDistributionChannelsOld(
  params?: LegacyDimQuery
): Promise<LegacyDimDistributionChannel[]> {
  const payload = await requestLegacy<any>('/legacy/distribution-channels', params);
  return asArray<any>(payload)
    .map(mapDistributionChannel)
    .filter((item): item is LegacyDimDistributionChannel => !!item);
}

export async function fetchMaterialsOld(params?: LegacyDimQuery): Promise<LegacyDimMaterial[]> {
  const payload = await requestLegacy<any>('/legacy/materials', params);
  return asArray<any>(payload)
    .map(mapMaterial)
    .filter((item): item is LegacyDimMaterial => !!item);
}
