import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { cleanup, renderRouter, waitFor } from 'expo-router/testing-library';

import type { EntryResponse } from '@/api/types';
import { TR } from '@/i18n/translations';
import { STORAGE_KEYS } from '@/storage/keys';

/**
 * These mount the real route tree from src/app, so they cover the redirects,
 * guards and deep links rather than any of it in isolation.
 *
 * `renderRouter` in expo-router 57 returns React Native Testing Library's
 * plain render result — the getPathname/toHavePathname helpers are not
 * attached under RNTL 14 — so each case asserts on the screen the user ends
 * up looking at, which is the more useful assertion anyway.
 */

const session = {
  token: 'jwt-abc',
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  user: { email: 'saimon.mahari@example.ch', name: 'Saimon Mahari' },
};

/** Seeds both stores, since which one holds the token depends on platform. */
async function signIn() {
  const raw = JSON.stringify(session);
  await AsyncStorage.setItem(STORAGE_KEYS.session, raw);
  await SecureStore.setItemAsync(STORAGE_KEYS.session, raw);
}

const ENTRY_ID = '5f0c6f2e-0000-4000-8000-000000000001';

const doneEntry: EntryResponse = {
  id: ENTRY_ID,
  rawText: 'Seit heute Mittag starke Kopfschmerzen',
  bodyRegion: 'head',
  status: 'Done',
  createdAt: new Date().toISOString(),
  assessment: {
    causes: [{ label: 'Spannungskopfschmerz', tier: 'high' }],
    urgency: 'low',
    nextSteps: ['Wasser trinken.'],
    generatedAt: new Date().toISOString(),
  },
};

/**
 * Stands in for the API. Only what the client reads from a Response is
 * provided; unknown entry ids get the API's 404.
 */
function fakeFetch(url: string) {
  const reply = (status: number, body: unknown) =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      text: async () => (body === undefined ? '' : JSON.stringify(body)),
    });

  const path = new URL(url).pathname;
  if (path === '/entries') return reply(200, [doneEntry]);
  if (path === `/entries/${ENTRY_ID}`) return reply(200, doneEntry);
  return reply(404, undefined);
}

const persistSettings = (settings: Record<string, unknown>) =>
  AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));

async function open(url: string) {
  const view = await renderRouter('src/app', { initialUrl: url });
  await waitFor(() => expect(view.toJSON()).toBeTruthy());
  return view;
}

const expectVisible = (view: Awaited<ReturnType<typeof open>>, text: string) =>
  waitFor(() => expect(view.getByText(text)).toBeTruthy());

beforeEach(async () => {
  jest.spyOn(globalThis, 'fetch').mockImplementation(((url: string) => fakeFetch(url)) as typeof fetch);
  await AsyncStorage.clear();
  await SecureStore.deleteItemAsync(STORAGE_KEYS.session);
});

// expo-router keeps its navigation store at module scope, so without an
// explicit unmount one test starts on the screen the previous one left.
afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

describe('entry redirect', () => {
  it('sends a signed-out visitor to login', async () => {
    const view = await open('/');

    await expectVisible(view, TR.de.login.subtitle);
  });

  it('sends a signed-in visitor who has not consented to onboarding', async () => {
    await signIn();

    const view = await open('/');

    await expectVisible(view, TR.de.on.headline);
  });

  it('sends a signed-in, consented visitor to the home screen', async () => {
    await signIn();
    await persistSettings({ consentAccepted: true });

    const view = await open('/');

    await expectVisible(view, `${TR.de.start.greeting}, Saimon Mahari`);
  });
});

describe('route guards', () => {
  it('keeps a signed-out visitor out of the tab screens', async () => {
    const view = await open('/emergency');

    await expectVisible(view, TR.de.login.subtitle);
  });

  it('keeps a signed-out visitor out of the profile screen', async () => {
    const view = await open('/profile');

    await expectVisible(view, TR.de.login.subtitle);
  });

  it('sends a signed-in visitor without consent back to onboarding', async () => {
    await signIn();

    const view = await open('/emergency');

    await expectVisible(view, TR.de.on.headline);
  });
});

describe('deep links', () => {
  it('opens an assessment straight from its URL', async () => {
    await signIn();
    await persistSettings({ consentAccepted: true });

    const view = await open(`/assessment/${ENTRY_ID}`);

    await expectVisible(view, TR.de.assess.title);
    // Content of that specific entry, proving the id was resolved rather
    // than some default being rendered.
    await expectVisible(view, 'Spannungskopfschmerz');
    await expectVisible(view, TR.de.urgency.low.label);
  });

  it('shows the empty state for an assessment id that does not exist', async () => {
    // Anyone can type symtora://assessment/anything.
    await signIn();
    await persistSettings({ consentAccepted: true });

    const view = await open('/assessment/not-a-case');

    await expectVisible(view, TR.de.states.emptyTitle);
  });
});

describe('persisted settings survive a restart', () => {
  it('renders in the persisted language', async () => {
    await signIn();
    await persistSettings({ consentAccepted: true, lang: 'fr' });

    const view = await open('/emergency');

    await expectVisible(view, TR.fr.emergency.warningTitle);
  });

  it('shows the restored user on the data screen', async () => {
    await signIn();
    await persistSettings({ consentAccepted: true });

    const view = await open('/data');

    await expectVisible(view, 'Saimon Mahari');
  });
});
