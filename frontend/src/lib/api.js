import axios from 'axios';

const TOKEN_KEY = 'tcm_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request.
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear token and bounce to login.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      tokenStore.clear();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/** Pull a human message out of an axios error, including field-level validation errors. */
export function apiErrorMessage(error) {
  const data = error?.response?.data;
  if (data?.fields) {
    return Object.entries(data.fields)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
  }
  return data?.message || error?.message || 'Request failed';
}
