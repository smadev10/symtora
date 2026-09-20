import { StyleSheet } from 'react-native';

import { type Theme, type ThemeTokens, tokens } from './tokens';

/** Letter spacing expressed in em, converted to the points RN expects. */
export const ls = (size: number, em: number) => Math.round(size * em * 100) / 100;

/** Line height expressed as a multiplier, converted to points. */
export const lh = (size: number, multiplier: number) => Math.round(size * multiplier * 100) / 100;

export const cardShadow = {
  shadowColor: '#a1a1a1',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.4,
  shadowRadius: 8,
  elevation: 3,
} as const;

/**
 * Wraps a token-driven style factory in a per-theme cache.
 *
 * Screens declare their sheet once at module level and call the result on
 * every render, so the cache is what keeps `StyleSheet.create` off the render
 * path and lets downstream memos hold.
 */
export function themedStyles<T>(factory: (tk: ThemeTokens) => T): (theme: Theme) => T {
  const cache = new Map<Theme, T>();

  return (theme: Theme) => {
    const cached = cache.get(theme);
    if (cached) return cached;

    const created = factory(tokens(theme));
    cache.set(theme, created);
    return created;
  };
}

/**
 * Pieces used by more than one screen. Anything used by a single screen stays
 * in that screen's own sheet.
 */
export const sharedStyles = themedStyles((tk) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: tk.screenBg },
    screenPad: { padding: 18, paddingTop: 20 },
    screenPadNoTop: { padding: 18, paddingTop: 14 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rowStart: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    card: { backgroundColor: tk.card, borderRadius: 19, padding: 14, marginBottom: 10, ...cardShadow },
    badge: {
      backgroundColor: tk.badgeBg,
      color: tk.textNormal,
      fontSize: 11,
      fontWeight: '600',
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 20,
      overflow: 'hidden',
    },
    badgeDark: {
      backgroundColor: 'rgba(255,255,255,.14)',
      color: '#fff',
      fontSize: 11,
      fontWeight: '600',
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 20,
      overflow: 'hidden',
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: tk.card,
      alignItems: 'center',
      justifyContent: 'center',
      ...cardShadow,
    },
    pageTitle: { color: tk.textStrong, fontWeight: '800', fontSize: 26, marginTop: 4, marginBottom: 4 },
    pageSubtitle: { color: tk.textMuted, fontSize: 13, marginBottom: 18 },
    sectionTitleTop: { color: tk.textStrong, fontWeight: '700', fontSize: 14, marginTop: 22, marginBottom: 10 },
    sectionTitleInCard: { color: tk.textStrong, fontWeight: '700', fontSize: 14 },
    kicker: { color: 'rgba(255,255,255,.6)', fontSize: 11, fontWeight: '700', letterSpacing: ls(11, 0.12) },
    kickerLight: { color: tk.textFaint, fontSize: 11, fontWeight: '700', letterSpacing: ls(11, 0.12) },
    divider: { height: 1, backgroundColor: tk.divider, marginVertical: 12 },
    rowSubtitle: { color: tk.textMuted, fontSize: 11.5, marginTop: 2 },
    textStrong: { color: tk.textStrong },
    textNormal: { color: tk.textNormal },
    textMuted: { color: tk.textMuted, fontSize: 12.5, lineHeight: lh(12.5, 1.5) },
    textMutedSmall: { color: tk.textMuted, fontSize: 11 },
    iconBoxLight: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: tk.badgeBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBoxDark: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: '#142939',
      alignItems: 'center',
      justifyContent: 'center',
    },
    distTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: tk.divider, overflow: 'hidden' },
  }),
);
