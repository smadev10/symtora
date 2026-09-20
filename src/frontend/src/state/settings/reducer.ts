import { LANGS, type Lang } from '@/i18n/translations';
import { THEMES, type Theme } from '@/theme/tokens';

/** Retention windows offered on the data screen, in days. */
export const RETENTIONS = [7, 30, 365] as const;

export type Retention = (typeof RETENTIONS)[number];

export type SettingsState = {
  lang: Lang;
  theme: Theme;
  retention: Retention;
  localOnly: boolean;
  consentAccepted: boolean;
};

export type SettingsAction =
  | { type: 'setLang'; lang: Lang }
  | { type: 'setTheme'; theme: Theme }
  | { type: 'setRetention'; retention: Retention }
  | { type: 'toggleLocalOnly' }
  | { type: 'acceptConsent' }
  | { type: 'hydrate'; persisted: Partial<SettingsState> | null };

export const DEFAULT_SETTINGS: SettingsState = {
  lang: 'de',
  theme: 'light',
  retention: 30,
  localOnly: true,
  consentAccepted: false,
};

const isOneOf = <T extends readonly unknown[]>(allowed: T, value: unknown): value is T[number] =>
  allowed.includes(value);

/**
 * Persisted settings are untrusted input: the blob may come from an older
 * build or have been edited by hand. Anything that would not render is
 * dropped in favour of the default.
 */
function sanitise(persisted: Partial<SettingsState> | null): Partial<SettingsState> {
  if (!persisted || typeof persisted !== 'object') return {};

  const clean: Partial<SettingsState> = {};
  if (isOneOf(LANGS, persisted.lang)) clean.lang = persisted.lang;
  if (isOneOf(THEMES, persisted.theme)) clean.theme = persisted.theme;
  if (isOneOf(RETENTIONS, persisted.retention)) clean.retention = persisted.retention;
  if (typeof persisted.localOnly === 'boolean') clean.localOnly = persisted.localOnly;
  if (typeof persisted.consentAccepted === 'boolean') {
    clean.consentAccepted = persisted.consentAccepted;
  }
  return clean;
}

export function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'setLang':
      return { ...state, lang: action.lang };
    case 'setTheme':
      return { ...state, theme: action.theme };
    case 'setRetention':
      return { ...state, retention: action.retention };
    case 'toggleLocalOnly':
      return { ...state, localOnly: !state.localOnly };
    case 'acceptConsent':
      return { ...state, consentAccepted: true };
    case 'hydrate':
      return { ...state, ...sanitise(action.persisted) };
    default:
      return state;
  }
}
