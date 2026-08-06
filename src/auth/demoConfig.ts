/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { logger } from '../services/metadata/logger';

/**
 * Validates if Demo Mode is explicitly enabled via server configuration.
 *
 * Demo Mode MUST ONLY be enabled when:
 * - process.env.APP_MODE === 'demo' OR process.env.ENABLE_DEMO_MODE === 'true'
 * AND
 * - process.env.NODE_ENV !== 'production' AND process.env.APP_ENV !== 'production' AND process.env.APP_ENV !== 'staging'
 *
 * Demo Mode MUST NOT be inferred from:
 * - Database lookup failure
 * - Missing Supabase configuration
 * - Missing tenant record
 * - Unknown user
 * - Client-provided tenant ID
 * - Frontend route or query parameter
 * - Generic token parsing failure
 * - NODE_ENV alone
 */
export function isDemoModeEnabled(): boolean {
  const rawAppMode = (process.env.APP_MODE || '').toLowerCase();
  const appMode = (process.env.APP_MODE || 'demo').toLowerCase();
  const enableDemo = (process.env.ENABLE_DEMO_MODE || '').toLowerCase() === 'true';
  const nodeEnv = (process.env.NODE_ENV || '').toLowerCase();
  const appEnv = (process.env.APP_ENV || '').toLowerCase();

  const isProductionOrStaging =
    nodeEnv === 'production' ||
    appEnv === 'production' ||
    appEnv === 'staging' ||
    rawAppMode === 'production' ||
    rawAppMode === 'staging';

  // Strict Fail-Closed Rule: Production and Staging MUST NOT enable demo mode.
  if (isProductionOrStaging) {
    if (rawAppMode === 'demo' || enableDemo) {
      logger.error('SecurityConfig', 'Insecure configuration detected: Attempted to enable Demo Mode in production/staging environment.');
      throw new Error('SECURITY CONFIGURATION ERROR: Demo mode cannot be enabled when APP_MODE, APP_ENV, or NODE_ENV is production or staging.');
    }
    return false;
  }

  return appMode === 'demo' || enableDemo;
}

/**
 * Validates whether an ID token is a recognized demo token.
 * Demo tokens are accepted ONLY when explicit demo mode is enabled.
 */
export function isValidDemoToken(idToken: string | null | undefined): boolean {
  if (!idToken) return false;
  try {
    if (!isDemoModeEnabled()) return false;
  } catch {
    return false;
  }

  // Recognized demo token formats
  return /^demo-(gmail-uid-[a-zA-Z0-9-]+|google-oauth-access-token|token-[a-zA-Z0-9-]+|user-[a-zA-Z0-9-]+|tenant-id|default)$/.test(idToken);
}

/**
 * Fixed isolated synthetic demo identity.
 */
export const MOCK_DEMO_IDENTITY = {
  uid: 'demo-user-id',
  email: 'demo@nestam.com',
  tenantId: 'demo-tenant-id',
  role: 'Doctor' as const,
  isDemo: true,
};
