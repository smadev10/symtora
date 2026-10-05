import { api, type ApiClient } from './client';
import type { CreateEntryRequest, CreateEntryResponse, EntryResponse } from './types';

export type EntriesApi = {
  create: (request: CreateEntryRequest) => Promise<CreateEntryResponse>;
  get: (id: string) => Promise<EntryResponse>;
  list: () => Promise<EntryResponse[]>;
};

export function createEntriesApi(client: ApiClient): EntriesApi {
  return {
    create: (request) =>
      client.request<CreateEntryResponse>('/entries', { method: 'POST', body: request, auth: true }),

    get: (id) => client.request<EntryResponse>(`/entries/${encodeURIComponent(id)}`, { auth: true }),

    list: () => client.request<EntryResponse[]>('/entries', { auth: true }),
  };
}

export const entriesApi = createEntriesApi(api);
