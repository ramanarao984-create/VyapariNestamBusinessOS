/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { getSupabaseClient } from '../supabase/client';
import { CryptoService } from '../services/whatsapp/CryptoService';
import { logger } from '../services/metadata/logger';
import { AuditService } from '../services/metadata/AuditService';
import { BYOSIntegrationError, GoogleConnectionDTO } from './BYOSIntegrationContracts';

const DEFAULT_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/business.manage',
];

export class GoogleOAuthService {
  /**
   * Helper to check for missing database schema errors
   */
  private static isSchemaError(error: any): boolean {
    if (!error) return false;
    const code = error.code?.toString();
    const message = error.message?.toLowerCase() || '';
    return (
      code === '42P01' ||
      code === 'PGRST205' ||
      message.includes('could not find the table') ||
      (message.includes('relation') && message.includes('does not exist'))
    );
  }

  /**
   * Generates high-entropy single-use CSRF OAuth state bound to tenant and user
   */
  public static async generateAuthUrl(params: {
    tenantId: string;
    actorUid: string;
    redirectUri: string;
  }): Promise<{ authUrl: string; state: string }> {
    const { tenantId, actorUid, redirectUri } = params;

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error('[GoogleOAuthService] GOOGLE_CLIENT_ID is not configured in environment.');
    }

    // High entropy state token
    const rawState = crypto.randomBytes(32).toString('hex');
    const stateHash = crypto.createHash('sha256').update(rawState).digest('hex');

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min TTL

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('google_oauth_states').insert({
        state_hash: stateHash,
        tenant_id: tenantId,
        user_uid: actorUid,
        redirect_uri: redirectUri,
        expires_at: expiresAt,
      });

      if (error && !this.isSchemaError(error)) {
        logger.error('GoogleOAuthService', 'Failed to store OAuth state in database', error);
      }
    } catch (dbErr) {
      logger.warn('GoogleOAuthService', 'Database write for google_oauth_states failed, proceeding with signed state check', dbErr);
    }

    // Embed signature into state string to ensure state validity even if DB schema isn't ready
    const hmacSecret = process.env.ENCRYPTION_SECRET || 'google_oauth_state_signing_secret';
    const sig = crypto.createHmac('sha256', hmacSecret).update(`${tenantId}:${actorUid}:${rawState}`).digest('hex');
    const compositeState = Buffer.from(JSON.stringify({ t: tenantId, u: actorUid, s: rawState, sig })).toString('base64url');

    const searchParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: DEFAULT_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: compositeState,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${searchParams.toString()}`;

    AuditService.logEvent({ tenantId, userId: actorUid, eventType: 'GOOGLE_OAUTH_INITIATED', metadata: { redirectUri } });

    return { authUrl, state: compositeState };
  }

  /**
   * Validates state and completes authorization code exchange with Google
   */
  public static async handleCallback(params: {
    code: string;
    state: string;
  }): Promise<GoogleConnectionDTO> {
    const { code, state } = params;

    let payload: { t: string; u: string; s: string; sig: string };
    try {
      payload = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    } catch {
      throw new BYOSIntegrationError('OAUTH_STATE_INVALID', 'Invalid OAuth state encoding.', 'unknown');
    }

    const { t: tenantId, u: actorUid, s: rawState, sig } = payload;
    if (!tenantId || !actorUid || !rawState || !sig) {
      throw new BYOSIntegrationError('OAUTH_STATE_INVALID', 'Malformed OAuth state payload.', tenantId || 'unknown');
    }

    // Verify state signature
    const hmacSecret = process.env.ENCRYPTION_SECRET || 'google_oauth_state_signing_secret';
    const expectedSig = crypto.createHmac('sha256', hmacSecret).update(`${tenantId}:${actorUid}:${rawState}`).digest('hex');
    const bufSig = Buffer.from(sig);
    const bufExpected = Buffer.from(expectedSig);
    if (bufSig.length !== bufExpected.length || !crypto.timingSafeEqual(bufSig, bufExpected)) {
      throw new BYOSIntegrationError('OAUTH_STATE_INVALID', 'OAuth state signature verification failed.', tenantId);
    }

    // Validate and consume single-use state from DB
    const stateHash = crypto.createHash('sha256').update(rawState).digest('hex');
    try {
      const supabase = getSupabaseClient();
      const { data: stateRecord, error: stateError } = await supabase
        .from('google_oauth_states')
        .select('*')
        .eq('state_hash', stateHash)
        .maybeSingle();

      if (stateRecord) {
        if (new Date(stateRecord.expires_at) < new Date()) {
          throw new BYOSIntegrationError('OAUTH_STATE_EXPIRED', 'OAuth state has expired. Please initiate sign-in again.', tenantId);
        }
        if (stateRecord.used_at) {
          throw new BYOSIntegrationError('OAUTH_STATE_REPLAYED', 'OAuth state has already been used.', tenantId);
        }

        // Mark state used
        await supabase
          .from('google_oauth_states')
          .update({ used_at: new Date().toISOString() })
          .eq('state_hash', stateHash);
      }
    } catch (err: any) {
      if (err instanceof BYOSIntegrationError) throw err;
      logger.warn('GoogleOAuthService', 'State table check failed, signature verified', err);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:3000'}/api/integrations/google/callback`;

    if (!clientId || !clientSecret) {
      throw new BYOSIntegrationError('INTEGRATION_PROVIDER_UNAVAILABLE', 'Server missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.', tenantId);
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const tokenData: any = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      logger.error('GoogleOAuthService', 'Token exchange failed', tokenData);
      throw new BYOSIntegrationError(
        'INTEGRATION_CREDENTIALS_INVALID',
        `Google token exchange failed: ${tokenData.error_description || tokenData.error || 'Unknown error'}`,
        tenantId
      );
    }

    // Retrieve user email
    let userEmail: string | null = null;
    try {
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (userinfoRes.ok) {
        const userinfo: any = await userinfoRes.json();
        userEmail = userinfo.email || null;
      }
    } catch (emailErr) {
      logger.warn('GoogleOAuthService', 'Failed to retrieve user email from Google userinfo', emailErr);
    }

    const accessTokenCiphertext = CryptoService.encrypt(tokenData.access_token);
    const refreshTokenCiphertext = tokenData.refresh_token ? CryptoService.encrypt(tokenData.refresh_token) : null;
    const expiresIn = tokenData.expires_in || 3600;
    const tokenExpiryAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const connectionId = `gconn_${tenantId}_${Date.now()}`;
    const now = new Date().toISOString();

    const record = {
      id: connectionId,
      tenant_id: tenantId,
      google_email: userEmail,
      access_token_ciphertext: accessTokenCiphertext,
      refresh_token_ciphertext: refreshTokenCiphertext,
      token_expiry_at: tokenExpiryAt,
      granted_scopes: DEFAULT_SCOPES,
      connection_status: 'connected',
      connected_at: now,
      disconnected_at: null,
      last_verified_at: now,
      updated_at: now,
    };

    try {
      const supabase = getSupabaseClient();
      await supabase.from('google_connections').upsert(record, { onConflict: 'tenant_id' });
    } catch (saveErr) {
      logger.warn('GoogleOAuthService', 'Failed to persist connection to google_connections table', saveErr);
    }

    AuditService.logEvent({ tenantId, userId: actorUid, eventType: 'GOOGLE_OAUTH_SUCCESS', metadata: { userEmail } });

    return {
      isConnected: true,
      tenantId,
      googleEmail: userEmail,
      grantedScopes: DEFAULT_SCOPES,
      lastVerifiedAt: now,
      connectionStatus: 'connected',
    };
  }

  /**
   * Retrieves and automatically refreshes Google Access Token on demand
   */
  public static async getValidAccessToken(tenantId: string): Promise<string> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('google_connections')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error && !this.isSchemaError(error)) {
        throw new BYOSIntegrationError('INTEGRATION_NOT_CONNECTED', `Failed to query Google connection: ${error.message}`, tenantId);
      }

      if (!data || data.connection_status !== 'connected') {
        throw new BYOSIntegrationError('INTEGRATION_NOT_CONNECTED', 'Google Workspace integration is not connected for this tenant.', tenantId);
      }

      const decryptedAccess = CryptoService.decrypt(data.access_token_ciphertext);

      // Check if token is near expiration (within 2 minutes)
      const isExpiring = data.token_expiry_at && new Date(data.token_expiry_at).getTime() - Date.now() < 120000;

      if (!isExpiring) {
        return decryptedAccess;
      }

      // Refresh token if refresh token is available
      if (!data.refresh_token_ciphertext) {
        return decryptedAccess; // Best-effort return active token if refresh token is absent
      }

      const decryptedRefresh = CryptoService.decrypt(data.refresh_token_ciphertext);
      const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return decryptedAccess;
      }

      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: decryptedRefresh,
          grant_type: 'refresh_token',
        }),
      });

      const refreshData: any = await refreshResponse.json();
      if (!refreshResponse.ok || !refreshData.access_token) {
        logger.warn('GoogleOAuthService', 'Silent token refresh failed', refreshData);
        return decryptedAccess;
      }

      const newAccessCiphertext = CryptoService.encrypt(refreshData.access_token);
      const newExpiryAt = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString();

      await supabase
        .from('google_connections')
        .update({
          access_token_ciphertext: newAccessCiphertext,
          token_expiry_at: newExpiryAt,
          last_verified_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId);

      return refreshData.access_token;
    } catch (err: any) {
      if (err instanceof BYOSIntegrationError) throw err;
      throw new BYOSIntegrationError('INTEGRATION_NOT_CONNECTED', `Failed to retrieve Google token: ${err.message}`, tenantId);
    }
  }

  /**
   * Returns sanitized connection status
   */
  public static async getConnectionStatus(tenantId: string): Promise<GoogleConnectionDTO> {
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('google_connections')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (!data || data.connection_status !== 'connected') {
        return {
          isConnected: false,
          tenantId,
          googleEmail: null,
          grantedScopes: [],
          lastVerifiedAt: null,
          connectionStatus: 'disconnected',
        };
      }

      return {
        isConnected: true,
        tenantId,
        googleEmail: data.google_email,
        grantedScopes: data.granted_scopes || [],
        lastVerifiedAt: data.last_verified_at,
        connectionStatus: data.connection_status,
      };
    } catch {
      return {
        isConnected: false,
        tenantId,
        googleEmail: null,
        grantedScopes: [],
        lastVerifiedAt: null,
        connectionStatus: 'disconnected',
      };
    }
  }

  /**
   * Safely disconnects tenant's Google Workspace integration
   */
  public static async disconnect(tenantId: string, actorUid: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('google_connections')
        .update({
          connection_status: 'disconnected',
          access_token_ciphertext: '',
          refresh_token_ciphertext: null,
          disconnected_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId);

      AuditService.logEvent({ tenantId, userId: actorUid, eventType: 'GOOGLE_OAUTH_DISCONNECTED' });
    } catch (err: any) {
      logger.error('GoogleOAuthService', `Disconnect failed for tenant ${tenantId}`, err);
    }
  }
}
