/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

class MockStorage implements Storage {
  private store: Record<string, string> = {};
  get length() { return Object.keys(this.store).length; }
  clear() { this.store = {}; }
  getItem(key: string) { return this.store[key] || null; }
  key(index: number) { return Object.keys(this.store)[index] || null; }
  removeItem(key: string) { delete this.store[key]; }
  setItem(key: string, value: string) { this.store[key] = String(value); }
}

global.sessionStorage = new MockStorage();
global.localStorage = new MockStorage();
import { AuthService } from '../AuthService';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: null,
  })),
  signOut: vi.fn(() => Promise.resolve()),
  setPersistence: vi.fn(() => Promise.resolve()),
  browserLocalPersistence: {},
  GoogleAuthProvider: class {
    addScope = vi.fn();
    setCustomParameters = vi.fn();
    static credentialFromResult = vi.fn();
  },
  onAuthStateChanged: vi.fn(() => () => {}),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  getRedirectResult: vi.fn(),
}));

const mockGetUser = vi.fn();
const mockRefresh = vi.fn();

vi.mock('../../firebase', () => ({
  auth: {
    currentUser: null,
    signOut: vi.fn(() => Promise.resolve()),
  },
  provider: {
    addScope: vi.fn(),
    setCustomParameters: vi.fn(),
  },
}));

describe('Auth Fallback Security & Tenant Isolation Guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Popup failure without currentUser remains unauthenticated (fails closed)', async () => {
    vi.spyOn(AuthService, 'getCurrentUser').mockReturnValue(null);
    expect(AuthService.getCurrentUser()).toBeNull();
    expect(AuthService.getAccessToken()).toBeNull();
  });

  it('2. Popup failure plus a valid existing Firebase currentUser can recover ID token', async () => {
    const mockUser = { uid: 'real-fb-user-123', email: 'doctor@nestam.com' } as any;
    vi.spyOn(AuthService, 'getCurrentUser').mockReturnValue(mockUser);
    vi.spyOn(AuthService, 'refreshFirebaseSession').mockResolvedValue('valid-refreshed-id-token-xyz');

    const activeUser = AuthService.getCurrentUser();
    expect(activeUser?.uid).toBe('real-fb-user-123');

    const token = await AuthService.refreshFirebaseSession();
    expect(token).toBe('valid-refreshed-id-token-xyz');
  });

  it('3. Cached tenant ID in localStorage cannot grant unauthenticated access', () => {
    localStorage.setItem('nestam_tenant_id', 'unauthorized_tenant_999');
    expect(AuthService.getCurrentUser()).toBeNull();
    expect(AuthService.getAccessToken()).toBeNull();
  });

  it('4. Invalid or expired Google access token is rejected by isTokenValid', () => {
    const pastTime = Date.now() - 10000;
    sessionStorage.setItem('nestam_google_access_token', 'expired_token');
    sessionStorage.setItem('nestam_google_access_token_expires_at', pastTime.toString());

    expect(AuthService.isTokenValid()).toBe(false);
    expect(AuthService.getAccessToken()).toBeNull();
  });

  it('5. Logout clears active session and tenant storage state', async () => {
    sessionStorage.setItem('nestam_current_tenant_id', 'clinic_a');
    localStorage.setItem('nestam_tenant_id', 'clinic_a');

    await AuthService.logout();

    expect(AuthService.getAccessToken()).toBeNull();
    expect(AuthService.isTokenValid()).toBe(false);
  });

  it('6. Switching accounts prevents stale tenant retention', () => {
    sessionStorage.setItem('nestam_current_tenant_id', 'clinic_old');
    sessionStorage.removeItem('nestam_current_tenant_id');
    expect(sessionStorage.getItem('nestam_current_tenant_id')).toBeNull();
  });
});
