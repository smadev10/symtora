import { ApiError, ERROR_KEYS } from '@/api/errors';
import { createClient } from '@/api/client';

type FetchArgs = { url: string; init: RequestInit };

function stubFetch(responder: (args: FetchArgs) => Promise<Response> | Response) {
  const calls: FetchArgs[] = [];
  const impl = ((url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    return Promise.resolve(responder({ url, init }));
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function clientWith(
  responder: (args: FetchArgs) => Promise<Response> | Response,
  token: string | null = null,
) {
  const { impl, calls } = stubFetch(responder);
  const client = createClient({
    baseUrl: 'https://api.test',
    fetchImpl: impl,
    getToken: () => token,
    timeoutMs: 50,
  });
  return { client, calls };
}

describe('request', () => {
  it('joins the base URL and the path', async () => {
    const { client, calls } = clientWith(() => json({ ok: true }));

    await client.request('/entries');

    expect(calls[0].url).toBe('https://api.test/entries');
  });

  it('tolerates a base URL with a trailing slash', async () => {
    const { impl, calls } = stubFetch(() => json({}));
    const client = createClient({ baseUrl: 'https://api.test/', fetchImpl: impl });

    await client.request('/entries');

    expect(calls[0].url).toBe('https://api.test/entries');
  });

  it('returns the parsed JSON body', async () => {
    const { client } = clientWith(() => json({ id: 'abc', status: 'Pending' }));

    await expect(client.request('/entries')).resolves.toEqual({ id: 'abc', status: 'Pending' });
  });

  it('serialises the body and sets a JSON content type', async () => {
    const { client, calls } = clientWith(() => json({}));

    await client.request('/auth/login', { method: 'POST', body: { email: 'a@b.ch' } });

    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.body).toBe(JSON.stringify({ email: 'a@b.ch' }));
    expect(new Headers(calls[0].init.headers).get('Content-Type')).toBe('application/json');
  });

  it('resolves to null for a 204 with no body', async () => {
    const { client } = clientWith(() => new Response(null, { status: 204 }));

    await expect(client.request('/me/data', { method: 'DELETE' })).resolves.toBeNull();
  });
});

describe('authorization', () => {
  it('attaches the bearer token when one is available', async () => {
    const { client, calls } = clientWith(() => json({}), 'jwt-abc');

    await client.request('/entries', { auth: true });

    expect(new Headers(calls[0].init.headers).get('Authorization')).toBe('Bearer jwt-abc');
  });

  it('sends no Authorization header when signed out', async () => {
    const { client, calls } = clientWith(() => json({}), null);

    await client.request('/entries', { auth: true });

    expect(new Headers(calls[0].init.headers).has('Authorization')).toBe(false);
  });

  it('sends no Authorization header on unauthenticated routes even with a token', async () => {
    const { client, calls } = clientWith(() => json({}), 'jwt-abc');

    await client.request('/auth/login', { method: 'POST' });

    expect(new Headers(calls[0].init.headers).has('Authorization')).toBe(false);
  });
});

describe('error mapping', () => {
  it('maps a rejected fetch to a network error', async () => {
    const { impl } = stubFetch(() => {
      throw new TypeError('Failed to fetch');
    });
    const client = createClient({ baseUrl: 'https://api.test', fetchImpl: impl });

    await expect(client.request('/entries')).rejects.toMatchObject({
      kind: 'network',
      messageKey: ERROR_KEYS.network,
    });
  });

  it('maps an aborted request to a timeout error', async () => {
    const client = createClient({
      baseUrl: 'https://api.test',
      timeoutMs: 10,
      fetchImpl: ((_url: string, init: RequestInit = {}) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })),
          );
        })) as unknown as typeof fetch,
    });

    await expect(client.request('/entries')).rejects.toMatchObject({
      kind: 'timeout',
      messageKey: ERROR_KEYS.timeout,
    });
  });

  it('maps 400 to a validation error and keeps the field details', async () => {
    const { client } = clientWith(() =>
      json({ title: 'One or more validation errors', errors: { Password: ['Too short'] } }, 400),
    );

    await expect(client.request('/auth/register', { method: 'POST' })).rejects.toMatchObject({
      kind: 'validation',
      messageKey: ERROR_KEYS.validation,
      fieldErrors: { Password: ['Too short'] },
    });
  });

  it('maps 401 to an unauthorized error', async () => {
    const { client } = clientWith(() => json({}, 401));

    await expect(client.request('/entries', { auth: true })).rejects.toMatchObject({
      kind: 'unauthorized',
      messageKey: ERROR_KEYS.unauthorized,
    });
  });

  it('maps 404 to a not-found error', async () => {
    const { client } = clientWith(() => json({}, 404));

    await expect(client.request('/entries/nope')).rejects.toMatchObject({ kind: 'notFound' });
  });

  it('maps 409 to a conflict, e.g. an email that is already registered', async () => {
    const { client } = clientWith(() => json({ title: 'Email already registered.' }, 409));

    await expect(client.request('/auth/register')).rejects.toMatchObject({
      kind: 'conflict',
      messageKey: ERROR_KEYS.conflict,
      status: 409,
    });
  });

  it('maps 5xx to a server error', async () => {
    const { client } = clientWith(() => json({}, 503));

    await expect(client.request('/entries')).rejects.toMatchObject({
      kind: 'server',
      messageKey: ERROR_KEYS.server,
      status: 503,
    });
  });

  it('survives an error response that is not JSON at all', async () => {
    // A proxy or gateway in front of the API will happily return HTML.
    const { client } = clientWith(() => new Response('<html>502</html>', { status: 502 }));

    await expect(client.request('/entries')).rejects.toMatchObject({ kind: 'server' });
  });

  it('never surfaces a raw server message as user-facing text', async () => {
    // Error text has to be translatable, so screens render the key, not this.
    const { client } = clientWith(() => json({ title: 'Object reference not set' }, 500));

    const error = await client.request('/entries').catch((e: unknown) => e as ApiError);

    expect(error).toBeInstanceOf(ApiError);
    expect(Object.values(ERROR_KEYS)).toContain((error as ApiError).messageKey);
  });
});

describe('form uploads', () => {
  it('sends FormData as-is and leaves the multipart content type to fetch', async () => {
    const { client, calls } = clientWith(() => json({ text: 'ok' }));
    const form = new FormData();
    form.append('language', 'de');

    await client.request('/transcriptions', { method: 'POST', form });

    expect(calls[0].init.body).toBe(form);
    expect(new Headers(calls[0].init.headers).get('Content-Type')).toBeNull();
  });

  it('lets one request wait longer than the client default', async () => {
    // Answers after 80 ms unless the request is aborted first, like a real slow server.
    const client = createClient({
      baseUrl: 'https://api.test',
      timeoutMs: 50,
      fetchImpl: ((_url: string, init: RequestInit = {}) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(() => resolve(json({ ok: true })), 80);
          init.signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
          });
        })) as unknown as typeof fetch,
    });

    await expect(client.request('/slow', { timeoutMs: 500 })).resolves.toEqual({ ok: true });
  });
});
