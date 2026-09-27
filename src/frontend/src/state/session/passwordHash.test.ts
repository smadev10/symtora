import { hashPassword } from './passwordHash';

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

describe('hashPassword', () => {
  it('returns the SHA-256 hex digest of the password', async () => {
    await expect(hashPassword('hunter22')).resolves.toBe(await sha256Hex('hunter22'));
  });

  it('is deterministic for the same input', async () => {
    await expect(hashPassword('correct horse')).resolves.toBe(
      await hashPassword('correct horse'),
    );
  });

  it('produces different digests for different passwords', async () => {
    await expect(hashPassword('correct horse')).resolves.not.toBe(
      await hashPassword('battery staple'),
    );
  });
});
