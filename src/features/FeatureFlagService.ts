/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FeatureFlags } from '../services/metadata/types';
import { FeatureFlag, VALID_FEATURE_FLAGS } from './FeatureFlag';
import { ValidationError } from '../services/metadata/errors';

export const FLAG_MAPPING: Record<FeatureFlag, string> = {
  APPOINTMENTS: 'enableAppointments',
  PATIENTS: 'enablePatients',
  FOLLOWUPS: 'enableFollowUps',
  WHATSAPP: 'enableWhatsApp',
  REPORTS: 'enableReports',
  BILLING: 'enableBilling',
  CALENDAR: 'enableCalendar',
  AI_ASSISTANT: 'enableAiAssistant',
};

/**
 * FeatureFlagService evaluates feature flags for tenants.
 */
export class FeatureFlagService {
  /**
   * Validates if the provided flag is known and valid.
   * Throws ValidationError if the flag is unknown.
   */
  public static validateFlag(flag: any): void {
    if (!flag || typeof flag !== 'string' || !VALID_FEATURE_FLAGS.has(flag)) {
      throw new ValidationError(`Unknown or invalid feature flag: "${flag}"`);
    }
  }

  /**
   * Checks if a specific feature flag is enabled for the tenant.
   */
  public static isEnabled(
    featureFlags: FeatureFlags | null | undefined,
    flag: FeatureFlag
  ): boolean {
    this.validateFlag(flag);
    if (!featureFlags) {
      return false;
    }

    const key = FLAG_MAPPING[flag];
    const value =
      featureFlags[key as keyof FeatureFlags] !== undefined
        ? featureFlags[key as keyof FeatureFlags]
        : featureFlags[flag as keyof FeatureFlags];

    return value === true || value === 'true';
  }

  /**
   * Checks if at least one of the specified feature flags is enabled.
   */
  public static isAnyEnabled(
    featureFlags: FeatureFlags | null | undefined,
    flags: FeatureFlag[]
  ): boolean {
    if (!flags || flags.length === 0) {
      return false;
    }
    flags.forEach((f) => this.validateFlag(f));
    return flags.some((f) => this.isEnabled(featureFlags, f));
  }

  /**
   * Checks if all of the specified feature flags are enabled.
   */
  public static isAllEnabled(
    featureFlags: FeatureFlags | null | undefined,
    flags: FeatureFlag[]
  ): boolean {
    if (!flags || flags.length === 0) {
      return false;
    }
    flags.forEach((f) => this.validateFlag(f));
    return flags.every((f) => this.isEnabled(featureFlags, f));
  }

  /**
   * Returns a list of all enabled feature flags for the tenant.
   */
  public static getEnabledFeatures(
    featureFlags: FeatureFlags | null | undefined
  ): FeatureFlag[] {
    if (!featureFlags) {
      return [];
    }
    const enabled: FeatureFlag[] = [];
    VALID_FEATURE_FLAGS.forEach((flag) => {
      if (this.isEnabled(featureFlags, flag as FeatureFlag)) {
        enabled.push(flag as FeatureFlag);
      }
    });
    return enabled;
  }
}
