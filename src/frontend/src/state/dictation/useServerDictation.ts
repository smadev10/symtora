import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { File } from 'expo-file-system';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { Platform } from 'react-native';

import { isApiError } from '@/api/errors';
import { transcriptionsApi, type TranscriptionsApi } from '@/api/transcriptions';
import type { Lang } from '@/i18n/translations';
import { dictationReducer, INITIAL_DICTATION, type DictationError } from './reducer';

/** Long enough for a symptom description, short enough to stay well under the upload limit. */
export const MAX_RECORDING_MS = 120_000;

const RECORDING_OPTIONS = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };

/** Metering is dBFS (≈ -60 quiet … 0 loud); the waveform wants 0…1. */
const toLevel = (db: number | undefined) => (db === undefined ? 0 : Math.max(0, Math.min(1, (db + 60) / 60)));

/**
 * The recorder leaves each recording in the app cache. It is health data and
 * the screen promises it isn't kept, so it is deleted as soon as it is used
 * up. On the web the "file" is an in-memory blob URL with nothing to delete.
 */
function discardRecording(uri: string | null): void {
  if (!uri || Platform.OS === 'web') return;
  try {
    new File(uri).delete();
  } catch {
    // Already gone, or never written; nothing left to protect.
  }
}

function toError(error: unknown): DictationError {
  if (isApiError(error) && (error.kind === 'network' || error.kind === 'timeout' || error.kind === 'server')) {
    return 'serverUnavailable';
  }
  return 'unknown';
}

/**
 * Dictation for Expo Go and the web: records with expo-audio, then the
 * Symtora API transcribes it on the self-hosted Whisper service. There is no
 * live text; the transcript arrives once after stopping.
 */
export function useServerDictation(enabled: boolean, transcribe: TranscriptionsApi['transcribe'] = transcriptionsApi.transcribe) {
  const [state, dispatch] = useReducer(dictationReducer, INITIAL_DICTATION);
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 120);

  const langRef = useRef<Lang>('de');
  const recordingRef = useRef(false);
  /** Bumped by abort/unmount so a transcript still in flight is dropped. */
  const runRef = useRef(0);

  const start = useCallback(
    async (lang: Lang) => {
      if (!enabled) return;
      const run = ++runRef.current;
      langRef.current = lang;
      dispatch({ type: 'requested' });

      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (run !== runRef.current) return;
      if (!permission.granted) {
        dispatch({ type: 'failed', error: 'permissionDenied' });
        return;
      }

      try {
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
      } catch {
        if (run === runRef.current) dispatch({ type: 'failed', error: 'unknown' });
        return;
      }
      // Cancelled while the microphone was being prepared: never start it.
      if (run !== runRef.current) return;
      recorder.record();
      recordingRef.current = true;
      dispatch({ type: 'started' });
    },
    [enabled, recorder],
  );

  const stop = useCallback(async () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    const run = runRef.current;
    dispatch({ type: 'stopRequested' });

    let uri: string | null = null;
    try {
      await recorder.stop();
      uri = recorder.uri;
      if (!uri) throw new Error('No recording file');
      const text = await transcribe(uri, langRef.current);
      if (run !== runRef.current) return;
      if (text.trim()) dispatch({ type: 'result', transcript: text, isFinal: true });
      dispatch({ type: 'ended' });
    } catch (error) {
      if (run !== runRef.current) return;
      dispatch({ type: 'failed', error: toError(error) });
    } finally {
      discardRecording(uri);
    }
  }, [recorder, transcribe]);

  const abort = useCallback(() => {
    runRef.current += 1;
    if (recordingRef.current) {
      void recorder
        .stop()
        .then(() => discardRecording(recorder.uri))
        .catch(() => {});
    }
    recordingRef.current = false;
  }, [recorder]);

  // Hard cap, so a forgotten recording can't grow past the upload limit.
  useEffect(() => {
    if (state.status === 'listening' && recorderState.durationMillis >= MAX_RECORDING_MS) void stop();
  }, [state.status, recorderState.durationMillis, stop]);

  // Leaving the screen discards the recording rather than leaving the mic open.
  useEffect(() => () => abort(), [abort]);

  return {
    state,
    level: state.status === 'listening' ? toLevel(recorderState.metering) : 0,
    start,
    stop: () => void stop(),
    abort,
  };
}
