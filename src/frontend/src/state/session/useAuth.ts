import { useCallback, useState } from 'react';

import { authApi as defaultAuthApi, type AuthApi } from '@/api/auth';
import { ERROR_KEYS, isApiError } from '@/api/errors';
import type { AuthResponse } from '@/api/types';
import { useSession } from './Provider';
import { hashPassword } from './passwordHash';

/**
 * Fallback display name for accounts registered before the API stored names:
 * those come back from login with an empty `name`, so one is derived from the
 * address instead. The profile screen can overwrite it.
 */
export function displayNameFromEmail(email: string): string {
  const local = email.includes('@') ? email.slice(0, email.indexOf('@')) : email;

  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export type UseAuth = {
  submitting: boolean;
  errorKey: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
};

export function useAuth(authApi: AuthApi = defaultAuthApi): UseAuth {
  const { signIn } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const run = useCallback(
    async (request: () => Promise<AuthResponse>, email: string) => {
      setSubmitting(true);
      setErrorKey(null);

      try {
        const { token, expiresAt, name } = await request();
        signIn({ token, expiresAt, user: { email, name: name || displayNameFromEmail(email) } });
      } catch (error) {
        setErrorKey(isApiError(error) ? error.messageKey : ERROR_KEYS.unknown);
      } finally {
        setSubmitting(false);
      }
    },
    [signIn],
  );

  const login = useCallback(
    (email: string, password: string) =>
      // The password is hashed here, not in the screen: every call site gets it for free.
      run(async () => authApi.login({ email, password: await hashPassword(password) }), email),
    [authApi, run],
  );

  const register = useCallback(
    (name: string, email: string, password: string) =>
      run(async () => authApi.register({ name, email, password: await hashPassword(password) }), email),
    [authApi, run],
  );

  return { submitting, errorKey, login, register };
}
