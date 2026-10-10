import { Platform } from 'react-native';

import type { Lang } from '@/i18n/translations';
import { api, type ApiClient } from './client';

/** CPU transcription of up to two minutes of audio, plus the upload, on a slow network. */
export const TRANSCRIBE_TIMEOUT_MS = 120_000;

export type TranscriptionsApi = {
  /** Uploads a recording and resolves to its transcript; empty when nothing was understood. */
  transcribe: (audioUri: string, lang: Lang) => Promise<string>;
};

/**
 * React Native's FormData takes a `{ uri, name, type }` descriptor for files;
 * a browser needs a real Blob, which the recorder exposes as a blob: URL.
 */
async function appendAudio(form: FormData, uri: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append('audio', blob, 'recording.webm');
    return;
  }
  form.append('audio', { uri, name: 'recording.m4a', type: 'audio/mp4' } as unknown as Blob);
}

export function createTranscriptionsApi(client: ApiClient): TranscriptionsApi {
  return {
    async transcribe(audioUri, lang) {
      const form = new FormData();
      await appendAudio(form, audioUri);
      form.append('language', lang);

      const response = await client.request<{ text?: string } | null>('/transcriptions', {
        method: 'POST',
        form,
        auth: true,
        timeoutMs: TRANSCRIBE_TIMEOUT_MS,
      });
      return response?.text?.trim() ?? '';
    },
  };
}

export const transcriptionsApi = createTranscriptionsApi(api);
