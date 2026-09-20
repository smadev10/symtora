import type { SegmentTint } from '@/data/cases';

export const THEMES = ['light', 'dark'] as const;

export type Theme = (typeof THEMES)[number];

/** Background/foreground pair for a tinted transcript segment or icon box. */
export type Tint = { bg: string; fg: string };

export type ThemeTokens = {
  screenBg: string;
  card: string;
  textStrong: string;
  textNormal: string;
  textMuted: string;
  textFaint: string;
  divider: string;
  accent: string;
  accentText: string;
  accentSelectedBg: string;
  accentSelectedBorder: string;
  badgeBg: string;
  navBg: string;
  heatFrom: string;
  heatTo: string;
  inset: string;
  tintBlue: Tint;
  tintOrange: Tint;
  tintGreen: Tint;
  tintNeutral: Tint;
};

const LIGHT: ThemeTokens = {
  screenBg: '#f7f8f9',
  card: '#ffffff',
  textStrong: '#142939',
  textNormal: '#285172',
  textMuted: '#6b8598',
  textFaint: '#a9bdc9',
  divider: '#e4e8eb',
  accent: '#285172',
  accentText: '#ffffff',
  accentSelectedBg: '#b9dcf7',
  accentSelectedBorder: '#285172',
  badgeBg: '#eef4f9',
  navBg: '#ffffff',
  heatFrom: '#eef4f9',
  heatTo: '#142939',
  inset: '#f2f4f6',
  tintBlue: { bg: '#eef4f9', fg: '#285172' },
  tintOrange: { bg: '#fdf1de', fg: '#8a5a08' },
  tintGreen: { bg: '#e8f5ec', fg: '#227a44' },
  tintNeutral: { bg: '#eef0f2', fg: '#6b7680' },
};

const DARK: ThemeTokens = {
  screenBg: '#0b1a26',
  card: '#16283a',
  textStrong: '#ffffff',
  textNormal: '#cfe3f0',
  textMuted: '#8ba3b4',
  textFaint: '#4d6274',
  divider: '#25405a',
  accent: '#b9dcf7',
  accentText: '#142939',
  accentSelectedBg: '#1f3d54',
  accentSelectedBorder: '#b9dcf7',
  badgeBg: '#1c3245',
  navBg: '#16283a',
  heatFrom: '#16283a',
  heatTo: '#b9dcf7',
  inset: '#1c3245',
  tintBlue: { bg: '#1c3245', fg: '#bcdcf6' },
  tintOrange: { bg: '#3a2f14', fg: '#e0b060' },
  tintGreen: { bg: '#143a24', fg: '#6fcf97' },
  tintNeutral: { bg: '#22303b', fg: '#8ba3b4' },
};

export function tokens(theme: Theme): ThemeTokens {
  return theme === 'dark' ? DARK : LIGHT;
}

const TINT_BY_SEGMENT: Record<SegmentTint, keyof ThemeTokens> = {
  blue: 'tintBlue',
  orange: 'tintOrange',
  green: 'tintGreen',
  neutral: 'tintNeutral',
};

/**
 * Resolves a transcript segment tint to its theme colours. Replaces the old
 * `tk['tint' + capitalise(c)]` string concatenation, which no type checker
 * could follow.
 */
export function tintFor(tk: ThemeTokens, tint: SegmentTint): Tint {
  return tk[TINT_BY_SEGMENT[tint]] as Tint;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Linear per-channel interpolation, used for the patterns heatmap. */
export function heatColor(fraction: number, from: string, to: string): string {
  const c1 = hexToRgb(from);
  const c2 = hexToRgb(to);
  const channel = (i: 0 | 1 | 2) => Math.round(c1[i] + (c2[i] - c1[i]) * fraction);
  return `rgb(${channel(0)},${channel(1)},${channel(2)})`;
}
