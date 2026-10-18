import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { cleanup, fireEvent, renderRouter, waitFor } from 'expo-router/testing-library';

import { TR } from '@/i18n/translations';
import { hashPassword } from '@/state/session/passwordHash';
import { STORAGE_KEYS } from '@/storage/keys';

/**
 * Regression: the profile screen cleared the new password and said "Saved."
 * without sending anything, so the old password kept working.
 */

const t = TR.de;
const TOKEN = 'jwt-signed-in';

const session = {
  token: TOKEN,
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  user: { email: 'saimon@example.ch', name: 'Saimon' },
};

/** Accepts a password change only when the current password matches. */
function fakeServer(currentPassword: string) {
  const state = { passwordHash: '', calls: [] as { method: string; path: string; body?: unknown }[] };

  const handler = async (url: string, init?: RequestInit) => {
    const reply = (status: number, body?: unknown) => ({
      ok: status >= 200 && status < 300,
      status,
      text: async () => (body === undefined ? '' : JSON.stringify(body)),
    });

    const path = new URL(url).pathname;
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    state.calls.push({ method, path, body });

    if (new Headers(init?.headers).get('Authorization') !== `Bearer ${TOKEN}`) return reply(401);
    if (method === 'GET' && path === '/entries') return reply(200, []);
    if (method === 'PUT' && path === '/auth/password') {
      if (body.currentPassword !== state.passwordHash) {
        return reply(400, { title: 'One or more validation errors occurred.', errors: { currentPassword: ['wrong'] } });
      }
      state.passwordHash = body.newPassword;
      return reply(204);
    }
    return reply(404);
  };

  return {
    state,
    start: async () => {
      state.passwordHash = await hashPassword(currentPassword);
      jest.spyOn(globalThis, 'fetch').mockImplementation(handler as unknown as typeof fetch);
    },
  };
}

async function openProfile(server: ReturnType<typeof fakeServer>) {
  await server.start();
  await SecureStore.setItemAsync(STORAGE_KEYS.session, JSON.stringify(session));
  return renderRouter('src/app', { initialUrl: '/profile' });
}

const passwordCalls = (server: ReturnType<typeof fakeServer>) =>
  server.state.calls.filter((c) => c.path === '/auth/password');

beforeEach(async () => {
  await AsyncStorage.clear();
  await SecureStore.deleteItemAsync(STORAGE_KEYS.session);
  await AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ consentAccepted: true }));
});

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

it('changes the password on the server and signs out', async () => {
  const server = fakeServer('old-password');
  const view = await openProfile(server);

  await fireEvent.changeText(await view.findByPlaceholderText(t.profile.newPasswordPlaceholder), 'new-password');
  await fireEvent.changeText((await view.findAllByDisplayValue('')).at(-1)!, 'old-password');
  await fireEvent.press(view.getByText(t.profile.save));

  await waitFor(async () => expect(await SecureStore.getItemAsync(STORAGE_KEYS.session)).toBeNull());
  expect(server.state.passwordHash).toBe(await hashPassword('new-password'));
  expect(await view.findByText(t.login.loginCta)).toBeTruthy();
});

it('says the current password is wrong and keeps the old one', async () => {
  const server = fakeServer('old-password');
  const view = await openProfile(server);

  await fireEvent.changeText(await view.findByPlaceholderText(t.profile.newPasswordPlaceholder), 'new-password');
  await fireEvent.changeText((await view.findAllByDisplayValue('')).at(-1)!, 'not-my-password');
  await fireEvent.press(view.getByText(t.profile.save));

  expect(await view.findByText(t.profile.currentPasswordWrong)).toBeTruthy();
  expect(view.queryByText(t.profile.saved)).toBeNull();
  expect(server.state.passwordHash).toBe(await hashPassword('old-password'));
});

it('sends nothing for a new password that is too short', async () => {
  const server = fakeServer('old-password');
  const view = await openProfile(server);

  await fireEvent.changeText(await view.findByPlaceholderText(t.profile.newPasswordPlaceholder), 'short');
  await fireEvent.changeText((await view.findAllByDisplayValue('')).at(-1)!, 'old-password');
  await fireEvent.press(view.getByText(t.profile.save));

  await waitFor(() => expect(view.queryByText(t.profile.saved)).toBeNull());
  expect(passwordCalls(server)).toHaveLength(0);
});
