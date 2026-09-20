import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { SettingsProvider, useSettings } from '@/state/settings/Provider';
import { DEFAULT_SETTINGS } from '@/state/settings/reducer';
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

/** A store whose first read never settles, to freeze the app mid-hydration. */
function neverResolvingStore(seed: Record<string, string>) {
  const inner = memoryStore(seed);
  return {
    ...inner,
    get: () => new Promise<string | null>(() => {}),
  };
}

const wrapperFor = (store: KeyValueStore) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <SettingsProvider store={store}>{children}</SettingsProvider>;
  };

describe('SettingsProvider', () => {
  it('starts from the defaults', async () => {
    const store = memoryStore();

    const { result } = await renderHook(() => useSettings(), { wrapper: wrapperFor(store) });

    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('hydrates from what was persisted', async () => {
    const store = memoryStore({
      [STORAGE_KEYS.settings]: JSON.stringify({ lang: 'fr', theme: 'dark', retention: 365 }),
    });

    const { result } = await renderHook(() => useSettings(), { wrapper: wrapperFor(store) });

    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.settings).toEqual({
      ...DEFAULT_SETTINGS,
      lang: 'fr',
      theme: 'dark',
      retention: 365,
    });
  });

  it('persists a change so it survives the next launch', async () => {
    const store = memoryStore();

    const { result } = await renderHook(() => useSettings(), { wrapper: wrapperFor(store) });
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    await act(async () => {
      result.current.setLang('en');
    });

    await waitFor(() =>
      expect(JSON.parse(store.map.get(STORAGE_KEYS.settings) ?? '{}')).toMatchObject({
        lang: 'en',
      }),
    );
  });

  it('does not overwrite stored settings with defaults before hydration finishes', async () => {
    // The persist effect runs on first render too. Without a hydration guard
    // it would write the defaults straight over the user's saved preferences.
    const stored = JSON.stringify({ lang: 'fr', theme: 'dark' });
    const store = neverResolvingStore({ [STORAGE_KEYS.settings]: stored });

    const { result } = await renderHook(() => useSettings(), { wrapper: wrapperFor(store) });

    expect(result.current.hydrated).toBe(false);
    expect(store.map.get(STORAGE_KEYS.settings)).toBe(stored);
  });

  it('throws a useful error when used outside the provider', async () => {
    await expect(renderHook(() => useSettings())).rejects.toThrow(/SettingsProvider/);
  });
});
