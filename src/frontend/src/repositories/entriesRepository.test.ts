import { CASES, HISTORY_ORDER } from '@/data/cases';
import { LANGS, TR } from '@/i18n/translations';
import { demoEntriesRepository } from '@/repositories/entriesRepository';

describe('list', () => {
  it('returns one entry per demo case, in the order the home screen shows them', async () => {
    const entries = await demoEntriesRepository.list('de');

    expect(entries.map((e) => e.id)).toEqual([...HISTORY_ORDER]);
  });

  it('labels each entry in the requested language', async () => {
    const [de] = await demoEntriesRepository.list('de');
    const [fr] = await demoEntriesRepository.list('fr');

    expect(de.title).toBe(CASES.de[HISTORY_ORDER[0]].title);
    expect(fr.title).toBe(CASES.fr[HISTORY_ORDER[0]].title);
    expect(de.title).not.toBe(fr.title);
  });

  it('carries the urgency and its label from the underlying case', async () => {
    const entries = await demoEntriesRepository.list('de');

    for (const entry of entries) {
      const source = CASES.de[entry.id as keyof (typeof CASES)['de']];
      expect({ urgency: entry.urgency, urgencyLabel: entry.urgencyLabel }).toEqual({
        urgency: source.urgency,
        urgencyLabel: source.urgencyLabel,
      });
    }
  });

  it('gives every entry a date label and a region in every language', async () => {
    for (const lang of LANGS) {
      const entries = await demoEntriesRepository.list(lang);

      expect(entries.map((e) => e.dateLabel)).toEqual(TR[lang].recentDates.slice(0, entries.length));
      entries.forEach((entry, i) => expect(entry.region).toBe(TR[lang].regions[i]));
    }
  });

  it('has a date label available for every entry it returns', async () => {
    // recentDates is index-matched to the history list; a short array would
    // render `undefined` under a card title.
    for (const lang of LANGS) {
      const entries = await demoEntriesRepository.list(lang);
      expect(TR[lang].recentDates.length).toBeGreaterThanOrEqual(entries.length);
      expect(TR[lang].regions.length).toBeGreaterThanOrEqual(entries.length);
    }
  });
});

describe('get', () => {
  it('returns the full case for a known id', async () => {
    const found = await demoEntriesRepository.get('de', 'headache');

    expect(found).toEqual(CASES.de.headache);
  });

  it('returns it in the requested language', async () => {
    const found = await demoEntriesRepository.get('fr', 'knee');

    expect(found).toEqual(CASES.fr.knee);
  });

  it('returns null for an id that does not exist', async () => {
    // Reachable from a deep link to /assessment/anything.
    await expect(demoEntriesRepository.get('de', 'sprained-ego')).resolves.toBeNull();
  });
});
