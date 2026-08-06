/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OnboardingService, OnboardingParams } from '../OnboardingService';
import { OnboardingValidation } from '../OnboardingValidation';
import { TenantService } from '../../services/metadata/TenantService';
import { UserService } from '../../services/metadata/UserService';
import { AuditService } from '../../services/metadata/AuditService';
import { ValidationError } from '../../services/metadata/errors';

// Mock TenantService, UserService, and AuditService
vi.mock('../../services/metadata/TenantService', () => ({
  TenantService: {
    createTenant: vi.fn(),
    getTenantById: vi.fn(),
  },
}));

vi.mock('../../services/metadata/UserService', () => ({
  UserService: {
    createOwner: vi.fn(),
  },
}));

vi.mock('../../services/metadata/AuditService', () => ({
  AuditService: {
    logEvent: vi.fn(),
  },
}));

describe('OnboardingService and Validation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validOnboardingParams: OnboardingParams = {
    clinicName: 'Apex Medical Center',
    ownerName: 'Dr. Haritha Rao',
    email: 'haritha@example.com',
    phone: '+919999999999',
    spreadsheetId: 'sheet-abc-123',
    driveFolderId: 'folder-xyz-789',
    calendarId: 'cal-primary-001',
    subscriptionStatus: 'trial',
    firebaseUid: 'firebase-user-uid-abc',
  };

  describe('generateTenantId', () => {
    it('should generate a valid alphanumeric/kebab-case slug from clinic name', () => {
      const slug = OnboardingService.generateTenantId('Apex Medical Center!!!');
      expect(slug).toBe('apex-medical-center');
    });

    it('should handle special characters and trimming', () => {
      const slug = OnboardingService.generateTenantId('  @Apex-Clinic_2026_  ');
      expect(slug).toBe('apex-clinic-2026');
    });

    it('should return empty string for empty input', () => {
      expect(OnboardingService.generateTenantId('')).toBe('');
    });
  });

  describe('validateConfiguration', () => {
    it('should pass validation with valid params', () => {
      expect(() =>
        OnboardingService.validateConfiguration(validOnboardingParams)
      ).not.toThrow();
    });

    it('should throw ValidationError on empty clinic name', () => {
      expect(() =>
        OnboardingService.validateConfiguration({ ...validOnboardingParams, clinicName: '' })
      ).toThrow(ValidationError);
    });

    it('should throw ValidationError on malformed owner email', () => {
      expect(() =>
        OnboardingService.validateConfiguration({ ...validOnboardingParams, email: 'invalid_email' })
      ).toThrow(ValidationError);
    });

    it('should throw ValidationError on empty Google Spreadsheet ID', () => {
      expect(() =>
        OnboardingService.validateConfiguration({ ...validOnboardingParams, spreadsheetId: '' })
      ).toThrow(ValidationError);
    });

    it('should throw ValidationError on empty Google Drive Folder ID', () => {
      expect(() =>
        OnboardingService.validateConfiguration({ ...validOnboardingParams, driveFolderId: '' })
      ).toThrow(ValidationError);
    });

    it('should throw ValidationError on empty Google Calendar ID', () => {
      expect(() =>
        OnboardingService.validateConfiguration({ ...validOnboardingParams, calendarId: '' })
      ).toThrow(ValidationError);
    });

    it('should throw ValidationError on empty Firebase UID', () => {
      expect(() =>
        OnboardingService.validateConfiguration({ ...validOnboardingParams, firebaseUid: '' })
      ).toThrow(ValidationError);
    });
  });

  describe('completeOnboarding', () => {
    it('should successfully onboard a new clinic, provision tenant & owner, and write audit logs', async () => {
      // Setup mock returns
      const mockTenant = {
        id: 'apex-medical-center',
        name: 'Apex Medical Center',
        spreadsheetId: 'sheet-abc-123',
        calendarId: 'cal-primary-001',
        driveFolderId: 'folder-xyz-789',
        clinicConfig: {},
        featureFlags: {},
        subscriptionStatus: 'trial',
      };

      const mockOwner = {
        id: 'firebase-user-uid-abc',
        tenantId: 'apex-medical-center',
        email: 'haritha@example.com',
        role: 'Owner',
      };

      // Mock getTenantById throwing standard Not Found error to signify no duplicate tenant
      vi.mocked(TenantService.getTenantById).mockRejectedValue({
        name: 'NotFoundError',
        message: 'Tenant not found',
      });

      vi.mocked(TenantService.createTenant).mockResolvedValue(mockTenant as any);
      vi.mocked(UserService.createOwner).mockResolvedValue(mockOwner as any);

      // Execute onboarding
      const result = await OnboardingService.completeOnboarding(validOnboardingParams);

      // Assertions
      expect(result.tenant).toEqual(mockTenant);
      expect(result.owner).toEqual(mockOwner);

      // Verify tenant duplication check was performed
      expect(TenantService.getTenantById).toHaveBeenCalledWith('apex-medical-center');

      // Verify create Tenant was called with default structures
      expect(TenantService.createTenant).toHaveBeenCalledWith({
        id: 'apex-medical-center',
        name: 'Apex Medical Center',
        spreadsheetId: 'sheet-abc-123',
        calendarId: 'cal-primary-001',
        driveFolderId: 'folder-xyz-789',
        clinicConfig: expect.any(Object),
        featureFlags: expect.any(Object),
        subscriptionStatus: 'trial',
      });

      // Verify create Owner was called
      expect(UserService.createOwner).toHaveBeenCalledWith(
        'firebase-user-uid-abc',
        'apex-medical-center',
        'haritha@example.com'
      );

      // Verify exact required audit logging
      expect(AuditService.logEvent).toHaveBeenCalledWith({
        tenantId: 'apex-medical-center',
        userId: 'firebase-user-uid-abc',
        eventType: 'CLINIC_CREATED',
        metadata: { clinicName: 'Apex Medical Center' },
      });

      expect(AuditService.logEvent).toHaveBeenCalledWith({
        tenantId: 'apex-medical-center',
        userId: 'firebase-user-uid-abc',
        eventType: 'OWNER_CREATED',
        metadata: { email: 'haritha@example.com' },
      });

      expect(AuditService.logEvent).toHaveBeenCalledWith({
        tenantId: 'apex-medical-center',
        userId: 'firebase-user-uid-abc',
        eventType: 'ONBOARDING_COMPLETED',
        metadata: { tenantId: 'apex-medical-center', ownerUid: 'firebase-user-uid-abc' },
      });
    });

    it('should throw ValidationError if tenant already exists', async () => {
      // Mock getTenantById successfully returning a tenant (meaning it's a duplicate)
      vi.mocked(TenantService.getTenantById).mockResolvedValue({
        id: 'apex-medical-center',
      } as any);

      await expect(
        OnboardingService.completeOnboarding(validOnboardingParams)
      ).rejects.toThrow('Tenant with ID "apex-medical-center" already exists.');

      expect(TenantService.createTenant).not.toHaveBeenCalled();
      expect(UserService.createOwner).not.toHaveBeenCalled();
      expect(AuditService.logEvent).not.toHaveBeenCalled();
    });
  });
});
