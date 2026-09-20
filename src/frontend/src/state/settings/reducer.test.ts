import {
  DEFAULT_SETTINGS,
  RETENTIONS,
  settingsReducer,
  type SettingsState,
} from '@/state/settings/reducer';

describe('settings defaults', () => {
  it('matches the behaviour the prototype shipped with', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      lang: 'de',
      theme: 'light',
      retention: 30,
      localOnly: true,
      consentAccepted: false,
    });
  });
});

describe('settingsReducer', () => {
  it('changes only the language', () => {
    const next = settingsReducer(DEFAULT_SETTINGS, { type: 'setLang', lang: 'fr' });

    expect(next).toEqual({ ...DEFAULT_SETTINGS, lang: 'fr' });
  });

  it('changes only the theme', () => {
    const next = settingsReducer(DEFAULT_SETTINGS, { type: 'setTheme', theme: 'dark' });

    expect(next).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark' });
  });

  it('changes only the retention window', () => {
    const next = settingsReducer(DEFAULT_SETTINGS, { type: 'setRetention', retention: 365 });

    expect(next).toEqual({ ...DEFAULT_SETTINGS, retention: 365 });
  });

  it('toggles local-only processing back and forth', () => {
    const off = settingsReducer(DEFAULT_SETTINGS, { type: 'toggleLocalOnly' });
    const on = settingsReducer(off, { type: 'toggleLocalOnly' });

    expect(off.localOnly).toBe(false);
    expect(on.localOnly).toBe(true);
  });

  it('records onboarding consent', () => {
    const next = settingsReducer(DEFAULT_SETTINGS, { type: 'acceptConsent' });

    expect(next.consentAccepted).toBe(true);
  });

  it('never mutates the state it is given', () => {
    const before = { ...DEFAULT_SETTINGS };
    settingsReducer(before, { type: 'setLang', lang: 'en' });

    expect(before).toEqual(DEFAULT_SETTINGS);
  });

  it('returns the same state object for an unknown action', () => {
    const state = { ...DEFAULT_SETTINGS };

    // @ts-expect-error deliberately unknown action
    expect(settingsReducer(state, { type: 'nope' })).toBe(state);
  });
});

describe('hydrate', () => {
  it('applies persisted values over the defaults', () => {
    const next = settingsReducer(DEFAULT_SETTINGS, {
      type: 'hydrate',
      persisted: { lang: 'en', theme: 'dark', retention: 7, localOnly: false, consentAccepted: true },
    });

    expect(next).toEqual({
      lang: 'en',
      theme: 'dark',
      retention: 7,
      localOnly: false,
      consentAccepted: true,
    });
  });

  it('keeps defaults for keys the persisted blob does not contain', () => {
    const next = settingsReducer(DEFAULT_SETTINGS, {
      type: 'hydrate',
      persisted: { theme: 'dark' },
    });

    expect(next).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark' });
  });

  it('discards values that are not valid any more', () => {
    // A blob written by an older build, or edited by hand, must not put the
    // app into a state no screen can render.
    const next = settingsReducer(DEFAULT_SETTINGS, {
      type: 'hydrate',
      persisted: {
        lang: 'es',
        theme: 'solarized',
        retention: 9999,
        localOnly: 'yes',
        consentAccepted: 1,
      } as unknown as Partial<SettingsState>,
    });

    expect(next).toEqual(DEFAULT_SETTINGS);
  });

  it('tolerates a null persisted blob', () => {
    expect(settingsReducer(DEFAULT_SETTINGS, { type: 'hydrate', persisted: null })).toEqual(
      DEFAULT_SETTINGS,
    );
  });

  it('accepts every advertised retention window', () => {
    for (const retention of RETENTIONS) {
      const next = settingsReducer(DEFAULT_SETTINGS, { type: 'hydrate', persisted: { retention } });
      expect(next.retention).toBe(retention);
    }
  });
});
