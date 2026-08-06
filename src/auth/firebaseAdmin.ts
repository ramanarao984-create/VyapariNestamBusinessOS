/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, cert, applicationDefault, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

let firebaseAdminApp: App | null = null;

/**
 * Singleton getter for server-side Firebase Admin Auth.
 * Never import or invoke this file in client-side code.
 */
export function getFirebaseAdminAuth(): Auth {
  if (!firebaseAdminApp) {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      firebaseAdminApp = existingApps[0]!;
    } else {
      const isTest = process.env.NODE_ENV === 'test';
      const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
      const googleCredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

      if (serviceAccountRaw) {
        try {
          const jsonStr = serviceAccountRaw.startsWith('{')
            ? serviceAccountRaw
            : Buffer.from(serviceAccountRaw, 'base64').toString('utf8');
          const credentialObj = JSON.parse(jsonStr);
          firebaseAdminApp = initializeApp({
            credential: cert(credentialObj),
          });
        } catch (err: any) {
          console.error('[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:', err.message);
          throw new Error('FIREBASE_SERVICE_ACCOUNT parsing error. Fail-closed.');
        }
      } else if (projectId && clientEmail && privateKeyRaw) {
        const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
        firebaseAdminApp = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      } else if (googleCredPath) {
        firebaseAdminApp = initializeApp({
          credential: applicationDefault(),
        });
      } else if (isTest) {
        // In unit testing environment without credentials, initialize with mock app
        firebaseAdminApp = initializeApp({
          projectId: 'test-project',
        });
      } else if (process.env.NODE_ENV === 'production') {
        throw new Error('FATAL: Server-side Firebase Admin credentials are not configured in production. Failing closed.');
      } else {
        // Development fallback with mock project ID if explicit credentials missing
        console.warn('[FirebaseAdmin] Credentials missing in non-production. Initializing with default project.');
        firebaseAdminApp = initializeApp({
          projectId: 'nestam-dev-project',
        });
      }
    }
  }

  return getAuth(firebaseAdminApp);
}
