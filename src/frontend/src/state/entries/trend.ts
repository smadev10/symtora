import type { EntrySummary } from './reducer';

export const TREND_DAYS = 14;

const DAY_MS = 86_400_000;

/** Local midnight, so "a day" matches the calendar day the user sees. */
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * Whole calendar days between `createdAt` and `now` (0 = today), or null when
 * the timestamp cannot be parsed.
 */
export function calendarDaysAgo(createdAt: string, now: Date): number | null {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return null;
  // Rounded, because a DST switch makes one day 23 or 25 hours long.
  return Math.round((startOfDay(now).getTime() - startOfDay(created).getTime()) / DAY_MS);
}

/**
 * Finished assessments per calendar day over the last `days` days, oldest
 * first and today last. Entries still pending, or whose analysis failed, have
 * no urgency and are not counted.
 */
export function assessmentsPerDay(items: EntrySummary[], now: Date, days = TREND_DAYS): number[] {
  const counts = new Array<number>(days).fill(0);
  for (const item of items) {
    if (!item.urgency) continue;
    const daysAgo = calendarDaysAgo(item.createdAt, now);
    if (daysAgo !== null && daysAgo >= 0 && daysAgo < days) counts[days - 1 - daysAgo] += 1;
  }

  return counts;
}
