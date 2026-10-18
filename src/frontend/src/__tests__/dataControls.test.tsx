import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { cleanup, fireEvent, renderRouter, waitFor } from 'expo-router/testing-library';

import type { EntryResponse } from '@/api/types';
import { TR } from '@/i18n/translations';
import { STORAGE_KEYS } from '@/storage/keys';

/**
 * Regression: "delete all data" used to only empty the list on screen. The
 * entries stayed on the server and came back on the next reload, so the
 * onboarding promise "deletable at any time" was not kept.
 */

const t = TR.de;
const TOKEN = 'jwt-signed-in';

const session = {
  token: TOKEN,
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  user: { email: 'saimon@example.ch', name: 'Saimon' },
};

const entry: EntryResponse = {
  id: '5f0c6f2e-0000-4000-8000-000000000003',
  rawText: 'Seit gestern Halsweh',
  bodyRegion: 'throat',
  status: 'Done',
  createdAt: new Date().toISOString(),
  assessment: null,
};

/** A tiny stateful server: deletes really remove what later requests see. */
function fakeServer({ failDeletes = false } = {}) {
  const state = { entries: [entry], accountExists: true, calls: [] as string[] };

  const handler = (url: string, init?: RequestInit) => {
    const reply = (status: number, body?: unknown) =>
      Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        text: async () => (body === undefined ? '' : JSON.stringify(body)),
      });

    const path = new URL(url).pathname;
    const method = init?.method ?? 'GET';
    state.calls.push(`${method} ${path}`);

    const auth = new Headers(init?.headers).get('Authorization');
    if (auth !== `Bearer ${TOKEN}` || !state.accountExists) return reply(401);

    if (method === 'DELETE' && failDeletes) return reply(500);
    if (method === 'GET' && path === '/entries') return reply(200, state.entries);
    if (method === 'DELETE' && path === '/me/data') {
      state.entries = [];
      return reply(204);
    }
    if (method === 'DELETE' && path === '/me') {
      state.accountExists = false;
      state.entries = [];
      return reply(204);
    }
    return reply(404);
  };

  return { state, handler };
}

async function signedIn(server: ReturnType<typeof fakeServer>) {
  jest.spyOn(globalThis, 'fetch').mockImplementation(server.handler as typeof fetch);
  await SecureStore.setItemAsync(STORAGE_KEYS.session, JSON.stringify(session));
  return renderRouter('src/app', { initialUrl: '/data' });
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await SecureStore.deleteItemAsync(STORAGE_KEYS.session);
  await AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ consentAccepted: true }));
});

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

it('deletes the health data on the server, not just on screen', async () => {
  const server = fakeServer();
  const view = await signedIn(server);

  await fireEvent.press(await view.findByText(t.data.delete));
  await fireEvent.press(await view.findByText(t.data.deleteConfirmCta));

  await waitFor(() => expect(server.state.calls).toContain('DELETE /me/data'));
  expect(server.state.entries).toEqual([]);
});

it('keeps the sheet open with an error when the server refuses', async () => {
  const server = fakeServer({ failDeletes: true });
  const view = await signedIn(server);

  await fireEvent.press(await view.findByText(t.data.delete));
  await fireEvent.press(await view.findByText(t.data.deleteConfirmCta));

  expect(await view.findByText(t.errors.server)).toBeTruthy();
  expect(server.state.entries).toHaveLength(1);
});

it('deletes the account and signs out', async () => {
  const server = fakeServer();
  const view = await signedIn(server);

  await fireEvent.press(await view.findByText(t.data.deleteAccount));
  // The row and the sheet's button share the label in German; the sheet renders last.
  await waitFor(() => expect(view.getAllByText(t.data.deleteAccountConfirmCta).length).toBeGreaterThan(1));
  await fireEvent.press(view.getAllByText(t.data.deleteAccountConfirmCta).at(-1)!);

  await waitFor(() => expect(server.state.calls).toContain('DELETE /me'));
  expect(server.state.accountExists).toBe(false);
  await waitFor(async () => expect(await SecureStore.getItemAsync(STORAGE_KEYS.session)).toBeNull());
});
