import { SEGMENT_TINTS } from '@/data/cases';
import { THEMES, heatColor, tintFor, tokens } from '@/theme/tokens';

function keyPaths(value: unknown, prefix = ''): string[] {
  if (value !== null && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      keyPaths(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [prefix];
}

describe('tokens', () => {
  it('exposes an identical key set for every theme', () => {
    // A token defined in light but not dark renders as `undefined`, which
    // React Native treats as "no colour" rather than erroring.
    const reference = keyPaths(tokens('light')).sort();

    for (const theme of THEMES) {
      expect({ theme, keys: keyPaths(tokens(theme)).sort() }).toEqual({ theme, keys: reference });
    }
  });

  it('gives every token a non-empty colour value', () => {
    for (const theme of THEMES) {
      for (const [path, value] of Object.entries(flatten(tokens(theme)))) {
        expect({ theme, path, value }).toEqual({ theme, path, value: expect.stringMatching(/^(#|rgb)/) });
      }
    }
  });

  it('resolves every transcript segment tint to a real token', () => {
    // cases.ts stores tints as 'blue' | 'orange' | … and the assessment screen
    // turns those into token names. An unmapped tint silently loses the
    // highlight.
    for (const theme of THEMES) {
      for (const tint of SEGMENT_TINTS) {
        const resolved = tintFor(tokens(theme), tint);
        expect({ theme, tint, hasBg: typeof resolved.bg, hasFg: typeof resolved.fg }).toEqual({
          theme,
          tint,
          hasBg: 'string',
          hasFg: 'string',
        });
      }
    }
  });
});

describe('heatColor', () => {
  it('returns the start colour at 0', () => {
    expect(heatColor(0, '#000000', '#ffffff')).toBe('rgb(0,0,0)');
  });

  it('returns the end colour at 1', () => {
    expect(heatColor(1, '#000000', '#ffffff')).toBe('rgb(255,255,255)');
  });

  it('interpolates channel by channel in between', () => {
    expect(heatColor(0.5, '#000000', '#ffffff')).toBe('rgb(128,128,128)');
    expect(heatColor(0.5, '#ff0000', '#0000ff')).toBe('rgb(128,0,128)');
  });
});

function flatten(value: unknown, prefix = ''): Record<string, unknown> {
  if (value !== null && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
      (acc, [k, v]) => Object.assign(acc, flatten(v, prefix ? `${prefix}.${k}` : k)),
      {},
    );
  }
  return { [prefix]: value };
}
