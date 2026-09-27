import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ApiError, ERROR_KEYS } from '@/api/errors';
import type { AuthApi } from '@/api/auth';
import { SessionProvider, useSession } from '@/state/session/Provider';
import { displayNameFromEmail, useAuth } from '@/state/session/useAuth';
import type { KeyValueStore } from '@/storage/kv';

const nullStore: KeyValueStore = {
  get: async () => null,
  set: async () => {},
  remove: async () => {},
};

const ok = {
  token: 'jwt-abc',
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  name: 'Saimon Mahari',
};

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function fakeAuthApi(overrides: Partial<AuthApi> = {}): AuthApi {
  return { login: async () => ok, register: async () => ok, ...overrides };
}

function wrapper({ children }: { children: ReactNode }) {
  return <SessionProvider store={nullStore}>{children}</SessionProvider>;
}

const hooks = (authApi: AuthApi) => () => ({ auth: useAuth(authApi), session: useSession() });

describe('displayNameFromEmail', () => {
  it('turns a dotted local part into a capitalised name', () => {
    expect(displayNameFromEmail('saimon.mahari@example.ch')).toBe('Saimon Mahari');
  });

  it('handles a single-word local part', () => {
    expect(displayNameFromEmail('saimon@example.ch')).toBe('Saimon');
  });

  it('treats underscores and hyphens as separators too', () => {
    expect(displayNameFromEmail('anna_maria-mueller@example.ch')).toBe('Anna Maria Mueller');
  });

  it('falls back to the whole string when there is no @', () => {
    expect(displayNameFromEmail('nonsense')).toBe('Nonsense');
  });

  it('returns an empty string for an empty local part', () => {
    expect(displayNameFromEmail('@example.ch')).toBe('');
  });
});

describe('login', () => {
  it('signs the session in with the returned token and name', async () => {
    const { result } = await renderHook(hooks(fakeAuthApi()), { wrapper });
    await waitFor(() => expect(result.current.session.session.status).toBe('anonymous'));

    await act(async () => {
      await result.current.auth.login('s.m@example.ch', 'hunter22');
    });

    expect(result.current.session.session).toEqual({
      status: 'authenticated',
      token: 'jwt-abc',
      expiresAt: ok.expiresAt,
      user: { email: 's.m@example.ch', name: 'Saimon Mahari' },
    });
  });

  it('derives a name from the email when the account has none stored', async () => {
    // Accounts registered before the API stored names come back with an empty one.
    const authApi = fakeAuthApi({ login: async () => ({ ...ok, name: '' }) });
    const { result } = await renderHook(hooks(authApi), { wrapper });
    await waitFor(() => expect(result.current.session.session.status).toBe('anonymous'));

    await act(async () => {
      await result.current.auth.login('anna.muster@example.ch', 'hunter22');
    });

    expect(result.current.session.session).toMatchObject({
      user: { email: 'anna.muster@example.ch', name: 'Anna Muster' },
    });
  });

  it('sends a hashed password rather than the one the user typed', async () => {
    const sent: unknown[] = [];
    const authApi = fakeAuthApi({
      login: async (request) => {
        sent.push(request);
        return ok;
      },
    });

    const { result } = await renderHook(hooks(authApi), { wrapper });
    await waitFor(() => expect(result.current.session.session.status).toBe('anonymous'));

    await act(async () => {
      await result.current.auth.login('saimon.mahari@example.ch', 'hunter22');
    });

    expect(sent).toEqual([
      { email: 'saimon.mahari@example.ch', password: await sha256('hunter22') },
    ]);
  });

  it('surfaces a wrong password as the unauthorized translation key', async () => {
    const authApi = fakeAuthApi({
      login: async () => {
        throw new ApiError('unauthorized', { status: 401 });
      },
    });

    const { result } = await renderHook(hooks(authApi), { wrapper });
    await waitFor(() => expect(result.current.session.session.status).toBe('anonymous'));

    await act(async () => {
      await result.current.auth.login('a@b.ch', 'wrong');
    });

    expect(result.current.auth.errorKey).toBe(ERROR_KEYS.unauthorized);
    expect(result.current.session.session.status).toBe('anonymous');
  });

  it('maps an unexpected failure to the unknown key', async () => {
    const authApi = fakeAuthApi({
      login: async () => {
        throw new Error('boom');
      },
    });

    const { result } = await renderHook(hooks(authApi), { wrapper });

    await act(async () => {
      await result.current.auth.login('a@b.ch', 'x');
    });

    expect(result.current.auth.errorKey).toBe(ERROR_KEYS.unknown);
  });

  it('clears a previous error when a retry succeeds', async () => {
    let fail = true;
    const authApi = fakeAuthApi({
      login: async () => {
        if (fail) throw new ApiError('unauthorized');
        return ok;
      },
    });

    const { result } = await renderHook(hooks(authApi), { wrapper });
    await act(async () => {
      await result.current.auth.login('a@b.ch', 'wrong');
    });
    expect(result.current.auth.errorKey).toBe(ERROR_KEYS.unauthorized);

    fail = false;
    await act(async () => {
      await result.current.auth.login('a@b.ch', 'right');
    });

    expect(result.current.auth.errorKey).toBeNull();
  });
});

describe('register', () => {
  it('sends the name, email and a hashed password', async () => {
    const sent: unknown[] = [];
    const authApi = fakeAuthApi({
      register: async (request) => {
        sent.push(request);
        return ok;
      },
    });

    const { result } = await renderHook(hooks(authApi), { wrapper });
    await waitFor(() => expect(result.current.session.session.status).toBe('anonymous'));

    await act(async () => {
      await result.current.auth.register('Saimon Mahari', 'new@example.ch', 'hunter22');
    });

    expect(sent).toEqual([
      { name: 'Saimon Mahari', email: 'new@example.ch', password: await sha256('hunter22') },
    ]);
    expect(result.current.session.session).toMatchObject({
      user: { email: 'new@example.ch', name: 'Saimon Mahari' },
    });
  });

  it('reports a rejected password as the validation key', async () => {
    const authApi = fakeAuthApi({
      register: async () => {
        throw new ApiError('validation', { status: 400, fieldErrors: { Password: ['Too short'] } });
      },
    });

    const { result } = await renderHook(hooks(authApi), { wrapper });

    await act(async () => {
      await result.current.auth.register('N', 'a@b.ch', 'short');
    });

    expect(result.current.auth.errorKey).toBe(ERROR_KEYS.validation);
  });
});

describe('submitting', () => {
  it('reports submitting while the request is in flight', async () => {
    let release: (() => void) | undefined;
    const authApi = fakeAuthApi({
      login: async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return ok;
      },
    });

    const { result } = await renderHook(hooks(authApi), { wrapper });

    let pending: Promise<void> | undefined;
    await act(async () => {
      pending = result.current.auth.login('a@b.ch', 'x');
    });

    expect(result.current.auth.submitting).toBe(true);

    await act(async () => {
      release?.();
      await pending;
    });

    expect(result.current.auth.submitting).toBe(false);
  });
});
