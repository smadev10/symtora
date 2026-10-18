import type { ApiClient, RequestOptions } from '@/api/client';
import { createMeApi } from '@/api/me';

function recordingClient(result: unknown = null) {
  const calls: { path: string; options?: RequestOptions }[] = [];
  const client: ApiClient = {
    request: async <T,>(path: string, options?: RequestOptions) => {
      calls.push({ path, options });
      return result as T;
    },
  };
  return { client, calls };
}

describe('me api', () => {
  it('deletes all health data on the server', async () => {
    const { client, calls } = recordingClient();

    await createMeApi(client).deleteData();

    expect(calls[0].path).toBe('/me/data');
    expect(calls[0].options?.method).toBe('DELETE');
  });

  it('deletes the whole account', async () => {
    const { client, calls } = recordingClient();

    await createMeApi(client).deleteAccount();

    expect(calls[0].path).toBe('/me');
    expect(calls[0].options?.method).toBe('DELETE');
  });

  it('fetches the export', async () => {
    const exported = { exportedAt: '2026-10-12T00:00:00Z', profile: {}, entries: [] };
    const { client, calls } = recordingClient(exported);

    await expect(createMeApi(client).exportData()).resolves.toEqual(exported);

    expect(calls[0].path).toBe('/me/export');
    expect(calls[0].options?.method ?? 'GET').toBe('GET');
  });

  it('authenticates every call', async () => {
    const { client, calls } = recordingClient();
    const api = createMeApi(client);

    await api.deleteData();
    await api.deleteAccount();
    await api.exportData();

    expect(calls.map((call) => call.options?.auth)).toEqual([true, true, true]);
  });
});
