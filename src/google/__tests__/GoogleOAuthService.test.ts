import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GoogleOAuthService } from '../GoogleOAuthService';
import { BYOSIntegrationError } from '../BYOSIntegrationContracts';

describe('GoogleOAuthService Server-Mediated Flow & Credential Vault', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GOOGLE_CLIENT_ID: 'test_google_client_id_123',
      GOOGLE_CLIENT_SECRET: 'test_google_client_secret_456',
      GOOGLE_REDIRECT_URI: 'http://localhost:3000/api/integrations/google/callback',
      ENCRYPTION_SECRET: 'test_secret_key_that_is_32_bytes_long!!',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should generate high-entropy signed OAuth state and valid Google Auth URL', async () => {
    const { authUrl, state } = await GoogleOAuthService.generateAuthUrl({
      tenantId: 'tenant_clinic_a',
      actorUid: 'uid_admin_1',
      redirectUri: 'http://localhost:3000/api/integrations/google/callback',
    });

    expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(authUrl).toContain('client_id=test_google_client_id_123');
    expect(authUrl).toContain('access_type=offline');
    expect(authUrl).toContain('prompt=consent');
    expect(state).toBeDefined();

    // Verify state decodes into expected composite signature
    const payload = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    expect(payload.t).toBe('tenant_clinic_a');
    expect(payload.u).toBe('uid_admin_1');
    expect(payload.sig).toBeDefined();
  });

  it('should reject invalid or tampered state during callback', async () => {
    await expect(
      GoogleOAuthService.handleCallback({
        code: 'auth_code_123',
        state: 'invalid_base64_state',
      })
    ).rejects.toThrow(BYOSIntegrationError);
  });

  it('should reject state with invalid signature', async () => {
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        t: 'tenant_clinic_b',
        u: 'attacker_uid',
        s: 'raw_state_123',
        sig: 'bad_signature_hash',
      })
    ).toString('base64url');

    await expect(
      GoogleOAuthService.handleCallback({
        code: 'auth_code_123',
        state: tamperedPayload,
      })
    ).rejects.toThrow(/signature verification failed/i);
  });

  it('should return disconnected status when tenant has no Google integration record', async () => {
    const status = await GoogleOAuthService.getConnectionStatus('tenant_unconnected');
    expect(status.isConnected).toBe(false);
    expect(status.tenantId).toBe('tenant_unconnected');
    expect(status.connectionStatus).toBe('disconnected');
    expect(status.googleEmail).toBeNull();
  });
});
