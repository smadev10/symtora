import { expoGoUrl } from './PhoneQr';

describe('expoGoUrl', () => {
  it('points Expo Go at the dev server on the given address', () => {
    expect(expoGoUrl('192.168.5.8')).toBe('exp://192.168.5.8:8081');
  });

  it('gives nothing to show without an address', () => {
    expect(expoGoUrl(undefined)).toBeNull();
    expect(expoGoUrl('  ')).toBeNull();
  });
});
