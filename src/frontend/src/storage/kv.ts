import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/** The only storage surface the rest of the app is allowed to depend on. */
export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/** Unencrypted, available on every platform. Fine for preferences. */
export const asyncStorageStore: KeyValueStore = {
  get: (key) => AsyncStorage.getItem(key),
  set: (key, value) => AsyncStorage.setItem(key, value),
  remove: (key) => AsyncStorage.removeItem(key),
};

/** Keychain on iOS, Keystore on Android. Not implemented on web. */
export const expoSecureStore: KeyValueStore = {
  get: (key) => SecureStore.getItemAsync(key),
  set: (key, value) => SecureStore.setItemAsync(key, value),
  remove: (key) => SecureStore.deleteItemAsync(key),
};

/**
 * expo-secure-store supports Android, iOS and tvOS only. On web we fall back
 * to AsyncStorage, which is plaintext — a browser cannot hide a value from its
 * own user regardless, so this is a documented limitation rather than a gap.
 */
export function chooseSecureStore(platformOS: string): KeyValueStore {
  return platformOS === 'web' ? asyncStorageStore : expoSecureStore;
}

export async function readJson<T>(store: KeyValueStore, key: string): Promise<T | null> {
  const raw = await store.get(key);
  if (raw === null) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    // A truncated or hand-edited blob must not stop the app booting.
    return null;
  }
}

export async function writeJson<T>(
  store: KeyValueStore,
  key: string,
  value: T | null,
): Promise<void> {
  if (value === null) return store.remove(key);
  return store.set(key, JSON.stringify(value));
}
