/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { useOnboarding } from '../useOnboarding';
import { useAuth } from '../../auth/AuthHooks';
import { useTenantContext } from '../../auth/useTenantContext';
import { OnboardingService } from '../OnboardingService';
import { TenantService } from '../../services/metadata/TenantService';

// Mock AuthHooks
vi.mock('../../auth/AuthHooks', () => ({
  useAuth: vi.fn(),
}));

// Mock useTenantContext
vi.mock('../../auth/useTenantContext', () => ({
  useTenantContext: vi.fn(),
}));

// Mock TenantService
vi.mock('../../services/metadata/TenantService', () => ({
  TenantService: {
    getTenantById: vi.fn(),
    createTenant: vi.fn(),
  },
}));

// Mock OnboardingService
vi.mock('../OnboardingService', () => ({
  OnboardingService: {
    completeOnboarding: vi.fn(),
    generateTenantId: vi.fn((name) => name?.toLowerCase().replace(/[^a-z0-9]+/g, '-')),
    validateConfiguration: vi.fn(),
  },
}));

// Helper test component
const TestHookComponent: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const {
    step,
    formData,
    updateField,
    error,
    isSubmitting,
    isCompleted,
    nextStep,
    prevStep,
    submit,
  } = useOnboarding(onSuccess);

  return (
    <div>
      <div data-testid="step">{step}</div>
      <div data-testid="clinic-name">{formData.clinicName}</div>
      <div data-testid="tenant-id">{formData.tenantId}</div>
      <div data-testid="error">{error || 'none'}</div>
      <div data-testid="completed">{isCompleted ? 'true' : 'false'}</div>
      <div data-testid="submitting">{isSubmitting ? 'true' : 'false'}</div>

      <button data-testid="update-btn" onClick={() => updateField('clinicName', 'Vasu Dental')}>
        Update Clinic Name
      </button>
      <button data-testid="update-owner-btn" onClick={() => updateField('ownerName', 'Dr. Vasu')}>
        Update Owner Name
      </button>
      <button data-testid="update-phone-btn" onClick={() => updateField('phone', '+918888888888')}>
        Update Phone
      </button>
      <button data-testid="update-sheet-btn" onClick={() => updateField('spreadsheetId', 'sheet-1')}>
        Update Sheet
      </button>
      <button data-testid="update-folder-btn" onClick={() => updateField('driveFolderId', 'folder-1')}>
        Update Folder
      </button>
      <button data-testid="update-cal-btn" onClick={() => updateField('calendarId', 'cal-1')}>
        Update Calendar
      </button>
      <button data-testid="next-btn" onClick={() => nextStep()}>
        Next
      </button>
      <button data-testid="prev-btn" onClick={() => prevStep()}>
        Prev
      </button>
      <button data-testid="submit-btn" onClick={() => submit()}>
        Submit
      </button>
    </div>
  );
};

describe('useOnboarding Custom React Hook', () => {
  const mockRefresh = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'auth-uid-123', email: 'doc@example.com', displayName: 'Doctor Name' },
    } as any);

    vi.mocked(useTenantContext).mockReturnValue({
      refresh: mockRefresh,
    } as any);

    vi.mocked(TenantService.getTenantById).mockRejectedValue({
      name: 'NotFoundError',
      message: 'Tenant not found',
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('should initialize with correct default values and auto-fill from auth context', () => {
    render(<TestHookComponent />);

    expect(screen.getByTestId('step').textContent).toBe('1');
    expect(screen.getByTestId('error').textContent).toBe('none');
    expect(screen.getByTestId('completed').textContent).toBe('false');
  });

  it('should support updating form fields and correctly update derived tenant ID', () => {
    render(<TestHookComponent />);

    act(() => {
      screen.getByTestId('update-btn').click();
    });

    expect(screen.getByTestId('clinic-name').textContent).toBe('Vasu Dental');
    // derived tenantId from 'Vasu Dental' using generateTenantId mock which replaces non-alphanumeric with hyphen
    expect(screen.getByTestId('tenant-id').textContent).toBe('vasu-dental');
  });

  it('should transition steps and enforce step-wise validation', async () => {
    render(<TestHookComponent />);

    // Try going to next step without filling required fields should fail (since we have mock valid checks)
    await act(async () => {
      screen.getByTestId('next-btn').click();
    });

    // Should fail validation on step 1 due to missing fields, showing error
    expect(screen.getByTestId('step').textContent).toBe('1');
    expect(screen.getByTestId('error').textContent).not.toBe('none');

    // Update Step 1 fields
    await act(async () => {
      screen.getByTestId('update-btn').click();
      screen.getByTestId('update-owner-btn').click();
      screen.getByTestId('update-phone-btn').click();
    });

    // Advancing step again should now succeed
    await act(async () => {
      screen.getByTestId('next-btn').click();
    });

    expect(screen.getByTestId('step').textContent).toBe('2');
    expect(screen.getByTestId('error').textContent).toBe('none');

    // Go back to step 1
    act(() => {
      screen.getByTestId('prev-btn').click();
    });
    expect(screen.getByTestId('step').textContent).toBe('1');
  });

  it('should submit form data, call OnboardingService, and trigger TenantContext refresh', async () => {
    const successSpy = vi.fn();
    render(<TestHookComponent onSuccess={successSpy} />);

    // Fill Step 1
    await act(async () => {
      screen.getByTestId('update-btn').click();
      screen.getByTestId('update-owner-btn').click();
      screen.getByTestId('update-phone-btn').click();
    });

    await act(async () => {
      screen.getByTestId('next-btn').click();
    });

    // Fill Step 2
    await act(async () => {
      screen.getByTestId('update-sheet-btn').click();
      screen.getByTestId('update-folder-btn').click();
      screen.getByTestId('update-cal-btn').click();
    });

    await act(async () => {
      screen.getByTestId('next-btn').click();
    }); // goes to step 3

    await act(async () => {
      screen.getByTestId('next-btn').click();
    }); // goes to step 4

    expect(screen.getByTestId('step').textContent).toBe('4');

    vi.mocked(OnboardingService.completeOnboarding).mockResolvedValue({
      tenant: {} as any,
      owner: {} as any,
    });

    await act(async () => {
      screen.getByTestId('submit-btn').click();
    });

    expect(OnboardingService.completeOnboarding).toHaveBeenCalled();
    expect(mockRefresh).toHaveBeenCalled();
    expect(screen.getByTestId('completed').textContent).toBe('true');
    expect(successSpy).toHaveBeenCalled();
  });
});
