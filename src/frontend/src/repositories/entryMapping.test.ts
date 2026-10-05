import type { EntryResponse } from '@/api/types';
import { TR } from '@/i18n/translations';
import {
  dateLabel,
  entryTitle,
  toAssessmentView,
  toProbability,
  toSummary,
  toUrgency,
} from '@/repositories/entryMapping';

const NOW = new Date(2026, 8, 28, 15, 0);

function entry(overrides: Partial<EntryResponse> = {}): EntryResponse {
  return {
    id: 'e1',
    rawText: 'Seit heute Mittag starke Kopfschmerzen hinter der Stirn',
    bodyRegion: 'head',
    status: 'Done',
    createdAt: new Date(2026, 8, 28, 9, 30).toISOString(),
    assessment: {
      causes: [
        { label: 'Spannungskopfschmerz', tier: 'high', reason: ' Passt zur Nackensteifigkeit. ' },
        { label: 'Migräne', tier: 'MID' },
      ],
      urgency: 'low',
      nextSteps: ['Wasser trinken.'],
      generatedAt: new Date(2026, 8, 28, 9, 31).toISOString(),
    },
    ...overrides,
  };
}

describe('level narrowing', () => {
  it('accepts known levels regardless of case', () => {
    expect(toUrgency('HIGH')).toBe('high');
    expect(toProbability('Low')).toBe('low');
  });

  it('falls back to mid for anything unexpected, like the server parser', () => {
    expect(toUrgency('critical')).toBe('mid');
    expect(toProbability('')).toBe('mid');
  });
});

describe('entryTitle', () => {
  it('uses the localised body region when one is known', () => {
    expect(entryTitle(entry(), TR.fr)).toBe(TR.fr.regionLabels.head);
  });

  it('falls back to the first words of the description', () => {
    expect(entryTitle(entry({ bodyRegion: null }), TR.de)).toBe('Seit heute Mittag starke Kopfschmerzen …');
  });

  it('does not truncate a short description', () => {
    expect(entryTitle(entry({ bodyRegion: 'elbow', rawText: 'Ellbogen tut weh' }), TR.de)).toBe(
      'Ellbogen tut weh',
    );
  });
});

describe('dateLabel', () => {
  it('says today and yesterday by calendar day', () => {
    expect(dateLabel(new Date(2026, 8, 28, 0, 5).toISOString(), 'en', NOW)).toBe(TR.en.dates.today);
    expect(dateLabel(new Date(2026, 8, 27, 23, 55).toISOString(), 'de', NOW)).toBe(TR.de.dates.yesterday);
  });

  it('prints older dates as a date', () => {
    const label = dateLabel(new Date(2026, 8, 20).toISOString(), 'de', NOW);
    expect(label).not.toBe(TR.de.dates.today);
    expect(label).toContain('20');
  });
});

describe('toSummary', () => {
  it('maps a finished entry to a history row', () => {
    expect(toSummary(entry(), 'en', NOW)).toEqual({
      id: 'e1',
      title: 'Head',
      dateLabel: 'Today',
      region: 'Head',
      urgency: 'low',
      urgencyLabel: TR.en.urgency.low.label,
    });
  });

  it('shows a pending entry without an urgency', () => {
    const summary = toSummary(entry({ status: 'Pending', assessment: null }), 'en', NOW);
    expect(summary.urgency).toBeNull();
  });

  it('leaves the region empty when none was given', () => {
    expect(toSummary(entry({ bodyRegion: null }), 'en', NOW).region).toBe('');
  });
});

describe('toAssessmentView', () => {
  it('maps causes, tiers and steps', () => {
    const view = toAssessmentView(entry(), 'de', NOW);

    expect(view.urgency).toBe('low');
    expect(view.causes).toEqual([
      { label: 'Spannungskopfschmerz', prob: 'high', desc: 'Passt zur Nackensteifigkeit.' },
      // Assessments from before reasons existed have none.
      { label: 'Migräne', prob: 'mid', desc: null },
    ]);
    expect(view.steps).toEqual(['Wasser trinken.']);
    expect(view.rawText).toBe(entry().rawText);
  });

  it('has no urgency while pending', () => {
    const view = toAssessmentView(entry({ status: 'Pending', assessment: null }), 'de', NOW);

    expect(view.status).toBe('Pending');
    expect(view.urgency).toBeNull();
    expect(view.causes).toEqual([]);
    expect(view.steps).toEqual([]);
  });

  it('ignores a leftover assessment on a failed entry', () => {
    const view = toAssessmentView(entry({ status: 'Failed' }), 'de', NOW);
    expect(view.urgency).toBeNull();
  });
});
