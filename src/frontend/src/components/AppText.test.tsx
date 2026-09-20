import { render, screen } from '@testing-library/react-native';
import { StyleSheet, type TextStyle } from 'react-native';

import AppText from '@/components/AppText';

async function renderedStyle(style: TextStyle): Promise<TextStyle> {
  await render(<AppText style={style}>probe</AppText>);
  return (StyleSheet.flatten(screen.getByText('probe').props.style) ?? {}) as TextStyle;
}

const familyFor = async (style: TextStyle) => (await renderedStyle(style)).fontFamily;

describe('AppText', () => {
  it('maps each supported font weight to its own Open Sans family', async () => {
    // Custom fonts on native don't synthesise weights, so every weight needs
    // an explicitly registered family or it silently renders at regular.
    expect(await familyFor({ fontWeight: '400' })).toBe('OpenSans_400Regular');
    expect(await familyFor({ fontWeight: '500' })).toBe('OpenSans_500Medium');
    expect(await familyFor({ fontWeight: '600' })).toBe('OpenSans_600SemiBold');
    expect(await familyFor({ fontWeight: '700' })).toBe('OpenSans_700Bold');
    expect(await familyFor({ fontWeight: '800' })).toBe('OpenSans_800ExtraBold');
  });

  it('accepts the keyword weights "normal" and "bold"', async () => {
    expect(await familyFor({ fontWeight: 'normal' })).toBe('OpenSans_400Regular');
    expect(await familyFor({ fontWeight: 'bold' })).toBe('OpenSans_700Bold');
  });

  it('falls back to regular for an unmapped or absent weight', async () => {
    expect(await familyFor({})).toBe('OpenSans_400Regular');
    expect(await familyFor({ fontWeight: '100' })).toBe('OpenSans_400Regular');
  });

  it('lets an explicit fontFamily win over the weight mapping', async () => {
    expect(await familyFor({ fontWeight: '700', fontFamily: 'Courier' })).toBe('Courier');
  });

  it('drops fontWeight from the style so it cannot fight the chosen family', async () => {
    expect((await renderedStyle({ fontWeight: '700' })).fontWeight).toBeUndefined();
  });
});
