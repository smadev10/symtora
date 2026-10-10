import type { BodyRegion } from '@/repositories/entryMapping';
import { regionDistribution } from '@/state/entries/distribution';
import type { EntrySummary } from '@/state/entries/reducer';

const NOW = new Date('2026-10-10T12:00:00Z');

const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

const entry = (bodyRegion: BodyRegion | null, createdAt = daysAgo(1)): EntrySummary => ({
  id: `${bodyRegion}-${createdAt}`,
  title: '',
  dateLabel: '',
  region: '',
  urgency: 'low',
  urgencyLabel: '',
  createdAt,
  bodyRegion,
});

const percentOf = (rows: ReturnType<typeof regionDistribution>, region: BodyRegion | null) =>
  rows.find((row) => row.region === region)?.percent;

describe('regionDistribution', () => {
  it('is empty when there were no entries in the window', () => {
    expect(regionDistribution([], NOW)).toEqual([]);
    expect(regionDistribution([entry('head', daysAgo(31))], NOW)).toEqual([]);
  });

  it('computes each region’s share, largest first', () => {
    const rows = regionDistribution([entry('head'), entry('head'), entry('head'), entry('knee')], NOW);

    expect(rows[0]).toEqual({ region: 'head', count: 3, percent: 75 });
    expect(percentOf(rows, 'knee')).toBe(25);
  });

  it('lists every known region even at zero, so the card keeps its shape', () => {
    const rows = regionDistribution([entry('throat')], NOW);

    expect(rows.map((row) => row.region).sort()).toEqual(['head', 'knee', 'stomach', 'throat']);
    expect(percentOf(rows, 'head')).toBe(0);
  });

  it('adds a "no region" row only when some entry has none', () => {
    expect(percentOf(regionDistribution([entry('head')], NOW), null)).toBeUndefined();
    expect(percentOf(regionDistribution([entry('head'), entry(null)], NOW), null)).toBe(50);
  });

  it('rounds so the percentages always add up to 100', () => {
    const rows = regionDistribution([entry('head'), entry('stomach'), entry('throat')], NOW);

    expect(rows.reduce((sum, row) => sum + row.percent, 0)).toBe(100);
  });

  it('counts entries still being analysed, since their region is already known', () => {
    const pending = { ...entry('stomach'), urgency: null };

    expect(percentOf(regionDistribution([pending], NOW), 'stomach')).toBe(100);
  });
});
