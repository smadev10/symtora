import { ApiError, kindForStatus } from './errors';

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Attach the bearer token, when one is available. */
  auth?: boolean;
  signal?: AbortSignal;
};

export type ClientOptions = {
  baseUrl: string;
  /**
   * Supplied by the session layer at startup. A getter rather than an import
   * so `api/` never depends on `state/`.
   */
  getToken?: () => string | null;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export type ApiClient = {
  request<T>(path: string, options?: RequestOptions): Promise<T>;
};

const DEFAULT_TIMEOUT_MS = 15_000;

/** ASP.NET ProblemDetails carries validation failures under `errors`. */
function fieldErrorsFrom(payload: unknown): Record<string, string[]> | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const errors = (payload as { errors?: unknown }).errors;
  if (!errors || typeof errors !== 'object') return undefined;
  return errors as Record<string, string[]>;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => '');
  if (text.length === 0) return null;

  try {
    return JSON.parse(text);
  } catch {
    // A gateway or proxy in front of the API may return HTML.
    return null;
  }
}

export function createClient({
  baseUrl,
  getToken = () => null,
  fetchImpl,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: ClientOptions): ApiClient {
  const root = baseUrl.replace(/\/+$/, '');
  const doFetch: typeof fetch = fetchImpl ?? ((...args) => fetch(...args));

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, auth = false, signal } = options;

    const headers = new Headers({ Accept: 'application/json' });
    if (body !== undefined) headers.set('Content-Type', 'application/json');

    if (auth) {
      const token = getToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });

    let response: Response;
    try {
      response = await doFetch(`${root}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (cause) {
      const aborted = (cause as Error | undefined)?.name === 'AbortError';
      throw new ApiError(aborted ? 'timeout' : 'network', { cause });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const payload = await readBody(response);
      throw new ApiError(kindForStatus(response.status), {
        status: response.status,
        fieldErrors: fieldErrorsFrom(payload),
      });
    }

    return (await readBody(response)) as T;
  }

  return { request };
}

/**
 * Inlined at build time by the Expo CLI. Dot notation is required — bracket
 * access silently does not get replaced.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

let tokenGetter: () => string | null = () => null;

/** Called once by SessionProvider so requests can authenticate themselves. */
export function setTokenGetter(getter: () => string | null): void {
  tokenGetter = getter;
}

export const api = createClient({
  baseUrl: API_BASE_URL,
  getToken: () => tokenGetter(),
});
