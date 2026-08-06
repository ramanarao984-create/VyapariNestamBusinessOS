/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { getFirebaseAdminAuth } from './firebaseAdmin';
import { UserService } from '../services/metadata/UserService';
import { TenantService } from '../services/metadata/TenantService';
import { logger } from '../services/metadata/logger';
import { isDemoModeEnabled, isValidDemoToken } from './demoConfig';
import { NotFoundError, DatabaseError } from '../services/metadata/errors';

export type ApprovedRole = 'Owner' | 'Admin' | 'Doctor' | 'Receptionist' | 'ReadOnly';

export interface AuthenticatedUserContext {
  uid: string;
  email: string;
  tenantId: string;
  role: ApprovedRole;
  permissions: string[];
  isDemo?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedUserContext;
    }
  }
}

/**
 * Maps system roles to explicit permission sets
 */
export function getPermissionsForRole(role: ApprovedRole): string[] {
  switch (role) {
    case 'Owner':
    case 'Admin':
      return [
        'whatsapp:read',
        'whatsapp:write',
        'whatsapp:connection:manage',
        'whatsapp:automation:manage',
        'whatsapp:templates:manage',
        'workspace:sync',
        'ai:chat',
        'users:manage',
      ];
    case 'Doctor':
    case 'Receptionist':
      return [
        'whatsapp:read',
        'whatsapp:write',
        'whatsapp:automation:manage',
        'ai:chat',
      ];
    case 'ReadOnly':
      return ['whatsapp:read'];
    default:
      return [];
  }
}

/**
 * Helper to produce structured JSON error responses without leaking internal credentials or headers
 */
function sendAuthError(
  res: Response,
  statusCode: number,
  code: 'UNAUTHENTICATED' | 'TENANT_NOT_MAPPED' | 'TENANT_INACTIVE' | 'FORBIDDEN' | 'TENANT_CONTEXT_MISMATCH' | 'DATABASE_UNAVAILABLE' | 'DEMO_MODE_RESTRICTED',
  message: string,
  requestId: string = 'N/A'
) {
  return res.status(statusCode).json({
    error: {
      code,
      message,
      requestId,
    },
  });
}

/**
 * Express middleware requiring a valid Firebase ID Token and server-side mapped tenant user.
 * Populates req.auth with trusted identity, tenant, role, and permissions.
 */
export async function requireAuthenticatedUser(req: Request, res: Response, next: NextFunction) {
  const requestId = (req as any).requestId || Math.random().toString(36).substring(2, 11);
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('ServerAuth', 'Missing or malformed Authorization header', { requestId });
    return sendAuthError(res, 401, 'UNAUTHENTICATED', 'Missing or invalid Authorization header.', requestId);
  }

  const idToken = authHeader.split('Bearer ')[1]?.trim();
  if (!idToken) {
    logger.warn('ServerAuth', 'Empty Bearer token provided', { requestId });
    return sendAuthError(res, 401, 'UNAUTHENTICATED', 'Bearer token is missing.', requestId);
  }

  // Check for demo token authorization
  if (idToken.startsWith('demo-')) {
    if (isValidDemoToken(idToken)) {
      req.auth = {
        uid: idToken,
        email: idToken.includes('gmail') ? 'ramanarao984@gmail.com' : 'demo@nestam.com',
        tenantId: 'demo-tenant-id',
        role: 'Doctor', // Restricted role
        permissions: getPermissionsForRole('Doctor'),
        isDemo: true,
      };

      // Tenant context mismatch check for demo token
      const requestedTenantId = (req.body?.tenantId || req.query?.tenantId || req.headers['x-tenant-id']) as string | undefined;
      if (requestedTenantId && requestedTenantId.trim() !== '' && requestedTenantId !== 'demo-tenant-id') {
        return sendAuthError(
          res,
          403,
          'TENANT_CONTEXT_MISMATCH',
          `Request tenant context '${requestedTenantId}' does not match authenticated tenant 'demo-tenant-id'.`,
          requestId
        );
      }

      return next();
    } else {
      logger.warn('ServerAuth', 'Rejected demo token in non-demo mode or invalid demo token format', { requestId, idToken });
      return sendAuthError(res, 401, 'UNAUTHENTICATED', 'Demo authentication tokens are disabled or invalid in this environment.', requestId);
    }
  }

  try {
    const adminAuth = getFirebaseAdminAuth();
    let decodedToken;

    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (verifyErr: any) {
      logger.warn('ServerAuth', 'Firebase ID token verification failed', {
        requestId,
        error: verifyErr.message || verifyErr,
      });
      return sendAuthError(res, 401, 'UNAUTHENTICATED', 'Invalid or expired Firebase authentication token.', requestId);
    }

    const uid = decodedToken.uid;
    const email = (decodedToken.email || '').trim().toLowerCase();

    // Look up approved user mapping in server-side metadata DB
    let userMetadata;
    try {
      userMetadata = await UserService.getUserByFirebaseUid(uid);
    } catch (userErr: any) {
      if (userErr instanceof NotFoundError || userErr.code === 'NOT_FOUND') {
        logger.warn('ServerAuth', 'User lookup by UID failed, user unmapped', { requestId, uid, email });
        return sendAuthError(res, 403, 'TENANT_NOT_MAPPED', 'Authenticated user is not assigned to any active tenant.', requestId);
      }
      logger.error('ServerAuth', 'Database error during user lookup', userErr, { requestId, uid });
      return sendAuthError(res, 503, 'DATABASE_UNAVAILABLE', 'Database service is temporarily unavailable.', requestId);
    }

    // Look up tenant record
    let tenantRecord;
    try {
      tenantRecord = await TenantService.getTenantById(userMetadata.tenantId);
    } catch (tenantErr: any) {
      if (tenantErr instanceof NotFoundError || tenantErr.code === 'NOT_FOUND') {
        logger.warn('ServerAuth', 'Tenant record lookup failed for user', { requestId, uid, tenantId: userMetadata.tenantId });
        return sendAuthError(res, 403, 'TENANT_NOT_MAPPED', 'Tenant mapping does not exist.', requestId);
      }
      logger.error('ServerAuth', 'Database error during tenant lookup', tenantErr, { requestId, uid, tenantId: userMetadata.tenantId });
      return sendAuthError(res, 503, 'DATABASE_UNAVAILABLE', 'Database service is temporarily unavailable.', requestId);
    }

    const ALLOWED_TENANT_STATUSES = ['active', 'trial', 'active_trial'];
    const currentTenantStatus = (tenantRecord.subscriptionStatus || '').trim().toLowerCase();

    if (!currentTenantStatus || !ALLOWED_TENANT_STATUSES.includes(currentTenantStatus)) {
      logger.warn('ServerAuth', 'Access denied due to non-active/unapproved tenant status', {
        requestId,
        uid,
        tenantId: tenantRecord.id,
        subscriptionStatus: tenantRecord.subscriptionStatus,
      });
      return sendAuthError(
        res,
        403,
        'TENANT_INACTIVE',
        `Tenant account status '${tenantRecord.subscriptionStatus || 'unknown'}' is not active or approved. Access denied.`,
        requestId
      );
    }

    // Tenant context mismatch check for explicit tenantId passed in request body, query or header
    const requestedTenantId = (req.body?.tenantId || req.query?.tenantId || req.headers['x-tenant-id']) as string | undefined;
    if (requestedTenantId && requestedTenantId.trim() !== '' && requestedTenantId !== tenantRecord.id) {
      logger.warn('ServerAuth', 'Tenant context mismatch detected between token tenant and request payload', {
        requestId,
        uid,
        tokenTenantId: tenantRecord.id,
        requestedTenantId,
      });
      return sendAuthError(
        res,
        403,
        'TENANT_CONTEXT_MISMATCH',
        `Request tenant context '${requestedTenantId}' does not match authenticated tenant '${tenantRecord.id}'.`,
        requestId
      );
    }

    // Attach trusted context to req.auth
    req.auth = {
      uid,
      email,
      tenantId: tenantRecord.id,
      role: userMetadata.role as ApprovedRole,
      permissions: getPermissionsForRole(userMetadata.role as ApprovedRole),
      isDemo: false,
    };

    next();
  } catch (err: any) {
    logger.error('ServerAuth', 'Unexpected server authentication error', err, { requestId });
    return sendAuthError(res, 500, 'UNAUTHENTICATED', 'Server-side authentication error.', requestId);
  }
}

/**
 * Middleware ensuring that demo users cannot access production-only routes.
 */
export function requireProductionAccess(req: Request, res: Response, next: NextFunction) {
  const requestId = (req as any).requestId || Math.random().toString(36).substring(2, 11);
  if (req.auth?.isDemo || req.auth?.tenantId === 'demo-tenant-id') {
    logger.warn('ServerAuth', 'Blocked demo user from accessing production-only route', {
      requestId,
      path: req.path,
      method: req.method,
    });
    return sendAuthError(
      res,
      403,
      'DEMO_MODE_RESTRICTED',
      'This operation requires production credentials and is disabled in Demo Mode.',
      requestId
    );
  }
  next();
}

/**
 * Middleware requiring specific roles (e.g. Owner, Admin)
 */
export function requireRole(...allowedRoles: ApprovedRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = (req as any).requestId || 'N/A';
    if (!req.auth) {
      return sendAuthError(res, 401, 'UNAUTHENTICATED', 'Authentication required.', requestId);
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.auth.role)) {
      logger.warn('ServerAuth', 'Authorization denied based on role restriction', {
        requestId,
        uid: req.auth.uid,
        userRole: req.auth.role,
        requiredRoles: allowedRoles,
      });
      return sendAuthError(
        res,
        403,
        'FORBIDDEN',
        `Access denied. Role '${req.auth.role}' is not authorized for this operation.`,
        requestId
      );
    }

    next();
  };
}

/**
 * Middleware requiring specific granular permission (e.g. whatsapp:write)
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = (req as any).requestId || 'N/A';
    if (!req.auth) {
      return sendAuthError(res, 401, 'UNAUTHENTICATED', 'Authentication required.', requestId);
    }

    if (!req.auth.permissions || !req.auth.permissions.includes(permission)) {
      return sendAuthError(
        res,
        403,
        'FORBIDDEN',
        `Access denied. Insufficient permissions for '${permission}'.`,
        requestId
      );
    }

    next();
  };
}
