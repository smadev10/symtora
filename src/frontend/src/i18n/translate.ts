import { TR, type Lang } from './translations';

/**
 * Resolves a dotted key such as `errors.network` against a language tree.
 *
 * Used for values that are chosen at runtime — chiefly `ApiError.messageKey`,
 * which carries a key precisely so error text can be localised. Screens with
 * a key known at compile time should read `t.errors.network` directly and let
 * TypeScript check it.
 *
 * An unresolved key is returned as-is, so a mistake shows up in the UI instead
 * of rendering as an empty string.
 */
export function translate(lang: Lang, key: string): string {
  const resolved = key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node !== null && typeof node === 'object'
          ? (node as Record<string, unknown>)[part]
          : undefined,
      TR[lang],
    );

  return typeof resolved === 'string' ? resolved : key;
}
