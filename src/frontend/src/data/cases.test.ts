import {
  CASES,
  CASE_ORDER,
  DIST,
  HEAT,
  PROBABILITIES,
  SEGMENT_TINTS,
  TREND,
  URGENCIES,
} from '@/data/cases';
import { LANGS, TR } from '@/i18n/translations';

describe('demo cases', () => {
  it('defines every case in every language', () => {
    for (const lang of LANGS) {
      expect(Object.keys(CASES[lang]).sort()).toEqual([...CASE_ORDER].sort());
    }
  });

  it('only uses urgency levels the UI has a colour for', () => {
    for (const lang of LANGS) {
      for (const key of CASE_ORDER) {
        expect(URGENCIES).toContain(CASES[lang][key].urgency);
      }
    }
  });

  it('only uses segment tints that resolve to a theme token', () => {
    // The assessment screen builds a token name by capitalising this value
    // (`tintBlue`, `tintOrange`, …), so an unknown tint renders as undefined.
    for (const lang of LANGS) {
      for (const key of CASE_ORDER) {
        for (const segment of CASES[lang][key].segments) {
          if (segment.c !== null) expect(SEGMENT_TINTS).toContain(segment.c);
        }
      }
    }
  });

  it('only uses cause probabilities the pill styling knows', () => {
    for (const lang of LANGS) {
      for (const key of CASE_ORDER) {
        for (const cause of CASES[lang][key].causes) {
          expect(PROBABILITIES).toContain(cause.prob);
        }
      }
    }
  });

  it('keeps finding percentages within a renderable 0-100 bar width', () => {
    for (const lang of LANGS) {
      for (const key of CASE_ORDER) {
        for (const finding of CASES[lang][key].findings) {
          expect(finding.pct).toBeGreaterThanOrEqual(0);
          expect(finding.pct).toBeLessThanOrEqual(100);
        }
      }
    }
  });
});

describe('chart constants', () => {
  it('gives the heatmap one row per pattern region', () => {
    for (const lang of LANGS) {
      expect(HEAT).toHaveLength(TR[lang].patternRegions.length);
    }
  });

  it('gives every heatmap row the same number of weeks as there are week labels', () => {
    for (const lang of LANGS) {
      for (const row of HEAT) {
        expect(row).toHaveLength(TR[lang].weeks.length);
      }
    }
  });

  it('gives the distribution one percentage per pattern region', () => {
    for (const lang of LANGS) {
      expect(DIST).toHaveLength(TR[lang].patternRegions.length);
    }
  });

  it('covers a 14-day trend', () => {
    expect(TREND).toHaveLength(14);
  });
});

describe('case order', () => {
  it('matches the quick-chip list in every language', () => {
    // The chip at index i selects CASE_ORDER[i], so a mismatch silently picks
    // the wrong case.
    for (const lang of LANGS) {
      expect(TR[lang].chips).toHaveLength(CASE_ORDER.length);
    }
  });
});
