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

// Registry: maps a per-request numeric ID → mock payload
// Using a numeric ID avoids any WeakMap/reference issues across interceptors
let _seq = 0;
const _registry = new Map<number, unknown>();

// ─── Request interceptor ──────────────────────────────────────────────────────
// Attaches auth token.
// For GET requests that have mock data: cancels the network call and stores
// the mock in _registry so the error interceptor can return it instantly.
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if ((config.method || 'get').toLowerCase() === 'get' && config.url) {
    const { getMockResponse } = await import('../mocks/data');
    const path = config.url.split('?')[0];
    const mockData = getMockResponse(path);

    if (mockData !== undefined) {
      const id = ++_seq;
      (config as any).__mid = id;
      _registry.set(id, mockData);

      // Cancel the real HTTP request immediately
      const ctrl = new AbortController();
      config.signal = ctrl.signal;
      ctrl.abort();
    }
  }

  return config;
});

// ─── Response interceptor ─────────────────────────────────────────────────────
api.interceptors.response.use(
  // Successful responses pass through untouched
  // (only mutations reach here — mocked GETs never resolve successfully)
  (response) => response,

  async (error: AxiosError) => {
    const cfg = error.config as any;

    // ── 1. Return mock for our intentionally cancelled GET requests ──────────
    if (cfg?.__mid != null) {
      const mockData = _registry.get(cfg.__mid);
      _registry.delete(cfg.__mid);
      if (mockData !== undefined) {
        return {
          data: mockData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
        };
      }
    }

    // ── 2. Auto-refresh expired token (401) ───────────────────────────────────
    if (error.response?.status === 401 && !cfg?._retry) {
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

    // ── 3. Fallback mock for real network failures on GET (server down/5xx) ──
    const method = (cfg?.method || '').toLowerCase();
    const isNetworkOrServer = !error.response || error.response.status >= 500;
    if (method === 'get' && isNetworkOrServer && cfg?.url) {
      const { getMockResponse } = await import('../mocks/data');
      const mockData = getMockResponse(cfg.url.split('?')[0]);
      if (mockData !== undefined) {
        return {
          data: mockData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
        };
      }
    }

    return Promise.reject(error);
  }
);

export default api;
