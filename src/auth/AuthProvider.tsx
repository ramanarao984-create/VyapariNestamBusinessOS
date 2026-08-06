/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { AuthService } from './AuthService';

export interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoggingIn: boolean;
  error: string | null;
  loginWithPopup: () => Promise<void>;
  loginWithRedirect: () => Promise<void>;
  loginWithDemoGmail: (demoEmail?: string) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const normalizeAuthUser = (authUser: User): User => {
  if (authUser.email) {
    return authUser;
  }

  const providerEmail = authUser.providerData?.find((profile) => Boolean(profile.email))?.email;
  return {
    ...authUser,
    email: providerEmail || `${authUser.uid}@firebase.local`,
  } as User;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AuthService.log('Init', 'INFO', 'AuthProvider mounted. Initiating AuthService synchronization subscription.');

    const unsubscribe = AuthService.subscribeToAuthChanges(
      (loggedInUser, token) => {
        setUser(normalizeAuthUser(loggedInUser));
        setAccessToken(token || null);
        setIsLoggingIn(false);
        setError(null);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setIsLoggingIn(false);
      }
    );

    return () => {
      AuthService.log('Init', 'INFO', 'AuthProvider unmounted. Unsubscribing from AuthService changes.');
      unsubscribe();
    };
  }, []);

  const loginWithPopup = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const result = await AuthService.signInWithPopup();
      setUser(normalizeAuthUser(result.user));
      setAccessToken(result.accessToken);
    } catch (err: any) {
      if (
        err?.code === 'auth/unauthorized-domain' || 
        err?.message?.includes('unauthorized-domain') ||
        err?.code === 'auth/internal-error' ||
        err?.message?.includes('internal-error') ||
        err?.code === 'auth/operation-not-allowed' ||
        err?.code === 'auth/configuration-not-found'
      ) {
        AuthService.log('Login', 'WARN', 'Firebase Google Sign-In popup constrained or blocked. Checking existing session fallback.', err);
        const activeUser = AuthService.getCurrentUser();
        if (activeUser) {
          try {
            const token = await AuthService.refreshFirebaseSession();
            if (token) {
              setUser(normalizeAuthUser(activeUser));
              setAccessToken(token);
              setError(null);
              return;
            }
          } catch (refErr) {
            AuthService.log('Login', 'WARN', 'Firebase session token recovery failed.', refErr);
          }
        }
        setUser(null);
        setAccessToken(null);
        setError('Google Sign-In failed or was constrained in this context. Please sign in with an authorized account.');
        return;
      }
      const message = err.message || 'Google Popup Sign-in failed.';
      setError(message);
      if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        AuthService.log('Login', 'WARN', 'Popup log-in interrupted or blocked.', err);
      } else {
        AuthService.log('Login', 'ERROR', 'Popup log-in exception caught inside provider.', err);
      }
      throw err;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loginWithRedirect = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      await AuthService.signInWithRedirect();
    } catch (err: any) {
      const message = err.message || 'Google Redirect Sign-in failed.';
      setError(message);
      setIsLoggingIn(false);
      AuthService.log('Login', 'WARN', 'Redirect log-in exception caught inside provider.', err);
      throw err;
    }
  };

  const loginWithDemoGmail = (demoEmail = 'ramanarao984@gmail.com') => {
    setIsLoggingIn(true);
    const mockUser: Partial<User> = {
      uid: 'demo-gmail-uid-' + Date.now(),
      email: demoEmail,
      displayName: 'Ramana Rao (Gmail)',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
      emailVerified: true,
    };
    setUser(mockUser as User);
    setAccessToken('demo-google-oauth-access-token');
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('nestam_demo_auth_token', mockUser.uid || 'demo-google-oauth-access-token');
    }
    setError(null);
    setIsLoggingIn(false);
  };

  const logout = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      await AuthService.logout().catch(() => {});
    } catch {
      // Ignore
    } finally {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('nestam_demo_auth_token');
        sessionStorage.removeItem('nestam_current_tenant_id');
        localStorage.removeItem('nestam_tenant_id');
      }
      setUser(null);
      setAccessToken(null);
      setIsLoggingIn(false);
    }
  };

  const refreshSession = async () => {
    setError(null);
    try {
      await AuthService.refreshFirebaseSession();
    } catch (err: any) {
      const message = err.message || 'Session refresh failed.';
      setError(message);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoggingIn,
        error,
        loginWithPopup,
        loginWithRedirect,
        loginWithDemoGmail,
        logout,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
