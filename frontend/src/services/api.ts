const LOCAL_SERVICE_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'auth-service',
  'data-service',
  'dim-service',
  'ingest-service'
]);

const stripTrailingSlash = (value: string): string => {
  if (value === '/') return value;
  return value.replace(/\/+$/, '');
};

const buildClientBase = (port: number): string => {
  if (typeof window === 'undefined') {
    return `http://localhost:${port}`;
  }

  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};

const resolveServiceBase = (rawValue: string | undefined, fallbackPort: number): string => {
  if (!rawValue) {
    return stripTrailingSlash(buildClientBase(fallbackPort));
  }

  try {
    const parsed = new URL(rawValue);
    const suffix = stripTrailingSlash(`${parsed.pathname}${parsed.search}${parsed.hash}` || '');
    const normalizedSuffix = suffix === '/' ? '' : suffix;
    const targetPort = parsed.port ? Number(parsed.port) : fallbackPort;

    if (!LOCAL_SERVICE_HOSTS.has(parsed.hostname)) {
      return stripTrailingSlash(`${parsed.protocol}//${parsed.host}${normalizedSuffix}`);
    }

    return stripTrailingSlash(`${buildClientBase(targetPort)}${normalizedSuffix}`);
  } catch {
    return stripTrailingSlash(rawValue);
  }
};

export type ApiResponse<T> =
  | { success?: boolean; data?: T; error?: { code: string; message: string } }
  | { data?: T };

export type AuthTokens = { accessToken: string; refreshToken: string };

const AUTH_BASE = resolveServiceBase(import.meta.env.VITE_AUTH_URL, 6601);
const DATA_BASE = resolveServiceBase(import.meta.env.VITE_DATA_URL, 6603);
const DIM_BASE = resolveServiceBase(import.meta.env.VITE_DIM_URL, 6604);
const INGEST_BASE = resolveServiceBase(import.meta.env.VITE_INGEST_URL, 6602);
const DATA_API_KEY = import.meta.env.VITE_DATA_API_KEY || 'changeme';
const INGEST_API_KEY = import.meta.env.VITE_INGEST_API_KEY || DATA_API_KEY;

const TOKEN_STORAGE_KEYS = {
  access: 'accessToken',
  refresh: 'refreshToken'
} as const;

const tokenListeners = new Set<(tokens: AuthTokens) => void>();
let inMemoryTokens: AuthTokens = { accessToken: '', refreshToken: '' };

function notifyTokenListeners(tokens: AuthTokens) {
  tokenListeners.forEach(listener => {
    try {
      listener(tokens);
    } catch {
      // Swallow listener errors to avoid breaking auth flow
    }
  });
}

function getStorage(): Storage | undefined {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return undefined;
}

function unwrapApiResponse<T>(payload: ApiResponse<T>): T {
  if (payload && typeof payload === 'object' && 'data' in payload && payload.data !== undefined) {
    return payload.data as T;
  }
  return payload as T;
}

// Helper function to build full URL for auth service
export function buildAuthUrl(path: string): string {
  const cleanBaseUrl = AUTH_BASE.endsWith('/') ? AUTH_BASE.slice(0, -1) : AUTH_BASE;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBaseUrl}${cleanPath}`;
}

export type AuthSuccessResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  tokenType?: string;
  user?: any;
};

async function refreshTokensRequest(refreshToken: string): Promise<ApiResponse<AuthSuccessResponse>> {
  const res = await fetch(buildAuthUrl('/api/v1/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || res.statusText);
  }

  return json as ApiResponse<AuthSuccessResponse>;
}

async function http<T>(url: string, init?: RequestInit, opts: { retry?: boolean } = {}): Promise<T> {
  const { retry = true } = opts;

  const performRequest = async (tokens: AuthTokens) => {
    const headers = new Headers(init?.headers || {});
    if (tokens.accessToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${tokens.accessToken}`);
    }
    return fetch(url, { ...init, headers });
  };

  const currentTokens = getTokens();
  let response = await performRequest(currentTokens);

  if (response.status === 401 && retry && currentTokens.refreshToken) {
    const originalError = await response.clone().json().catch(() => ({}));
    try {
      const refreshed = await refreshTokensRequest(currentTokens.refreshToken);
      const refreshedData = unwrapApiResponse(refreshed);

      if (!refreshedData?.accessToken) {
        clearTokens();
        throw new Error(originalError?.error?.message || 'Session expired');
      }

      const nextTokens: AuthTokens = {
        accessToken: refreshedData.accessToken,
        refreshToken: refreshedData.refreshToken || currentTokens.refreshToken
      };

      setTokens(nextTokens);
      response = await performRequest(nextTokens);
    } catch (err: any) {
      clearTokens();
      const message = err?.message || originalError?.error?.message || 'Session expired';
      throw new Error(message);
    }
  }

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.error?.message || response.statusText);
  }

  return json as T;
}

export function getTokens(): AuthTokens {
  const storage = getStorage();
  if (!storage) return inMemoryTokens;
  return {
    accessToken: storage.getItem(TOKEN_STORAGE_KEYS.access) || '',
    refreshToken: storage.getItem(TOKEN_STORAGE_KEYS.refresh) || ''
  };
}

export function setTokens(tokens: AuthTokens): void {
  const storage = getStorage();
  if (storage) {
    storage.setItem(TOKEN_STORAGE_KEYS.access, tokens.accessToken);
    storage.setItem(TOKEN_STORAGE_KEYS.refresh, tokens.refreshToken);
  } else {
    inMemoryTokens = tokens;
  }
  notifyTokenListeners(tokens);
}

export function clearTokens(): void {
  const storage = getStorage();
  if (storage) {
    storage.removeItem(TOKEN_STORAGE_KEYS.access);
    storage.removeItem(TOKEN_STORAGE_KEYS.refresh);
  } else {
    inMemoryTokens = { accessToken: '', refreshToken: '' };
  }
  notifyTokenListeners({ accessToken: '', refreshToken: '' });
}

export function subscribeToTokenChanges(listener: (tokens: AuthTokens) => void): () => void {
  tokenListeners.add(listener);
  return () => tokenListeners.delete(listener);
}

export const authApi = {
  async register(input: { email: string; username: string; password: string; firstName?: string; lastName?: string }) {
    return http<ApiResponse<{ user: any; message: string }>>(buildAuthUrl('/api/v1/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
  },
  async login(input: { username: string; password: string }) {
    return http<ApiResponse<AuthSuccessResponse>>(buildAuthUrl('/api/v1/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
  },
  async refresh(refreshToken: string) {
    const response = await refreshTokensRequest(refreshToken);
    return unwrapApiResponse(response);
  },
  async logout(refreshToken: string) {
    return http<ApiResponse<{ message?: string }>>(buildAuthUrl('/api/v1/auth/logout'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
  },
  async getProfile() {
    return http<ApiResponse<any>>(buildAuthUrl('/api/v1/profile'), { method: 'GET' });
  },
  async updateProfile(input: { firstName?: string; lastName?: string }) {
    return http<ApiResponse<any>>(buildAuthUrl('/api/v1/profile'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
  },
  async me() {
    return http<ApiResponse<any>>(buildAuthUrl('/api/v1/auth/me'), { method: 'GET' });
  }
};

export const dataApi = {
  async prices(params: { company?: string; skuId?: string; from?: string; to?: string }) {
    const sp = new URLSearchParams(params as any).toString();
    return http<{ data: any[] }>(`${DATA_BASE}/v1/prices?${sp}`, { headers: { 'x-api-key': DATA_API_KEY } });
  },
  async forecastList(params: Record<string, string>) {
    const sp = new URLSearchParams(params).toString();
    return http<{ data: any[] }>(`${DATA_BASE}/v1/forecast?${sp}`, { headers: { 'x-api-key': DATA_API_KEY } });
  }
};

export const dimApi = {
  async companies() {
    return http<{ data: any[] }>(`${DIM_BASE}/v1/dim/companies`, { headers: { 'x-api-key': DATA_API_KEY } });
  },
  async depts() {
    return http<{ data: any[] }>(`${DIM_BASE}/v1/dim/depts`, { headers: { 'x-api-key': DATA_API_KEY } });
  },
  async distributionChannels() {
    return http<{ data: any[] }>(`${DIM_BASE}/v1/dim/distribution-channels`, { headers: { 'x-api-key': DATA_API_KEY } });
  },
  async materials() {
    return http<{ data: any[] }>(`${DIM_BASE}/v1/dim/materials`, { headers: { 'x-api-key': DATA_API_KEY } });
  }
};

export const ingestApi = {
  async upload(file: File, anchorMonth: string) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('anchorMonth', anchorMonth);
    return http<{ runId: number }>(`${INGEST_BASE}/v1/upload`, {
      method: 'POST',
      headers: { 'x-api-key': INGEST_API_KEY },
      body: fd
    });
  },
  async manual(payload: {
    anchorMonth: string;
    lines: Array<{
      company_code: string;
      dept_code?: string;
      dc_code?: string;
      division?: string;
      sales_organization?: string;
      sales_office?: string;
      sales_group?: string;
      sales_representative?: string;
      material_code: string;
      material_desc?: string;
      pack_size?: string;
      uom_code?: string;
      n_2?: number;
      n_1?: number;
      n?: number;
      n1?: number;
      n2?: number;
      n3?: number;
      price?: number;
    }>;
  }) {
    return http<{ runId: number }>(`${INGEST_BASE}/v1/manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': INGEST_API_KEY
      },
      body: JSON.stringify(payload)
    });
  }
};

export const logsApi = {
  async getLogs(params: { service?: string; level?: string; limit?: number; since?: string }) {
    const sp = new URLSearchParams();
    if (params.service) sp.append('service', params.service);
    if (params.level) sp.append('level', params.level);
    if (params.limit) sp.append('limit', params.limit.toString());
    if (params.since) sp.append('since', params.since);

    const res = await fetch(`${DATA_BASE}/v1/logs?${sp.toString()}`, {
      headers: { 'X-API-Key': DATA_API_KEY }
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error?.message || res.statusText);
    return json as { data: { logs: any[]; count: number; total: number } };
  },
  async getStats() {
    const res = await fetch(`${DATA_BASE}/v1/logs/stats`, {
      headers: { 'X-API-Key': DATA_API_KEY }
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error?.message || res.statusText);
    return json as { data: { totalLogs: number; firstEntry: any; lastEntry: any } };
  },
  async clearLogs() {
    const res = await fetch(`${DATA_BASE}/v1/logs`, {
      method: 'DELETE',
      headers: { 'X-API-Key': DATA_API_KEY }
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error?.message || res.statusText);
    return json as { success: boolean; message: string };
  }
};

export const serviceBases = {
  auth: AUTH_BASE,
  data: DATA_BASE,
  dim: DIM_BASE,
  ingest: INGEST_BASE
} as const;

// General API client for API key management and other general requests
export const api = {
  get: async (url: string) => {
    let fullUrl: string;
    if (url.startsWith('http')) {
      fullUrl = url;
    } else {
      const cleanBaseUrl = AUTH_BASE.endsWith('/') ? AUTH_BASE.slice(0, -1) : AUTH_BASE;
      const cleanPath = url.startsWith('/') ? url : `/${url}`;
      fullUrl = `${cleanBaseUrl}${cleanPath}`;
    }
    return http<any>(fullUrl, { method: 'GET' });
  },
  post: async (url: string, data?: any) => {
    let fullUrl: string;
    if (url.startsWith('http')) {
      fullUrl = url;
    } else {
      const cleanBaseUrl = AUTH_BASE.endsWith('/') ? AUTH_BASE.slice(0, -1) : AUTH_BASE;
      const cleanPath = url.startsWith('/') ? url : `/${url}`;
      fullUrl = `${cleanBaseUrl}${cleanPath}`;
    }
    return http<any>(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined
    });
  },
  put: async (url: string, data?: any) => {
    let fullUrl: string;
    if (url.startsWith('http')) {
      fullUrl = url;
    } else {
      const cleanBaseUrl = AUTH_BASE.endsWith('/') ? AUTH_BASE.slice(0, -1) : AUTH_BASE;
      const cleanPath = url.startsWith('/') ? url : `/${url}`;
      fullUrl = `${cleanBaseUrl}${cleanPath}`;
    }
    return http<any>(fullUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined
    });
  },
  delete: async (url: string) => {
    let fullUrl: string;
    if (url.startsWith('http')) {
      fullUrl = url;
    } else {
      const cleanBaseUrl = AUTH_BASE.endsWith('/') ? AUTH_BASE.slice(0, -1) : AUTH_BASE;
      const cleanPath = url.startsWith('/') ? url : `/${url}`;
      fullUrl = `${cleanBaseUrl}${cleanPath}`;
    }
    return http<any>(fullUrl, { method: 'DELETE' });
  }
};
