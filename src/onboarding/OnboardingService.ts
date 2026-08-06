/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TenantService } from '../services/metadata/TenantService';
import { UserService } from '../services/metadata/UserService';
import { AuditService } from '../services/metadata/AuditService';
import { OnboardingValidation } from './OnboardingValidation';
import { logger } from '../services/metadata/logger';
import {
  Tenant,
  UserMetadata,
  ClinicConfig,
  FeatureFlags,
  SubscriptionStatus,
} from '../services/metadata/types';

export interface OnboardingParams {
  clinicName: string;
  ownerName: string;
  email: string;
  phone: string;
  spreadsheetId: string;
  driveFolderId: string;
  calendarId: string;
  subscriptionStatus: SubscriptionStatus;
  firebaseUid: string;
  tenantId?: string;
}

/**
 * Orchestrates the clinic onboarding metadata creation flow.
 */
export class OnboardingService {
  /**
   * Helper to derive a clean tenant ID slug from the clinic name.
   */
  public static generateTenantId(clinicName: string): string {
    if (!clinicName) {
      return '';
    }
    return clinicName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Runs field-level validations.
   */
  public static validateConfiguration(params: OnboardingParams): void {
    OnboardingValidation.validateClinicName(params.clinicName);
    OnboardingValidation.validateEmail(params.email);
    OnboardingValidation.validateGoogleId(params.spreadsheetId, 'Spreadsheet');
    OnboardingValidation.validateGoogleId(params.driveFolderId, 'Drive Folder');
    OnboardingValidation.validateGoogleId(params.calendarId, 'Calendar');
    OnboardingValidation.validateFirebaseUid(params.firebaseUid);

    const tenantId = params.tenantId || this.generateTenantId(params.clinicName);
    OnboardingValidation.validateTenantId(tenantId);
  }

  /**
   * Builds the default set of feature flags.
   */
  public static initializeFeatureFlags(): FeatureFlags {
    return {
      enableWhatsApp: true,
      enableBilling: true,
      enableCalendar: true,
      enableAppointments: true,
      enablePatients: true,
      enableFollowUps: true,
      enableReports: true,
      enableAiAssistant: true,
    };
  }

  /**
   * Builds default clinic configuration parameters.
   */
  public static initializeClinicConfig(params: {
    clinicName: string;
    ownerName: string;
    email: string;
    phone: string;
  }): ClinicConfig {
    return {
      email: params.email,
      phone: params.phone,
      doctorName: params.ownerName,
      businessHours: [
        {
          days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          open: '09:00',
          close: '17:00',
        },
      ],
    };
  }

  /**
   * Direct wrap over TenantService.createTenant.
   */
  public static async createClinic(params: {
    id: string;
    name: string;
    spreadsheetId: string;
    calendarId: string;
    driveFolderId: string;
    clinicConfig: ClinicConfig;
    featureFlags: FeatureFlags;
    subscriptionStatus: SubscriptionStatus;
  }): Promise<Tenant> {
    return TenantService.createTenant(params);
  }

  /**
   * Direct wrap over UserService.createOwner.
   */
  public static async createOwner(
    uid: string,
    tenantId: string,
    email: string
  ): Promise<UserMetadata> {
    return UserService.createOwner(uid, tenantId, email);
  }

  /**
   * Executes the full multi-step clinic provisioning and metadata initialization.
   */
  public static async completeOnboarding(
    params: OnboardingParams
  ): Promise<{ tenant: Tenant; owner: UserMetadata }> {
    const startTime = Date.now();
    const tenantId = params.tenantId || this.generateTenantId(params.clinicName);
    const requestId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);

    try {
      logger.info('OnboardingService', 'Starting onboarding process', {
        requestId,
        tenantId,
        firebaseUid: params.firebaseUid,
        operation: 'completeOnboarding',
        status: 'PENDING'
      });

      // 1. Validate fields
      this.validateConfiguration(params);

      // 2. Check for duplicate tenant code
      await OnboardingValidation.validateDuplicateTenantId(tenantId);

      // 3. Build default configuration state
      const clinicConfig = this.initializeClinicConfig({
        clinicName: params.clinicName,
        ownerName: params.ownerName,
        email: params.email,
        phone: params.phone,
      });

      const featureFlags = this.initializeFeatureFlags();

      // 4. Create Tenant Metadata Record
      const tenant = await this.createClinic({
        id: tenantId,
        name: params.clinicName,
        spreadsheetId: params.spreadsheetId,
        calendarId: params.calendarId,
        driveFolderId: params.driveFolderId,
        clinicConfig,
        featureFlags,
        subscriptionStatus: params.subscriptionStatus,
      });

      // 5. Create Owner User Metadata Record
      const owner = await this.createOwner(params.firebaseUid, tenantId, params.email);

      // 6. Security & Audit Logging
      await AuditService.logEvent({
        tenantId,
        userId: params.firebaseUid,
        eventType: 'CLINIC_CREATED',
        metadata: { clinicName: params.clinicName },
      });

      await AuditService.logEvent({
        tenantId,
        userId: params.firebaseUid,
        eventType: 'OWNER_CREATED',
        metadata: { email: params.email },
      });

      await AuditService.logEvent({
        tenantId,
        userId: params.firebaseUid,
        eventType: 'ONBOARDING_COMPLETED',
        metadata: { tenantId, ownerUid: params.firebaseUid },
      });

      const durationMs = Date.now() - startTime;
      logger.info('OnboardingService', 'Onboarding completed successfully', {
        requestId,
        tenantId,
        firebaseUid: params.firebaseUid,
        operation: 'completeOnboarding',
        durationMs,
        status: 'SUCCESS'
      });

      return { tenant, owner };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      logger.error('OnboardingService', 'Onboarding process failed', error, {
        requestId,
        tenantId,
        firebaseUid: params.firebaseUid,
        operation: 'completeOnboarding',
        durationMs,
        status: 'FAILED'
      });
      throw error;
    }
  }
}
