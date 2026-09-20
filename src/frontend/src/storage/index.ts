import { Platform } from 'react-native';

import { asyncStorageStore, chooseSecureStore } from './kv';

/** Preferences: unencrypted, every platform. */
export const prefsStore = asyncStorageStore;

/** Credentials: Keychain/Keystore on native, AsyncStorage on web. */
export const secureStore = chooseSecureStore(Platform.OS);

export * from './keys';
export * from './kv';
