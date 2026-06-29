import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL nao foi definida no .env do cliente');
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — auto-refresh + demo-mode mock fallback
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean };

    // 1) Token refresh on 401
    if (error.response?.status === 401 && !original._retry) {
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

    // 2) Mock fallback for GET requests when API is unreachable (network error or 5xx)
    const method = (original?.method || '').toLowerCase();
    const isNetworkOrServer = !error.response || error.response.status >= 500;
    if (method === 'get' && isNetworkOrServer && original?.url) {
      const { getMockResponse } = await import('../mocks/data');
      const mockData = getMockResponse(original.url);
      if (mockData !== undefined) {
        return { data: mockData, status: 200, statusText: 'OK', headers: {}, config: original };
      }
    }

    return Promise.reject(error);
  }
);

export default api;
