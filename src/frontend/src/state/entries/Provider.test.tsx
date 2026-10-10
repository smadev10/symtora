import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ApiError, ERROR_KEYS } from '@/api/errors';
import type { EntriesRepository } from '@/repositories/entriesRepository';
import { EntriesProvider, useEntries } from '@/state/entries/Provider';
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
      },
    ],
    get: async () => null,
    create: async () => ({ id: 'new-entry', status: 'Pending' }),
    ...overrides,
  };
}

function wrapperFor(repository: EntriesRepository) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SettingsProvider store={nullStore}>
        <EntriesProvider repository={repository}>{children}</EntriesProvider>
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
