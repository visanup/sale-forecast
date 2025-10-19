import { dimApi } from './api';
import {
  fetchCompaniesOld,
  fetchDeptsOld,
  fetchDistributionChannelsOld,
  fetchMaterialsOld,
  type LegacyDimCompany,
  type LegacyDimDept,
  type LegacyDimDistributionChannel,
  type LegacyDimMaterial,
  type LegacyDimQuery
} from './oldDim';

export type DimQuery = {
  search?: string;
  limit?: number;
  signal?: AbortSignal;
};

export type DimCompany = {
  code: string;
  label?: string | null;
  description?: string | null;
  raw?: unknown;
};

export type DimDept = {
  code: string;
  label?: string | null;
  raw?: unknown;
};

export type DimDistributionChannel = {
  code: string;
  label?: string | null;
  description?: string | null;
  raw?: unknown;
};

export type DimMaterial = {
  code: string;
  label?: string | null;
  description?: string | null;
  packSize?: string | null;
  uom?: string | null;
  raw?: unknown;
};

const LEGACY_MODE = resolveLegacyMode(import.meta.env.VITE_USE_OLD_DIM);
let legacyDimActive = LEGACY_MODE === 'force';

type LegacyMode = 'off' | 'prefer' | 'force';

function resolveLegacyMode(value: unknown): LegacyMode {
  if (value === undefined || value === null) {
    return 'off';
  }
  if (typeof value === 'boolean') {
    return value ? 'prefer' : 'off';
  }
  if (typeof value !== 'string') {
    return 'off';
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) return 'off';
  if (['force', 'only', 'legacy-only', 'legacy'].includes(normalized)) return 'force';
  if (['false', '0', 'off', 'no', 'disabled'].includes(normalized)) return 'off';
  return 'prefer';
}

function extractMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim().length > 0) return error.trim();
  return 'unexpected error';
}

function logLegacyFallback(dimension: string, error: unknown, context: 'disabled' | 'using'): void {
  if (typeof console === 'undefined') return;
  const message = extractMessage(error);
  if (context === 'using') {
    console.warn(`[dimSource] New ${dimension} fetch failed (${message}); using legacy DIM API instead.`);
  } else {
    console.warn(`[dimSource] Legacy ${dimension} fetch failed (${message}); continuing with new DIM API.`);
  }
}

async function withLegacyFallback<T>(
  dimension: string,
  newFetcher: () => Promise<T>,
  legacyFetcher: () => Promise<T>
): Promise<T> {
  if (LEGACY_MODE === 'force') {
    try {
      const value = await legacyFetcher();
      legacyDimActive = true;
      return value;
    } catch (error) {
      legacyDimActive = false;
      logLegacyFallback(dimension, error, 'disabled');
      throw error;
    }
  }

  try {
    const value = await newFetcher();
    legacyDimActive = false;
    return value;
  } catch (newError) {
    if (LEGACY_MODE === 'off') {
      throw newError;
    }
    try {
      const legacyValue = await legacyFetcher();
      legacyDimActive = true;
      logLegacyFallback(dimension, newError, 'using');
      return legacyValue;
    } catch (legacyError) {
      legacyDimActive = false;
      logLegacyFallback(dimension, legacyError, 'disabled');
      throw newError;
    }
  }
}

function mapLegacyCompany(item: LegacyDimCompany): DimCompany {
  return {
    code: item.code,
    label: item.name ?? item.description ?? item.code,
    description: item.description ?? item.name ?? null,
    raw: item.raw ?? item
  };
}

function mapLegacyDept(item: LegacyDimDept): DimDept {
  return {
    code: item.code,
    label: item.name ?? item.code,
    raw: item.raw ?? item
  };
}

function mapLegacyDistributionChannel(item: LegacyDimDistributionChannel): DimDistributionChannel {
  return {
    code: item.code,
    label: item.name ?? item.description ?? item.code,
    description: item.description ?? item.name ?? null,
    raw: item.raw ?? item
  };
}

function mapLegacyMaterial(item: LegacyDimMaterial): DimMaterial {
  return {
    code: item.code,
    label: item.description ? `${item.code} - ${item.description}` : item.code,
    description: item.description ?? null,
    packSize: item.packSize ?? null,
    uom: item.uom ?? null,
    raw: item.raw ?? item
  };
}

function toLegacyQuery(params?: DimQuery): LegacyDimQuery | undefined {
  if (!params) return undefined;
  return {
    search: params.search,
    limit: params.limit,
    signal: params.signal
  };
}

function mapNewCompany(item: any): DimCompany | null {
  const code = item?.companyCode ?? item?.company_code ?? item?.code;
  if (!code) return null;
  const description = item?.companyDesc ?? item?.company_desc ?? item?.companyName ?? item?.company_name ?? null;
  return {
    code,
    label: description ?? code,
    description,
    raw: item
  };
}

function mapNewDept(item: any): DimDept | null {
  const code = item?.deptCode ?? item?.dept_code ?? item?.code;
  if (!code) return null;
  const label = item?.deptName ?? item?.dept_name ?? null;
  return {
    code,
    label: label ?? code,
    raw: item
  };
}

function mapNewDistributionChannel(item: any): DimDistributionChannel | null {
  const code = item?.dcCode ?? item?.dc_code ?? item?.code;
  if (!code) return null;
  const description = item?.dcDesc ?? item?.dc_desc ?? null;
  const label = item?.dcName ?? item?.dc_name ?? description ?? code;
  return {
    code,
    label,
    description: description ?? label,
    raw: item
  };
}

function mapNewMaterial(item: any): DimMaterial | null {
  const code = item?.materialCode ?? item?.material_code ?? item?.code;
  if (!code) return null;
  const description = item?.materialDesc ?? item?.material_desc ?? null;
  const packSize = item?.packSize ?? item?.pack_size ?? null;
  const uom = item?.uom ?? item?.uomCode ?? item?.uom_code ?? null;
  return {
    code,
    label: description ? `${code} - ${description}` : code,
    description,
    packSize,
    uom,
    raw: item
  };
}

async function fetchCompaniesNew(params?: DimQuery): Promise<DimCompany[]> {
  const response = await dimApi.companies({
    search: params?.search,
    limit: params?.limit,
    signal: params?.signal
  });
  const records = response?.data ?? [];
  return records.map(mapNewCompany).filter((item): item is DimCompany => !!item);
}

async function fetchDeptsNew(params?: DimQuery): Promise<DimDept[]> {
  const response = await dimApi.depts({
    search: params?.search,
    limit: params?.limit,
    signal: params?.signal
  });
  const records = response?.data ?? [];
  return records.map(mapNewDept).filter((item): item is DimDept => !!item);
}

async function fetchDistributionChannelsNew(params?: DimQuery): Promise<DimDistributionChannel[]> {
  const response = await dimApi.distributionChannels({
    search: params?.search,
    limit: params?.limit,
    signal: params?.signal
  });
  const records = response?.data ?? [];
  return records.map(mapNewDistributionChannel).filter((item): item is DimDistributionChannel => !!item);
}

async function fetchMaterialsNew(params?: DimQuery): Promise<DimMaterial[]> {
  const response = await dimApi.materials({
    search: params?.search,
    limit: params?.limit,
    signal: params?.signal
  });
  const records = response?.data ?? [];
  return records.map(mapNewMaterial).filter((item): item is DimMaterial => !!item);
}

async function fetchCompanies(params?: DimQuery): Promise<DimCompany[]> {
  return withLegacyFallback(
    'companies',
    () => fetchCompaniesNew(params),
    async () => {
      const results = await fetchCompaniesOld(toLegacyQuery(params));
      return results.map(mapLegacyCompany);
    }
  );
}

async function fetchDepts(params?: DimQuery): Promise<DimDept[]> {
  return withLegacyFallback(
    'departments',
    () => fetchDeptsNew(params),
    async () => {
      const results = await fetchDeptsOld(toLegacyQuery(params));
      return results.map(mapLegacyDept);
    }
  );
}

async function fetchDistributionChannels(params?: DimQuery): Promise<DimDistributionChannel[]> {
  return withLegacyFallback(
    'distribution channels',
    () => fetchDistributionChannelsNew(params),
    async () => {
      const results = await fetchDistributionChannelsOld(toLegacyQuery(params));
      return results.map(mapLegacyDistributionChannel);
    }
  );
}

async function fetchMaterials(params?: DimQuery): Promise<DimMaterial[]> {
  return withLegacyFallback(
    'materials',
    () => fetchMaterialsNew(params),
    async () => {
      const results = await fetchMaterialsOld(toLegacyQuery(params));
      return results.map(mapLegacyMaterial);
    }
  );
}

export const DimSource = {
  fetchCompanies,
  fetchDepts,
  fetchDistributionChannels,
  fetchMaterials,
  isUsingOldDim(): boolean {
    return legacyDimActive;
  }
};

export type DimSourceType = typeof DimSource;
