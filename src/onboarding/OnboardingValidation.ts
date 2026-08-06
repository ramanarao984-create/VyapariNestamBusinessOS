/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ValidationError } from '../services/metadata/errors';
import { TenantService } from '../services/metadata/TenantService';

export class OnboardingValidation {
  /**
   * Validates email string format.
   */
  public static validateEmail(email: string): void {
    if (!email || typeof email !== 'string' || email.trim() === '') {
      throw new ValidationError('Owner email is required.');
    }
    if (!email.includes('@')) {
      throw new ValidationError('A valid owner email address containing "@" is required.');
    }
  }

  /**
   * Validates clinic name.
   */
  public static validateClinicName(name: string): void {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new ValidationError('Clinic name is required and cannot be empty.');
    }
  }

  /**
   * Validates Google Workspace configuration IDs.
   */
  public static validateGoogleId(id: string, fieldName: string): void {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new ValidationError(`${fieldName} ID is required and cannot be empty.`);
    }
  }

  /**
   * Validates the generated or inputted tenant ID.
   */
  public static validateTenantId(id: string): void {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new ValidationError('Tenant ID must be a non-empty string.');
    }
    if (!/^[a-zA-Z0-9_\-]+$/.test(id)) {
      throw new ValidationError(
        'Tenant ID must contain only alphanumeric characters, underscores, or hyphens.'
      );
    }
  }

  /**
   * Validates Firebase UID.
   */
  public static validateFirebaseUid(uid: string): void {
    if (!uid || typeof uid !== 'string' || uid.trim() === '') {
      throw new ValidationError('Firebase UID is required and must be a non-empty string.');
    }
  }

  /**
   * Checks if a tenant ID is already taken.
   */
  public static async validateDuplicateTenantId(id: string): Promise<void> {
    try {
      await TenantService.getTenantById(id);
      throw new ValidationError(`Tenant with ID "${id}" already exists.`);
    } catch (err: any) {
      if (err.name === 'NotFoundError' || err.message?.includes('not found')) {
        // Safe to proceed, tenant does not exist!
        return;
      }
      throw err;
    }
  }
}
