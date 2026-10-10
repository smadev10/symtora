import type { EntrySummary } from '@/state/entries/reducer';
import { assessmentsPerDay, TREND_DAYS } from '@/state/entries/trend';

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
  ...overrides,
});

describe('assessmentsPerDay', () => {
  it('returns one zeroed slot per day when there are no entries', () => {
    expect(assessmentsPerDay([], NOW)).toEqual(new Array(TREND_DAYS).fill(0));
  });

  it('puts today last and the oldest day first', () => {
    const counts = assessmentsPerDay([entry(daysAgo(0)), entry(daysAgo(0, 23)), entry(daysAgo(13))], NOW);

    expect(counts[TREND_DAYS - 1]).toBe(2);
    expect(counts[0]).toBe(1);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it('ignores entries older than the window', () => {
    expect(assessmentsPerDay([entry(daysAgo(14)), entry(daysAgo(30))], NOW)).toEqual(
      new Array(TREND_DAYS).fill(0),
    );
  });

  it('counts only finished assessments, not pending or failed entries', () => {
    const counts = assessmentsPerDay([entry(daysAgo(1), { urgency: null }), entry(daysAgo(1))], NOW);

    expect(counts[TREND_DAYS - 2]).toBe(1);
  });

  it('skips an entry with an unreadable date', () => {
    expect(assessmentsPerDay([entry('not-a-date')], NOW)).toEqual(new Array(TREND_DAYS).fill(0));
  });
});
