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
import { AppState } from 'react-native';

import { ERROR_KEYS, isApiError, isRetryableKey } from '@/api/errors';
import { apiEntriesRepository, type EntriesRepository } from '@/repositories/entriesRepository';
import { useSettings } from '@/state/settings/Provider';
import { INITIAL_ENTRIES, entriesReducer, type EntriesState } from './reducer';

type EntriesContextValue = {
  entries: EntriesState;
  reload: () => Promise<void>;
  clear: () => void;
};

/**
 * How failed loads are retried. `quick` are the waits between the first
 * attempts, while the screen still shows the loading bar; once they run out
 * the error is shown and loading keeps being retried every `background` ms.
 */
export type RetryPolicy = { quick: readonly number[]; background: number };

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  quick: [1_000, 2_000, 4_000, 8_000],
  background: 30_000,
};

const EntriesContext = createContext<EntriesContextValue | null>(null);

export function EntriesProvider({
  children,
  repository = apiEntriesRepository,
  retryPolicy = DEFAULT_RETRY_POLICY,
  sessionKey = 'default',
}: {
  children: ReactNode;
  repository?: EntriesRepository;
  retryPolicy?: RetryPolicy;
  /**
   * Who the entries belong to — the session token. Null while signed out:
   * nothing is loaded and the list is emptied. A new key loads afresh, so
   * logging in (or switching accounts) never shows a stale or failed list.
   */
  sessionKey?: string | null;
}) {
  const [entries, dispatch] = useReducer(entriesReducer, INITIAL_ENTRIES);
  const { settings } = useSettings();
  const lang = settings.lang;

  const repositoryRef = useRef(repository);
  repositoryRef.current = repository;
  const policyRef = useRef(retryPolicy);
  policyRef.current = retryPolicy;
  const statusRef = useRef(entries.status);
  statusRef.current = entries.status;

  /** Guards against an in-flight load for an old language overwriting a newer one. */
  const requestId = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelRetry = useCallback(() => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryTimer.current = null;
  }, []);

  /**
   * `quiet` retries run behind an error that is already on screen, so they
   * don't flip it back to the loading bar every half minute.
   */
  const load = useCallback(
    async (attempt = 0, quiet = false) => {
      cancelRetry();
      const id = ++requestId.current;
      if (!quiet) dispatch({ type: 'loadStarted', attempt });

      try {
        const items = await repositoryRef.current.list(lang);
        if (id !== requestId.current) return;
        dispatch({ type: 'loadSucceeded', items });
      } catch (error) {
        if (id !== requestId.current) return;
        const errorKey = isApiError(error) ? error.messageKey : ERROR_KEYS.unknown;
        const retry = (delay: number, nextQuiet: boolean) => {
          retryTimer.current = setTimeout(() => void load(attempt + 1, nextQuiet), delay);
        };

        if (!isRetryableKey(errorKey)) {
          dispatch({ type: 'loadFailed', errorKey });
          return;
        }

        const policy = policyRef.current;
        const quickDelay = quiet ? undefined : policy.quick[attempt];
        if (quickDelay !== undefined) {
          // Still within the quick retries: the loading bar stays up.
          retry(quickDelay, false);
          return;
        }

        if (!quiet) dispatch({ type: 'loadFailed', errorKey });
        retry(policy.background, true);
      }
    },
    [lang, cancelRetry],
  );

  const signedIn = sessionKey !== null;
  const signedInRef = useRef(signedIn);
  signedInRef.current = signedIn;

  useEffect(() => {
    if (!signedIn) {
      dispatch({ type: 'cleared' });
      return undefined;
    }
    void load();
    return () => {
      cancelRetry();
      // Drops any answer still in flight for this language.
      requestId.current += 1;
    };
    // sessionKey is a dependency so a new login reloads even in the same language.
  }, [load, cancelRetry, signedIn, sessionKey]);

  // Coming back to the app is a good moment to try again rather than wait out the timer.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && signedInRef.current && statusRef.current === 'error') void load();
    });
    return () => subscription.remove();
  }, [load]);

  const value = useMemo<EntriesContextValue>(
    () => ({
      entries,
      reload: () => load(),
      clear: () => {
        cancelRetry();
        // Bumped so a load still in flight cannot repopulate what was wiped.
        requestId.current += 1;
        dispatch({ type: 'cleared' });
      },
    }),
    [entries, load, cancelRetry],
  );

  return <EntriesContext.Provider value={value}>{children}</EntriesContext.Provider>;
}

export function useEntries(): EntriesContextValue {
  const value = useContext(EntriesContext);
  if (!value) throw new Error('useEntries must be used inside an EntriesProvider');
  return value;
}
