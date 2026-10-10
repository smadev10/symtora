import { BODY_REGIONS, type BodyRegion } from '@/repositories/entryMapping';
import type { EntrySummary } from './reducer';

export const DISTRIBUTION_DAYS = 30;

const DAY_MS = 86_400_000;

export type RegionShare = {
  /** Null for entries described without picking a body region. */
  region: BodyRegion | null;
  count: number;
  /** Whole percent; the rows of one distribution always add up to 100. */
  percent: number;
};

/**
 * Splits whole numbers so they keep summing to 100: everyone gets their
 * rounded-down share, and the points left over go to the largest remainders.
 */
function toPercents(counts: number[], total: number): number[] {
  const exact = counts.map((count) => (count / total) * 100);
  const percents = exact.map(Math.floor);
  let left = 100 - percents.reduce((sum, n) => sum + n, 0);

  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);
  for (const { index } of byRemainder) {
    if (left <= 0) break;
    percents[index] += 1;
    left -= 1;
  }
  return percents;
}

/**
 * Share of entries per body region over the last `days` days, largest first.
 * Every known region is listed, even at 0 %, so the card keeps its shape;
 * "no region" only appears when some entry actually has none. Empty when
 * there were no entries in the window.
 */
export function regionDistribution(items: EntrySummary[], now: Date, days = DISTRIBUTION_DAYS): RegionShare[] {
  const since = now.getTime() - days * DAY_MS;
  const counts = new Map<BodyRegion | null, number>(BODY_REGIONS.map((region) => [region, 0]));

  for (const item of items) {
    const created = Date.parse(item.createdAt);
    if (Number.isNaN(created) || created < since || created > now.getTime()) continue;
    counts.set(item.bodyRegion, (counts.get(item.bodyRegion) ?? 0) + 1);
  }

  if (counts.get(null) === 0) counts.delete(null);
  const rows = [...counts.entries()];
  const total = rows.reduce((sum, [, count]) => sum + count, 0);
  if (total === 0) return [];

  const percents = toPercents(rows.map(([, count]) => count), total);
  return (
    rows
      .map(([region, count], index) => ({ region, count, percent: percents[index] }))
      // Array.sort is stable, so ties keep the declared region order.
      .sort((a, b) => b.count - a.count)
  );
}
