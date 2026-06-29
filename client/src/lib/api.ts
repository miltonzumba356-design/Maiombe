import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL nao foi definida no .env do cliente');
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token + mock-first for GET requests
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // For GET requests: return mock data immediately (no network roundtrip)
  if ((config.method || 'get').toLowerCase() === 'get' && config.url) {
    const { getMockResponse } = await import('../mocks/data');
    const path = config.url.split('?')[0];
    const mockData = getMockResponse(path);
    if (mockData !== undefined) {
      // Store mock on config and abort the actual request
      (config as typeof config & { __mockData?: unknown }).__mockData = mockData;
      const ctrl = new AbortController();
      config.signal = ctrl.signal;
      ctrl.abort();
    }
  }
  return config;
});

// Response interceptor — mock shortcircuit + auto-refresh + fallback
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const cfg = error.config as (typeof error.config & { __mockData?: unknown; _retry?: boolean }) | undefined;

    // 1) Return mock for intentionally aborted GET requests
    if (cfg?.__mockData !== undefined) {
      return { data: cfg.__mockData, status: 200, statusText: 'OK', headers: {}, config: cfg };
    }

    // 2) Token refresh on 401
    if (error.response?.status === 401 && cfg && !cfg._retry) {
      cfg._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await api.post('/auth/refresh', { refreshToken });
          localStorage.setItem('access_token', data.data.accessToken);
          cfg.headers = cfg.headers ?? {};
          cfg.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(cfg);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }

    // 3) Fallback mock for real network errors / 5xx on GET requests
    const method = (cfg?.method || '').toLowerCase();
    const isNetworkOrServer = !error.response || error.response.status >= 500;
    if (method === 'get' && isNetworkOrServer && cfg?.url) {
      const { getMockResponse } = await import('../mocks/data');
      const mockData = getMockResponse(cfg.url.split('?')[0]);
      if (mockData !== undefined) {
        return { data: mockData, status: 200, statusText: 'OK', headers: {}, config: cfg };
      }
    }

    return Promise.reject(error);
  }
);

export default api;
