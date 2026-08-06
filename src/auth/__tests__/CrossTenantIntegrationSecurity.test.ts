import { describe, it, expect } from 'vitest';
import { WhatsAppConnectionService } from '../../services/whatsapp/WhatsAppConnectionService';
import { GoogleOAuthService } from '../../google/GoogleOAuthService';

describe('Cross-Tenant Integration Security & Zero Raw Credential Exposure', () => {
  it('should never expose raw token_ciphertext in RedactedConnectionDTO', async () => {
    const redacted = await WhatsAppConnectionService.getRedactedConnection('tenant_clinic_a');

    expect(redacted).toBeDefined();
    expect((redacted as any).tokenCiphertext).toBeUndefined();
    expect((redacted as any).accessToken).toBeUndefined();
    expect((redacted as any).token_ciphertext).toBeUndefined();
    expect(redacted.tenantId).toBe('tenant_clinic_a');
  });

  it('should never expose raw OAuth tokens in GoogleConnectionDTO', async () => {
    const status = await GoogleOAuthService.getConnectionStatus('tenant_clinic_a');

    expect(status).toBeDefined();
    expect((status as any).accessToken).toBeUndefined();
    expect((status as any).refreshToken).toBeUndefined();
    expect((status as any).access_token_ciphertext).toBeUndefined();
    expect(status.tenantId).toBe('tenant_clinic_a');
  });

  it('should isolate integration operations strictly by tenantId', async () => {
    const statusA = await GoogleOAuthService.getConnectionStatus('tenant_clinic_a');
    const statusB = await GoogleOAuthService.getConnectionStatus('tenant_clinic_b');

    expect(statusA.tenantId).toBe('tenant_clinic_a');
    expect(statusB.tenantId).toBe('tenant_clinic_b');
    expect(statusA).not.toBe(statusB);
  });
});
