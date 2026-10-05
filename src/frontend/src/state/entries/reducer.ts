import type { Urgency } from '@/data/cases';

/** One row in the home screen's "recent" list. */
export type EntrySummary = {
  id: string;
  title: string;
  dateLabel: string;
  /** Localised body region, or an empty string when none was given. */
  region: string;
  /** Null while the entry is still being analysed, or when analysis failed. */
  urgency: Urgency | null;
  urgencyLabel: string;
};

export type EntriesStatus = 'idle' | 'loading' | 'ready' | 'error';

export type EntriesState = {
  status: EntriesStatus;
  items: EntrySummary[];
  /** A translation key, never a ready-made message — errors are localised too. */
  errorKey: string | null;
};

export type EntriesAction =
  | { type: 'loadStarted' }
  | { type: 'loadSucceeded'; items: EntrySummary[] }
  | { type: 'loadFailed'; errorKey: string }
  | { type: 'cleared' };

export const INITIAL_ENTRIES: EntriesState = { status: 'idle', items: [], errorKey: null };

export function entriesReducer(state: EntriesState, action: EntriesAction): EntriesState {
  switch (action.type) {
    case 'loadStarted':
      // Items are kept so a refresh doesn't flash an empty list.
      return { ...state, status: 'loading', errorKey: null };

    case 'loadSucceeded':
      return { status: 'ready', items: action.items, errorKey: null };

    case 'loadFailed':
      return { ...state, status: 'error', errorKey: action.errorKey };

    case 'cleared':
      return INITIAL_ENTRIES;

    default:
      return state;
  }
}
