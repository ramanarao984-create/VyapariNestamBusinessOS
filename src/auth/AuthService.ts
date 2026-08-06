/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  User,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth } from '../firebase';

// Custom typed exceptions for authentication errors
export class AuthNetworkException extends Error {
  constructor(message: string, public originalError?: any) {
    super(`[AuthNetworkException] ${message}`);
    this.name = 'AuthNetworkException';
  }
}

export class GoogleTokenExpiredException extends Error {
  constructor() {
    super('[GoogleTokenExpiredException] The Google API OAuth session has expired or is invalid.');
    this.name = 'GoogleTokenExpiredException';
  }
}

export type AuthLogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface AuthLogEntry {
  timestamp: string;
  level: AuthLogLevel;
  event: 'Login' | 'Logout' | 'Session Restore' | 'Token Refresh' | 'Token Expired' | 'Refresh Failure' | 'Init';
  message: string;
  details?: any;
}

class AuthServiceSingleton {
  private _accessToken: string | null = null;
  private _expiresAt: number | null = null;
  private _isRedirectChecking = false;

  constructor() {
    this.log('Init', 'INFO', 'Initializing enterprise AuthService architecture.');
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        this.log('Init', 'INFO', 'Explicit browser local persistence set successfully.');
      })
      .catch((err) => {
        this.log('Init', 'ERROR', 'Failed to configure local persistence.', err);
      });

    this.loadTokenFromSessionStorage();
  }

  private buildGoogleProvider(includeWorkspaceScopes = false): GoogleAuthProvider {
    const googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('openid');
    googleProvider.addScope('profile');
    googleProvider.addScope('email');

    if (includeWorkspaceScopes) {
      googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
      googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
      googleProvider.addScope('https://www.googleapis.com/auth/business.manage');
      googleProvider.setCustomParameters({ prompt: 'consent select_account' });
    } else {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
    }

    return googleProvider;
  }

  /**
   * Retrieves active Firebase currentUser instance directly
   */
  public getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Helper to perform centralized structured logging
   */
  public log(
    event: AuthLogEntry['event'],
    level: AuthLogLevel,
    message: string,
    details?: any
  ) {
    const entry: AuthLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      message,
      details,
    };
    const logString = `[${entry.timestamp}] [${entry.level}] [AuthService:${entry.event}] ${entry.message}`;
    if (level === 'ERROR') {
      console.error(logString, details || '');
    } else if (level === 'WARN') {
      console.warn(logString, details || '');
    } else {
      console.log(logString, details || '');
    }
  }

  /**
   * Helper to execute a promise-returning function with exponential backoff retry.
   */
  public async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    initialDelay = 1000
  ): Promise<T> {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        return await operation();
      } catch (err: any) {
        attempt++;
        if (attempt >= maxRetries) {
          throw err;
        }
        const delay = initialDelay * Math.pow(2, attempt);
        this.log('Init', 'WARN', `Transient error detected. Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`, err);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error('Retry exhausted');
  }

  /**
   * Phase 2 Hardened Security: No raw integration access tokens stored in browser storage.
   */
  private loadTokenFromSessionStorage() {
    this._accessToken = null;
    this._expiresAt = null;
  }

  /**
   * Phase 2 Hardened Security: keep Workspace API tokens in memory only.
   */
  private saveTokenToSessionStorage(token: string, expiresInSeconds = 3600) {
    this._accessToken = token || null;
    this._expiresAt = token ? Date.now() + expiresInSeconds * 1000 : null;
  }

  /**
   * Clear active token state.
   */
  private clearStoredToken() {
    this._accessToken = null;
    this._expiresAt = null;
  }

  /**
   * Performs high-fidelity silent refresh of the Firebase session ID Token.
   */
  public async refreshFirebaseSession(): Promise<string | null> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      this.log('Token Refresh', 'WARN', 'No active user found to perform Firebase session refresh.');
      return null;
    }
    try {
      this.log('Token Refresh', 'INFO', 'Attempting silent refresh of Firebase ID Token...');
      const idToken = await this.retryWithBackoff(() => currentUser.getIdToken(true));
      this.log('Token Refresh', 'INFO', 'Firebase ID Token refreshed successfully.');
      return idToken;
    } catch (err: any) {
      this.log('Refresh Failure', 'ERROR', 'Firebase ID Token refresh failed.', err);
      throw new AuthNetworkException('Silent Firebase ID token refresh failed.', err);
    }
  }

  /**
   * Resolves Google redirect sign-in result, mitigating potential race conditions.
   */
  public async handleRedirectResult(): Promise<{ user: User; accessToken: string } | null> {
    if (this._isRedirectChecking) {
      this.log('Init', 'INFO', 'Redirect check is already in progress, skipping concurrent invoke.');
      return null;
    }

    this._isRedirectChecking = true;
    try {
      this.log('Init', 'INFO', 'Checking for unresolved Google redirect credential...');
      const result = await getRedirectResult(auth);
      this._isRedirectChecking = false;

      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const accessToken = credential?.accessToken || '';
        if (accessToken) {
          this.saveTokenToSessionStorage(accessToken);
        }
        this.log('Login', 'INFO', `Google OAuth redirect resolved successfully for user: ${result.user.email}`);
        return { user: result.user, accessToken };
      }
      return null;
    } catch (error: any) {
      this._isRedirectChecking = false;
      this.log('Init', 'WARN', 'No active Google redirect result to resolve', error);
      return null;
    }
  }

  /**
   * Basic Google sign-in. Requests only identity scopes.
   */
  public async signInWithPopup(): Promise<{ user: User; accessToken: string }> {
    return this.runGooglePopup(false);
  }

  /**
   * Explicit Google Workspace authorization. Requests Sheets, Calendar, and Business Profile scopes.
   */
  public async authorizeGoogleWorkspace(): Promise<{ user: User; accessToken: string }> {
    return this.runGooglePopup(true);
  }

  private async runGooglePopup(includeWorkspaceScopes: boolean): Promise<{ user: User; accessToken: string }> {
    this.log('Login', 'INFO', includeWorkspaceScopes ? 'Initiating Google Workspace API authorization...' : 'Initiating interactive Google sign-in...');
    const googleProvider = this.buildGoogleProvider(includeWorkspaceScopes);

    try {
      let result;
      try {
        result = await signInWithPopup(auth, googleProvider);
      } catch (popupErr: any) {
        if (popupErr?.code === 'auth/popup-blocked' || popupErr?.message?.includes('popup-blocked')) {
          this.log('Login', 'WARN', 'Popup sign-in was blocked by browser. Attempting fallback to redirect sign-in...', popupErr);
          try {
            await signInWithRedirect(auth, googleProvider);
            throw new Error('Redirecting to Google Sign-In page...');
          } catch (redirectErr: any) {
            this.log('Login', 'WARN', 'Redirect fallback also unavailable in iframe context.', redirectErr);
            throw popupErr;
          }
        }
        throw popupErr;
      }

      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken || '';

      if (includeWorkspaceScopes && !accessToken) {
        throw new Error('Google Workspace OAuth access token was missing from credential output.');
      }

      this.log('Login', 'INFO', `Google ${includeWorkspaceScopes ? 'Workspace authorization' : 'sign-in'} completed successfully for user: ${result.user.email}`);
      if (accessToken) {
        this.saveTokenToSessionStorage(accessToken);
      }
      return { user: result.user, accessToken };
    } catch (error: any) {
      if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
        this.log('Login', 'WARN', 'Popup sign-in was cancelled or blocked by browser', error);
      } else if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
        const domain = typeof window !== 'undefined' ? window.location.hostname : 'preview origin';
        this.log('Login', 'WARN', `Firebase domain not authorized in console: ${domain}`, error);
        const err = new Error(`Firebase: Error (auth/unauthorized-domain). Current domain '${domain}' is not authorized in Firebase Auth.`);
        (err as any).code = 'auth/unauthorized-domain';
        throw err;
      } else if (
        error?.code === 'auth/internal-error' ||
        error?.message?.includes('internal-error') ||
        error?.code === 'auth/operation-not-allowed'
      ) {
        this.log('Login', 'WARN', 'Firebase Google Sign-In internal limitation encountered in iframe context', error);
      } else {
        this.log('Login', 'ERROR', 'Popup sign-in failed', error);
      }
      throw error;
    }
  }

  /**
   * Redirect Sign-In interface. Uses identity scopes only.
   */
  public async signInWithRedirect(): Promise<void> {
    this.log('Login', 'INFO', 'Initiating Google redirect sign-in...');
    try {
      await signInWithRedirect(auth, this.buildGoogleProvider(false));
    } catch (error: any) {
      this.log('Login', 'WARN', 'Redirect sign-in failed to initiate', error);
      throw error;
    }
  }

  /**
   * Subscribes to authentication state events, checking for redirect results first to prevent race conditions.
   */
  public subscribeToAuthChanges(
    onAuthSuccess: (user: User, accessToken: string) => void,
    onAuthFailure: () => void
  ): () => void {
    let active = true;

    this.handleRedirectResult()
      .then((redirectResult) => {
        if (!active) return;
        if (redirectResult) {
          onAuthSuccess(redirectResult.user, redirectResult.accessToken);
        }
      })
      .catch((err) => {
        this.log('Init', 'ERROR', 'Error handling redirect resolution inside event listener subscription.', err);
      });

    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (!active) return;

      if (user) {
        const activeToken = this.getAccessToken();
        if (activeToken) {
          this.log('Session Restore', 'INFO', `Session automatically restored for user: ${user.email}`);
          onAuthSuccess(user, activeToken);
        } else {
          this.log('Token Expired', 'WARN', `Persistent Firebase user detected but Google OAuth token is absent or expired for: ${user.email}`);
          onAuthSuccess(user, '');
        }
      } else {
        this.log('Session Restore', 'INFO', 'No authenticated user session detected.');
        this.clearStoredToken();
        onAuthFailure();
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }

  /**
   * Retrieves active Google OAuth token. Checks expiration and returns null if invalid.
   */
  public getAccessToken(): string | null {
    if (this._accessToken && this._expiresAt && Date.now() < this._expiresAt) {
      return this._accessToken;
    }
    this.clearStoredToken();
    return null;
  }

  /**
   * Checks whether the active Google OAuth token is present and valid.
   */
  public isTokenValid(): boolean {
    return this.getAccessToken() !== null;
  }

  /**
   * Standard Sign Out flow.
   */
  public async logout(): Promise<void> {
    this.log('Logout', 'INFO', 'Executing clean global logout...');
    try {
      await this.retryWithBackoff(() => signOut(auth));
      this.clearStoredToken();
      this.log('Logout', 'INFO', 'User logged out successfully.');
    } catch (error: any) {
      this.log('Refresh Failure', 'ERROR', 'Failed to execute signOut correctly', error);
      throw error;
    }
  }
}

export const AuthService = new AuthServiceSingleton();
