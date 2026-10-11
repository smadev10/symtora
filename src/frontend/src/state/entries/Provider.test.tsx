import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ApiError, ERROR_KEYS } from '@/api/errors';
import type { EntriesRepository } from '@/repositories/entriesRepository';
import { EntriesProvider, useEntries, type RetryPolicy } from '@/state/entries/Provider';
import { SettingsProvider, useSettings } from '@/state/settings/Provider';
import type { KeyValueStore } from '@/storage/kv';

const nullStore: KeyValueStore = {
  get: async () => null,
  set: async () => {},
  remove: async () => {},
};

function fakeRepository(overrides: Partial<EntriesRepository> = {}): EntriesRepository {
  return {
    list: async (lang) => [
      {
        id: `entry-${lang}`,
        title: `Title ${lang}`,
        dateLabel: 'Today',
        region: 'Head',
        urgency: 'low',
        urgencyLabel: 'Low',
        createdAt: '2026-10-10T09:00:00.000Z',
        bodyRegion: null,
      },
    ],
    get: async () => null,
    create: async () => ({ id: 'new-entry', status: 'Pending' }),
    ...overrides,
  };
}

/** No waiting between attempts, and background retries far beyond any test. */
const NO_QUICK_RETRIES: RetryPolicy = { quick: [], background: 60_000 };

function wrapperFor(repository: EntriesRepository, retryPolicy: RetryPolicy = NO_QUICK_RETRIES) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SettingsProvider store={nullStore}>
        <EntriesProvider repository={repository} retryPolicy={retryPolicy}>
          {children}
        </EntriesProvider>
      </SettingsProvider>
    );
  };
}

const bothHooks = () => ({ entries: useEntries(), settings: useSettings() });

describe('EntriesProvider loading', () => {
  it('loads entries on mount', async () => {
    const { result } = await renderHook(() => useEntries(), {
      wrapper: wrapperFor(fakeRepository()),
    });

    await waitFor(() => expect(result.current.entries.status).toBe('ready'));
    expect(result.current.entries.items).toHaveLength(1);
  });

  it('reloads in the new language when the setting changes', async () => {
    // Titles, region and date labels are localised while mapping, so a
    // language switch has to refetch rather than just re-render.
    const { result } = await renderHook(bothHooks, { wrapper: wrapperFor(fakeRepository()) });
    await waitFor(() => expect(result.current.entries.entries.status).toBe('ready'));
    expect(result.current.entries.entries.items[0].id).toBe('entry-de');

    await act(async () => {
      result.current.settings.setLang('fr');
    });

    await waitFor(() => expect(result.current.entries.entries.items[0].id).toBe('entry-fr'));
  });
});

describe('EntriesProvider failure', () => {
  it('records the ApiError translation key', async () => {
    const repository = fakeRepository({
      list: async () => {
        throw new ApiError('network');
      },
    });

    const { result } = await renderHook(() => useEntries(), { wrapper: wrapperFor(repository) });

    await waitFor(() => expect(result.current.entries.status).toBe('error'));
    expect(result.current.entries.errorKey).toBe(ERROR_KEYS.network);
  });

  it('falls back to the unknown key for a non-API failure', async () => {
    const repository = fakeRepository({
      list: async () => {
        throw new Error('boom');
      },
    });

    const { result } = await renderHook(() => useEntries(), { wrapper: wrapperFor(repository) });

    await waitFor(() => expect(result.current.entries.status).toBe('error'));
    expect(result.current.entries.errorKey).toBe(ERROR_KEYS.unknown);
  });

  it('can recover on a manual reload', async () => {
    let shouldFail = true;
    const repository = fakeRepository({
      list: async (lang) => {
        if (shouldFail) throw new ApiError('server');
        return [
          {
            id: `entry-${lang}`,
            title: 'Recovered',
            dateLabel: 'Today',
            region: 'Head',
            urgency: 'low' as const,
            urgencyLabel: 'Low',
            createdAt: '2026-10-10T09:00:00.000Z',
            bodyRegion: null,
          },
        ];
      },
    });

    const { result } = await renderHook(() => useEntries(), { wrapper: wrapperFor(repository) });
    await waitFor(() => expect(result.current.entries.status).toBe('error'));

    shouldFail = false;
    await act(async () => {
      await result.current.reload();
    });

    await waitFor(() => expect(result.current.entries.status).toBe('ready'));
    expect(result.current.entries.errorKey).toBeNull();
  });
});

describe('EntriesProvider automatic retries', () => {
  const recovered = (lang: string) => [
    {
      id: `entry-${lang}`,
      title: 'Recovered',
      dateLabel: 'Today',
      region: 'Head',
      urgency: 'low' as const,
      urgencyLabel: 'Low',
      createdAt: '2026-10-10T09:00:00.000Z',
      bodyRegion: null,
    },
  ];

  it('retries a failed load by itself and never shows the error when a retry works', async () => {
    let calls = 0;
    const statuses: string[] = [];
    const repository = fakeRepository({
      list: async (lang) => {
        calls += 1;
        if (calls < 3) throw new ApiError('network');
        return recovered(lang);
      },
    });

    const { result } = await renderHook(
      () => {
        const value = useEntries();
        statuses.push(value.entries.status);
        return value;
      },
      { wrapper: wrapperFor(repository, { quick: [0, 0, 0], background: 60_000 }) },
    );

    await waitFor(() => expect(result.current.entries.status).toBe('ready'));
    expect(calls).toBe(3);
    expect(statuses).not.toContain('error');
  });

  it('counts the attempts while retrying', async () => {
    const repository = fakeRepository({
      list: async () => {
        throw new ApiError('timeout');
      },
    });

    const { result } = await renderHook(() => useEntries(), {
      wrapper: wrapperFor(repository, { quick: [0, 60_000], background: 60_000 }),
    });

    await waitFor(() => expect(result.current.entries.attempt).toBe(1));
    expect(result.current.entries.status).toBe('loading');
  });

  it('keeps retrying in the background after showing the error, and recovers without a tap', async () => {
    let shouldFail = true;
    const repository = fakeRepository({
      list: async (lang) => {
        if (shouldFail) throw new ApiError('server');
        return recovered(lang);
      },
    });

    const { result } = await renderHook(() => useEntries(), {
      wrapper: wrapperFor(repository, { quick: [], background: 20 }),
    });
    await waitFor(() => expect(result.current.entries.status).toBe('error'));

    shouldFail = false;

    await waitFor(() => expect(result.current.entries.status).toBe('ready'));
  });

  it('does not retry a rejected session, which fails the same way every time', async () => {
    let calls = 0;
    const repository = fakeRepository({
      list: async () => {
        calls += 1;
        throw new ApiError('unauthorized');
      },
    });

    const { result } = await renderHook(() => useEntries(), {
      wrapper: wrapperFor(repository, { quick: [0, 0], background: 0 }),
    });

    await waitFor(() => expect(result.current.entries.status).toBe('error'));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(calls).toBe(1);
    expect(result.current.entries.errorKey).toBe(ERROR_KEYS.unauthorized);
  });
});

describe('EntriesProvider session', () => {
  /** Mutable so `rerender` can sign in and out without remounting the tree. */
  let sessionKey: string | null = null;

  function sessionWrapper(repository: EntriesRepository) {
    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <SettingsProvider store={nullStore}>
          <EntriesProvider repository={repository} retryPolicy={NO_QUICK_RETRIES} sessionKey={sessionKey}>
            {children}
          </EntriesProvider>
        </SettingsProvider>
      );
    };
  }

  beforeEach(() => {
    sessionKey = null;
  });

  it('loads nothing while signed out, then loads on sign-in', async () => {
    const list = jest.fn(fakeRepository().list);
    const { result, rerender } = await renderHook(() => useEntries(), {
      wrapper: sessionWrapper(fakeRepository({ list })),
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(list).not.toHaveBeenCalled();
    expect(result.current.entries.status).toBe('idle');

    sessionKey = 'token-a';
    await rerender({});

    await waitFor(() => expect(result.current.entries.status).toBe('ready'));
    expect(list).toHaveBeenCalledTimes(1);
  });

  it('empties the list on sign-out, so the next person sees nothing of it', async () => {
    sessionKey = 'token-a';
    const { result, rerender } = await renderHook(() => useEntries(), {
      wrapper: sessionWrapper(fakeRepository()),
    });
    await waitFor(() => expect(result.current.entries.items).toHaveLength(1));

    sessionKey = null;
    await rerender({});

    await waitFor(() => expect(result.current.entries.items).toEqual([]));
    expect(result.current.entries.status).toBe('idle');
  });
});

describe('EntriesProvider clear', () => {
  it('empties the list when the user wipes their data', async () => {
    const { result } = await renderHook(() => useEntries(), {
      wrapper: wrapperFor(fakeRepository()),
    });
    await waitFor(() => expect(result.current.entries.status).toBe('ready'));

    await act(async () => {
      result.current.clear();
    });

    expect(result.current.entries.items).toEqual([]);
  });
});

describe('useEntries', () => {
  it('throws a useful error when used outside the provider', async () => {
    await expect(renderHook(() => useEntries())).rejects.toThrow(/EntriesProvider/);
  });
});
