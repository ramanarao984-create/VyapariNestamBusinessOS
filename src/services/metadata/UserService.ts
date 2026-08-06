/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient, isSupabaseConfigured } from '../../supabase/client';
import { isDemoModeEnabled } from '../../auth/demoConfig';
import { UserMetadata, UserRole } from './types';
import { ValidationError, NotFoundError, DatabaseError } from './errors';
import { logger } from './logger';
import { TenantService } from './TenantService';

export class UserService {
  private static readonly CONTEXT = 'UserService';

  /**
   * Helper to map database rows to UserMetadata interface
   */
  private static mapRow(row: any): UserMetadata {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      email: row.email,
      role: row.role as UserRole,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * General validator for user fields
   */
  private static validateUserFields(id: string, tenantId: string, email: string, role?: string): void {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new ValidationError('Firebase UID is required and must be a non-empty string.');
    }
    if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
      throw new ValidationError('Tenant ID is required and must be a non-empty string.');
    }
    if (!email || typeof email !== 'string' || email.trim() === '') {
      throw new ValidationError('Email address is required.');
    }
    if (!email.includes('@')) {
      throw new ValidationError('A valid email address containing "@" is required.');
    }
    if (role) {
      const validRoles = ['Owner', 'Admin', 'Doctor', 'Receptionist', 'ReadOnly'];
      if (!validRoles.includes(role)) {
        throw new ValidationError(`Invalid role: "${role}". Must be one of: Owner, Admin, Doctor, Receptionist, ReadOnly.`);
      }
    }
  }

  /**
   * Creates a user as the Owner of a tenant.
   */
  public static async createOwner(uid: string, tenantId: string, email: string): Promise<UserMetadata> {
    logger.info(this.CONTEXT, 'Creating clinic Owner user metadata', { uid, tenantId, email });
    return this.createUser({ uid, tenantId, email, role: 'Owner' });
  }

  /**
   * General purpose user registration.
   */
  public static async createUser(params: {
    uid: string;
    tenantId: string;
    email: string;
    role: UserRole;
  }): Promise<UserMetadata> {
    const { uid, tenantId, email, role } = params;

    this.validateUserFields(uid, tenantId, email, role);

    logger.info(this.CONTEXT, 'Registering new user metadata', { uid, tenantId, email, role });

    try {
      // Ensure the associated tenant exists first to maintain relational integrity
      await TenantService.getTenantById(tenantId);

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: uid,
          tenant_id: tenantId,
          email: email.trim().toLowerCase(),
          role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new ValidationError(`User with Firebase UID "${uid}" already exists in the metadata system.`);
        }
        throw error;
      }

      return this.mapRow(data);
    } catch (err: any) {
      if (err instanceof ValidationError || err instanceof NotFoundError) {
        throw err;
      }
      logger.error(this.CONTEXT, `Database error creating user "${uid}"`, err);
      throw new DatabaseError(`Failed to register user metadata: ${err.message || err}`, err);
    }
  }

  /**
   * Resolves user metadata by Firebase Auth UID.
   */
  public static async getUserByFirebaseUid(uid: string): Promise<UserMetadata> {
    if (!uid || typeof uid !== 'string' || uid.trim() === '') {
      throw new ValidationError('Firebase Auth UID is required for user lookup.');
    }

    if (uid.startsWith('demo-')) {
      return {
        id: uid,
        tenantId: 'demo-tenant-id',
        email: uid.includes('gmail') ? 'ramanarao984@gmail.com' : 'demo@nestam.com',
        role: 'Doctor',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new NotFoundError(`User metadata for Firebase UID "${uid}" was not found.`);
      }

      return this.mapRow(data);
    } catch (err: any) {
      if (err instanceof NotFoundError || err instanceof ValidationError) {
        throw err;
      }
      logger.error(this.CONTEXT, `Database error looking up user with UID "${uid}"`, err);
      throw new DatabaseError(`Failed to fetch user by UID: ${err.message || err}`, err);
    }
  }

  /**
   * Fetches all registered users for a specific tenant.
   */
  public static async getUsersByTenant(tenantId: string): Promise<UserMetadata[]> {
    if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
      throw new ValidationError('Tenant ID is required to fetch members.');
    }

    try {
      // Confirm tenant exists
      await TenantService.getTenantById(tenantId);

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('role', { ascending: true });

      if (error) {
        throw error;
      }

      return (data || []).map(row => this.mapRow(row));
    } catch (err: any) {
      if (err instanceof NotFoundError || err instanceof ValidationError) {
        throw err;
      }
      logger.error(this.CONTEXT, `Database error listing users for tenant "${tenantId}"`, err);
      throw new DatabaseError(`Failed to list tenant users: ${err.message || err}`, err);
    }
  }

  /**
   * Updates a user's RBAC role.
   */
  public static async updateUserRole(uid: string, role: UserRole): Promise<UserMetadata> {
    if (!uid) {
      throw new ValidationError('Firebase UID is required to change user roles.');
    }
    const validRoles = ['Owner', 'Admin', 'Doctor', 'Receptionist', 'ReadOnly'];
    if (!validRoles.includes(role)) {
      throw new ValidationError(`Invalid role: "${role}". Must be one of: Owner, Admin, Doctor, Receptionist, ReadOnly.`);
    }

    logger.info(this.CONTEXT, 'Updating user metadata role', { uid, role });

    try {
      // Ensure user exists
      await this.getUserByFirebaseUid(uid);

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('users')
        .update({
          role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', uid)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return this.mapRow(data);
    } catch (err: any) {
      if (err instanceof NotFoundError || err instanceof ValidationError) {
        throw err;
      }
      logger.error(this.CONTEXT, `Database error updating role for user "${uid}"`, err);
      throw new DatabaseError(`Failed to update user role: ${err.message || err}`, err);
    }
  }

  /**
   * Deactivates a user association by removing them from metadata access table.
   */
  public static async deactivateUser(uid: string): Promise<void> {
    if (!uid || typeof uid !== 'string' || uid.trim() === '') {
      throw new ValidationError('Firebase UID is required to deactivate user.');
    }

    logger.info(this.CONTEXT, 'Deactivating/removing user metadata', { uid });

    try {
      // Ensure user exists before deleting
      await this.getUserByFirebaseUid(uid);

      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', uid);

      if (error) {
        throw error;
      }
    } catch (err: any) {
      if (err instanceof NotFoundError || err instanceof ValidationError) {
        throw err;
      }
      logger.error(this.CONTEXT, `Database error deactivating user "${uid}"`, err);
      throw new DatabaseError(`Failed to deactivate user: ${err.message || err}`, err);
    }
  }
}
