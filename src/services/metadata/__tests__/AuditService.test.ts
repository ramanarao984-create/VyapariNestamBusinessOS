/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from '../AuditService';
import { getSupabaseClient } from '../../../supabase/client';
import { ValidationError, DatabaseError } from '../errors';

// Mock getSupabaseClient
vi.mock('../../../supabase/client', () => {
  const mockSingle = vi.fn();
  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
  const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
  const mockLimit = vi.fn();
  const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockEq = vi.fn().mockReturnValue({ order: mockOrder });

  const mockClient = {
    from: vi.fn(() => ({
      insert: mockInsert,
      select: mockSelect,
      eq: mockEq,
    })),
  };

  return {
    getSupabaseClient: vi.fn(() => mockClient),
    isSupabaseConfigured: vi.fn(() => true),
  };
});

describe('AuditService Metadata Logger', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = getSupabaseClient();
    vi.clearAllMocks();
  });

  describe('logEvent', () => {
    it('should successfully log a metadata lifecycle event with payload', async () => {
      // Arrange
      const mockRow = {
        id: 101,
        tenant_id: 'test-clinic',
        user_id: 'user-123',
        event_type: 'LOGIN',
        metadata: { client_ip: '127.0.0.1' },
        created_at: '2026-07-20T12:00:00Z',
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockRow, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      // Act
      const log = await AuditService.logEvent({
        tenantId: 'test-clinic',
        userId: 'user-123',
        eventType: 'LOGIN',
        metadata: { client_ip: '127.0.0.1' },
      });

      // Assert
      expect(log).toBeDefined();
      expect(log.id).toBe(101);
      expect(log.tenantId).toBe('test-clinic');
      expect(log.eventType).toBe('LOGIN');
      expect(log.metadata.client_ip).toBe('127.0.0.1');
    });

    it('should allow tenant_id to be null for global user operations', async () => {
      const mockRow = {
        id: 102,
        tenant_id: null,
        user_id: 'global-admin',
        event_type: 'CLINIC_CREATED',
        metadata: {},
        created_at: '2026-07-20T12:00:00Z',
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockRow, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      const log = await AuditService.logEvent({
        tenantId: null,
        userId: 'global-admin',
        eventType: 'CLINIC_CREATED',
      });

      expect(log.tenantId).toBeNull();
    });

    it('should throw ValidationError if metadata is an array instead of key-value object', async () => {
      await expect(
        AuditService.logEvent({
          tenantId: 'test-clinic',
          userId: 'user-123',
          eventType: 'LOGIN',
          metadata: ['not', 'an', 'object'] as any,
        })
      ).rejects.toThrow(ValidationError);
    });
  });
});
