/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Permission } from '../Permission';
import { AuthorizationService } from '../AuthorizationService';
import { useAuthorization } from '../useAuthorization';
import { ProtectedComponent } from '../ProtectedComponent';
import { useTenantContext } from '../useTenantContext';

// Mock useTenantContext
vi.mock('../useTenantContext', () => {
  return {
    useTenantContext: vi.fn(),
  };
});

// Helper component to consume hook and show values for testing hook behavior
const HookConsumer: React.FC<{ permissionToCheck: Permission; anyPermissions?: Permission[] }> = ({
  permissionToCheck,
  anyPermissions = [],
}) => {
  const { role, permissions, hasPermission, hasAnyPermission, hasAllPermissions } = useAuthorization();
  return (
    <div>
      <div data-testid="role">{role || 'null'}</div>
      <div data-testid="permissions-count">{permissions.length}</div>
      <div data-testid="has-permission">{hasPermission(permissionToCheck) ? 'true' : 'false'}</div>
      <div data-testid="has-any-permission">
        {hasAnyPermission(anyPermissions) ? 'true' : 'false'}
      </div>
      <div data-testid="has-all-permissions">
        {hasAllPermissions(anyPermissions) ? 'true' : 'false'}
      </div>
    </div>
  );
};

describe('Authorization & RBAC Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('AuthorizationService Unit Tests', () => {
    const roles = ['Owner', 'Admin', 'Doctor', 'Receptionist', 'ReadOnly'] as const;
    const permissions: Permission[] = [
      'VIEW_DASHBOARD',
      'VIEW_PATIENTS',
      'EDIT_PATIENTS',
      'DELETE_PATIENTS',
      'VIEW_APPOINTMENTS',
      'EDIT_APPOINTMENTS',
      'VIEW_REPORTS',
      'EDIT_SETTINGS',
      'MANAGE_USERS',
    ];

    it('should grant Owner full access (all permissions)', () => {
      permissions.forEach((permission) => {
        expect(AuthorizationService.hasPermission('Owner', permission)).toBe(true);
      });
      expect(AuthorizationService.getPermissionsForRole('Owner').length).toBe(9);
    });

    it('should grant Admin operational management access but not delete patients', () => {
      expect(AuthorizationService.hasPermission('Admin', 'VIEW_DASHBOARD')).toBe(true);
      expect(AuthorizationService.hasPermission('Admin', 'VIEW_PATIENTS')).toBe(true);
      expect(AuthorizationService.hasPermission('Admin', 'EDIT_PATIENTS')).toBe(true);
      expect(AuthorizationService.hasPermission('Admin', 'VIEW_APPOINTMENTS')).toBe(true);
      expect(AuthorizationService.hasPermission('Admin', 'EDIT_APPOINTMENTS')).toBe(true);
      expect(AuthorizationService.hasPermission('Admin', 'VIEW_REPORTS')).toBe(true);
      expect(AuthorizationService.hasPermission('Admin', 'EDIT_SETTINGS')).toBe(true);
      expect(AuthorizationService.hasPermission('Admin', 'MANAGE_USERS')).toBe(true);

      // Verify exceptions/boundaries
      expect(AuthorizationService.hasPermission('Admin', 'DELETE_PATIENTS')).toBe(false);
      expect(AuthorizationService.getPermissionsForRole('Admin').length).toBe(8);
    });

    it('should grant Doctor clinical operations only', () => {
      const docPermissions = AuthorizationService.getPermissionsForRole('Doctor');
      expect(docPermissions).toContain('VIEW_DASHBOARD');
      expect(docPermissions).toContain('VIEW_PATIENTS');
      expect(docPermissions).toContain('EDIT_PATIENTS');
      expect(docPermissions).toContain('VIEW_APPOINTMENTS');
      expect(docPermissions).toContain('VIEW_REPORTS');

      expect(docPermissions).not.toContain('DELETE_PATIENTS');
      expect(docPermissions).not.toContain('EDIT_APPOINTMENTS');
      expect(docPermissions).not.toContain('EDIT_SETTINGS');
      expect(docPermissions).not.toContain('MANAGE_USERS');
      expect(docPermissions.length).toBe(5);
    });

    it('should grant Receptionist appointments and patient registration only', () => {
      const recepPermissions = AuthorizationService.getPermissionsForRole('Receptionist');
      expect(recepPermissions).toContain('VIEW_DASHBOARD');
      expect(recepPermissions).toContain('VIEW_PATIENTS');
      expect(recepPermissions).toContain('EDIT_PATIENTS');
      expect(recepPermissions).toContain('VIEW_APPOINTMENTS');
      expect(recepPermissions).toContain('EDIT_APPOINTMENTS');

      expect(recepPermissions).not.toContain('DELETE_PATIENTS');
      expect(recepPermissions).not.toContain('VIEW_REPORTS');
      expect(recepPermissions).not.toContain('EDIT_SETTINGS');
      expect(recepPermissions).not.toContain('MANAGE_USERS');
      expect(recepPermissions.length).toBe(5);
    });

    it('should grant ReadOnly read-only views only', () => {
      const readPermissions = AuthorizationService.getPermissionsForRole('ReadOnly');
      expect(readPermissions).toContain('VIEW_DASHBOARD');
      expect(readPermissions).toContain('VIEW_PATIENTS');
      expect(readPermissions).toContain('VIEW_APPOINTMENTS');
      expect(readPermissions).toContain('VIEW_REPORTS');

      expect(readPermissions).not.toContain('EDIT_PATIENTS');
      expect(readPermissions).not.toContain('DELETE_PATIENTS');
      expect(readPermissions).not.toContain('EDIT_APPOINTMENTS');
      expect(readPermissions).not.toContain('EDIT_SETTINGS');
      expect(readPermissions).not.toContain('MANAGE_USERS');
      expect(readPermissions.length).toBe(4);
    });

    it('should return false or empty arrays for invalid/unknown roles', () => {
      const invalidRole = 'SuperHero';
      permissions.forEach((permission) => {
        expect(AuthorizationService.hasPermission(invalidRole, permission)).toBe(false);
      });
      expect(AuthorizationService.getPermissionsForRole(invalidRole)).toEqual([]);
      expect(AuthorizationService.hasPermission(null, 'VIEW_DASHBOARD')).toBe(false);
      expect(AuthorizationService.hasPermission(undefined, 'VIEW_DASHBOARD')).toBe(false);
    });

    it('should correctly evaluate hasAnyPermission and hasAllPermissions', () => {
      expect(AuthorizationService.hasAnyPermission('ReadOnly', ['EDIT_PATIENTS', 'VIEW_DASHBOARD'])).toBe(true);
      expect(AuthorizationService.hasAnyPermission('ReadOnly', ['EDIT_PATIENTS', 'DELETE_PATIENTS'])).toBe(false);

      expect(AuthorizationService.hasAllPermissions('Doctor', ['VIEW_PATIENTS', 'EDIT_PATIENTS'])).toBe(true);
      expect(AuthorizationService.hasAllPermissions('Doctor', ['VIEW_PATIENTS', 'EDIT_SETTINGS'])).toBe(false);

      // Boundary empty inputs
      expect(AuthorizationService.hasAnyPermission('Doctor', [])).toBe(false);
      expect(AuthorizationService.hasAllPermissions('Doctor', [])).toBe(false);
    });
  });

  describe('useAuthorization React Hook Tests', () => {
    it('should return null role and empty permissions when unauthenticated', () => {
      vi.mocked(useTenantContext).mockReturnValue({
        tenant: null,
        user: null,
        clinicConfig: null,
        featureFlags: null,
        loading: false,
        loaded: true,
        error: null,
        unauthenticated: true,
        refresh: async () => {},
      });

      render(<HookConsumer permissionToCheck="VIEW_DASHBOARD" />);

      expect(screen.getByTestId('role').textContent).toBe('null');
      expect(screen.getByTestId('permissions-count').textContent).toBe('0');
      expect(screen.getByTestId('has-permission').textContent).toBe('false');
    });

    it('should return correct role, permissions, and check methods when authenticated as Doctor', () => {
      vi.mocked(useTenantContext).mockReturnValue({
        tenant: { id: 'clinic-1' } as any,
        user: { id: 'user-1', role: 'Doctor' } as any,
        clinicConfig: null,
        featureFlags: null,
        loading: false,
        loaded: true,
        error: null,
        unauthenticated: false,
        refresh: async () => {},
      });

      render(
        <HookConsumer
          permissionToCheck="EDIT_PATIENTS"
          anyPermissions={['VIEW_REPORTS', 'EDIT_SETTINGS']}
        />
      );

      expect(screen.getByTestId('role').textContent).toBe('Doctor');
      expect(screen.getByTestId('permissions-count').textContent).toBe('5');
      expect(screen.getByTestId('has-permission').textContent).toBe('true'); // Doctor can edit patients
      expect(screen.getByTestId('has-any-permission').textContent).toBe('true'); // Doctor can view reports
      expect(screen.getByTestId('has-all-permissions').textContent).toBe('false'); // Doctor cannot edit settings
    });
  });

  describe('ProtectedComponent Tests', () => {
    it('should render children if user has the single required permission', () => {
      vi.mocked(useTenantContext).mockReturnValue({
        tenant: { id: 'clinic-1' } as any,
        user: { id: 'user-1', role: 'Receptionist' } as any,
        clinicConfig: null,
        featureFlags: null,
        loading: false,
        loaded: true,
        error: null,
        unauthenticated: false,
        refresh: async () => {},
      });

      render(
        <ProtectedComponent permission="EDIT_APPOINTMENTS">
          <div data-testid="guarded">Guarded Content</div>
        </ProtectedComponent>
      );

      expect(screen.getByTestId('guarded').textContent).toBe('Guarded Content');
    });

    it('should hide children and render fallback if unauthorized', () => {
      vi.mocked(useTenantContext).mockReturnValue({
        tenant: { id: 'clinic-1' } as any,
        user: { id: 'user-1', role: 'ReadOnly' } as any,
        clinicConfig: null,
        featureFlags: null,
        loading: false,
        loaded: true,
        error: null,
        unauthenticated: false,
        refresh: async () => {},
      });

      render(
        <ProtectedComponent permission="EDIT_APPOINTMENTS" fallback={<span data-testid="fallback">Access Denied</span>}>
          <div data-testid="guarded">Guarded Content</div>
        </ProtectedComponent>
      );

      expect(screen.queryByTestId('guarded')).toBeNull();
      expect(screen.getByTestId('fallback').textContent).toBe('Access Denied');
    });

    it('should correctly support permissions list checks with anyRequired (default) and allRequired', () => {
      vi.mocked(useTenantContext).mockReturnValue({
        tenant: { id: 'clinic-1' } as any,
        user: { id: 'user-1', role: 'Doctor' } as any,
        clinicConfig: null,
        featureFlags: null,
        loading: false,
        loaded: true,
        error: null,
        unauthenticated: false,
        refresh: async () => {},
      });

      // Doctor has VIEW_REPORTS, lacks EDIT_SETTINGS
      const { rerender } = render(
        <ProtectedComponent permissions={['VIEW_REPORTS', 'EDIT_SETTINGS']}>
          <div data-testid="guarded-any">Rendered via Any</div>
        </ProtectedComponent>
      );

      expect(screen.getByTestId('guarded-any').textContent).toBe('Rendered via Any');

      rerender(
        <ProtectedComponent permissions={['VIEW_REPORTS', 'EDIT_SETTINGS']} allRequired={true} fallback={<div data-testid="no-all">Lacks All</div>}>
          <div data-testid="guarded-all">Rendered via All</div>
        </ProtectedComponent>
      );

      expect(screen.queryByTestId('guarded-all')).toBeNull();
      expect(screen.getByTestId('no-all').textContent).toBe('Lacks All');
    });
  });
});
