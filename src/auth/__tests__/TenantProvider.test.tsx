/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { TenantProvider } from '../TenantProvider';
import { useTenantContext } from '../useTenantContext';
import { useAuth } from '../AuthHooks';
import { TenantResolver } from '../TenantResolver';
import { ValidationError } from '../../services/metadata/errors';

// Mock AuthHooks
vi.mock('../AuthHooks', () => {
  return {
    useAuth: vi.fn(),
  };
});

// Mock TenantResolver
vi.mock('../TenantResolver', () => {
  return {
    TenantResolver: {
      resolve: vi.fn(),
    },
  };
});

// Helper component to consume context and display values
const TestConsumer: React.FC = () => {
  const context = useTenantContext();
  return (
    <div>
      <div data-testid="loading">{context.loading ? 'true' : 'false'}</div>
      <div data-testid="loaded">{context.loaded ? 'true' : 'false'}</div>
      <div data-testid="error">{context.error ? context.error.message : 'null'}</div>
      <div data-testid="unauthenticated">{context.unauthenticated ? 'true' : 'false'}</div>
      <div data-testid="tenant-name">{context.tenant ? context.tenant.name : 'null'}</div>
      <div data-testid="doctor-name">{context.clinicConfig ? context.clinicConfig.doctorName : 'null'}</div>
      <div data-testid="whatsapp-enabled">{context.featureFlags?.enableWhatsApp ? 'true' : 'false'}</div>
      <button data-testid="refresh-btn" onClick={() => context.refresh()}>Refresh</button>
    </div>
  );
};

describe('TenantProvider React Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should handle initial loading state when auth is loading', async () => {
    // Arrange
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      accessToken: null,
      isLoggingIn: true,
      error: null,
      loginWithPopup: vi.fn(),
      loginWithRedirect: vi.fn(),
      loginWithDemoGmail: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
      authorizeGoogleWorkspace: vi.fn(),
    });

    // Act
    render(
      <TenantProvider>
        <TestConsumer />
      </TenantProvider>
    );

    // Assert
    expect(screen.getByTestId('loading').textContent).toBe('true');
    expect(screen.getByTestId('loaded').textContent).toBe('false');
    expect(screen.getByTestId('unauthenticated').textContent).toBe('false');
    expect(screen.getByTestId('tenant-name').textContent).toBe('null');
  });

  it('should handle unauthenticated state when auth loaded with no user', async () => {
    // Arrange
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      accessToken: null,
      isLoggingIn: false,
      error: null,
      loginWithPopup: vi.fn(),
      loginWithRedirect: vi.fn(),
      loginWithDemoGmail: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
      authorizeGoogleWorkspace: vi.fn(),
    });

    // Act
    render(
      <TenantProvider>
        <TestConsumer />
      </TenantProvider>
    );

    // Assert
    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(screen.getByTestId('loaded').textContent).toBe('false');
    expect(screen.getByTestId('unauthenticated').textContent).toBe('true');
    expect(screen.getByTestId('tenant-name').textContent).toBe('null');
  });

  it('should successfully resolve tenant metadata on successful auth', async () => {
    // Arrange
    const mockUser = { uid: 'user-id-123', email: 'test@nestam.com' } as any;
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      accessToken: null,
      isLoggingIn: false,
      error: null,
      loginWithPopup: vi.fn(),
      loginWithRedirect: vi.fn(),
      loginWithDemoGmail: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
      authorizeGoogleWorkspace: vi.fn(),
    });

    const mockResolvedContext = {
      tenant: {
        id: 'clinic-1',
        name: 'My Clinic',
        spreadsheetId: 'sheet-1',
        calendarId: 'cal-1',
        driveFolderId: 'drive-1',
        clinicConfig: { doctorName: 'Dr. Rao' },
        featureFlags: { enableWhatsApp: true },
        subscriptionStatus: 'active' as const,
        createdAt: '',
        updatedAt: '',
      },
      user: {
        id: 'user-id-123',
        tenantId: 'clinic-1',
        email: 'test@nestam.com',
        role: 'Doctor' as const,
        createdAt: '',
        updatedAt: '',
      },
      clinicConfig: { doctorName: 'Dr. Rao' },
      featureFlags: { enableWhatsApp: true },
    };

    let resolvePromise: Promise<any>;
    vi.mocked(TenantResolver.resolve).mockImplementation(() => {
      resolvePromise = Promise.resolve(mockResolvedContext);
      return resolvePromise;
    });

    // Act
    render(
      <TenantProvider>
        <TestConsumer />
      </TenantProvider>
    );

    // Assert initial resolve loading state
    expect(screen.getByTestId('loading').textContent).toBe('true');
    expect(screen.getByTestId('loaded').textContent).toBe('false');

    // Wait for the resolve promise to settle
    await act(async () => {
      await resolvePromise;
    });

    // Assert metadata values loaded
    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(screen.getByTestId('loaded').textContent).toBe('true');
    expect(screen.getByTestId('tenant-name').textContent).toBe('My Clinic');
    expect(screen.getByTestId('doctor-name').textContent).toBe('Dr. Rao');
    expect(screen.getByTestId('whatsapp-enabled').textContent).toBe('true');
    expect(screen.getByTestId('error').textContent).toBe('null');
  });

  it('should handle failed resolve and set error state', async () => {
    // Arrange
    const mockUser = { uid: 'user-id-123', email: 'test@nestam.com' } as any;
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      accessToken: null,
      isLoggingIn: false,
      error: null,
      loginWithPopup: vi.fn(),
      loginWithRedirect: vi.fn(),
      loginWithDemoGmail: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
      authorizeGoogleWorkspace: vi.fn(),
    });

    let rejectPromise: Promise<any>;
    vi.mocked(TenantResolver.resolve).mockImplementation(() => {
      rejectPromise = Promise.reject(new ValidationError('Metadata incomplete.'));
      return rejectPromise;
    });

    // Act
    render(
      <TenantProvider>
        <TestConsumer />
      </TenantProvider>
    );

    // Wait for the reject promise to settle
    await act(async () => {
      try {
        await rejectPromise;
      } catch (e) {}
    });

    // Assert error state
    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(screen.getByTestId('loaded').textContent).toBe('false');
    expect(screen.getByTestId('error').textContent).toBe('Metadata incomplete.');
  });

  it('should bypass cache and update context when refresh() is invoked', async () => {
    // Arrange
    const mockUser = { uid: 'user-id-123', email: 'test@nestam.com' } as any;
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      accessToken: null,
      isLoggingIn: false,
      error: null,
      loginWithPopup: vi.fn(),
      loginWithRedirect: vi.fn(),
      loginWithDemoGmail: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
      authorizeGoogleWorkspace: vi.fn(),
    });

    const mockResolvedContext = {
      tenant: {
        id: 'clinic-1',
        name: 'My Clinic',
        spreadsheetId: 'sheet-1',
        calendarId: 'cal-1',
        driveFolderId: 'drive-1',
        clinicConfig: { doctorName: 'Dr. Rao' },
        featureFlags: { enableWhatsApp: true },
        subscriptionStatus: 'active' as const,
        createdAt: '',
        updatedAt: '',
      },
      user: {
        id: 'user-id-123',
        tenantId: 'clinic-1',
        email: 'test@nestam.com',
        role: 'Doctor' as const,
        createdAt: '',
        updatedAt: '',
      },
      clinicConfig: { doctorName: 'Dr. Rao' },
      featureFlags: { enableWhatsApp: true },
    };

    let firstResolvePromise: Promise<any>;
    vi.mocked(TenantResolver.resolve).mockImplementation(() => {
      firstResolvePromise = Promise.resolve(mockResolvedContext);
      return firstResolvePromise;
    });

    render(
      <TenantProvider>
        <TestConsumer />
      </TenantProvider>
    );

    await act(async () => {
      await firstResolvePromise;
    });

    expect(screen.getByTestId('tenant-name').textContent).toBe('My Clinic');
    expect(TenantResolver.resolve).toHaveBeenCalledTimes(1);

    // Setup mock update for the refresh
    const updatedContext = {
      ...mockResolvedContext,
      tenant: {
        ...mockResolvedContext.tenant,
        name: 'My Updated Clinic',
      },
    };

    let refreshResolvePromise: Promise<any>;
    vi.mocked(TenantResolver.resolve).mockImplementation((uid, options) => {
      expect(options?.forceRefresh).toBe(true);
      refreshResolvePromise = Promise.resolve(updatedContext);
      return refreshResolvePromise;
    });

    // Trigger refresh button click
    const refreshBtn = screen.getByTestId('refresh-btn');
    await act(async () => {
      refreshBtn.click();
      await refreshResolvePromise;
    });

    // Assert update reflects in the context
    expect(screen.getByTestId('tenant-name').textContent).toBe('My Updated Clinic');
    expect(TenantResolver.resolve).toHaveBeenCalledTimes(2);
  });
});
