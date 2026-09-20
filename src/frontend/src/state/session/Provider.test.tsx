import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { SessionProvider, useSession } from '@/state/session/Provider';
import type { PersistedSession } from '@/state/session/reducer';
import { STORAGE_KEYS } from '@/storage/keys';
import type { KeyValueStore } from '@/storage/kv';

function memoryStore(seed?: Record<string, string>) {
  const map = new Map<string, string>(Object.entries(seed ?? {}));
  const store: KeyValueStore & { map: Map<string, string> } = {
    map,
    get: async (k) => map.get(k) ?? null,
    set: async (k, v) => void map.set(k, v),
    remove: async (k) => void map.delete(k),
  };
  return store;
}

const session: PersistedSession = {
  token: 'jwt-abc',
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  user: { email: 'saimon@example.ch', name: 'Saimon Mahari' },
};

const expired: PersistedSession = {
  ...session,
  expiresAt: new Date(Date.now() - 1_000).toISOString(),
};

const wrapperFor = (store: KeyValueStore) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <SessionProvider store={store}>{children}</SessionProvider>;
  };

describe('SessionProvider restore', () => {
  it('settles on anonymous when nothing is stored', async () => {
    const { result } = await renderHook(() => useSession(), { wrapper: wrapperFor(memoryStore()) });

    await waitFor(() => expect(result.current.session.status).toBe('anonymous'));
  });

  it('restores a session that has not expired', async () => {
    const store = memoryStore({ [STORAGE_KEYS.session]: JSON.stringify(session) });

    const { result } = await renderHook(() => useSession(), { wrapper: wrapperFor(store) });

    await waitFor(() => expect(result.current.session.status).toBe('authenticated'));
    expect(result.current.session).toEqual({ status: 'authenticated', ...session });
  });

  it('refuses an expired session and clears it from storage', async () => {
    // Leaving a dead token on disk means every launch retries it and every
    // request 401s before the user is sent to login.
    const store = memoryStore({ [STORAGE_KEYS.session]: JSON.stringify(expired) });

    const { result } = await renderHook(() => useSession(), { wrapper: wrapperFor(store) });

    await waitFor(() => expect(result.current.session.status).toBe('anonymous'));
    await waitFor(() => expect(store.map.has(STORAGE_KEYS.session)).toBe(false));
  });
});

describe('SessionProvider sign in and out', () => {
  it('persists the session so the next launch restores it', async () => {
    const store = memoryStore();
    const { result } = await renderHook(() => useSession(), { wrapper: wrapperFor(store) });
    await waitFor(() => expect(result.current.session.status).toBe('anonymous'));

    await act(async () => {
      result.current.signIn(session);
    });

    expect(result.current.session.status).toBe('authenticated');
    await waitFor(() =>
      expect(JSON.parse(store.map.get(STORAGE_KEYS.session) ?? 'null')).toEqual(session),
    );
  });

  it('erases the stored token on sign-out', async () => {
    const store = memoryStore({ [STORAGE_KEYS.session]: JSON.stringify(session) });
    const { result } = await renderHook(() => useSession(), { wrapper: wrapperFor(store) });
    await waitFor(() => expect(result.current.session.status).toBe('authenticated'));

    await act(async () => {
      result.current.signOut();
    });

    expect(result.current.session.status).toBe('anonymous');
    await waitFor(() => expect(store.map.has(STORAGE_KEYS.session)).toBe(false));
  });
});

describe('SessionProvider profile', () => {
  it('persists a renamed profile without disturbing the token', async () => {
    const store = memoryStore({ [STORAGE_KEYS.session]: JSON.stringify(session) });
    const { result } = await renderHook(() => useSession(), { wrapper: wrapperFor(store) });
    await waitFor(() => expect(result.current.session.status).toBe('authenticated'));

    await act(async () => {
      result.current.updateProfile({ name: 'S. Mahari' });
    });

    await waitFor(() => {
      const stored = JSON.parse(store.map.get(STORAGE_KEYS.session) ?? 'null');
      expect(stored).toEqual({ ...session, user: { ...session.user, name: 'S. Mahari' } });
    });
  });
});

describe('useSession', () => {
  it('throws a useful error when used outside the provider', async () => {
    await expect(renderHook(() => useSession())).rejects.toThrow(/SessionProvider/);
  });
});
