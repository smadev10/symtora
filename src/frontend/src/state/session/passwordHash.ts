import * as Crypto from 'expo-crypto';

/**
 * Checked on-device: the API only ever sees a fixed-length hash, so it can't
 * enforce a minimum length itself.
 */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Pre-hashes the password on-device before it becomes an API request body.
 * This is defense-in-depth, not a substitute for TLS: the API re-hashes and
 * salts whatever string it receives with ASP.NET Identity's PasswordHasher
 * exactly as it would a plaintext password, so storage is unaffected either
 * way — this only keeps the user's literal password off the wire and out of
 * request logs.
 */
export function hashPassword(password: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
}
