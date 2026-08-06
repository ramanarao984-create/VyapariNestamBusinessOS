/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SubscriptionStatus = 'active' | 'inactive' | 'trial';

export type UserRole = 'Owner' | 'Admin' | 'Doctor' | 'Receptionist' | 'ReadOnly';

export interface ClinicConfig {
  address?: string;
  phone?: string;
  email?: string;
  businessHours?: {
    days: string[];
    open: string;
    close: string;
  }[];
  logoUrl?: string;
  doctorName?: string;
  specialty?: string;
  brandingColor?: string;
  [key: string]: any; // Allow extensibility for local small businesses
}

export interface FeatureFlags {
  enableWhatsApp?: boolean;
  enableInventory?: boolean;
  enableBilling?: boolean;
  enableSms?: boolean;
  whiteLabelEnabled?: boolean;
  customBrandingEnabled?: boolean;
  [key: string]: any; // Allow dynamic addition of features
}

export interface Tenant {
  id: string; // unique immutable tenant identifier (e.g. 'tenant_clinic_name')
  name: string;
  spreadsheetId: string;
  calendarId: string;
  driveFolderId: string;
  clinicConfig: ClinicConfig;
  featureFlags: FeatureFlags;
  subscriptionStatus: SubscriptionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserMetadata {
  id: string; // Firebase UID
  tenantId: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id?: number;
  tenantId: string | null;
  userId: string; // Firebase UID or email
  eventType: 'LOGIN' | 'LOGOUT' | 'USER_CREATED' | 'ROLE_CHANGED' | 'CONFIG_UPDATED' | 'SUBSCRIPTION_UPDATED' | 'CLINIC_CREATED' | string;
  metadata: Record<string, any>;
  createdAt: string;
}
