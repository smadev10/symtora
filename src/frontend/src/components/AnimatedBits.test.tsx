import { render, screen } from '@testing-library/react-native';

import { PulseRing, Spinner, WaveBar } from '@/components/AnimatedBits';

describe('AnimatedBits', () => {
  it('renders each animation without crashing', async () => {
    await render(
      <>
        <Spinner testID="spinner" />
        <PulseRing testID="pulse" />
        <WaveBar testID="wave" />
      </>,
    );

    expect(screen.getByTestId('spinner')).toBeTruthy();
    expect(screen.getByTestId('pulse')).toBeTruthy();
    expect(screen.getByTestId('wave')).toBeTruthy();
  });

  it('stops its loops on unmount', async () => {
    // A loop left running after unmount warns on every subsequent frame and
    // keeps the component tree alive. Failing to return a cleanup from the
    // effects would surface here as a console error.
    const errors: unknown[] = [];
    const spy = jest.spyOn(console, 'error').mockImplementation((...args) => {
      errors.push(args);
    });

    const view = await render(
      <>
        <Spinner />
        <PulseRing />
        <WaveBar />
      </>,
    );
    await view.unmount();

    expect(errors).toEqual([]);
    spy.mockRestore();
  });
});
