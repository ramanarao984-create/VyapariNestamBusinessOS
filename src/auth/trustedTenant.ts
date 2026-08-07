import type { Request } from 'express';

type TenantRequest = Pick<Request, 'auth' | 'body' | 'query' | 'headers'>;

function readRequestedTenantId(req: TenantRequest): string | undefined {
  const bodyTenantId = req.body && typeof req.body === 'object' && 'tenantId' in req.body
    ? (req.body as { tenantId?: unknown }).tenantId
    : undefined;
  const queryTenantId = req.query?.tenantId;
  const headerTenantId = req.headers['x-tenant-id'];

  for (const value of [bodyTenantId, queryTenantId, headerTenantId]) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) return value[0].trim();
  }

  return undefined;
}

/**
 * Returns only the tenant assigned by server-side authentication.
 * Client-provided tenant identifiers are never used as the source of truth.
 */
export function getTrustedTenantId(req: TenantRequest): string {
  const tenantId = req.auth?.tenantId?.trim();
  if (!tenantId) {
    throw new Error('AUTHENTICATED_TENANT_CONTEXT_REQUIRED');
  }

  const requestedTenantId = readRequestedTenantId(req);
  if (requestedTenantId && requestedTenantId !== tenantId) {
    throw new Error('TENANT_CONTEXT_MISMATCH');
  }

  return tenantId;
}
