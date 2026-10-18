import * as Sharing from 'expo-sharing';

import type { MyDataExport } from '@/api/types';
import { exportFileName, saveExport } from '@/export/saveExport';

jest.mock('expo-file-system', () => {
  const written: Record<string, string> = {};
  class File {
    uri: string;
    constructor(_dir: unknown, name: string) {
      this.uri = `file:///cache/${name}`;
    }
    create() {}
    write(content: string) {
      written[this.uri] = content;
    }
  }
  return { File, Paths: { cache: {} }, __written: written };
});
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn(async () => {}) }));

const data: MyDataExport = {
  exportedAt: '2026-10-12T08:30:00Z',
  profile: { email: 'saimon@example.ch', name: 'Saimon', createdAt: '2026-09-01T00:00:00Z' },
  entries: [],
};

it('names the file after the export date', () => {
  expect(exportFileName(data.exportedAt)).toBe('symtora-export-2026-10-12.json');
});

it('writes the JSON to a file and opens the share sheet for it', async () => {
  await saveExport(data);

  const uri = 'file:///cache/symtora-export-2026-10-12.json';
  const written = (jest.requireMock('expo-file-system') as { __written: Record<string, string> }).__written;
  expect(JSON.parse(written[uri])).toEqual(data);
  expect(Sharing.shareAsync).toHaveBeenCalledWith(uri, expect.objectContaining({ mimeType: 'application/json' }));
});
