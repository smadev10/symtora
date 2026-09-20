import { render, screen, userEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ERROR_KEYS } from '@/api/errors';
import { AsyncBoundary, EmptyState, ErrorState, LoadingState, OfflineState } from '@/components/states';
import { TR } from '@/i18n/translations';
import { SettingsProvider } from '@/state/settings/Provider';
import type { KeyValueStore } from '@/storage/kv';

const nullStore: KeyValueStore = {
  get: async () => null,
  set: async () => {},
  remove: async () => {},
};

function Wrapper({ children }: { children: ReactNode }) {
  return <SettingsProvider store={nullStore}>{children}</SettingsProvider>;
}

const show = (node: ReactNode) => render(<Wrapper>{node}</Wrapper>);

describe('LoadingState', () => {
  it('shows the loading label in the active language', async () => {
    await show(<LoadingState />);

    expect(screen.getByText(TR.de.states.loading)).toBeTruthy();
  });
});

describe('EmptyState', () => {
  it('shows the default empty copy', async () => {
    await show(<EmptyState />);

    expect(screen.getByText(TR.de.states.emptyTitle)).toBeTruthy();
    expect(screen.getByText(TR.de.states.emptyBody)).toBeTruthy();
  });

  it('accepts overridden copy for a screen with its own wording', async () => {
    await show(<EmptyState title="Nothing here" body="Add one" />);

    expect(screen.getByText('Nothing here')).toBeTruthy();
  });
});

describe('ErrorState', () => {
  it('renders the message the error key resolves to, not the key', async () => {
    await show(<ErrorState errorKey={ERROR_KEYS.server} />);

    expect(screen.getByText(TR.de.errors.server)).toBeTruthy();
    expect(screen.queryByText(ERROR_KEYS.server)).toBeNull();
  });

  it('offers a retry that calls back', async () => {
    const onRetry = jest.fn();
    await show(<ErrorState errorKey={ERROR_KEYS.server} onRetry={onRetry} />);

    await userEvent.press(screen.getByText(TR.de.states.retry));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides the retry button when there is nothing to retry', async () => {
    await show(<ErrorState errorKey={ERROR_KEYS.validation} />);

    expect(screen.queryByText(TR.de.states.retry)).toBeNull();
  });
});

describe('OfflineState', () => {
  it('shows the offline copy', async () => {
    await show(<OfflineState />);

    expect(screen.getByText(TR.de.states.offlineTitle)).toBeTruthy();
  });
});

describe('AsyncBoundary', () => {
  it('shows the loading state while loading with nothing cached', async () => {
    await show(
      <AsyncBoundary status="loading" hasContent={false}>
        {null}
      </AsyncBoundary>,
    );

    expect(screen.getByText(TR.de.states.loading)).toBeTruthy();
  });

  it('keeps showing content while refreshing', async () => {
    // A refresh over existing data must not replace the screen with a spinner.
    await show(
      <AsyncBoundary status="loading" hasContent>
        <>{null}</>
      </AsyncBoundary>,
    );

    expect(screen.queryByText(TR.de.states.loading)).toBeNull();
  });

  it('shows the offline state for a network failure rather than a generic error', async () => {
    // Offline is inferred from NetworkError; there is no connectivity library.
    await show(
      <AsyncBoundary status="error" errorKey={ERROR_KEYS.network} hasContent={false}>
        {null}
      </AsyncBoundary>,
    );

    expect(screen.getByText(TR.de.states.offlineTitle)).toBeTruthy();
  });

  it('shows the error state for any other failure', async () => {
    await show(
      <AsyncBoundary status="error" errorKey={ERROR_KEYS.server} hasContent={false}>
        {null}
      </AsyncBoundary>,
    );

    expect(screen.getByText(TR.de.errors.server)).toBeTruthy();
  });

  it('shows the empty state when a successful load returned nothing', async () => {
    await show(
      <AsyncBoundary status="ready" hasContent={false}>
        {null}
      </AsyncBoundary>,
    );

    expect(screen.getByText(TR.de.states.emptyTitle)).toBeTruthy();
  });
});
