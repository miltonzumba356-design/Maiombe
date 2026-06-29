import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL nao foi definida no .env do cliente');
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 14000,
});

// Detect whether a server GET response contains real data or is effectively empty
function serverHasData(responseData: unknown): boolean {
  const d = (responseData as any)?.data;
  if (d == null) return false;

  // Array response (e.g. /contracts)
  if (Array.isArray(d)) return d.length > 0;

  if (typeof d === 'object') {
    // { data: [...], total: N } — clients, alerts, funding, etc.
    if (Array.isArray((d as any).data)) return (d as any).data.length > 0;

    // KPI objects — treat as empty when all numeric values are 0
    const nums = Object.values(d as object).filter(v => typeof v === 'number');
    if (nums.length >= 3 && (nums as number[]).every(v => v === 0)) return false;

    // Non-empty object with meaningful keys
    return Object.keys(d as object).length > 0;
  }

  return false;
}

// ─── Request interceptor — attach token ───────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response interceptor ─────────────────────────────────────────────────────
api.interceptors.response.use(
  // SUCCESS: if server returned empty data → swap in mock
  async (response) => {
    if ((response.config.method || '').toLowerCase() === 'get' && response.config.url) {
      if (!serverHasData(response.data)) {
        const { getMockResponse } = await import('../mocks/data');
        const path = response.config.url.split('?')[0];
        const mockData = getMockResponse(path);
        if (mockData !== undefined) {
          return { ...response, data: mockData };
        }
      }
    }
    return response;
  },

  // ERROR: token refresh + mock fallback for network/5xx failures
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean };

    // 1) Auto-refresh on 401
    if (error.response?.status === 401 && !original?._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await api.post('/auth/refresh', { refreshToken });
          localStorage.setItem('access_token', data.data.accessToken);
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(original);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }

    // 2) Mock fallback for GET when server is unreachable or returns 5xx
    const method = (original?.method || '').toLowerCase();
    const isNetworkOrServer = !error.response || error.response.status >= 500;
    if (method === 'get' && isNetworkOrServer && original?.url) {
      const { getMockResponse } = await import('../mocks/data');
      const mockData = getMockResponse(original.url.split('?')[0]);
      if (mockData !== undefined) {
        return { data: mockData, status: 200, statusText: 'OK (mock)', headers: {}, config: original };
      }
    }

    return Promise.reject(error);
  }
);

export default api;
