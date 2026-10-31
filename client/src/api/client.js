import axios from 'axios';
import { mockGet } from './mock.js';

// Mock mode is a development convenience only. A production build ALWAYS talks to the real API.
const wantsMock = import.meta.env.VITE_USE_MOCK === 'true';
export const USE_MOCK = wantsMock && !import.meta.env.PROD;
if (wantsMock && import.meta.env.PROD) console.warn('[Gifted Scents] VITE_USE_MOCK is ignored in production builds.');

export const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export const http = axios.create({ baseURL: API_URL, withCredentials: true, timeout: 20000, headers: { 'x-gs-csrf': '1' } });

if (USE_MOCK) http.defaults.adapter = async (config) => ({ ...mockGet(config.url), status: 200, statusText: 'OK', headers: {}, config });

// ---- errors: always normalise to { message, code, status, details } ----
export class ApiError extends Error {
  constructor(message, { code, status, details } = {}) { super(message); this.code = code; this.status = status; this.details = details; }
}
const toApiError = (err) => {
  if (!err.response) return new ApiError(navigator.onLine === false ? "You're offline. Check your connection and try again." : 'Cannot reach the server. Please try again.', { code: 'NETWORK' });
  const e = err.response.data?.error;
  return new ApiError(e?.message || 'Something went wrong. Please try again.', { code: e?.code, status: err.response.status, details: e?.details });
};

// ---- single-flight silent refresh on 401 ----
let refreshing = null;
const NO_REFRESH = [
  '/auth/me',
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
];
let onSessionLost = () => {};
export const setSessionLostHandler = (fn) => { onSessionLost = fn; };

http.interceptors.response.use((r) => r, async (error) => {
  const cfg = error.config;
  if (error.response?.status === 401 && cfg && !cfg._retried && !NO_REFRESH.some((p) => cfg.url?.startsWith(p))) {
    cfg._retried = true;
    try {
      refreshing ||= http.post('/auth/refresh').finally(() => { refreshing = null; });
      await refreshing;
      return http(cfg);
    } catch { onSessionLost(); }
  }
  return Promise.reject(toApiError(error));
});

export const unwrap = (p) => p.then((r) => r.data.data);
