/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useCallback } from 'react';
import { useTenantContext } from './useTenantContext';
import { AuthorizationService } from './AuthorizationService';
import { Permission } from './Permission';
import { UserRole } from '../services/metadata/types';

export interface UseAuthorizationResult {
  role: UserRole | null;
  permissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
}

/**
 * React hook to check role-based permissions based on the active TenantContext.
 */
export const useAuthorization = (): UseAuthorizationResult => {
  const { user } = useTenantContext();

  const role = useMemo<UserRole | null>(() => {
    return user ? user.role : null;
  }, [user]);

  const permissions = useMemo<Permission[]>(() => {
    return AuthorizationService.getPermissionsForRole(role);
  }, [role]);

  const hasPermission = useCallback((permission: Permission): boolean => {
    return AuthorizationService.hasPermission(role, permission);
  }, [role]);

  const hasAnyPermission = useCallback((permissionsToCheck: Permission[]): boolean => {
    return AuthorizationService.hasAnyPermission(role, permissionsToCheck);
  }, [role]);

  const hasAllPermissions = useCallback((permissionsToCheck: Permission[]): boolean => {
    return AuthorizationService.hasAllPermissions(role, permissionsToCheck);
  }, [role]);

  return {
    role,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
};
