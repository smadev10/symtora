import type { BodyRegion } from '@/repositories/entryMapping';
import type { EntrySummary } from './reducer';
import { calendarDaysAgo, TREND_DAYS } from './trend';

export type HomeKpis = {
  /** Entries created in the window, including ones still being analysed. */
  entries: number;
  /** Distinct body regions among those entries; entries without one are ignored. */
  regions: number;
  /** Entries in the window whose assessment came back as high urgency. */
  emergencies: number;
};

/** The three counters on the home screen, over the same window as the trend chart. */
export function homeKpis(items: EntrySummary[], now: Date, days = TREND_DAYS): HomeKpis {
  let entries = 0;
  let emergencies = 0;
  const regions = new Set<BodyRegion>();

  for (const item of items) {
    const daysAgo = calendarDaysAgo(item.createdAt, now);
    if (daysAgo === null || daysAgo < 0 || daysAgo >= days) continue;

    entries += 1;
    if (item.bodyRegion) regions.add(item.bodyRegion);
    if (item.urgency === 'high') emergencies += 1;
  }

  return { entries, regions: regions.size, emergencies };
}
