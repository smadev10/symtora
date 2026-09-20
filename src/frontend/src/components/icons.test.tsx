import { render, screen } from '@testing-library/react-native';

import * as icons from '@/components/icons';
import { Avatar } from '@/components/icons';

async function initialsFor(name: string): Promise<string> {
  await render(<Avatar name={name} />);
  return screen.getByText(/.+/).props.children as string;
}

describe('Avatar', () => {
  it('uses the first letter of the first two words', async () => {
    expect(await initialsFor('Saimon Mahari')).toBe('SM');
  });

  it('uses a single initial for a one-word name', async () => {
    expect(await initialsFor('Saimon')).toBe('S');
  });

  it('ignores words beyond the first two', async () => {
    expect(await initialsFor('Anna Maria Müller')).toBe('AM');
  });

  it('tolerates surrounding and repeated whitespace', async () => {
    expect(await initialsFor('  Saimon   Mahari  ')).toBe('SM');
  });

  it('uppercases the initials', async () => {
    expect(await initialsFor('saimon mahari')).toBe('SM');
  });

  it('falls back to "?" when there is no name', async () => {
    expect(await initialsFor('')).toBe('?');
    expect(await initialsFor('   ')).toBe('?');
  });
});

describe('icon set', () => {
  it('renders every exported icon without crashing', async () => {
    const components = Object.entries(icons).filter(([name]) => name !== 'Avatar');

    expect(components.length).toBeGreaterThan(0);

    for (const [name, Icon] of components) {
      const Component = Icon as React.ComponentType<Record<string, never>>;
      const view = await render(<Component />);
      expect(view.toJSON()).toBeTruthy();
      await view.unmount();
      // Name kept in the loop so a failure points at the offending icon.
      expect(name).toEqual(expect.any(String));
    }
  });
});
