import type {
  ExpoSpeechRecognitionErrorCode,
  ExpoSpeechRecognitionModule as SpeechModuleValue,
} from 'expo-speech-recognition';
import { requireOptionalNativeModule } from 'expo';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Platform } from 'react-native';

import type { Lang } from '@/i18n/translations';
import { dictationReducer, INITIAL_DICTATION, type DictationError } from './reducer';

type SpeechModule = typeof SpeechModuleValue;

/**
 * Loaded on demand rather than imported: the native module is absent in Expo
 * Go and on web, and importing it there throws at module load. Web is excluded
 * outright because the browser's speech API sends audio to a cloud service.
 */
function loadSpeechModule(): SpeechModule | null {
  if (Platform.OS === 'web') return null;
  // Probe first: a failed require is caught, but dev builds still raise it as an error overlay.
  if (!requireOptionalNativeModule('ExpoSpeechRecognition')) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-speech-recognition').ExpoSpeechRecognitionModule as SpeechModule;
  } catch {
    return null;
  }
}

/** True when the on-device recogniser can be used (development builds; not Expo Go or web). */
export const hasOnDeviceRecognition = () => loadSpeechModule() !== null;

/** Recogniser locales to try per app language, Swiss variants first. */
const LOCALES: Record<Lang, readonly string[]> = {
  de: ['de-CH', 'de-DE', 'de-AT'],
  en: ['en-GB', 'en-US'],
  fr: ['fr-CH', 'fr-FR'],
};

const normalise = (locale: string) => locale.replace('_', '-').toLowerCase();

/** The first preferred locale the device has, falling back to the first preference. */
async function pickLocale(speech: SpeechModule, lang: Lang): Promise<string> {
  const wanted = LOCALES[lang];
  try {
    const { locales, installedLocales } = await speech.getSupportedLocales({});
    for (const available of [installedLocales, locales]) {
      const have = new Set(available.map(normalise));
      const hit = wanted.find((locale) => have.has(normalise(locale)));
      if (hit) return hit;
    }
  } catch {
    // Not supported on older Android; let start() report what it can't do.
  }
  return wanted[0];
}

/** Maps recogniser errors onto what the screen can explain. `null` means ignore. */
export function toDictationError(code: ExpoSpeechRecognitionErrorCode): DictationError | null {
  switch (code) {
    case 'aborted':
      return null;
    case 'not-allowed':
      return 'permissionDenied';
    case 'language-not-supported':
    case 'service-not-allowed':
    // On-device recognition never needs the network; this means it fell short of that.
    case 'network':
      return 'onDeviceUnavailable';
    case 'no-speech':
    case 'speech-timeout':
      return 'noSpeech';
    default:
      return 'unknown';
  }
}

/** Volume events range from -2 to 10; anything below 0 is inaudible. */
const toLevel = (value: number) => Math.max(0, Math.min(1, value / 10));

/**
 * On-device dictation. Audio and transcript stay on the phone: recognition is
 * started with `requiresOnDeviceRecognition`, and a device that can't do that
 * gets an error instead of a silent fallback to the vendor's cloud.
 */
export function useOnDeviceDictation(enabled: boolean) {
  const [state, dispatch] = useReducer(dictationReducer, INITIAL_DICTATION);
  const [level, setLevel] = useState(0);
  const speechRef = useRef<SpeechModule | null>(null);
  const active = useRef(false);

  useEffect(() => {
    const speech = enabled ? loadSpeechModule() : null;
    speechRef.current = speech;
    if (!speech) return undefined;

    const subscriptions = [
      speech.addListener('start', () => dispatch({ type: 'started' })),
      speech.addListener('result', (event) => {
        const transcript = event.results[0]?.transcript ?? '';
        dispatch({ type: 'result', transcript, isFinal: event.isFinal });
      }),
      speech.addListener('nomatch', () => dispatch({ type: 'failed', error: 'noSpeech' })),
      speech.addListener('error', (event) => {
        const error = toDictationError(event.error);
        if (error) dispatch({ type: 'failed', error });
      }),
      speech.addListener('end', () => {
        active.current = false;
        setLevel(0);
        dispatch({ type: 'ended' });
      }),
      speech.addListener('volumechange', (event) => setLevel(toLevel(event.value))),
    ];

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
      // Leaving the screen discards the recording rather than leaving the mic open.
      if (active.current) speech.abort();
      active.current = false;
    };
  }, [enabled]);

  const start = useCallback(async (lang: Lang) => {
    const speech = speechRef.current;
    dispatch({ type: 'requested' });
    if (!speech || !speech.isRecognitionAvailable()) {
      dispatch({ type: 'failed', error: 'unsupported' });
      return;
    }

    // On-device recognition needs the microphone only, not Apple's speech-server permission.
    const permission = await speech.requestMicrophonePermissionsAsync();
    if (!permission.granted) {
      dispatch({ type: 'failed', error: 'permissionDenied' });
      return;
    }
    if (!speech.supportsOnDeviceRecognition()) {
      dispatch({ type: 'failed', error: 'onDeviceUnavailable' });
      return;
    }

    active.current = true;
    speech.start({
      lang: await pickLocale(speech, lang),
      interimResults: true,
      continuous: true,
      requiresOnDeviceRecognition: true,
      addsPunctuation: true,
      maxAlternatives: 1,
      iosTaskHint: 'dictation',
      volumeChangeEventOptions: { enabled: true, intervalMillis: 120 },
    });
  }, []);

  const stop = useCallback(() => {
    dispatch({ type: 'stopRequested' });
    speechRef.current?.stop();
  }, []);

  const abort = useCallback(() => {
    if (active.current) speechRef.current?.abort();
    active.current = false;
  }, []);

  return { state, level, start, stop, abort };
}
