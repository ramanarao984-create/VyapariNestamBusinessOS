/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../UserService';
import { TenantService } from '../TenantService';
import { getSupabaseClient } from '../../../supabase/client';
import { ValidationError, NotFoundError, DatabaseError } from '../errors';

// Mock getSupabaseClient & TenantService
vi.mock('../../../supabase/client', () => {
  const mockSingle = vi.fn();
  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
  const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
  const mockUpdate = vi.fn().mockReturnValue({ select: mockSelect });
  const mockDelete = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  const mockMaybeSingle = vi.fn();
  const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });

  const mockClient = {
    from: vi.fn(() => ({
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
    })),
  };

  return {
    isSupabaseConfigured: vi.fn(() => true),
    getSupabaseClient: vi.fn(() => mockClient),
  };
});

vi.mock('../TenantService', () => {
  return {
    TenantService: {
      getTenantById: vi.fn().mockResolvedValue({ id: 'test-clinic' }),
    }
  };
});

describe('UserService Metadata operations', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = getSupabaseClient();
    vi.clearAllMocks();
  });

  describe('createUser', () => {
    it('should register a valid member under a tenant', async () => {
      // Arrange
      const mockResultRow = {
        id: 'fb-uid-123',
        tenant_id: 'test-clinic',
        email: 'doctor@nestam.com',
        role: 'Doctor',
        created_at: '2026-07-20T12:00:00Z',
        updated_at: '2026-07-20T12:00:00Z',
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockResultRow, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      // Act
      const user = await UserService.createUser({
        uid: 'fb-uid-123',
        tenantId: 'test-clinic',
        email: 'doctor@nestam.com',
        role: 'Doctor',
      });

      // Assert
      expect(user).toBeDefined();
      expect(user.id).toBe('fb-uid-123');
      expect(user.tenantId).toBe('test-clinic');
      expect(user.role).toBe('Doctor');
      expect(TenantService.getTenantById).toHaveBeenCalledWith('test-clinic');
    });

    it('should throw ValidationError if role is invalid', async () => {
      await expect(
        UserService.createUser({
          uid: 'uid-abc',
          tenantId: 'test-clinic',
          email: 'test@email.com',
          role: 'Hacker' as any,
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getUserByFirebaseUid', () => {
    it('should fetch and return a mapped UserMetadata record', async () => {
      const mockRow = {
        id: 'user-uid-999',
        tenant_id: 'test-clinic',
        email: 'admin@clinic.com',
        role: 'Admin',
        created_at: '2026-07-20T12:00:00Z',
        updated_at: '2026-07-20T12:00:00Z',
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockRow, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      mockSupabase.from.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: mockEq }) });

      const user = await UserService.getUserByFirebaseUid('user-uid-999');
      expect(user.id).toBe('user-uid-999');
      expect(user.role).toBe('Admin');
    });
  });
});
