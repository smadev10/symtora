import { render, screen, userEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import Button from '@/components/Button';
import { SettingsProvider } from '@/state/settings/Provider';
import type { KeyValueStore } from '@/storage/kv';
import { tokens } from '@/theme/tokens';

const nullStore: KeyValueStore = {
  get: async () => null,
  set: async () => {},
  remove: async () => {},
};

const show = (node: ReactNode) =>
  render(<SettingsProvider store={nullStore}>{node}</SettingsProvider>);

describe('Button', () => {
  it('calls onPress when enabled', async () => {
    const onPress = jest.fn();
    await show(<Button label="Analyse" onPress={onPress} />);

    await userEvent.press(screen.getByText('Analyse'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    // The old ctaButton only *looked* disabled — the style table encoded the
    // condition while the Pressable stayed live on some screens.
    const onPress = jest.fn();
    await show(<Button label="Analyse" onPress={onPress} disabled />);

    await userEvent.press(screen.getByText('Analyse'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('reports its disabled state to accessibility services', async () => {
    await show(<Button label="Analyse" onPress={() => {}} disabled />);

    expect(screen.getByRole('button', { name: 'Analyse' }).props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  it('uses the muted palette while disabled', async () => {
    const onPress = jest.fn();
    await show(<Button label="Analyse" onPress={onPress} disabled />);

    const { textFaint } = tokens('light');
    expect(screen.getByText('Analyse').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: textFaint })]),
    );
  });
});
