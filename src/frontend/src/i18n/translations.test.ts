import { LANGS, TR } from '@/i18n/translations';

/**
 * Flattens a translation tree into sorted, comparable key paths.
 * Arrays contribute their length (`chips[4]`) because several of them are
 * index-matched against code — `chips` lines up with the demo case order, and
 * `patternRegions` with the heatmap rows — so a short array in one language is
 * a real bug, not a stylistic difference.
 */
function keyPaths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) return [`${prefix}[${value.length}]`];
  if (value !== null && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      keyPaths(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [prefix];
}

describe('translations', () => {
  it('exposes an identical key set in every language', () => {
    const reference = keyPaths(TR.de).sort();

    for (const lang of LANGS) {
      expect({ lang, keys: keyPaths(TR[lang]).sort() }).toEqual({ lang, keys: reference });
    }
  });
});
