import {
  INITIAL_ENTRIES,
  entriesReducer,
  type EntrySummary,
} from '@/state/entries/reducer';

const items: EntrySummary[] = [
  {
    id: 'headache',
    title: 'Kopfschmerzen',
    dateLabel: 'Heute',
    region: 'Kopf',
    urgency: 'low',
    urgencyLabel: 'Niedrig',
    createdAt: '2026-10-10T09:00:00.000Z',
  },
  {
    id: 'knee',
    title: 'Knieschmerzen',
    dateLabel: 'Gestern',
    region: 'Nacken',
    urgency: 'mid',
    urgencyLabel: 'Mittel',
    createdAt: '2026-10-10T09:00:00.000Z',
  },
];

describe('initial entries state', () => {
  it('starts idle with nothing loaded and no error', () => {
    expect(INITIAL_ENTRIES).toEqual({ status: 'idle', items: [], errorKey: null, attempt: 0 });
  });
});

describe('loading', () => {
  it('moves to loading and clears any previous error', () => {
    const failed = entriesReducer(INITIAL_ENTRIES, { type: 'loadFailed', errorKey: 'error.network' });

    const next = entriesReducer(failed, { type: 'loadStarted' });

    expect(next).toEqual({ status: 'loading', items: [], errorKey: null, attempt: 0 });
  });

  it('keeps the entries already on screen while refreshing', () => {
    // Blanking the list on refresh makes the home screen flash empty, which
    // reads as data loss.
    const ready = entriesReducer(INITIAL_ENTRIES, { type: 'loadSucceeded', items });

    const next = entriesReducer(ready, { type: 'loadStarted' });

    expect(next.items).toEqual(items);
    expect(next.status).toBe('loading');
  });
});

describe('automatic retries', () => {
  it('records which attempt is running', () => {
    const next = entriesReducer(INITIAL_ENTRIES, { type: 'loadStarted', attempt: 2 });

    expect(next).toMatchObject({ status: 'loading', attempt: 2 });
  });

  it('resets the attempt once a load succeeds', () => {
    const retrying = entriesReducer(INITIAL_ENTRIES, { type: 'loadStarted', attempt: 3 });

    expect(entriesReducer(retrying, { type: 'loadSucceeded', items }).attempt).toBe(0);
  });
});

describe('success', () => {
  it('stores the loaded entries and marks the list ready', () => {
    const next = entriesReducer(INITIAL_ENTRIES, { type: 'loadSucceeded', items });

    expect(next).toEqual({ status: 'ready', items, errorKey: null, attempt: 0 });
  });

  it('replaces rather than appends on a reload', () => {
    const first = entriesReducer(INITIAL_ENTRIES, { type: 'loadSucceeded', items });

    const next = entriesReducer(first, { type: 'loadSucceeded', items: [items[0]] });

    expect(next.items).toHaveLength(1);
  });

  it('is ready with an empty list when the user has no entries', () => {
    // Distinct from `idle`: the screen shows the empty state, not a spinner.
    const next = entriesReducer(INITIAL_ENTRIES, { type: 'loadSucceeded', items: [] });

    expect(next).toEqual({ status: 'ready', items: [], errorKey: null, attempt: 0 });
  });
});

describe('failure', () => {
  it('records a translation key rather than a message', () => {
    // Error text has to survive a language switch like everything else.
    const next = entriesReducer(INITIAL_ENTRIES, {
      type: 'loadFailed',
      errorKey: 'error.network',
    });

    expect(next).toEqual({ status: 'error', items: [], errorKey: 'error.network', attempt: 0 });
  });

  it('keeps previously loaded entries visible behind the error', () => {
    const ready = entriesReducer(INITIAL_ENTRIES, { type: 'loadSucceeded', items });

    const next = entriesReducer(ready, { type: 'loadFailed', errorKey: 'error.server' });

    expect(next.items).toEqual(items);
    expect(next.status).toBe('error');
  });
});

describe('clear', () => {
  it('returns to the initial state when the user wipes their data', () => {
    const ready = entriesReducer(INITIAL_ENTRIES, { type: 'loadSucceeded', items });

    expect(entriesReducer(ready, { type: 'cleared' })).toEqual(INITIAL_ENTRIES);
  });
});

describe('purity', () => {
  it('never mutates the state it is given', () => {
    const ready = entriesReducer(INITIAL_ENTRIES, { type: 'loadSucceeded', items });
    const snapshot = JSON.parse(JSON.stringify(ready));

    entriesReducer(ready, { type: 'loadFailed', errorKey: 'error.server' });

    expect(ready).toEqual(snapshot);
  });

  it('returns the same state object for an unknown action', () => {
    // @ts-expect-error deliberately unknown action
    expect(entriesReducer(INITIAL_ENTRIES, { type: 'nope' })).toBe(INITIAL_ENTRIES);
  });
});
