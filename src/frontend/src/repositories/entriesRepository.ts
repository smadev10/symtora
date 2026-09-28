import { entriesApi, type EntriesApi } from '@/api/entries';
import { isApiError } from '@/api/errors';
import type { CreateEntryResponse } from '@/api/types';
import type { Lang } from '@/i18n/translations';
import type { EntrySummary } from '@/state/entries/reducer';
import { toAssessmentView, toSummary, type AssessmentView, type BodyRegion } from './entryMapping';

/**
 * The seam between the screens and the entries API. Screens only ever see
 * the app's own shapes; the wire types stop here.
 */
export interface EntriesRepository {
  list(lang: Lang): Promise<EntrySummary[]>;
  /** Null when the entry does not exist or belongs to someone else. */
  get(lang: Lang, id: string): Promise<AssessmentView | null>;
  create(text: string, bodyRegion: BodyRegion | null): Promise<CreateEntryResponse>;
}

export function createApiEntriesRepository(api: EntriesApi): EntriesRepository {
  return {
    async list(lang) {
      const entries = await api.list();
      return entries.map((entry) => toSummary(entry, lang));
    },

    async get(lang, id) {
      try {
        return toAssessmentView(await api.get(id), lang);
      } catch (error) {
        // The API answers 404 for unknown ids, which a deep link can produce.
        if (isApiError(error) && error.kind === 'notFound') return null;
        throw error;
      }
    },

    create(text, bodyRegion) {
      return api.create({ text: text.trim(), bodyRegion });
    },
  };
}

export const apiEntriesRepository = createApiEntriesRepository(entriesApi);
