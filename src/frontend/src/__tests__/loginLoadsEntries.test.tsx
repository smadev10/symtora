import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { cleanup, fireEvent, renderRouter, waitFor } from 'expo-router/testing-library';

import type { EntryResponse } from '@/api/types';
import { TR } from '@/i18n/translations';
import { STORAGE_KEYS } from '@/storage/keys';

/**
 * Regression: the entries list used to load once at app start, while the
 * visitor was still signed out. The API answered 401, and logging in never
 * loaded it again, so the home screen said the session had expired.
 */

const t = TR.de;
const TOKEN = 'jwt-after-login';

const entry: EntryResponse = {
  id: '5f0c6f2e-0000-4000-8000-000000000002',
  rawText: 'Seit gestern Halsweh',
  bodyRegion: 'throat',
  status: 'Done',
  createdAt: new Date().toISOString(),
  assessment: {
    causes: [{ label: 'Erkältung', tier: 'high' }],
    urgency: 'low',
    nextSteps: ['Viel trinken.'],
    generatedAt: new Date().toISOString(),
  },
};

/** Like the real API: entries need the bearer token, login hands one out. */
function fakeApi(url: string, init?: RequestInit) {
  const reply = (status: number, body: unknown) =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      text: async () => (body === undefined ? '' : JSON.stringify(body)),
    });

  const path = new URL(url).pathname;
  if (path === '/auth/login') {
    return reply(200, { token: TOKEN, expiresAt: new Date(Date.now() + 86_400_000).toISOString(), name: 'Saimon' });
  }
  const auth = new Headers(init?.headers).get('Authorization');
  if (auth !== `Bearer ${TOKEN}`) return reply(401, undefined);
  if (path === '/entries') return reply(200, [entry]);
  return reply(404, undefined);
}

beforeEach(async () => {
  jest.spyOn(globalThis, 'fetch').mockImplementation(fakeApi as typeof fetch);
  await AsyncStorage.clear();
  await SecureStore.deleteItemAsync(STORAGE_KEYS.session);
  await AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ consentAccepted: true }));
});

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

it('shows the entries after logging in, not a session-expired message', async () => {
  const view = await renderRouter('src/app', { initialUrl: '/login' });

  await fireEvent.changeText(await view.findByPlaceholderText(t.login.emailPlaceholder), 'saimon@example.ch');
  await fireEvent.changeText(view.getByPlaceholderText(t.login.passwordPlaceholder), 'correct horse');
  await fireEvent.press(view.getByText(t.login.loginCta));

  expect(await view.findByText(`${t.dates.today} · ${t.regionLabels.throat}`)).toBeTruthy();
  expect(view.queryByText(t.states.sessionExpiredTitle)).toBeNull();
});
