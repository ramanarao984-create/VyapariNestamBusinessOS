/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TenantResolver } from '../TenantResolver';
import { TenantCache } from '../TenantCache';
import { TenantService } from '../../services/metadata/TenantService';
import { UserService } from '../../services/metadata/UserService';
import { AuditService } from '../../services/metadata/AuditService';
import { ValidationError, NotFoundError, DatabaseError } from '../../services/metadata/errors';

// Mock the services entirely
vi.mock('../../services/metadata/TenantService', () => {
  return {
    TenantService: {
      getTenantById: vi.fn(),
    },
  };
});

vi.mock('../../services/metadata/UserService', () => {
  return {
    UserService: {
      getUserByFirebaseUid: vi.fn(),
    },
  };
});

vi.mock('../../services/metadata/AuditService', () => {
  return {
    AuditService: {
      logEvent: vi.fn(),
    },
  };
});

describe('TenantResolver Metadata Resolution Flow', () => {
  beforeEach(() => {
    TenantCache.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should validate Firebase UID input and throw ValidationError if empty', async () => {
    await expect(TenantResolver.resolve('')).rejects.toThrow(ValidationError);
    await expect(TenantResolver.resolve('   ')).rejects.toThrow(ValidationError);
  });

  it('should resolve context on cache miss, write to cache, and fire LOGIN audit event exactly once', async () => {
    const mockUser = {
      id: 'fb-user-1',
      tenantId: 'nestam-clinic',
      email: 'doctor@nestam.com',
      role: 'Doctor' as const,
      createdAt: '2026-07-20T12:00:00Z',
      updatedAt: '2026-07-20T12:00:00Z',
    };

    const mockTenant = {
      id: 'nestam-clinic',
      name: 'Vyapari Nestam Clinic',
      spreadsheetId: 'sheet-1234',
      calendarId: 'cal-1234',
      driveFolderId: 'drive-1234',
      clinicConfig: { doctorName: 'Dr. Prasad' },
      featureFlags: { enableWhatsApp: true },
      subscriptionStatus: 'active' as const,
      createdAt: '2026-07-20T12:00:00Z',
      updatedAt: '2026-07-20T12:00:00Z',
    };

    vi.mocked(UserService.getUserByFirebaseUid).mockResolvedValue(mockUser);
    vi.mocked(TenantService.getTenantById).mockResolvedValue(mockTenant);
    vi.mocked(AuditService.logEvent).mockResolvedValue({} as any);

    // Call resolver
    const context1 = await TenantResolver.resolve('fb-user-1');

    expect(context1).toBeDefined();
    expect(context1.tenant.id).toBe('nestam-clinic');
    expect(context1.user.role).toBe('Doctor');
    expect(context1.clinicConfig.doctorName).toBe('Dr. Prasad');
    expect(context1.featureFlags.enableWhatsApp).toBe(true);

    // Ensure database was called
    expect(UserService.getUserByFirebaseUid).toHaveBeenCalledTimes(1);
    expect(TenantService.getTenantById).toHaveBeenCalledTimes(1);
    expect(AuditService.logEvent).toHaveBeenCalledTimes(1);

    // Call resolver again immediately -> should be a cache hit
    const context2 = await TenantResolver.resolve('fb-user-1');

    expect(context2).toBe(context1); // Referentially identical due to cache
    expect(UserService.getUserByFirebaseUid).toHaveBeenCalledTimes(1); // No new DB calls
    expect(TenantService.getTenantById).toHaveBeenCalledTimes(1);
    expect(AuditService.logEvent).toHaveBeenCalledTimes(1); // LOGIN event is not duplicated
  });

  it('should expire cache after TTL duration (5 minutes) and fetch from database again', async () => {
    const mockUser = { id: 'fb-user-1', tenantId: 'clinic-a' } as any;
    const mockTenant = { id: 'clinic-a', clinicConfig: {}, featureFlags: {} } as any;

    vi.mocked(UserService.getUserByFirebaseUid).mockResolvedValue(mockUser);
    vi.mocked(TenantService.getTenantById).mockResolvedValue(mockTenant);

    // Initial resolve
    await TenantResolver.resolve('fb-user-1');
    expect(UserService.getUserByFirebaseUid).toHaveBeenCalledTimes(1);

    // Advance time by 4 minutes (under TTL)
    vi.advanceTimersByTime(4 * 60 * 1000);
    await TenantResolver.resolve('fb-user-1');
    expect(UserService.getUserByFirebaseUid).toHaveBeenCalledTimes(1); // still cached

    // Advance time past 5 minutes (TTL expired)
    vi.advanceTimersByTime(2 * 60 * 1000); // 6 mins total
    await TenantResolver.resolve('fb-user-1');
    expect(UserService.getUserByFirebaseUid).toHaveBeenCalledTimes(2); // refetched from database
  });

  it('should support manual cache invalidation by Firebase UID', async () => {
    const mockUser = { id: 'fb-user-2', tenantId: 'clinic-b' } as any;
    const mockTenant = { id: 'clinic-b', clinicConfig: {}, featureFlags: {} } as any;

    vi.mocked(UserService.getUserByFirebaseUid).mockResolvedValue(mockUser);
    vi.mocked(TenantService.getTenantById).mockResolvedValue(mockTenant);

    await TenantResolver.resolve('fb-user-2');
    expect(UserService.getUserByFirebaseUid).toHaveBeenCalledTimes(1);

    // Invalidate UID cache
    TenantResolver.invalidate('fb-user-2');

    // Next resolve should query DB
    await TenantResolver.resolve('fb-user-2');
    expect(UserService.getUserByFirebaseUid).toHaveBeenCalledTimes(2);
  });

  it('should support manual cache invalidation by Tenant ID', async () => {
    const mockUser1 = { id: 'fb-user-3', tenantId: 'clinic-c' } as any;
    const mockUser2 = { id: 'fb-user-4', tenantId: 'clinic-c' } as any;
    const mockTenant = { id: 'clinic-c', clinicConfig: {}, featureFlags: {} } as any;

    vi.mocked(UserService.getUserByFirebaseUid)
      .mockResolvedValueOnce(mockUser1)
      .mockResolvedValueOnce(mockUser2);
    vi.mocked(TenantService.getTenantById).mockResolvedValue(mockTenant);

    // Resolve both users
    await TenantResolver.resolve('fb-user-3');
    await TenantResolver.resolve('fb-user-4');

    expect(TenantCache.size()).toBe(2);

    // Invalidate the entire tenant metadata
    TenantResolver.invalidateTenant('clinic-c');

    expect(TenantCache.size()).toBe(0);
  });

  it('should bubble up NotFoundError when user record is missing in metadata database', async () => {
    vi.mocked(UserService.getUserByFirebaseUid).mockRejectedValue(new NotFoundError('User not registered.'));

    await expect(TenantResolver.resolve('missing-user')).rejects.toThrow(NotFoundError);
    expect(TenantService.getTenantById).not.toHaveBeenCalled();
  });

  it('should wrap low-level database errors into strongly typed DatabaseError', async () => {
    vi.mocked(UserService.getUserByFirebaseUid).mockRejectedValue(new Error('Connection lost'));

    await expect(TenantResolver.resolve('some-uid')).rejects.toThrow(DatabaseError);
  });
});
