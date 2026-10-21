/**
 * Central API client for the Smarty web app.
 *
 * Every request goes through `apiFetch` so that:
 *   - the backend origin comes from a single place (`VITE_API_BASE_URL`),
 *   - the base URL always ends in exactly one `/api` segment,
 *   - a production build can never silently fall back to localhost,
 *   - failures are reported with a kind, a status, a duration and a
 *     correlation id instead of a bare "Failed to fetch".
 */

export const API_BASE_ENV_KEY = 'VITE_API_BASE_URL';

export const TOKEN_STORAGE_KEY = 'accessToken';

const RAW_API_BASE = (import.meta.env?.[API_BASE_ENV_KEY] || '').trim();
const IS_PRODUCTION = import.meta.env?.PROD === true;
const REQUEST_TIMEOUT_MS = Number(import.meta.env?.VITE_API_TIMEOUT_MS || 20000);

const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'];

/**
 * Normalize a configured API base URL.
 *
 * Accepts the backend origin with or without the `/api` prefix and always
 * produces exactly one `/api` suffix, so `https://host/api` and
 * `https://host` both resolve to `https://host/api` and never to
 * `https://host/api/api`.
 */
export function normalizeApiBase(raw) {
  const value = (raw || '').trim();
  if (!value) return '';

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return '';
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';

  let path = parsed.pathname.replace(/\/+$/, '');
  path = path.replace(/(\/api)+$/, '');
  parsed.pathname = `${path}/api`;
  parsed.search = '';
  parsed.hash = '';

  return parsed.toString().replace(/\/+$/, '');
}

/**
 * Validate the configured API base URL.
 * Returns `{ valid, reason, warning }`.
 */
export function validateApiBase(base, { isProduction = IS_PRODUCTION } = {}) {
  if (!base) {
    return {
      valid: false,
      reason:
        `${API_BASE_ENV_KEY} is not configured. Set it to the deployed API origin, ` +
        'for example https://your-render-service.onrender.com/api.',
    };
  }

  let parsed;
  try {
    parsed = new URL(base);
  } catch {
    return { valid: false, reason: `${API_BASE_ENV_KEY} is not a valid URL.` };
  }

  const hostname = parsed.hostname.toLowerCase();
  const isLocal = LOCAL_HOSTNAMES.includes(hostname) || hostname.endsWith('.localhost');

  if (isProduction && isLocal) {
    return {
      valid: false,
      reason:
        `The production build points at ${parsed.origin}. Set ${API_BASE_ENV_KEY} to the ` +
        'deployed API origin and rebuild the site.',
    };
  }

  if (isProduction && parsed.protocol !== 'https:') {
    return {
      valid: true,
      warning: `${API_BASE_ENV_KEY} uses ${parsed.protocol}//. Production APIs should use HTTPS.`,
    };
  }

  return { valid: true };
}

export const API_BASE = normalizeApiBase(RAW_API_BASE);
export const API_CONFIG = validateApiBase(API_BASE);

export const AUTH_PATHS = {
  register: '/auth/register',
  login: '/auth/login',
};

export const AUTH_ENDPOINTS = {
  register: `${API_BASE}${AUTH_PATHS.register}`,
  login: `${API_BASE}${AUTH_PATHS.login}`,
};

export class ApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ApiError';
    this.kind = details.kind || 'unknown';
    this.status = details.status ?? null;
    this.path = details.path ?? null;
    this.durationMs = details.durationMs ?? null;
    this.requestId = details.requestId ?? null;
    this.retryAfter = details.retryAfter ?? null;
  }

  /** Whether repeating the exact same request is safe and might succeed. */
  get isRetryable() {
    return this.kind === 'network' || this.kind === 'timeout' || this.kind === 'server';
  }
}

export function readToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token) {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    /* storage unavailable - the session simply will not survive a reload */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function createRequestId() {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch {
    /* ignore */
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const STATUS_MESSAGES = {
  400: 'The request was rejected. Please check the details and try again.',
  401: 'Invalid email or password.',
  403: 'You do not have permission to do that.',
  404: 'The requested endpoint was not found. Check the API URL.',
  409: 'That email address is already registered.',
  422: 'The request was rejected. Please check the details and try again.',
  429: 'Too many attempts. Please wait a moment and try again.',
};

function kindForStatus(status) {
  if (status === 400 || status === 422) return 'validation';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  if (status >= 400) return 'client';
  return 'unknown';
}

function messageForStatus(status, payload) {
  const serverMessage =
    (payload && (payload.error || payload.message)) || null;

  if (typeof serverMessage === 'string' && serverMessage.trim()) {
    return serverMessage;
  }

  return STATUS_MESSAGES[status] || `The request failed (HTTP ${status}).`;
}

/**
 * Perform a request against the API.
 *
 * Resolves with the parsed JSON body and rejects with an `ApiError`.
 */
export async function apiFetch(path, options = {}) {
  const startedAt = Date.now();
  const requestId = createRequestId();

  if (!API_CONFIG.valid) {
    throw new ApiError(API_CONFIG.reason, {
      kind: 'config',
      path,
      durationMs: 0,
      requestId,
    });
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE}${normalizedPath}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const token = readToken();

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    if (response.status === 401) {
      clearToken();
    }

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new ApiError(messageForStatus(response.status, payload), {
        kind: kindForStatus(response.status),
        status: response.status,
        path: normalizedPath,
        durationMs: Date.now() - startedAt,
        requestId: response.headers.get('X-Request-ID') || requestId,
        retryAfter: Number(response.headers.get('Retry-After')) || null,
      });

      logFailure(error);
      throw error;
    }

    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    const isTimeout = error?.name === 'AbortError';
    const failure = new ApiError(
      isTimeout
        ? `The request timed out after ${REQUEST_TIMEOUT_MS} ms. The server may be starting up or unreachable.`
        : 'Could not reach the server. The API URL may be wrong, the server may be down, or the browser may have blocked the request.',
      {
        kind: isTimeout ? 'timeout' : 'network',
        path: normalizedPath,
        durationMs: Date.now() - startedAt,
        requestId,
      },
    );

    logFailure(failure);
    throw failure;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Safe diagnostic logging: path, duration, status and correlation id only.
 * Never logs request bodies, passwords, tokens or cookies.
 */
function logFailure(error) {
  const details = [
    `path=${error.path}`,
    `kind=${error.kind}`,
    `status=${error.status ?? 'n/a'}`,
    `duration=${error.durationMs}ms`,
    `requestId=${error.requestId}`,
  ].join(' ');

  console.warn(`[api] request failed: ${details}`);
}

export const authAPI = {
  register: (payload) => apiFetch(AUTH_PATHS.register, { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => apiFetch(AUTH_PATHS.login, { method: 'POST', body: JSON.stringify(payload) }),
};
