// Drop this in your Lovable React app (e.g. src/lib/apiClient.ts)
// Replace Supabase calls with apiClient.get/post/put/delete.

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const TOKEN_KEY = 'ledgerflow_token';

export function setToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function request<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: <T = unknown>(p: string) => request<T>(p),
  post: <T = unknown>(p: string, body?: unknown) => request<T>(p, { method: 'POST', body: JSON.stringify(body) }),
  put: <T = unknown>(p: string, body?: unknown) => request<T>(p, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T = unknown>(p: string) => request<T>(p, { method: 'DELETE' }),
  upload: async <T = unknown>(p: string, file: File, fields: Record<string, string> = {}) => {
    const fd = new FormData();
    fd.append('file', file);
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    const res = await fetch(`${BASE}${p}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: fd,
    });
    if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
    return res.json() as Promise<T>;
  },
};

// Auth helpers
export const auth = {
  login: async (email: string, password: string) => {
    const r = await api.post<{ token: string; user: any }>('/auth/login', { email, password });
    setToken(r.token);
    return r.user;
  },
  register: async (email: string, password: string, name?: string) => {
    const r = await api.post<{ token: string; user: any }>('/auth/register', { email, password, name });
    setToken(r.token);
    return r.user;
  },
  logout: () => setToken(null),
  me: () => api.get<{ user: any }>('/auth/me'),
};
//*** End Patch