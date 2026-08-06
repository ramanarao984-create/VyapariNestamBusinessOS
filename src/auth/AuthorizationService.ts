/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRole } from '../services/metadata/types';
import { Permission } from './Permission';

const ROLE_PERMISSIONS: Record<UserRole, Set<Permission>> = {
  Owner: new Set<Permission>([
    'VIEW_DASHBOARD',
    'VIEW_PATIENTS',
    'EDIT_PATIENTS',
    'DELETE_PATIENTS',
    'VIEW_APPOINTMENTS',
    'EDIT_APPOINTMENTS',
    'VIEW_REPORTS',
    'EDIT_SETTINGS',
    'MANAGE_USERS',
  ]),
  Admin: new Set<Permission>([
    'VIEW_DASHBOARD',
    'VIEW_PATIENTS',
    'EDIT_PATIENTS',
    'VIEW_APPOINTMENTS',
    'EDIT_APPOINTMENTS',
    'VIEW_REPORTS',
    'EDIT_SETTINGS',
    'MANAGE_USERS',
  ]),
  Doctor: new Set<Permission>([
    'VIEW_DASHBOARD',
    'VIEW_PATIENTS',
    'EDIT_PATIENTS',
    'VIEW_APPOINTMENTS',
    'VIEW_REPORTS',
  ]),
  Receptionist: new Set<Permission>([
    'VIEW_DASHBOARD',
    'VIEW_PATIENTS',
    'EDIT_PATIENTS',
    'VIEW_APPOINTMENTS',
    'EDIT_APPOINTMENTS',
  ]),
  ReadOnly: new Set<Permission>([
    'VIEW_DASHBOARD',
    'VIEW_PATIENTS',
    'VIEW_APPOINTMENTS',
    'VIEW_REPORTS',
  ]),
};

/**
 * AuthorizationService evaluates role-based permissions against static rules.
 */
export class AuthorizationService {
  /**
   * Checks if a role has a specific permission.
   */
  public static hasPermission(role: string | null | undefined, permission: Permission): boolean {
    if (!role) {
      return false;
    }
    const permissions = ROLE_PERMISSIONS[role as UserRole];
    if (!permissions) {
      return false;
    }
    return permissions.has(permission);
  }

  /**
   * Checks if a role has at least one of the specified permissions.
   */
  public static hasAnyPermission(role: string | null | undefined, permissions: Permission[]): boolean {
    if (!role || !permissions || permissions.length === 0) {
      return false;
    }
    return permissions.some((permission) => this.hasPermission(role, permission));
  }

  /**
   * Checks if a role has all of the specified permissions.
   */
  public static hasAllPermissions(role: string | null | undefined, permissions: Permission[]): boolean {
    if (!role || !permissions || permissions.length === 0) {
      return false;
    }
    return permissions.every((permission) => this.hasPermission(role, permission));
  }

  /**
   * Returns all permissions assigned to a given role.
   */
  public static getPermissionsForRole(role: string | null | undefined): Permission[] {
    if (!role) {
      return [];
    }
    const permissions = ROLE_PERMISSIONS[role as UserRole];
    if (!permissions) {
      return [];
    }
    return Array.from(permissions);
  }
}
