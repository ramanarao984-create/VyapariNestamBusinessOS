import { describe, expect, it } from 'vitest';
import { getTrustedTenantId } from './tenantContext';

function request(overrides: Record<string, unknown> = {}) {
  return {
    auth: { tenantId: 'tenant-a' },
    body: {},
    query: {},
    headers: {},
    ...overrides,
  } as any;
}

describe('getTrustedTenantId', () => {
  it('uses the authenticated tenant, not a client-supplied tenant', () => {
    expect(getTrustedTenantId(request({ body: { tenantId: 'tenant-a' } }))).toBe('tenant-a');
  });

  it.each([
    { body: { tenantId: 'tenant-b' } },
    { query: { tenantId: 'tenant-b' } },
    { headers: { 'x-tenant-id': 'tenant-b' } },
  ])('rejects a cross-tenant context from $body/$query/$headers', (overrides) => {
    expect(() => getTrustedTenantId(request(overrides))).toThrow('TENANT_CONTEXT_MISMATCH');
  });

  it('rejects requests without a server-authenticated tenant', () => {
    expect(() => getTrustedTenantId(request({ auth: undefined }))).toThrow('AUTHENTICATED_TENANT_CONTEXT_REQUIRED');
  });

  it('rejects blank authenticated tenant IDs', () => {
    expect(() => getTrustedTenantId(request({ auth: { tenantId: '  ' } }))).toThrow('AUTHENTICATED_TENANT_CONTEXT_REQUIRED');
  });
});
