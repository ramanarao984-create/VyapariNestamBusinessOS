/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requireAuthenticatedUser, requireRole, requirePermission } from '../serverAuth';
import { getFirebaseAdminAuth } from '../firebaseAdmin';
import { UserService } from '../../services/metadata/UserService';
import { TenantService } from '../../services/metadata/TenantService';
import { NotFoundError } from '../../services/metadata/errors';

// Mocks
vi.mock('../firebaseAdmin', () => ({
  getFirebaseAdminAuth: vi.fn(),
}));

vi.mock('../../services/metadata/UserService', () => ({
  UserService: {
    getUserByFirebaseUid: vi.fn(),
  },
}));

vi.mock('../../services/metadata/TenantService', () => ({
  TenantService: {
    getTenantById: vi.fn(),
  },
}));

describe('Server-Side Authentication & Authorization Middleware Suite', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;
  let mockVerifyIdToken: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      headers: {},
      body: {},
      query: {},
      requestId: 'test-req-123',
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();

    mockVerifyIdToken = vi.fn();
    vi.mocked(getFirebaseAdminAuth).mockReturnValue({
      verifyIdToken: mockVerifyIdToken,
    } as any);
  });

  describe('requireAuthenticatedUser', () => {
    it('1. should reject request with 401 UNAUTHENTICATED when Authorization header is missing', async () => {
      await requireAuthenticatedUser(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'UNAUTHENTICATED',
            message: expect.stringContaining('Missing or invalid Authorization header'),
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('2. should reject request with 401 UNAUTHENTICATED when Authorization header is not Bearer', async () => {
      mockReq.headers.authorization = 'Basic token123';

      await requireAuthenticatedUser(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'UNAUTHENTICATED',
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('3. should reject request with 401 UNAUTHENTICATED when token verification fails', async () => {
      mockReq.headers.authorization = 'Bearer expired-or-invalid-token';
      mockVerifyIdToken.mockRejectedValue(new Error('Token expired'));

      await requireAuthenticatedUser(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'UNAUTHENTICATED',
            message: expect.stringContaining('Invalid or expired Firebase authentication token'),
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('4. should reject request with 403 TENANT_NOT_MAPPED when token is valid but user is not mapped in users table', async () => {
      mockReq.headers.authorization = 'Bearer valid-token-unmapped';
      mockVerifyIdToken.mockResolvedValue({
        uid: 'fb-unmapped-user',
        email: 'unmapped@clinic.com',
      });

      vi.mocked(UserService.getUserByFirebaseUid).mockRejectedValue(new NotFoundError('User record not found'));

      await requireAuthenticatedUser(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'TENANT_NOT_MAPPED',
            message: expect.stringContaining('not assigned to any active tenant'),
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('5. should reject request with 403 TENANT_INACTIVE when tenant subscription is inactive', async () => {
      mockReq.headers.authorization = 'Bearer valid-token-inactive-tenant';
      mockVerifyIdToken.mockResolvedValue({
        uid: 'fb-user-inactive',
        email: 'inactive@clinic.com',
      });

      vi.mocked(UserService.getUserByFirebaseUid).mockResolvedValue({
        id: 'fb-user-inactive',
        tenantId: 'suspended-clinic',
        role: 'Owner',
        email: 'inactive@clinic.com',
        createdAt: '2026-07-20T00:00:00Z',
        updatedAt: '2026-07-20T00:00:00Z',
      });

      vi.mocked(TenantService.getTenantById).mockResolvedValue({
        id: 'suspended-clinic',
        name: 'Suspended Clinic',
        spreadsheetId: '',
        calendarId: '',
        driveFolderId: '',
        subscriptionStatus: 'inactive',
        clinicConfig: {},
        featureFlags: {},
        createdAt: '2026-07-20T00:00:00Z',
        updatedAt: '2026-07-20T00:00:00Z',
      });

      await requireAuthenticatedUser(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'TENANT_INACTIVE',
            message: expect.stringContaining('not active or approved'),
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('5b. should reject suspended, revoked, unknown, and null tenant subscription statuses', async () => {
      const invalidStatuses = ['suspended', 'revoked', 'unknown', null, undefined];

      for (const status of invalidStatuses) {
        vi.clearAllMocks();
        mockReq.headers.authorization = `Bearer token-status-${status}`;
        mockVerifyIdToken.mockResolvedValue({
          uid: `fb-user-${status}`,
          email: `${status}@clinic.com`,
        });

        vi.mocked(UserService.getUserByFirebaseUid).mockResolvedValue({
          id: `fb-user-${status}`,
          tenantId: 'clinic-invalid-status',
          role: 'Owner',
          email: `${status}@clinic.com`,
          createdAt: '2026-07-20T00:00:00Z',
          updatedAt: '2026-07-20T00:00:00Z',
        });

        vi.mocked(TenantService.getTenantById).mockResolvedValue({
          id: 'clinic-invalid-status',
          name: 'Invalid Status Clinic',
          spreadsheetId: '',
          calendarId: '',
          driveFolderId: '',
          subscriptionStatus: status as any,
          clinicConfig: {},
          featureFlags: {},
          createdAt: '2026-07-20T00:00:00Z',
          updatedAt: '2026-07-20T00:00:00Z',
        });

        await requireAuthenticatedUser(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'TENANT_INACTIVE',
            }),
          })
        );
        expect(mockNext).not.toHaveBeenCalled();
      }
    });

    it('5c. should allow approved statuses: active, trial, active_trial', async () => {
      const allowedStatuses = ['active', 'trial', 'active_trial'];

      for (const status of allowedStatuses) {
        vi.clearAllMocks();
        mockReq.headers.authorization = `Bearer token-status-${status}`;
        mockVerifyIdToken.mockResolvedValue({
          uid: `fb-user-${status}`,
          email: `${status}@clinic.com`,
        });

        vi.mocked(UserService.getUserByFirebaseUid).mockResolvedValue({
          id: `fb-user-${status}`,
          tenantId: 'clinic-allowed-status',
          role: 'Owner',
          email: `${status}@clinic.com`,
          createdAt: '2026-07-20T00:00:00Z',
          updatedAt: '2026-07-20T00:00:00Z',
        });

        vi.mocked(TenantService.getTenantById).mockResolvedValue({
          id: 'clinic-allowed-status',
          name: 'Allowed Status Clinic',
          spreadsheetId: '',
          calendarId: '',
          driveFolderId: '',
          subscriptionStatus: status as any,
          clinicConfig: {},
          featureFlags: {},
          createdAt: '2026-07-20T00:00:00Z',
          updatedAt: '2026-07-20T00:00:00Z',
        });

        await requireAuthenticatedUser(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledTimes(1);
      }
    });

    it('6. should reject request with 403 TENANT_CONTEXT_MISMATCH when request payload tenantId differs from token tenantId', async () => {
      mockReq.headers.authorization = 'Bearer valid-token-tenant-a';
      mockReq.body.tenantId = 'clinic-b'; // User belongs to clinic-a, but requests clinic-b!

      mockVerifyIdToken.mockResolvedValue({
        uid: 'fb-user-a',
        email: 'doctor@clinic-a.com',
      });

      vi.mocked(UserService.getUserByFirebaseUid).mockResolvedValue({
        id: 'fb-user-a',
        tenantId: 'clinic-a',
        role: 'Doctor',
        email: 'doctor@clinic-a.com',
        createdAt: '2026-07-20T00:00:00Z',
        updatedAt: '2026-07-20T00:00:00Z',
      });

      vi.mocked(TenantService.getTenantById).mockResolvedValue({
        id: 'clinic-a',
        name: 'Clinic A',
        spreadsheetId: 'sheet-a',
        calendarId: 'cal-a',
        driveFolderId: 'drive-a',
        subscriptionStatus: 'active',
        clinicConfig: {},
        featureFlags: {},
        createdAt: '2026-07-20T00:00:00Z',
        updatedAt: '2026-07-20T00:00:00Z',
      });

      await requireAuthenticatedUser(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'TENANT_CONTEXT_MISMATCH',
            message: expect.stringContaining("does not match authenticated tenant 'clinic-a'"),
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('7. should populate req.auth with server-verified identity, tenant, role, and permissions for valid user', async () => {
      mockReq.headers.authorization = 'Bearer valid-token-doctor';
      mockVerifyIdToken.mockResolvedValue({
        uid: 'fb-doctor-1',
        email: 'doctor@clinic-a.com',
      });

      vi.mocked(UserService.getUserByFirebaseUid).mockResolvedValue({
        id: 'fb-doctor-1',
        tenantId: 'clinic-a',
        role: 'Doctor',
        email: 'doctor@clinic-a.com',
        createdAt: '2026-07-20T00:00:00Z',
        updatedAt: '2026-07-20T00:00:00Z',
      });

      vi.mocked(TenantService.getTenantById).mockResolvedValue({
        id: 'clinic-a',
        name: 'Clinic A',
        spreadsheetId: 'sheet-a',
        calendarId: 'cal-a',
        driveFolderId: 'drive-a',
        subscriptionStatus: 'active',
        clinicConfig: {},
        featureFlags: {},
        createdAt: '2026-07-20T00:00:00Z',
        updatedAt: '2026-07-20T00:00:00Z',
      });

      await requireAuthenticatedUser(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.auth).toBeDefined();
      expect(mockReq.auth.uid).toBe('fb-doctor-1');
      expect(mockReq.auth.tenantId).toBe('clinic-a');
      expect(mockReq.auth.role).toBe('Doctor');
      expect(mockReq.auth.permissions).toContain('whatsapp:read');
      expect(mockReq.auth.permissions).toContain('whatsapp:write');
    });
  });

  describe('requireRole', () => {
    it('8. should reject request with 401 UNAUTHENTICATED if req.auth is missing', () => {
      const middleware = requireRole('Owner', 'Admin');
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('9. should reject Receptionist user when route requires Owner or Admin (FORBIDDEN)', () => {
      mockReq.auth = {
        uid: 'receptionist-1',
        email: 'rec@clinic.com',
        tenantId: 'clinic-a',
        role: 'Receptionist',
        permissions: ['whatsapp:read', 'whatsapp:write'],
      };

      const middleware = requireRole('Owner', 'Admin');
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'FORBIDDEN',
            message: expect.stringContaining("Role 'Receptionist' is not authorized"),
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('10. should allow Owner or Admin user through required role check', () => {
      mockReq.auth = {
        uid: 'admin-1',
        email: 'admin@clinic.com',
        tenantId: 'clinic-a',
        role: 'Admin',
        permissions: ['whatsapp:read', 'whatsapp:write'],
      };

      const middleware = requireRole('Owner', 'Admin');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('requirePermission', () => {
    it('11. should deny access when user lacks required permission', () => {
      mockReq.auth = {
        uid: 'readonly-1',
        email: 'reader@clinic.com',
        tenantId: 'clinic-a',
        role: 'ReadOnly',
        permissions: ['whatsapp:read'],
      };

      const middleware = requirePermission('whatsapp:write');
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'FORBIDDEN',
            message: expect.stringContaining('Insufficient permissions'),
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
