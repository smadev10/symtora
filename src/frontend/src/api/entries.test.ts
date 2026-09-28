import type { ApiClient, RequestOptions } from '@/api/client';
import { createEntriesApi } from '@/api/entries';

function recordingClient(result: unknown = {}) {
  const calls: { path: string; options?: RequestOptions }[] = [];
  const client: ApiClient = {
    request: async <T,>(path: string, options?: RequestOptions) => {
      calls.push({ path, options });
      return result as T;
    },
  };
  return { client, calls };
}

describe('entries api', () => {
  it('posts a new entry with the text and body region', async () => {
    const { client, calls } = recordingClient({ id: 'abc', status: 'Pending' });

    await expect(
      createEntriesApi(client).create({ text: 'Kopfweh seit heute', bodyRegion: 'head' }),
    ).resolves.toEqual({ id: 'abc', status: 'Pending' });

    expect(calls[0].path).toBe('/entries');
    expect(calls[0].options?.method).toBe('POST');
    expect(calls[0].options?.body).toEqual({ text: 'Kopfweh seit heute', bodyRegion: 'head' });
  });

  it('fetches one entry by id', async () => {
    const { client, calls } = recordingClient();

    await createEntriesApi(client).get('5f0c6f2e-0000-4000-8000-000000000001');

    expect(calls[0].path).toBe('/entries/5f0c6f2e-0000-4000-8000-000000000001');
    expect(calls[0].options?.method ?? 'GET').toBe('GET');
  });

  it('lists the history', async () => {
    const { client, calls } = recordingClient([]);

    await createEntriesApi(client).list();

    expect(calls[0].path).toBe('/entries');
    expect(calls[0].options?.method ?? 'GET').toBe('GET');
  });

  it('authenticates every call', async () => {
    const { client, calls } = recordingClient();
    const api = createEntriesApi(client);

    await api.create({ text: 'x' });
    await api.get('id');
    await api.list();

    expect(calls.map((call) => call.options?.auth)).toEqual([true, true, true]);
  });
});
