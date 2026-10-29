export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'validation'
  | 'unauthorized'
  | 'notFound'
  | 'conflict'
  | 'server'
  | 'unknown';

/**
 * Translation keys, not messages. Errors are rendered in DE/EN/FR like every
 * other string, so nothing the server says is ever shown verbatim.
 */
export const ERROR_KEYS: Record<ApiErrorKind, string> = {
  network: 'errors.network',
  timeout: 'errors.timeout',
  validation: 'errors.validation',
  unauthorized: 'errors.unauthorized',
  notFound: 'errors.notFound',
  conflict: 'errors.conflict',
  server: 'errors.server',
  unknown: 'errors.unknown',
};

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly messageKey: string;
  readonly status?: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    kind: ApiErrorKind,
    options: { status?: number; fieldErrors?: Record<string, string[]>; cause?: unknown } = {},
  ) {
    // The Error message is for logs only; screens read `messageKey`.
    super(`ApiError:${kind}${options.status ? ` (${options.status})` : ''}`);
    this.name = 'ApiError';
    this.kind = kind;
    this.messageKey = ERROR_KEYS[kind];
    this.status = options.status;
    this.fieldErrors = options.fieldErrors;
  }
}

export function kindForStatus(status: number): ApiErrorKind {
  if (status === 400 || status === 422) return 'validation';
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 404) return 'notFound';
  // Only registration answers 409, for an email that already has an account.
  if (status === 409) return 'conflict';
  if (status >= 500) return 'server';
  return 'unknown';
}

export const isApiError = (value: unknown): value is ApiError => value instanceof ApiError;

/**
 * Failures that can clear up by themselves — a dropped connection, a slow or
 * briefly broken server — and are worth trying again without the user. An
 * expired login or a bad request will fail the same way every time.
 */
const RETRYABLE_KEYS: ReadonlySet<string> = new Set([
  ERROR_KEYS.network,
  ERROR_KEYS.timeout,
  ERROR_KEYS.server,
  ERROR_KEYS.unknown,
]);

export const isRetryableKey = (key: string | null): boolean => key !== null && RETRYABLE_KEYS.has(key);
