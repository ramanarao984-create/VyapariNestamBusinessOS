/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantService } from '../TenantService';
import { getSupabaseClient } from '../../../supabase/client';
import { ValidationError, NotFoundError, DatabaseError } from '../errors';

// Mock getSupabaseClient
vi.mock('../../../supabase/client', () => {
  const mockSingle = vi.fn();
  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
  const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
  const mockUpdate = vi.fn().mockReturnValue({ select: mockSelect });
  const mockMaybeSingle = vi.fn();
  const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });

  const mockClient = {
    from: vi.fn(() => ({
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
      eq: mockEq,
    })),
  };

  return {
    getSupabaseClient: vi.fn(() => mockClient),
    isSupabaseConfigured: vi.fn(() => true),
  };
});

describe('TenantService Metadata CRUD operations', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = getSupabaseClient();
    vi.clearAllMocks();
  });

  describe('createTenant', () => {
    it('should successfully validate parameters and create a tenant', async () => {
      // Arrange
      const mockResultRow = {
        id: 'test-clinic',
        name: 'Test Clinic',
        spreadsheet_id: 'sheet-123',
        calendar_id: 'cal-123',
        drive_folder_id: 'drive-123',
        clinic_config: { doctorName: 'Dr. Rao' },
        feature_flags: { enableWhatsApp: true },
        subscription_status: 'active',
        created_at: '2026-07-20T12:00:00Z',
        updated_at: '2026-07-20T12:00:00Z',
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockResultRow, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      // Act
      const tenant = await TenantService.createTenant({
        id: 'test-clinic',
        name: 'Test Clinic',
        spreadsheetId: 'sheet-123',
        calendarId: 'cal-123',
        driveFolderId: 'drive-123',
        clinicConfig: { doctorName: 'Dr. Rao' },
        featureFlags: { enableWhatsApp: true },
        subscriptionStatus: 'active',
      });

      // Assert
      expect(tenant).toBeDefined();
      expect(tenant.id).toBe('test-clinic');
      expect(tenant.spreadsheetId).toBe('sheet-123');
      expect(tenant.clinicConfig.doctorName).toBe('Dr. Rao');
      expect(tenant.subscriptionStatus).toBe('active');
      expect(mockSupabase.from).toHaveBeenCalledWith('tenants');
    });

    it('should throw ValidationError on malformed tenant ID', async () => {
      await expect(
        TenantService.createTenant({
          id: 'invalid id with spaces',
          name: 'Clinic',
          spreadsheetId: 'sheet',
          calendarId: 'cal',
          driveFolderId: 'drive',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw DatabaseError on general supabase errors', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Database down' } });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      await expect(
        TenantService.createTenant({
          id: 'clinic',
          name: 'Clinic',
          spreadsheetId: 'sheet',
          calendarId: 'cal',
          driveFolderId: 'drive',
        })
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe('getTenantById', () => {
    it('should fetch and return a mapped tenant record', async () => {
      const mockRow = {
        id: 'some-clinic',
        name: 'Some Clinic',
        spreadsheet_id: 'sheet-abc',
        calendar_id: 'cal-abc',
        drive_folder_id: 'drive-abc',
        clinic_config: {},
        feature_flags: {},
        subscription_status: 'trial',
        created_at: '2026-07-20T12:00:00Z',
        updated_at: '2026-07-20T12:00:00Z',
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockRow, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      mockSupabase.from.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: mockEq }) });

      const tenant = await TenantService.getTenantById('some-clinic');
      expect(tenant.id).toBe('some-clinic');
      expect(tenant.subscriptionStatus).toBe('trial');
    });

    it('should throw NotFoundError if no tenant matches ID', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      mockSupabase.from.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: mockEq }) });

      await expect(TenantService.getTenantById('non-existent')).rejects.toThrow(NotFoundError);
    });
  });
});
