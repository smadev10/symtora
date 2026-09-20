import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { Lang } from '@/i18n/translations';
import { STORAGE_KEYS } from '@/storage/keys';
import { prefsStore, readJson, writeJson, type KeyValueStore } from '@/storage';
import type { Theme } from '@/theme/tokens';
import {
  DEFAULT_SETTINGS,
  settingsReducer,
  type Retention,
  type SettingsState,
} from './reducer';

type SettingsContextValue = {
  settings: SettingsState;
  /** False until persisted settings have been read. */
  hydrated: boolean;
  setLang: (lang: Lang) => void;
  setTheme: (theme: Theme) => void;
  setRetention: (retention: Retention) => void;
  toggleLocalOnly: () => void;
  acceptConsent: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({
  children,
  store = prefsStore,
}: {
  children: ReactNode;
  store?: KeyValueStore;
}) {
  const [settings, dispatch] = useReducer(settingsReducer, DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const persisted = await readJson<Partial<SettingsState>>(
        storeRef.current,
        STORAGE_KEYS.settings,
      );
      if (cancelled) return;
      dispatch({ type: 'hydrate', persisted });
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Guarded: without this the first render would write the defaults over
    // whatever the user had saved, before the read above has come back.
    if (!hydrated) return;
    void writeJson(storeRef.current, STORAGE_KEYS.settings, settings);
  }, [hydrated, settings]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      hydrated,
      setLang: (lang) => dispatch({ type: 'setLang', lang }),
      setTheme: (theme) => dispatch({ type: 'setTheme', theme }),
      setRetention: (retention) => dispatch({ type: 'setRetention', retention }),
      toggleLocalOnly: () => dispatch({ type: 'toggleLocalOnly' }),
      acceptConsent: () => dispatch({ type: 'acceptConsent' }),
    }),
    [settings, hydrated],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside a SettingsProvider');
  return value;
}

/** Shorthand for the many components that only need the active theme. */
export function useTheme(): Theme {
  return useSettings().settings.theme;
}

/** Shorthand for the many components that only need the active language. */
export function useLang(): Lang {
  return useSettings().settings.lang;
}

