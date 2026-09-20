import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';

import { ERROR_KEYS, isApiError } from '@/api/errors';
import { demoEntriesRepository, type EntriesRepository } from '@/repositories/entriesRepository';
import { useSettings } from '@/state/settings/Provider';
import { INITIAL_ENTRIES, entriesReducer, type EntriesState } from './reducer';

type EntriesContextValue = {
  entries: EntriesState;
  reload: () => Promise<void>;
  clear: () => void;
};

const EntriesContext = createContext<EntriesContextValue | null>(null);

export function EntriesProvider({
  children,
  repository = demoEntriesRepository,
}: {
  children: ReactNode;
  repository?: EntriesRepository;
}) {
  const [entries, dispatch] = useReducer(entriesReducer, INITIAL_ENTRIES);
  const { settings } = useSettings();
  const lang = settings.lang;

  const repositoryRef = useRef(repository);
  repositoryRef.current = repository;

  /** Guards against an in-flight load for an old language overwriting a newer one. */
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    dispatch({ type: 'loadStarted' });

    try {
      const items = await repositoryRef.current.list(lang);
      if (id !== requestId.current) return;
      dispatch({ type: 'loadSucceeded', items });
    } catch (error) {
      if (id !== requestId.current) return;
      dispatch({
        type: 'loadFailed',
        errorKey: isApiError(error) ? error.messageKey : ERROR_KEYS.unknown,
      });
    }
  }, [lang]);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<EntriesContextValue>(
    () => ({
      entries,
      reload: load,
      clear: () => {
        // Bumped so a load still in flight cannot repopulate what was wiped.
        requestId.current += 1;
        dispatch({ type: 'cleared' });
      },
    }),
    [entries, load],
  );

  return <EntriesContext.Provider value={value}>{children}</EntriesContext.Provider>;
}

export function useEntries(): EntriesContextValue {
  const value = useContext(EntriesContext);
  if (!value) throw new Error('useEntries must be used inside an EntriesProvider');
  return value;
}
