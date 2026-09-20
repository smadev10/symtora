import { CASES, HISTORY_ORDER, type CaseKey, type DemoCase } from '@/data/cases';
import { TR, type Lang } from '@/i18n/translations';
import type { EntrySummary } from '@/state/entries/reducer';

/**
 * The seam between the screens and wherever entries come from.
 *
 * Today that is the bundled demo content. When the API is wired up, an
 * implementation backed by GET /entries replaces `demoEntriesRepository` and
 * nothing above this interface changes.
 */
export interface EntriesRepository {
  list(lang: Lang): Promise<EntrySummary[]>;
  get(lang: Lang, id: string): Promise<DemoCase | null>;
}

const isCaseKey = (id: string): id is CaseKey => id in CASES.de;

export const demoEntriesRepository: EntriesRepository = {
  async list(lang) {
    const t = TR[lang];

    return HISTORY_ORDER.map((key, i) => {
      const source = CASES[lang][key];
      return {
        id: key,
        title: source.title,
        dateLabel: t.recentDates[i],
        region: t.regions[i],
        urgency: source.urgency,
        urgencyLabel: source.urgencyLabel,
      };
    });
  },

  async get(lang, id) {
    return isCaseKey(id) ? CASES[lang][id] : null;
  },
};
