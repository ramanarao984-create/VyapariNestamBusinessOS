/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TenantContextType } from '../auth/TenantProvider';
import { ValidationError } from '../services/metadata/errors';
import { logger } from '../services/metadata/logger';

/**
 * GoogleWorkspaceResolver dynamically resolves Google Workspace resources
 * (Spreadsheet, Drive Folder, Calendar) for the currently active tenant from TenantContext.
 */
export class GoogleWorkspaceResolver {
  private context: TenantContextType;

  constructor(context: TenantContextType) {
    if (!context) {
      throw new ValidationError('TenantContext is required for GoogleWorkspaceResolver.');
    }
    this.context = context;
  }

  /**
   * Helper to check if Spreadsheet ID is configured for active tenant
   */
  public hasSpreadsheetId(): boolean {
    return Boolean(this.context.tenant?.spreadsheetId && this.context.tenant.spreadsheetId.trim() !== '');
  }

  /**
   * Helper to check if Drive Folder ID is configured for active tenant
   */
  public hasDriveFolderId(): boolean {
    return Boolean(this.context.tenant?.driveFolderId && this.context.tenant.driveFolderId.trim() !== '');
  }

  /**
   * Helper to check if Calendar ID is configured for active tenant
   */
  public hasCalendarId(): boolean {
    return Boolean(this.context.tenant?.calendarId && this.context.tenant.calendarId.trim() !== '');
  }

  /**
   * Helper to log resource resolution with tenantId, resourceType, resourceId, and requestId
   */
  private logResolution(resourceType: string, resourceId: string, durationMs: number) {
    const tenantId = this.context.tenant?.id || 'unknown';
    const requestId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    logger.info('GoogleWorkspaceResolver', `Resolved ${resourceType} resource`, {
      requestId,
      tenantId,
      operation: `resolve${resourceType}`,
      durationMs,
      status: 'SUCCESS',
      resourceId
    });
  }

  /**
   * Returns the currently active tenant's Google Spreadsheet ID.
   * Throws ValidationError if not configured or missing.
   */
  public getSpreadsheetId(): string {
    const startTime = Date.now();
    const tenant = this.context.tenant;
    const spreadsheetId = tenant?.spreadsheetId;

    if (!spreadsheetId || spreadsheetId.trim() === '') {
      const tenantId = tenant?.id || 'unknown';
      const requestId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
      const durationMs = Date.now() - startTime;
      
      logger.warn('GoogleWorkspaceResolver', 'Spreadsheet ID not configured for tenant', {
        requestId,
        tenantId,
        operation: 'resolveSpreadsheet',
        durationMs,
        status: 'UNCONFIGURED'
      });
      throw new ValidationError('Spreadsheet ID missing.');
    }

    const durationMs = Date.now() - startTime;
    this.logResolution('Spreadsheet', spreadsheetId, durationMs);
    return spreadsheetId;
  }

  /**
   * Returns the currently active tenant's Google Drive Folder ID.
   * Throws ValidationError if not configured or missing.
   */
  public getDriveFolderId(): string {
    const startTime = Date.now();
    const tenant = this.context.tenant;
    const driveFolderId = tenant?.driveFolderId;

    if (!driveFolderId || driveFolderId.trim() === '') {
      const tenantId = tenant?.id || 'unknown';
      const requestId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
      const durationMs = Date.now() - startTime;

      logger.warn('GoogleWorkspaceResolver', 'Drive ID not configured for tenant', {
        requestId,
        tenantId,
        operation: 'resolveDriveFolder',
        durationMs,
        status: 'UNCONFIGURED'
      });
      throw new ValidationError('Drive ID missing.');
    }

    const durationMs = Date.now() - startTime;
    this.logResolution('DriveFolder', driveFolderId, durationMs);
    return driveFolderId;
  }

  /**
   * Returns the currently active tenant's Google Calendar ID.
   * Throws ValidationError if not configured or missing.
   */
  public getCalendarId(): string {
    const startTime = Date.now();
    const tenant = this.context.tenant;
    const calendarId = tenant?.calendarId;

    if (!calendarId || calendarId.trim() === '') {
      const tenantId = tenant?.id || 'unknown';
      const requestId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
      const durationMs = Date.now() - startTime;

      logger.warn('GoogleWorkspaceResolver', 'Calendar ID not configured for tenant', {
        requestId,
        tenantId,
        operation: 'resolveCalendar',
        durationMs,
        status: 'UNCONFIGURED'
      });
      throw new ValidationError('Calendar ID missing.');
    }

    const durationMs = Date.now() - startTime;
    this.logResolution('Calendar', calendarId, durationMs);
    return calendarId;
  }
}
