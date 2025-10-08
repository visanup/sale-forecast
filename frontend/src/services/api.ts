export type ApiResponse<T> = { success?: boolean; data?: T; error?: { code: string; message: string } } | { data?: T };

const AUTH_BASE = import.meta.env.VITE_AUTH_URL || 'http://localhost:6601';
const DATA_BASE = import.meta.env.VITE_DATA_URL || 'http://localhost:6603';
const DIM_BASE = import.meta.env.VITE_DIM_URL || 'http://localhost:6604';
const INGEST_BASE = import.meta.env.VITE_INGEST_URL || 'http://localhost:6602';
const DATA_API_KEY = import.meta.env.VITE_DATA_API_KEY || 'changeme';
const INGEST_API_KEY = import.meta.env.VITE_INGEST_API_KEY || DATA_API_KEY;

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  // merge headers and attach Authorization if available
  const tokens = getTokens();
  const headers = new Headers(init?.headers || {});
  if (tokens.accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }
  const res = await fetch(url, { ...init, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || res.statusText);
  return json as T;
}

// Helper function to build full URL for auth service
function buildAuthUrl(path: string): string {
  const baseUrl = import.meta.env.VITE_AUTH_URL || 'http://localhost:6601';
  // Ensure path starts with / and baseUrl doesn't end with /
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${cleanBaseUrl}${cleanPath}`;
  return fullUrl;
}

export const authApi = {
  async register(input: { email: string; username: string; password: string; firstName?: string; lastName?: string }) {
    return http<ApiResponse<any>>(buildAuthUrl('/api/v1/auth/register'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  },
  async login(input: { username: string; password: string }) {
    return http<ApiResponse<{ accessToken: string; refreshToken: string }>>(buildAuthUrl('/api/v1/auth/login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  },
  async refresh(refreshToken: string) {
    return http<ApiResponse<{ accessToken: string }>>(buildAuthUrl('/api/v1/auth/refresh'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
  },
  async logout(refreshToken: string) {
    return http<ApiResponse<{}>>(buildAuthUrl('/api/v1/auth/logout'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
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
  async companies() { return http<{ data: any[] }>(`${DIM_BASE}/v1/dim/companies`, { headers: { 'x-api-key': DATA_API_KEY } }); },
  async depts() { return http<{ data: any[] }>(`${DIM_BASE}/v1/dim/depts`, { headers: { 'x-api-key': DATA_API_KEY } }); },
  async distributionChannels() { return http<{ data: any[] }>(`${DIM_BASE}/v1/dim/distribution-channels`, { headers: { 'x-api-key': DATA_API_KEY } }); },
  async materials() { return http<{ data: any[] }>(`${DIM_BASE}/v1/dim/materials`, { headers: { 'x-api-key': DATA_API_KEY } }); }
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
  async manual(payload: { anchorMonth: string; lines: Array<{ company_code: string; dept_code?: string; dc_code?: string; division?: string; sales_organization?: string; sales_office?: string; sales_group?: string; sales_representative?: string; material_code: string; material_desc?: string; pack_size?: string; uom_code?: string; n_2?: number; n_1?: number; n?: number; n1?: number; n2?: number; n3?: number; price?: number; }> }) {
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
    
    // Use direct fetch for logs API to avoid Bearer token authentication
    const res = await fetch(`${DATA_BASE}/v1/logs?${sp.toString()}`, { 
      headers: { 'X-API-Key': DATA_API_KEY } 
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error?.message || res.statusText);
    return json as { data: { logs: any[]; count: number; total: number } };
  },
  async getStats() {
    // Use direct fetch for logs API to avoid Bearer token authentication
    const res = await fetch(`${DATA_BASE}/v1/logs/stats`, { 
      headers: { 'X-API-Key': DATA_API_KEY } 
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error?.message || res.statusText);
    return json as { data: { totalLogs: number; firstEntry: any; lastEntry: any } };
  },
  async clearLogs() {
    // Use direct fetch for logs API to avoid Bearer token authentication
    const res = await fetch(`${DATA_BASE}/v1/logs`, { 
      method: 'DELETE',
      headers: { 'X-API-Key': DATA_API_KEY } 
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error?.message || res.statusText);
    return json as { success: boolean; message: string };
  }
};

export function setTokens(tokens: { accessToken: string; refreshToken: string }) {
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export function getTokens() {
  return { accessToken: localStorage.getItem('accessToken') || '', refreshToken: localStorage.getItem('refreshToken') || '' };
}

// General API client for API key management and other general requests
export const api = {
  get: async (url: string) => {
    // If URL doesn't start with http, assume it's a relative path for auth service
    let fullUrl: string;
    if (url.startsWith('http')) {
      fullUrl = url;
    } else {
      // Direct URL construction to avoid any caching issues
      const baseUrl = import.meta.env.VITE_AUTH_URL || 'http://localhost:6601';
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const cleanPath = url.startsWith('/') ? url : `/${url}`;
      fullUrl = `${cleanBaseUrl}${cleanPath}`;
    }
    return http<any>(fullUrl, { method: 'GET' });
  },
  post: async (url: string, data?: any) => {
    // If URL doesn't start with http, assume it's a relative path for auth service
    let fullUrl: string;
    if (url.startsWith('http')) {
      fullUrl = url;
    } else {
      // Direct URL construction to avoid any caching issues
      const baseUrl = import.meta.env.VITE_AUTH_URL || 'http://localhost:6601';
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
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
    // If URL doesn't start with http, assume it's a relative path for auth service
    let fullUrl: string;
    if (url.startsWith('http')) {
      fullUrl = url;
    } else {
      // Direct URL construction to avoid any caching issues
      const baseUrl = import.meta.env.VITE_AUTH_URL || 'http://localhost:6601';
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
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
    // If URL doesn't start with http, assume it's a relative path for auth service
    let fullUrl: string;
    if (url.startsWith('http')) {
      fullUrl = url;
    } else {
      // Direct URL construction to avoid any caching issues
      const baseUrl = import.meta.env.VITE_AUTH_URL || 'http://localhost:6601';
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const cleanPath = url.startsWith('/') ? url : `/${url}`;
      fullUrl = `${cleanBaseUrl}${cleanPath}`;
    }
    return http<any>(fullUrl, { method: 'DELETE' });
  }
};
