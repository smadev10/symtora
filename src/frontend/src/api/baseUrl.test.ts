import { resolveApiBaseUrl } from '@/api/baseUrl';

describe('resolveApiBaseUrl', () => {
  it('uses the dev server host from Expo Go with the API port', () => {
    expect(resolveApiBaseUrl({ devServerHostUri: '192.168.5.6:8081' })).toBe(
      'http://192.168.5.6:8080',
    );
  });

  it('ignores a scheme or path on the dev server host', () => {
    expect(resolveApiBaseUrl({ devServerHostUri: 'exp://10.0.0.7:8081/--/start' })).toBe(
      'http://10.0.0.7:8080',
    );
  });

  it('uses the page host on web', () => {
    expect(
      resolveApiBaseUrl({ webHostname: '192.168.1.20', devServerHostUri: '127.0.0.1:8081' }),
    ).toBe('http://192.168.1.20:8080');
  });

  it('lets EXPO_PUBLIC_API_URL override everything, without a trailing slash', () => {
    expect(
      resolveApiBaseUrl({
        explicitUrl: 'http://10.0.2.2:5014/',
        webHostname: 'example.test',
        devServerHostUri: '192.168.5.6:8081',
      }),
    ).toBe('http://10.0.2.2:5014');
  });

  it('falls back to localhost when nothing is known', () => {
    expect(resolveApiBaseUrl({})).toBe('http://localhost:8080');
  });
});
