/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Base custom error class for the Metadata Service layer.
 */
export class MetadataServiceError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when data validation checks fail (e.g., empty IDs, invalid enum values, poorly structured JSON).
 */
export class ValidationError extends MetadataServiceError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

/**
 * Thrown when a requested resource (Tenant, User, Log) is not found.
 */
export class NotFoundError extends MetadataServiceError {
  constructor(message: string) {
    super(message, 'NOT_FOUND_ERROR');
  }
}

/**
 * Thrown when database queries or mutations fail unexpectedly.
 * Low-level database/driver errors are logged securely and wrapped inside this class.
 */
export class DatabaseError extends MetadataServiceError {
  public readonly originalError?: any;

  constructor(message: string, originalError?: any) {
    super(message, 'DATABASE_ERROR');
    this.originalError = originalError;
  }
}
