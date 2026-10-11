import type { ApiClient, RequestOptions } from '@/api/client';
import { createTranscriptionsApi, TRANSCRIBE_TIMEOUT_MS } from '@/api/transcriptions';

function fakeClient(reply: unknown) {
  const calls: { path: string; options?: RequestOptions }[] = [];
  const client: ApiClient = {
    request: async <T,>(path: string, options?: RequestOptions) => {
      calls.push({ path, options });
      return reply as T;
    },
  };
  return { client, calls };
}

describe('transcriptionsApi', () => {
  it('uploads the recording with the language, authenticated, with a long timeout', async () => {
    const { client, calls } = fakeClient({ text: '  Kopfweh  ' });

    const text = await createTranscriptionsApi(client).transcribe('file:///cache/rec.m4a', 'de');

    expect(text).toBe('Kopfweh');
    expect(calls[0].path).toBe('/transcriptions');
    expect(calls[0].options).toMatchObject({ method: 'POST', auth: true, timeoutMs: TRANSCRIBE_TIMEOUT_MS });
    const form = calls[0].options?.form as FormData;
    expect(form.get('language')).toBe('de');
    expect(form.get('audio')).toBeTruthy();
  });

  it('treats a missing text field as nothing said', async () => {
    const { client } = fakeClient({});

    await expect(createTranscriptionsApi(client).transcribe('file:///rec.m4a', 'en')).resolves.toBe('');
  });
});
