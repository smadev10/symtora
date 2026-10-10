import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Audio from 'expo-audio';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { act, cleanup, fireEvent, renderRouter, waitFor } from 'expo-router/testing-library';

import { TR } from '@/i18n/translations';
import { STORAGE_KEYS } from '@/storage/keys';

/**
 * The record → review flow across the real route tree, with the native
 * recogniser replaced by the mock in jest.setup.js.
 */

type SpeechMock = typeof ExpoSpeechRecognitionModule & {
  __emit: (event: string, payload: unknown) => void;
  __reset: () => void;
};
const speech = ExpoSpeechRecognitionModule as SpeechMock;

const t = TR.de;

const audioMock = () =>
  Audio as unknown as { __reset: () => void; __recorder: { record: jest.Mock } };

async function signInWithConsent() {
  const raw = JSON.stringify({
    token: 'jwt-abc',
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    user: { email: 'saimon.mahari@example.ch', name: 'Saimon Mahari' },
  });
  await AsyncStorage.setItem(STORAGE_KEYS.session, raw);
  await SecureStore.setItemAsync(STORAGE_KEYS.session, raw);
  await AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ consentAccepted: true }));
}

async function open(url: string) {
  const view = await renderRouter('src/app', { initialUrl: url });
  await waitFor(() => expect(view.toJSON()).toBeTruthy());
  return view;
}

type View = Awaited<ReturnType<typeof open>>;

const say = (transcript: string, isFinal: boolean) =>
  act(async () => speech.__emit('result', { isFinal, results: [{ transcript, confidence: 1, segments: [] }] }));

/** Waits for the recogniser to be listening, then presses the stop button. */
async function stopWhenListening(view: View) {
  await waitFor(() => expect(speech.start).toHaveBeenCalled());
  await fireEvent.press(view.getByLabelText(t.record.stopLabel));
}

beforeEach(async () => {
  audioMock().__reset();
  speech.__reset();
  jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, text: async () => '[]' } as Response);
  await AsyncStorage.clear();
  await SecureStore.deleteItemAsync(STORAGE_KEYS.session);
  await signInWithConsent();
});

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

describe('dictating a description', () => {
  it('asks for on-device recognition and reports when nothing was heard', async () => {
    const view = await open('/new');
    await fireEvent.press(await view.findByText(t.newDesc.speakInstead));

    await stopWhenListening(view);
    expect(speech.start).toHaveBeenCalledWith(
      expect.objectContaining({ lang: 'de-CH', requiresOnDeviceRecognition: true }),
    );

    await waitFor(() => expect(view.getByText(t.record.errors.noSpeech.title)).toBeTruthy());
  });

  it('shows what is heard live and hands it over on stop', async () => {
    const view = await open('/new');
    await fireEvent.press(await view.findByText(t.newDesc.speakInstead));
    await waitFor(() => expect(speech.start).toHaveBeenCalled());

    await say('Seit heute Morgen Kopfweh.', true);
    await say('Vor allem links', false);
    expect(view.getByTestId('record-transcript')).toHaveTextContent('Seit heute Morgen Kopfweh. Vor allem links');

    await stopWhenListening(view);

    expect(await view.findByDisplayValue('Seit heute Morgen Kopfweh. Vor allem links')).toBeTruthy();
    expect(speech.stop).toHaveBeenCalled();
  });

  it('lands on the new-entry screen even when recording was opened from elsewhere', async () => {
    const view = await open('/record');
    await waitFor(() => expect(speech.start).toHaveBeenCalled());

    await say('Husten', true);
    await stopWhenListening(view);

    expect(await view.findByDisplayValue('Husten')).toBeTruthy();
  });

  it('appends to text already typed instead of replacing it', async () => {
    const view = await open('/new');
    await fireEvent.changeText(await view.findByPlaceholderText(t.newDesc.placeholder), 'Fieber');
    await fireEvent.press(view.getByText(t.newDesc.speakInstead));
    await waitFor(() => expect(speech.start).toHaveBeenCalled());

    await say('und Halsweh', true);
    await stopWhenListening(view);

    expect(await view.findByDisplayValue('Fieber und Halsweh')).toBeTruthy();
  });

  it('discards the recording on cancel', async () => {
    const view = await open('/new');
    await fireEvent.press(await view.findByText(t.newDesc.speakInstead));
    await waitFor(() => expect(speech.start).toHaveBeenCalled());
    await say('Rückenschmerzen', true);

    await fireEvent.press(view.getByText(t.record.cancel));

    await waitFor(() => expect(view.getByText(t.newDesc.speakInstead)).toBeTruthy());
    expect(speech.abort).toHaveBeenCalled();
    expect(view.queryByDisplayValue('Rückenschmerzen')).toBeNull();
  });
});

describe('when dictation cannot run', () => {
  it('falls back to server transcription in Expo Go and hands the text over', async () => {
    const modules = (globalThis as { expo: { modules: Record<string, unknown> } }).expo.modules;
    const stub = modules.ExpoSpeechRecognition;
    delete modules.ExpoSpeechRecognition;
    // The fake API: entries list for the home screen, a transcript for the upload.
    (globalThis.fetch as jest.Mock).mockImplementation(async (url: string) => ({
      ok: true,
      status: 200,
      text: async () => (url.endsWith('/transcriptions') ? JSON.stringify({ text: 'Seit heute Bauchweh.' }) : '[]'),
    }));
    try {
      const view = await open('/new');
      await fireEvent.press(await view.findByText(t.newDesc.speakInstead));

      expect(await view.findByText(t.record.serverNote)).toBeTruthy();
      // The stop button is disabled until recording has actually started.
      await waitFor(() => expect(audioMock().__recorder.record).toHaveBeenCalled());
      await fireEvent.press(view.getByLabelText(t.record.stopLabel));

      expect(await view.findByDisplayValue('Seit heute Bauchweh.')).toBeTruthy();
      expect(speech.start).not.toHaveBeenCalled();
    } finally {
      modules.ExpoSpeechRecognition = stub;
    }
  });

  it('explains when the server cannot transcribe', async () => {
    const modules = (globalThis as { expo: { modules: Record<string, unknown> } }).expo.modules;
    const stub = modules.ExpoSpeechRecognition;
    delete modules.ExpoSpeechRecognition;
    (globalThis.fetch as jest.Mock).mockImplementation(async (url: string) =>
      url.endsWith('/transcriptions')
        ? { ok: false, status: 503, text: async () => '' }
        : { ok: true, status: 200, text: async () => '[]' },
    );
    try {
      const view = await open('/record');
      await waitFor(() => expect(audioMock().__recorder.record).toHaveBeenCalled());
      await fireEvent.press(view.getByLabelText(t.record.stopLabel));

      expect(await view.findByText(t.record.errors.serverUnavailable.title)).toBeTruthy();
      expect(view.getByText(t.record.retry)).toBeTruthy();
    } finally {
      modules.ExpoSpeechRecognition = stub;
    }
  });

  it('explains a refused microphone and offers the settings', async () => {
    (speech.requestMicrophonePermissionsAsync as jest.Mock).mockResolvedValue({
      granted: false,
      canAskAgain: false,
      status: 'denied',
      expires: 'never',
    });

    const view = await open('/record');

    expect(await view.findByText(t.record.errors.permissionDenied.title)).toBeTruthy();
    expect(view.getByText(t.record.openSettings)).toBeTruthy();
    expect(speech.start).not.toHaveBeenCalled();
  });

  it('refuses rather than falling back to cloud recognition', async () => {
    (speech.supportsOnDeviceRecognition as jest.Mock).mockReturnValue(false);

    const view = await open('/record');

    expect(await view.findByText(t.record.errors.onDeviceUnavailable.title)).toBeTruthy();
    expect(speech.start).not.toHaveBeenCalled();
  });

  it('prefers a locale whose offline model is installed over a Swiss one that is not', async () => {
    (speech.getSupportedLocales as jest.Mock).mockResolvedValue({
      locales: ['de-DE', 'de-CH', 'fr-FR'],
      installedLocales: ['de_DE'],
    });

    await open('/record');

    await waitFor(() =>
      expect(speech.start).toHaveBeenCalledWith(expect.objectContaining({ lang: 'de-DE' })),
    );
  });
});
