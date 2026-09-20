import { THEMES } from '@/theme/tokens';
import { lh, ls, themedStyles } from '@/theme/styles';

describe('letter spacing and line height helpers', () => {
  it('converts an em letter-spacing to points at two decimals', () => {
    expect(ls(13, 0.08)).toBe(1.04);
    expect(ls(30, -0.01)).toBe(-0.3);
  });

  it('converts a line-height multiplier to points at two decimals', () => {
    expect(lh(30, 1.15)).toBe(34.5);
    expect(lh(12.5, 1.45)).toBe(18.13);
  });
});

describe('themedStyles', () => {
  it('builds the sheet from the tokens of the requested theme', () => {
    const sheet = themedStyles((tk) => ({ box: { backgroundColor: tk.screenBg } }));

    expect(sheet('light').box.backgroundColor).toBe('#f7f8f9');
    expect(sheet('dark').box.backgroundColor).toBe('#0b1a26');
  });

  it('returns the identical object on repeat calls for one theme', () => {
    // Screens call this on every render. A fresh object each time would
    // defeat every downstream memo and re-run StyleSheet.create constantly.
    const sheet = themedStyles((tk) => ({ box: { backgroundColor: tk.card } }));

    expect(sheet('light')).toBe(sheet('light'));
  });

  it('keeps a separate cached sheet per theme', () => {
    const sheet = themedStyles((tk) => ({ box: { backgroundColor: tk.card } }));

    expect(sheet('light')).not.toBe(sheet('dark'));
  });

  it('only invokes the factory once per theme', () => {
    const factory = jest.fn((tk: { card: string }) => ({ box: { backgroundColor: tk.card } }));
    const sheet = themedStyles(factory);

    for (const theme of THEMES) {
      sheet(theme);
      sheet(theme);
    }

    expect(factory).toHaveBeenCalledTimes(THEMES.length);
  });
});
