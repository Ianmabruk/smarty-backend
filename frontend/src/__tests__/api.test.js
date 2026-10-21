import { beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_BASE = 'https://api.example.com/api';

async function loadApi(baseUrl = ORIGINAL_BASE, extraEnv = {}) {
  vi.resetModules();
  vi.stubEnv('VITE_API_BASE_URL', baseUrl);
  for (const [key, value] of Object.entries(extraEnv)) {
    vi.stubEnv(key, value);
  }
  return import('../api.js');
}

describe('normalizeApiBase', () => {
  it('keeps a base URL that already ends with /api', async () => {
    const { normalizeApiBase } = await loadApi();

    expect(normalizeApiBase('https://api.example.com/api')).toBe('https://api.example.com/api');
  });

  it('adds /api to a bare origin exactly once', async () => {
    const { normalizeApiBase } = await loadApi();

    expect(normalizeApiBase('https://api.example.com')).toBe('https://api.example.com/api');
    expect(normalizeApiBase('https://api.example.com/')).toBe('https://api.example.com/api');
    expect(normalizeApiBase('https://api.example.com/api/')).toBe('https://api.example.com/api');
  });

  it('never duplicates the /api prefix', async () => {
    const { normalizeApiBase } = await loadApi();

    expect(normalizeApiBase('https://api.example.com/api/api')).toBe('https://api.example.com/api');
  });

  it('supports a path prefix in front of /api', async () => {
    const { normalizeApiBase } = await loadApi();

    expect(normalizeApiBase('https://api.example.com/v1/api')).toBe('https://api.example.com/v1/api');
  });

  it('drops query strings and fragments', async () => {
    const { normalizeApiBase } = await loadApi();

    expect(normalizeApiBase('https://api.example.com/api?x=1#y')).toBe('https://api.example.com/api');
  });

  it('returns an empty string for unusable values', async () => {
    const { normalizeApiBase } = await loadApi();

    expect(normalizeApiBase('')).toBe('');
    expect(normalizeApiBase('   ')).toBe('');
    expect(normalizeApiBase('not a url')).toBe('');
    expect(normalizeApiBase('ftp://api.example.com')).toBe('');
  });
});

describe('validateApiBase', () => {
  it('rejects a missing base URL', async () => {
    const { validateApiBase } = await loadApi();

    const result = validateApiBase('', { isProduction: true });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('VITE_API_BASE_URL');
  });

  it('rejects a localhost base URL in production', async () => {
    const { validateApiBase } = await loadApi();

    for (const base of ['http://localhost:5000/api', 'http://127.0.0.1:5000/api']) {
      const result = validateApiBase(base, { isProduction: true });
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/production/i);
    }
  });

  it('allows a localhost base URL during development', async () => {
    const { validateApiBase } = await loadApi();

    expect(validateApiBase('http://127.0.0.1:5000/api', { isProduction: false }).valid).toBe(true);
  });

  it('accepts an https origin in production', async () => {
    const { validateApiBase } = await loadApi();

    expect(validateApiBase('https://api.example.com/api', { isProduction: true }).valid).toBe(true);
  });

  it('warns about plain http in production', async () => {
    const { validateApiBase } = await loadApi();

    const result = validateApiBase('http://api.example.com/api', { isProduction: true });
    expect(result.valid).toBe(true);
    expect(result.warning).toMatch(/HTTPS/);
  });
});

describe('apiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the configured base URL and returns the parsed body', async () => {
    const { apiFetch } = await loadApi();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ success: true, data: { ok: true } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const body = await apiFetch('/courses');

    expect(body).toEqual({ success: true, data: { ok: true } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/api/courses');
  });

  it('sends JSON content type, request id and authorization header', async () => {
    const { apiFetch, saveToken } = await loadApi();
    saveToken('token-123');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/users/me');

    const options = fetchMock.mock.calls[0][1];
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers.Authorization).toBe('Bearer token-123');
    expect(options.headers['X-Request-ID']).toBeTruthy();
  });

  it('does not send an authorization header without a session', async () => {
    const { apiFetch } = await loadApi();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/courses');

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it.each([
    [400, 'validation'],
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [409, 'conflict'],
    [429, 'rate_limited'],
    [500, 'server'],
  ])('maps HTTP %s to the %s error kind', async (status, kind) => {
    const { apiFetch, ApiError } = await loadApi();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status,
        headers: new Headers(),
        json: async () => ({ success: false, error: 'server said no' }),
      }),
    );

    await expect(apiFetch('/auth/login')).rejects.toMatchObject({
      kind,
      status,
      message: 'server said no',
    });
    await expect(apiFetch('/auth/login')).rejects.toBeInstanceOf(ApiError);
  });

  it('clears the stored session on a 401', async () => {
    const { apiFetch, saveToken, readToken } = await loadApi();
    saveToken('stale-token');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers(),
        json: async () => ({ success: false, error: 'Invalid email or password' }),
      }),
    );

    await expect(apiFetch('/users/me')).rejects.toThrow();
    expect(readToken()).toBeNull();
  });

  it('reports a network failure without pretending to know the cause', async () => {
    const { apiFetch, ApiError } = await loadApi();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const error = await apiFetch('/auth/login').catch((err) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.kind).toBe('network');
    expect(error.isRetryable).toBe(true);
    expect(error.message).toMatch(/could not reach the server/i);
  });

  it('reports a timeout when the request is aborted', async () => {
    const { apiFetch } = await loadApi(ORIGINAL_BASE, { VITE_API_TIMEOUT_MS: '50' });
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url, options) =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () => {
              const abortError = new Error('aborted');
              abortError.name = 'AbortError';
              reject(abortError);
            });
          }),
      ),
    );

    const error = await apiFetch('/auth/login').catch((err) => err);

    expect(error.kind).toBe('timeout');
    expect(error.isRetryable).toBe(true);
  });

  it('fails fast with a configuration error when no base URL is set', async () => {
    const { apiFetch } = await loadApi('');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const error = await apiFetch('/auth/login').catch((err) => err);

    expect(error.kind).toBe('config');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never logs credentials', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { apiFetch } = await loadApi();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers(),
        json: async () => ({ success: false, error: 'Invalid email or password' }),
      }),
    );

    await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ password: 'hunter2' }) }).catch(
      () => {},
    );

    const logged = warnSpy.mock.calls.flat().join(' ');
    expect(logged).not.toContain('hunter2');
    expect(logged).toContain('/auth/login');
    expect(logged).toContain('requestId=');
  });
});

describe('authAPI', () => {
  it('posts to the registration and login endpoints', async () => {
    const { authAPI, AUTH_ENDPOINTS } = await loadApi();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ success: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await authAPI.register({ name: 'A', email: 'a@example.com', password: 'secret123' });
    await authAPI.login({ email: 'a@example.com', password: 'secret123' });

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/api/auth/register');
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      name: 'A',
      email: 'a@example.com',
      password: 'secret123',
    });
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.example.com/api/auth/login');
    expect(AUTH_ENDPOINTS.register).toBe('https://api.example.com/api/auth/register');
  });
});
