/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleWorkspaceResolver } from '../GoogleWorkspaceResolver';
import { TenantContextType } from '../../auth/TenantProvider';
import { ValidationError } from '../../services/metadata/errors';

describe('GoogleWorkspaceResolver', () => {
  let mockConsoleLog: any;
  let mockConsoleWarn: any;
  let mockConsoleError: any;

  beforeEach(() => {
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('successfully resolves spreadsheetId, driveFolderId, and calendarId for a valid tenant context', () => {
    const mockContext = {
      tenant: {
        id: 'clinic-a',
        name: 'Clinic A',
        spreadsheetId: 'sheet-123',
        driveFolderId: 'drive-456',
        calendarId: 'cal-789',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      user: null,
      clinicConfig: null,
      featureFlags: null,
      loading: false,
      loaded: true,
      error: null,
      unauthenticated: false,
      refresh: async () => {}
    } as unknown as TenantContextType;

    const resolver = new GoogleWorkspaceResolver(mockContext);

    expect(resolver.getSpreadsheetId()).toBe('sheet-123');
    expect(resolver.getDriveFolderId()).toBe('drive-456');
    expect(resolver.getCalendarId()).toBe('cal-789');

    // Confirm log calls
    expect(mockConsoleLog).toHaveBeenCalledTimes(3);
    const parsedLog0 = JSON.parse(mockConsoleLog.mock.calls[0][0]);
    expect(parsedLog0.message).toContain('Resolved Spreadsheet resource');
    expect(parsedLog0.tenantId).toBe('clinic-a');
    expect(parsedLog0.resourceId).toBe('sheet-123');
    expect(parsedLog0.requestId).toBeDefined();

    const parsedLog1 = JSON.parse(mockConsoleLog.mock.calls[1][0]);
    expect(parsedLog1.message).toContain('Resolved DriveFolder resource');
    expect(parsedLog1.tenantId).toBe('clinic-a');
    expect(parsedLog1.resourceId).toBe('drive-456');

    const parsedLog2 = JSON.parse(mockConsoleLog.mock.calls[2][0]);
    expect(parsedLog2.message).toContain('Resolved Calendar resource');
    expect(parsedLog2.tenantId).toBe('clinic-a');
    expect(parsedLog2.resourceId).toBe('cal-789');
  });

  it('throws ValidationError when spreadsheetId is missing', () => {
    const mockContext = {
      tenant: {
        id: 'clinic-b',
        name: 'Clinic B',
        spreadsheetId: '',
        driveFolderId: 'drive-456',
        calendarId: 'cal-789',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      user: null,
      clinicConfig: null,
      featureFlags: null,
      loading: false,
      loaded: true,
      error: null,
      unauthenticated: false,
      refresh: async () => {}
    } as unknown as TenantContextType;

    const resolver = new GoogleWorkspaceResolver(mockContext);

    expect(() => resolver.getSpreadsheetId()).toThrow(ValidationError);
    expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
    const parsedErr = JSON.parse(mockConsoleWarn.mock.calls[0][0]);
    expect(parsedErr.message).toContain('Spreadsheet ID not configured');
  });

  it('throws ValidationError when driveFolderId is missing', () => {
    const mockContext = {
      tenant: {
        id: 'clinic-c',
        name: 'Clinic C',
        spreadsheetId: 'sheet-123',
        driveFolderId: '  ',
        calendarId: 'cal-789',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      user: null,
      clinicConfig: null,
      featureFlags: null,
      loading: false,
      loaded: true,
      error: null,
      unauthenticated: false,
      refresh: async () => {}
    } as unknown as TenantContextType;

    const resolver = new GoogleWorkspaceResolver(mockContext);

    expect(() => resolver.getDriveFolderId()).toThrow(ValidationError);
  });

  it('throws ValidationError when calendarId is missing', () => {
    const mockContext = {
      tenant: {
        id: 'clinic-d',
        name: 'Clinic D',
        spreadsheetId: 'sheet-123',
        driveFolderId: 'drive-456',
        calendarId: undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      user: null,
      clinicConfig: null,
      featureFlags: null,
      loading: false,
      loaded: true,
      error: null,
      unauthenticated: false,
      refresh: async () => {}
    } as unknown as TenantContextType;

    const resolver = new GoogleWorkspaceResolver(mockContext);

    expect(() => resolver.getCalendarId()).toThrow(ValidationError);
  });
});
