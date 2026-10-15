import { api, type ApiClient } from './client';
import type { MyDataExport } from './types';

/** The signed-in user's own account and data controls. */
export type MeApi = {
  /** Deletes every entry and assessment; the account stays. */
  deleteData: () => Promise<void>;
  /** Deletes the account and everything stored with it. */
  deleteAccount: () => Promise<void>;
  exportData: () => Promise<MyDataExport>;
};

export function createMeApi(client: ApiClient): MeApi {
  return {
    deleteData: () => client.request<void>('/me/data', { method: 'DELETE', auth: true }),

    deleteAccount: () => client.request<void>('/me', { method: 'DELETE', auth: true }),

    exportData: () => client.request<MyDataExport>('/me/export', { auth: true }),
  };
}

export const meApi = createMeApi(api);
