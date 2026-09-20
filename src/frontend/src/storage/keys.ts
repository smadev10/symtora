/** Versioned so a future shape change can be migrated rather than guessed at. */
export const STORAGE_KEYS = {
  settings: 'symtora.settings.v1',
  session: 'symtora.session.v1',
} as const;
