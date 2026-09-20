import { INITIAL_SESSION, sessionReducer, type PersistedSession } from '@/state/session/reducer';

const NOW = Date.parse('2026-09-20T12:00:00Z');

const valid: PersistedSession = {
  token: 'jwt-abc',
  expiresAt: '2026-09-21T12:00:00Z',
  user: { email: 'saimon@example.ch', name: 'Saimon Mahari' },
};

describe('initial session', () => {
  it('starts out restoring, so no screen decides before storage has been read', () => {
    expect(INITIAL_SESSION).toEqual({ status: 'restoring' });
  });
});

describe('restore', () => {
  it('becomes authenticated for a session that has not expired', () => {
    const next = sessionReducer(INITIAL_SESSION, { type: 'restored', persisted: valid, now: NOW });

    expect(next).toEqual({ status: 'authenticated', ...valid });
  });

  it('becomes anonymous when nothing was stored', () => {
    const next = sessionReducer(INITIAL_SESSION, { type: 'restored', persisted: null, now: NOW });

    expect(next).toEqual({ status: 'anonymous' });
  });

  it('discards a session whose token has already expired', () => {
    const expired = { ...valid, expiresAt: '2026-09-19T12:00:00Z' };

    const next = sessionReducer(INITIAL_SESSION, {
      type: 'restored',
      persisted: expired,
      now: NOW,
    });

    expect(next).toEqual({ status: 'anonymous' });
  });

  it('treats an expiry exactly at the current instant as expired', () => {
    const edge = { ...valid, expiresAt: new Date(NOW).toISOString() };

    expect(sessionReducer(INITIAL_SESSION, { type: 'restored', persisted: edge, now: NOW })).toEqual(
      { status: 'anonymous' },
    );
  });

  it('discards a blob with an unparseable expiry', () => {
    const broken = { ...valid, expiresAt: 'whenever' };

    expect(
      sessionReducer(INITIAL_SESSION, { type: 'restored', persisted: broken, now: NOW }),
    ).toEqual({ status: 'anonymous' });
  });

  it('discards a blob that is missing a token', () => {
    const broken = { ...valid, token: '' };

    expect(
      sessionReducer(INITIAL_SESSION, { type: 'restored', persisted: broken, now: NOW }),
    ).toEqual({ status: 'anonymous' });
  });
});

describe('sign in and out', () => {
  it('stores the token and user on sign-in', () => {
    const next = sessionReducer({ status: 'anonymous' }, { type: 'signedIn', session: valid });

    expect(next).toEqual({ status: 'authenticated', ...valid });
  });

  it('drops the token entirely on sign-out', () => {
    const authenticated = sessionReducer(
      { status: 'anonymous' },
      { type: 'signedIn', session: valid },
    );

    const next = sessionReducer(authenticated, { type: 'signedOut' });

    expect(next).toEqual({ status: 'anonymous' });
    expect(JSON.stringify(next)).not.toContain('jwt-abc');
  });
});

describe('profile edits', () => {
  it('updates the display name without touching the token', () => {
    const authenticated = sessionReducer(
      { status: 'anonymous' },
      { type: 'signedIn', session: valid },
    );

    const next = sessionReducer(authenticated, {
      type: 'profileUpdated',
      user: { name: 'S. Mahari' },
    });

    expect(next).toEqual({
      status: 'authenticated',
      token: 'jwt-abc',
      expiresAt: valid.expiresAt,
      user: { email: 'saimon@example.ch', name: 'S. Mahari' },
    });
  });

  it('ignores a profile edit while signed out', () => {
    const anonymous = { status: 'anonymous' } as const;

    expect(sessionReducer(anonymous, { type: 'profileUpdated', user: { name: 'Nobody' } })).toBe(
      anonymous,
    );
  });
});

describe('purity', () => {
  it('never mutates the state it is given', () => {
    const before = sessionReducer({ status: 'anonymous' }, { type: 'signedIn', session: valid });
    const snapshot = JSON.parse(JSON.stringify(before));

    sessionReducer(before, { type: 'profileUpdated', user: { name: 'Changed' } });

    expect(before).toEqual(snapshot);
  });
});
