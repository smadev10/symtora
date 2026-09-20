/** Client-side profile. `name` is never sent: the API has no field for it. */
export type AuthUser = {
  email: string;
  name: string;
};

/** Exactly what gets written to the secure store. */
export type PersistedSession = {
  token: string;
  expiresAt: string;
  user: AuthUser;
};

export type SessionState =
  | { status: 'restoring' }
  | { status: 'anonymous' }
  | ({ status: 'authenticated' } & PersistedSession);

export type SessionAction =
  | { type: 'restored'; persisted: PersistedSession | null; now: number }
  | { type: 'signedIn'; session: PersistedSession }
  | { type: 'signedOut' }
  | { type: 'profileUpdated'; user: Partial<AuthUser> };

/**
 * Nothing is known until storage has been read. The root layout holds the
 * splash on `restoring` so no screen redirects on a guess.
 */
export const INITIAL_SESSION: SessionState = { status: 'restoring' };

const ANONYMOUS: SessionState = { status: 'anonymous' };

function isUsable(persisted: PersistedSession | null, now: number): persisted is PersistedSession {
  if (!persisted || typeof persisted !== 'object') return false;
  if (typeof persisted.token !== 'string' || persisted.token.length === 0) return false;
  if (typeof persisted.expiresAt !== 'string') return false;

  const expiresAt = Date.parse(persisted.expiresAt);
  if (Number.isNaN(expiresAt)) return false;

  return expiresAt > now;
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'restored':
      return isUsable(action.persisted, action.now)
        ? { status: 'authenticated', ...action.persisted }
        : ANONYMOUS;

    case 'signedIn':
      return { status: 'authenticated', ...action.session };

    case 'signedOut':
      return ANONYMOUS;

    case 'profileUpdated':
      if (state.status !== 'authenticated') return state;
      return { ...state, user: { ...state.user, ...action.user } };

    default:
      return state;
  }
}
