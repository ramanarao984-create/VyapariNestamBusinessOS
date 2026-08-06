/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BYOSRequestContext {
  tenantId: string;
  actorUid: string;
  actorRole: string;
  integrationType: 'google_workspace' | 'meta_whatsapp';
  operation: string;
  correlationId: string;
}

export type IntegrationErrorCode =
  | 'INTEGRATION_NOT_CONNECTED'
  | 'INTEGRATION_CREDENTIALS_INVALID'
  | 'INTEGRATION_SCOPE_MISSING'
  | 'INTEGRATION_ACCESS_REVOKED'
  | 'INTEGRATION_TENANT_MISMATCH'
  | 'INTEGRATION_REAUTH_REQUIRED'
  | 'OAUTH_STATE_INVALID'
  | 'OAUTH_STATE_EXPIRED'
  | 'OAUTH_STATE_REPLAYED'
  | 'INTEGRATION_PROVIDER_UNAVAILABLE';

export class BYOSIntegrationError extends Error {
  public code: IntegrationErrorCode;
  public tenantId: string;
  public details?: any;

  constructor(code: IntegrationErrorCode, message: string, tenantId: string, details?: any) {
    super(`[${code}] Tenant ${tenantId}: ${message}`);
    this.name = 'BYOSIntegrationError';
    this.code = code;
    this.tenantId = tenantId;
    this.details = details;
  }
}

export interface GoogleConnectionDTO {
  isConnected: boolean;
  tenantId: string;
  googleEmail: string | null;
  grantedScopes: string[];
  lastVerifiedAt: string | null;
  connectionStatus: string;
}

export interface GoogleSheetsReadRequest {
  context: BYOSRequestContext;
  spreadsheetId: string;
  range: string;
}

export interface GoogleSheetsAppendRequest {
  context: BYOSRequestContext;
  spreadsheetId: string;
  range: string;
  values: any[][];
}

export interface GoogleCalendarEventRequest {
  context: BYOSRequestContext;
  calendarId: string;
  event: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string };
  };
}
