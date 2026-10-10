import type { EntryResponse, EntryStatusDto } from '@/api/types';
import { PROBABILITIES, URGENCIES, type Probability, type Urgency } from '@/data/cases';
import { TR, type Lang, type Translations } from '@/i18n/translations';
import type { EntrySummary } from '@/state/entries/reducer';

/** The `bodyRegion` values the app sends, and the keys of `TR.regionLabels`. */
export const BODY_REGIONS = ['head', 'stomach', 'throat', 'knee'] as const;
export type BodyRegion = (typeof BODY_REGIONS)[number];

const isBodyRegion = (value: string): value is BodyRegion =>
  (BODY_REGIONS as readonly string[]).includes(value);

/** What the assessment screen renders. Only fields the API actually returns. */
export type AssessmentView = {
  id: string;
  title: string;
  status: EntryStatusDto;
  rawText: string;
  createdLabel: string;
  /** Null until the analysis is done. */
  urgency: Urgency | null;
  causes: { label: string; prob: Probability; desc: string | null }[];
  steps: string[];
};

const TITLE_WORDS = 5;

/**
 * Anything the model got wrong falls back to "mid", matching the server's
 * parser: over-estimating urgency is the safer mistake.
 */
export function toUrgency(value: string): Urgency {
  const lower = value.toLowerCase();
  return (URGENCIES as readonly string[]).includes(lower) ? (lower as Urgency) : 'mid';
}

export function toProbability(value: string): Probability {
  const lower = value.toLowerCase();
  return (PROBABILITIES as readonly string[]).includes(lower) ? (lower as Probability) : 'mid';
}

export function entryTitle(entry: Pick<EntryResponse, 'bodyRegion' | 'rawText'>, t: Translations): string {
  const region = entry.bodyRegion?.toLowerCase();
  if (region && isBodyRegion(region)) return t.regionLabels[region];

  const words = entry.rawText.trim().split(/\s+/);
  return words.length > TITLE_WORDS ? `${words.slice(0, TITLE_WORDS).join(' ')} …` : words.join(' ');
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export function dateLabel(iso: string, lang: Lang, now: Date = new Date()): string {
  const date = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  const t = TR[lang];

  if (days === 0) return t.dates.today;
  if (days === 1) return t.dates.yesterday;
  return date.toLocaleDateString(lang);
}

export function toSummary(entry: EntryResponse, lang: Lang, now?: Date): EntrySummary {
  const t = TR[lang];
  // A pending or failed entry has no urgency yet; show it neutrally rather than as "low".
  const urgency = entry.assessment ? toUrgency(entry.assessment.urgency) : null;

  return {
    id: entry.id,
    title: entryTitle(entry, t),
    dateLabel: dateLabel(entry.createdAt, lang, now),
    region: entry.bodyRegion && isBodyRegion(entry.bodyRegion) ? t.regionLabels[entry.bodyRegion] : '',
    urgency,
    urgencyLabel: urgency ? t.urgency[urgency].label : '…',
    createdAt: entry.createdAt,
    bodyRegion: entry.bodyRegion && isBodyRegion(entry.bodyRegion) ? entry.bodyRegion : null,
  };
}

export function toAssessmentView(entry: EntryResponse, lang: Lang, now?: Date): AssessmentView {
  const assessment = entry.status === 'Done' ? entry.assessment : null;

  return {
    id: entry.id,
    title: entryTitle(entry, TR[lang]),
    status: entry.status,
    rawText: entry.rawText,
    createdLabel: dateLabel(entry.createdAt, lang, now),
    urgency: assessment ? toUrgency(assessment.urgency) : null,
    causes: (assessment?.causes ?? []).map((cause) => ({
      label: cause.label,
      prob: toProbability(cause.tier),
      desc: cause.reason?.trim() || null,
    })),
    steps: assessment?.nextSteps ?? [],
  };
}
