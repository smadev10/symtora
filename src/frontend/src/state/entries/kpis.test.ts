import { homeKpis } from '@/state/entries/kpis';
import type { EntrySummary } from '@/state/entries/reducer';

const NOW = new Date(2026, 9, 10, 15, 0);

const daysAgo = (n: number, hour = 9) => new Date(2026, 9, 10 - n, hour).toISOString();

const entry = (createdAt: string, overrides: Partial<EntrySummary> = {}): EntrySummary => ({
  id: createdAt,
  title: 'Head',
  dateLabel: '',
  region: '',
  urgency: 'low',
  urgencyLabel: '',
  createdAt,
  bodyRegion: null,
  ...overrides,
});

describe('homeKpis', () => {
  it('is all zeros without entries', () => {
    expect(homeKpis([], NOW)).toEqual({ entries: 0, regions: 0, emergencies: 0 });
  });

  it('counts only entries inside the 14-day window', () => {
    const items = [
      entry(daysAgo(0)),
      entry(daysAgo(13), { urgency: 'high', bodyRegion: 'knee' }),
      entry(daysAgo(14), { urgency: 'high', bodyRegion: 'head' }),
      entry(daysAgo(-1)),
      entry('not a date'),
    ];

    expect(homeKpis(items, NOW)).toEqual({ entries: 2, regions: 1, emergencies: 1 });
  });

  it('counts distinct regions, ignoring duplicates and entries without one', () => {
    const items = [
      entry(daysAgo(1), { bodyRegion: 'head' }),
      entry(daysAgo(2), { bodyRegion: 'head' }),
      entry(daysAgo(3), { bodyRegion: 'stomach' }),
      entry(daysAgo(4), { bodyRegion: null }),
    ];

    expect(homeKpis(items, NOW).regions).toBe(2);
  });

  it('treats only high urgency as an emergency and still counts pending entries', () => {
    const items = [
      entry(daysAgo(1), { urgency: 'high' }),
      entry(daysAgo(1), { urgency: 'mid' }),
      entry(daysAgo(1), { urgency: 'low' }),
      entry(daysAgo(1), { urgency: null }),
    ];

    expect(homeKpis(items, NOW)).toEqual({ entries: 4, regions: 0, emergencies: 1 });
  });
});
