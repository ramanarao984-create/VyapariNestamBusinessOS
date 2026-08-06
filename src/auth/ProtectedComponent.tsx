/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuthorization } from './useAuthorization';
import { Permission } from './Permission';

export interface ProtectedComponentProps {
  permission?: Permission;
  permissions?: Permission[];
  allRequired?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * ProtectedComponent wraps child elements and only renders them if the current user
 * has the required permission(s).
 */
export const ProtectedComponent: React.FC<ProtectedComponentProps> = ({
  permission,
  permissions,
  allRequired = false,
  fallback = null,
  children,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuthorization();

  let isAuthorized = true;

  if (permission) {
    isAuthorized = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    if (allRequired) {
      isAuthorized = hasAllPermissions(permissions);
    } else {
      isAuthorized = hasAnyPermission(permissions);
    }
  }

  if (!isAuthorized) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
