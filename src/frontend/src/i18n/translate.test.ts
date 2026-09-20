import { ERROR_KEYS } from '@/api/errors';
import { LANGS, TR } from '@/i18n/translations';
import { translate } from '@/i18n/translate';

describe('translate', () => {
  it('resolves a dotted path into the language tree', () => {
    expect(translate('de', 'nav.start')).toBe(TR.de.nav.start);
    expect(translate('fr', 'nav.start')).toBe(TR.fr.nav.start);
  });

  it('returns the key itself when nothing matches', () => {
    // Visible in the UI on purpose — a blank label hides the mistake.
    expect(translate('de', 'nav.nope')).toBe('nav.nope');
    expect(translate('de', 'totally.unknown.path')).toBe('totally.unknown.path');
  });

  it('returns the key rather than an object for a partial path', () => {
    expect(translate('de', 'nav')).toBe('nav');
  });
});

describe('api error keys', () => {
  it('resolves every ApiError key in every language', () => {
    // ApiError carries a key, never a message. An unresolved key would render
    // as `errors.network` to the user.
    for (const lang of LANGS) {
      for (const [kind, key] of Object.entries(ERROR_KEYS)) {
        expect({ lang, kind, resolved: translate(lang, key) }).not.toEqual({
          lang,
          kind,
          resolved: key,
        });
      }
    }
  });
});
