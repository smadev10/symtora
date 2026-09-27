import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { cleanup, renderRouter, waitFor } from 'expo-router/testing-library';

import { CASES } from '@/data/cases';
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
  await AsyncStorage.clear();
  await SecureStore.deleteItemAsync(STORAGE_KEYS.session);
});

// expo-router keeps its navigation store at module scope, so without an
// explicit unmount one test starts on the screen the previous one left.
afterEach(async () => {
  await cleanup();
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
    const view = await open('/patterns');

    await expectVisible(view, TR.de.login.subtitle);
  });

  it('keeps a signed-out visitor out of the profile screen', async () => {
    const view = await open('/profile');

    await expectVisible(view, TR.de.login.subtitle);
  });

  it('sends a signed-in visitor without consent back to onboarding', async () => {
    await signIn();

    const view = await open('/patterns');

    await expectVisible(view, TR.de.on.headline);
  });
});

describe('deep links', () => {
  it('opens an assessment straight from its URL', async () => {
    await signIn();
    await persistSettings({ consentAccepted: true });

    const view = await open('/assessment/headache');

    await expectVisible(view, TR.de.assess.title);
    // A finding unique to the headache case, proving the id was resolved
    // rather than some default being rendered.
    await expectVisible(view, CASES.de.headache.findings[0].label);
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

    const view = await open('/patterns');

    await expectVisible(view, TR.fr.patterns.title);
  });

  it('renders the persisted retention choice as selected', async () => {
    await signIn();
    await persistSettings({ consentAccepted: true, retention: 365 });

    const view = await open('/data');

    await expectVisible(view, TR.de.retentionLabels.d365);
  });

  it('shows the restored user on the data screen', async () => {
    await signIn();
    await persistSettings({ consentAccepted: true });

    const view = await open('/data');

    await expectVisible(view, 'Saimon Mahari');
  });
});
