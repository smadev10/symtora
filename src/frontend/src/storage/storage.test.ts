import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import {
  asyncStorageStore,
  chooseSecureStore,
  expoSecureStore,
  readJson,
  writeJson,
  type KeyValueStore,
} from '@/storage/kv';

function memoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    get: async (k) => map.get(k) ?? null,
    set: async (k, v) => void map.set(k, v),
    remove: async (k) => void map.delete(k),
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('json helpers', () => {
  it('round-trips a value through a store', async () => {
    const store = memoryStore();
    await writeJson(store, 'prefs', { lang: 'fr', retention: 365 });

    expect(await readJson(store, 'prefs')).toEqual({ lang: 'fr', retention: 365 });
  });

  it('returns null for a key that was never written', async () => {
    expect(await readJson(memoryStore(), 'missing')).toBeNull();
  });

  it('returns null instead of throwing when the stored value is corrupt', async () => {
    // A half-written or hand-edited blob must not brick launch: the app falls
    // back to defaults rather than crashing before the first frame.
    const store = memoryStore();
    await store.set('prefs', '{not valid json');

    expect(await readJson(store, 'prefs')).toBeNull();
  });

  it('removes the key when writing null', async () => {
    const store = memoryStore();
    await writeJson(store, 'session', { token: 'abc' });
    await writeJson(store, 'session', null);

    expect(await store.get('session')).toBeNull();
  });
});

describe('asyncStorageStore', () => {
  it('persists and reads back a value', async () => {
    await asyncStorageStore.set('k', 'v');
    expect(await asyncStorageStore.get('k')).toBe('v');
  });

  it('returns null after removal', async () => {
    await asyncStorageStore.set('k', 'v');
    await asyncStorageStore.remove('k');
    expect(await asyncStorageStore.get('k')).toBeNull();
  });
});

describe('expoSecureStore', () => {
  it('persists and reads back a value', async () => {
    await expoSecureStore.set('token', 'jwt');
    expect(await expoSecureStore.get('token')).toBe('jwt');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('token', 'jwt');
  });

  it('returns null after removal', async () => {
    await expoSecureStore.set('token', 'jwt');
    await expoSecureStore.remove('token');
    expect(await expoSecureStore.get('token')).toBeNull();
  });
});

describe('chooseSecureStore', () => {
  it('uses the encrypted keychain store on native platforms', () => {
    expect(chooseSecureStore('ios')).toBe(expoSecureStore);
    expect(chooseSecureStore('android')).toBe(expoSecureStore);
  });

  it('falls back to async storage on web, where SecureStore has no support', () => {
    // expo-secure-store ships no web implementation. A browser cannot keep a
    // secret from its own user anyway, so this is documented, not solved.
    expect(chooseSecureStore('web')).toBe(asyncStorageStore);
  });
});
