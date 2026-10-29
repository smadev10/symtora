/** The port docker compose publishes the API on. */
export const DEFAULT_API_PORT = 8080;

type Sources = {
  /** `EXPO_PUBLIC_API_URL`, if set. Always wins. */
  explicitUrl?: string;
  /** Hostname the web page was served from, on web only. */
  webHostname?: string;
  /** `host:port` of the dev server Expo Go loaded the bundle from. */
  devServerHostUri?: string;
};

/**
 * Works out where the API is without anyone typing in an IP address.
 *
 * The phone already reached the PC to download the bundle, so the API is on
 * that same host, just on another port. That keeps working when the PC moves
 * to a different Wi-Fi and gets a new address.
 */
export function resolveApiBaseUrl({ explicitUrl, webHostname, devServerHostUri }: Sources): string {
  if (explicitUrl) return explicitUrl.replace(/\/+$/, '');

  const host = webHostname || hostOf(devServerHostUri);
  return `http://${host || 'localhost'}:${DEFAULT_API_PORT}`;
}

/** `192.168.5.6:8081` -> `192.168.5.6`; also tolerates a scheme or a path. */
function hostOf(hostUri: string | undefined): string | undefined {
  if (!hostUri) return undefined;
  const withoutScheme = hostUri.replace(/^[a-z]+:\/\//i, '');
  return withoutScheme.split('/')[0]?.split(':')[0] || undefined;
}
