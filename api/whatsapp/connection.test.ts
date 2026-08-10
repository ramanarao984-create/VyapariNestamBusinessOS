import { describe, expect, it } from 'vitest';
import { resolveFirebaseEmail } from './connection';

function tokenWithClaims(claims: Record<string, unknown>) {
  const encode = (value: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(claims)}.signature`;
}

describe('resolveFirebaseEmail', () => {
  it('normalizes the verified account email', () => {
    expect(
      resolveFirebaseEmail(
        { localId: 'owner-1', email: '  RamanaRao984@GMAIL.COM ', emailVerified: true },
        tokenWithClaims({}),
      ),
    ).toBe('ramanarao984@gmail.com');
  });

  it('uses the Google provider email when Identity Toolkit omits the top-level email', () => {
    expect(
      resolveFirebaseEmail(
        {
          localId: 'owner-1',
          providerUserInfo: [
            { providerId: 'google.com', email: 'ramanarao984@gmail.com' },
          ],
        },
        tokenWithClaims({}),
      ),
    ).toBe('ramanarao984@gmail.com');
  });

  it('uses a verified Firebase email claim for the same authenticated user', () => {
    expect(
      resolveFirebaseEmail(
        { localId: 'owner-1' },
        tokenWithClaims({
          sub: 'owner-1',
          email: 'ramanarao984@gmail.com',
          email_verified: true,
        }),
      ),
    ).toBe('ramanarao984@gmail.com');
  });

  it('rejects unverified claims and claims belonging to another user', () => {
    expect(
      resolveFirebaseEmail(
        { localId: 'owner-1' },
        tokenWithClaims({
          sub: 'owner-1',
          email: 'ramanarao984@gmail.com',
          email_verified: false,
        }),
      ),
    ).toBe('');

    expect(
      resolveFirebaseEmail(
        { localId: 'owner-1' },
        tokenWithClaims({
          sub: 'owner-2',
          email: 'ramanarao984@gmail.com',
          email_verified: true,
        }),
      ),
    ).toBe('');
  });
});
