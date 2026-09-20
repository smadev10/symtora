import { createAuthApi } from '@/api/auth';
import type { ApiClient, RequestOptions } from '@/api/client';

function recordingClient(result: unknown = { token: 'jwt', expiresAt: '2026-09-21T12:00:00Z' }) {
  const calls: { path: string; options?: RequestOptions }[] = [];
  const client: ApiClient = {
    request: async <T,>(path: string, options?: RequestOptions) => {
      calls.push({ path, options });
      return result as T;
    },
  };
  return { client, calls };
}

describe('login', () => {
  it('posts the credentials to the login route', async () => {
    const { client, calls } = recordingClient();

    await createAuthApi(client).login({ email: 'saimon@example.ch', password: 'hunter22' });

    expect(calls[0].path).toBe('/auth/login');
    expect(calls[0].options?.method).toBe('POST');
    expect(calls[0].options?.body).toEqual({
      email: 'saimon@example.ch',
      password: 'hunter22',
    });
  });

  it('returns the token and its expiry', async () => {
    const { client } = recordingClient({ token: 'jwt-abc', expiresAt: '2026-09-21T12:00:00Z' });

    await expect(
      createAuthApi(client).login({ email: 'a@b.ch', password: 'hunter22' }),
    ).resolves.toEqual({ token: 'jwt-abc', expiresAt: '2026-09-21T12:00:00Z' });
  });

  it('does not ask for an Authorization header', async () => {
    // Signing in with a stale token attached is how you get a confusing 401
    // on the one route that should never need one.
    const { client, calls } = recordingClient();

    await createAuthApi(client).login({ email: 'a@b.ch', password: 'hunter22' });

    expect(calls[0].options?.auth).toBeFalsy();
  });
});

describe('register', () => {
  it('posts only the fields the API accepts', async () => {
    // RegisterRequest is { email, password }. The signup screen also collects
    // a name, which has nowhere to go and stays on the device.
    const { client, calls } = recordingClient();

    await createAuthApi(client).register({ email: 'new@example.ch', password: 'hunter22' });

    expect(calls[0].path).toBe('/auth/register');
    expect(calls[0].options?.method).toBe('POST');
    expect(calls[0].options?.body).toEqual({
      email: 'new@example.ch',
      password: 'hunter22',
    });
  });
});
