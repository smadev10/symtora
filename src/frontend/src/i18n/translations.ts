import de from './de';
import en from './en';
import fr from './fr';

export type { Translations } from './de';
import type { Translations } from './de';

export const LANGS = ['de', 'en', 'fr'] as const;

export type Lang = (typeof LANGS)[number];

export const TR: Record<Lang, Translations> = { de, en, fr };
