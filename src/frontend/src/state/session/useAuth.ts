import { useCallback, useState } from 'react';

import { authApi as defaultAuthApi, type AuthApi } from '@/api/auth';
import { ERROR_KEYS, isApiError } from '@/api/errors';
import { useSession } from './Provider';
import { hashPassword } from './passwordHash';

/**
 * The API stores no display name, so one is derived from the address for
 * users who sign in on a fresh device. The profile screen can overwrite it.
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
    async (request: () => Promise<{ token: string; expiresAt: string }>, email: string, name: string) => {
      setSubmitting(true);
      setErrorKey(null);

      try {
        const { token, expiresAt } = await request();
        signIn({ token, expiresAt, user: { email, name } });
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
      run(
        async () => authApi.login({ email, password: await hashPassword(password) }),
        email,
        displayNameFromEmail(email),
      ),
    [authApi, run],
  );

  const register = useCallback(
    (name: string, email: string, password: string) =>
      // `name` is deliberately not sent: RegisterRequest is email + password.
      run(
        async () => authApi.register({ email, password: await hashPassword(password) }),
        email,
        name,
      ),
    [authApi, run],
  );

  return { submitting, errorKey, login, register };
}
