/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useContext } from 'react';
import { AuthContext, AuthContextType } from './AuthProvider';
import { AuthService } from './AuthService';

/**
 * Access the core authentication context.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Hook targeting exclusively the authenticated Firebase User and basic login loading state.
 */
export const useAuthUser = () => {
  const { user, isLoggingIn, error } = useAuth();
  return { user, isLoggingIn, error };
};

/**
 * Hook targeting the Google Access Token state and authorization checks.
 */
export const useGoogleToken = () => {
  const { accessToken } = useAuth();

  return {
    accessToken,
    isGoogleAuthorized: !!accessToken,
    isTokenExpired: !accessToken,
    isTokenValid: () => AuthService.isTokenValid(),
    getAccessTokenDirectly: () => AuthService.getAccessToken()
  };
};

/**
 * Hook targeting the interactive authentication actions and callbacks.
 */
export const useAuthActions = () => {
  const { loginWithPopup, authorizeGoogleWorkspace, loginWithRedirect, loginWithDemoGmail, logout, refreshSession } = useAuth();

  return {
    loginWithPopup,
    authorizeGoogleWorkspace,
    loginWithRedirect,
    loginWithDemoGmail,
    logout,
    refreshSession
  };
};
