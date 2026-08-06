/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { auth } from '../firebase';

export interface ApiClientOptions extends RequestInit {
  headers?: Record<string, string>;
}

/**
 * Authenticated fetch wrapper for communicating with protected backend API routes.
 * Automatically attaches Firebase ID Token as Authorization: Bearer header.
 */
export async function authenticatedFetch(input: string | URL | Request, init?: ApiClientOptions): Promise<Response> {
  const currentUser = auth.currentUser;
  let token: string | null = null;

  if (currentUser) {
    try {
      token = await currentUser.getIdToken();
    } catch (err) {
      console.warn('[ApiClient] Failed to retrieve Firebase ID token:', err);
    }
  }

  const metaEnv = (import.meta as any)?.env || {};
  const isClientDemoMode =
    metaEnv.VITE_APP_MODE === 'demo' || metaEnv.VITE_ENABLE_DEMO_MODE === 'true';

  if (!token && typeof window !== 'undefined') {
    const storedDemoToken = sessionStorage.getItem('nestam_demo_auth_token') || localStorage.getItem('nestam_demo_auth_token');
    if (storedDemoToken) {
      token = storedDemoToken;
    } else if (isClientDemoMode) {
      token = 'demo-google-oauth-access-token';
    }
  }

  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    console.warn('[ApiClient] Unauthorized API request (401). Token may be missing or expired.');
  } else if (response.status === 403) {
    console.warn('[ApiClient] Forbidden API request (403). Insufficient permissions or unmapped tenant.');
  }

  return response;
}
