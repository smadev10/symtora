import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';

import { STORAGE_KEYS } from '@/storage/keys';
import { readJson, secureStore, writeJson, type KeyValueStore } from '@/storage';
import {
  INITIAL_SESSION,
  sessionReducer,
  type AuthUser,
  type PersistedSession,
  type SessionState,
} from './reducer';

type SessionContextValue = {
  session: SessionState;
  signIn: (session: PersistedSession) => void;
  signOut: () => void;
  updateProfile: (user: Partial<AuthUser>) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  children,
  store = secureStore,
}: {
  children: ReactNode;
  store?: KeyValueStore;
}) {
  const [session, dispatch] = useReducer(sessionReducer, INITIAL_SESSION);
  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const persisted = await readJson<PersistedSession>(storeRef.current, STORAGE_KEYS.session);
      if (cancelled) return;
      dispatch({ type: 'restored', persisted, now: Date.now() });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // `restoring` is the pre-read state and must not touch storage, or the
    // first frame would erase the very session it is about to read.
    if (session.status === 'restoring') return;

    if (session.status === 'authenticated') {
      const { status, ...persisted } = session;
      void writeJson(storeRef.current, STORAGE_KEYS.session, persisted);
    } else {
      // Covers both sign-out and a token found expired at restore time.
      void storeRef.current.remove(STORAGE_KEYS.session);
    }
  }, [session]);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      signIn: (next) => dispatch({ type: 'signedIn', session: next }),
      signOut: () => dispatch({ type: 'signedOut' }),
      updateProfile: (user) => dispatch({ type: 'profileUpdated', user }),
    }),
    [session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside a SessionProvider');
  return value;
}
