import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { MyDataExport } from '@/api/types';

/** `symtora-export-2026-10-12.json`, so repeated exports don't overwrite each other once saved. */
export function exportFileName(exportedAt: string): string {
  return `symtora-export-${exportedAt.slice(0, 10)}.json`;
}

/**
 * Hands the export to the user as a real .json file — a download on web, the
 * system share sheet on a phone (save to Files, Drive, mail, ...).
 *
 * The native copy goes to the cache directory and is overwritten by the next
 * export, so no second, forgotten copy of the health data piles up on the device.
 */
export async function saveExport(data: MyDataExport): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  const name = exportFileName(data.exportedAt);

  if (Platform.OS === 'web') {
    // expo-sharing can't share a local file on web; a download is the browser's equivalent.
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(json);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: name });
}
