import { describe, expect, it } from 'vitest';
import type { User } from 'firebase/auth';
import { normalizeAuthUser } from '../AuthProvider';

describe('normalizeAuthUser', () => {
  it('keeps the Firebase email when one is present', () => {
    const user = {
      uid: 'firebase-uid-1',
      email: 'owner@example.com',
      providerData: [],
    } as unknown as User;

    expect(normalizeAuthUser(user).email).toBe('owner@example.com');
  });

  it('uses providerData email when Firebase user email is absent', () => {
    const user = {
      uid: 'firebase-uid-2',
      email: null,
      providerData: [{ email: 'workspace@example.com' }],
    } as unknown as User;

    expect(normalizeAuthUser(user).email).toBe('workspace@example.com');
  });

  it('falls back to a stable internal identity when no email is exposed', () => {
    const user = {
      uid: 'firebase-uid-3',
      email: null,
      providerData: [],
    } as unknown as User;

    expect(normalizeAuthUser(user).email).toBe('firebase-uid-3@firebase.local');
  });
});
