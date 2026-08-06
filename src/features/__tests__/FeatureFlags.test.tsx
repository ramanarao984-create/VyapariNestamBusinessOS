/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { FeatureFlag } from '../FeatureFlag';
import { FeatureFlagService } from '../FeatureFlagService';
import { useFeatureFlags } from '../useFeatureFlags';
import { FeatureGate } from '../FeatureGate';
import { useTenantContext } from '../../auth/useTenantContext';
import { ValidationError } from '../../services/metadata/errors';

// Mock useTenantContext
vi.mock('../../auth/useTenantContext', () => {
  return {
    useTenantContext: vi.fn(),
  };
});

// Helper component to consume hook and show values for testing hook behavior
const HookConsumer: React.FC<{ flagToCheck: FeatureFlag; listFlags?: FeatureFlag[] }> = ({
  flagToCheck,
  listFlags = [],
}) => {
  const { featureFlags, isEnabled, isAnyEnabled, isAllEnabled } = useFeatureFlags();
  return (
    <div>
      <div data-testid="flags-present">{featureFlags ? 'true' : 'false'}</div>
      <div data-testid="is-enabled">{isEnabled(flagToCheck) ? 'true' : 'false'}</div>
      <div data-testid="is-any-enabled">
        {isAnyEnabled(listFlags) ? 'true' : 'false'}
      </div>
      <div data-testid="is-all-enabled">
        {isAllEnabled(listFlags) ? 'true' : 'false'}
      </div>
    </div>
  );
};

describe('FeatureFlags & Tenant Toggles Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('FeatureFlagService Unit Tests', () => {
    it('should correctly evaluate enabled and disabled feature flags', () => {
      const mockFlags = {
        enableWhatsApp: true,
        enableBilling: false,
      };

      expect(FeatureFlagService.isEnabled(mockFlags, 'WHATSAPP')).toBe(true);
      expect(FeatureFlagService.isEnabled(mockFlags, 'BILLING')).toBe(false);
    });

    it('should support checking flag keys directly in uppercase', () => {
      const mockFlags = {
        WHATSAPP: true,
        BILLING: false,
      };

      expect(FeatureFlagService.isEnabled(mockFlags, 'WHATSAPP')).toBe(true);
      expect(FeatureFlagService.isEnabled(mockFlags, 'BILLING')).toBe(false);
    });

    it('should throw ValidationError on unknown or invalid flags', () => {
      const mockFlags = { enableWhatsApp: true };

      expect(() => FeatureFlagService.isEnabled(mockFlags, 'INVALID_FLAG' as any)).toThrow(ValidationError);
      expect(() => FeatureFlagService.isAnyEnabled(mockFlags, ['WHATSAPP', 'INVALID_FLAG' as any])).toThrow(ValidationError);
      expect(() => FeatureFlagService.isAllEnabled(mockFlags, ['WHATSAPP', 'INVALID_FLAG' as any])).toThrow(ValidationError);
    });

    it('should return false if featureFlags is null or undefined', () => {
      expect(FeatureFlagService.isEnabled(null, 'WHATSAPP')).toBe(false);
      expect(FeatureFlagService.isEnabled(undefined, 'WHATSAPP')).toBe(false);
    });

    it('should correctly evaluate isAnyEnabled and isAllEnabled', () => {
      const mockFlags = {
        enableWhatsApp: true,
        enableBilling: false,
        enableCalendar: true,
      };

      expect(FeatureFlagService.isAnyEnabled(mockFlags, ['WHATSAPP', 'BILLING'])).toBe(true);
      expect(FeatureFlagService.isAnyEnabled(mockFlags, ['BILLING', 'AI_ASSISTANT'])).toBe(false);

      expect(FeatureFlagService.isAllEnabled(mockFlags, ['WHATSAPP', 'CALENDAR'])).toBe(true);
      expect(FeatureFlagService.isAllEnabled(mockFlags, ['WHATSAPP', 'BILLING'])).toBe(false);

      // Boundary empty inputs
      expect(FeatureFlagService.isAnyEnabled(mockFlags, [])).toBe(false);
      expect(FeatureFlagService.isAllEnabled(mockFlags, [])).toBe(false);
    });

    it('should return list of enabled features with getEnabledFeatures()', () => {
      const mockFlags = {
        enableWhatsApp: true,
        enableBilling: false,
        enableCalendar: true,
        enableAiAssistant: 'true' as any, // supports string representation
      };

      const enabled = FeatureFlagService.getEnabledFeatures(mockFlags);
      expect(enabled).toContain('WHATSAPP');
      expect(enabled).toContain('CALENDAR');
      expect(enabled).toContain('AI_ASSISTANT');
      expect(enabled).not.toContain('BILLING');
      expect(enabled.length).toBe(3);
    });
  });

  describe('useFeatureFlags React Hook Tests', () => {
    it('should return inactive/null states when unauthenticated or no flags configured', () => {
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

      render(<HookConsumer flagToCheck="WHATSAPP" />);

      expect(screen.getByTestId('flags-present').textContent).toBe('false');
      expect(screen.getByTestId('is-enabled').textContent).toBe('false');
    });

    it('should return correct results from active context', () => {
      vi.mocked(useTenantContext).mockReturnValue({
        tenant: { id: 'clinic-1' } as any,
        user: null,
        clinicConfig: null,
        featureFlags: {
          enableWhatsApp: true,
          enableBilling: false,
          enableReports: true,
        },
        loading: false,
        loaded: true,
        error: null,
        unauthenticated: false,
        refresh: async () => {},
      });

      render(
        <HookConsumer
          flagToCheck="WHATSAPP"
          listFlags={['WHATSAPP', 'REPORTS']}
        />
      );

      expect(screen.getByTestId('flags-present').textContent).toBe('true');
      expect(screen.getByTestId('is-enabled').textContent).toBe('true');
      expect(screen.getByTestId('is-any-enabled').textContent).toBe('true');
      expect(screen.getByTestId('is-all-enabled').textContent).toBe('true');
    });
  });

  describe('FeatureGate Component Tests', () => {
    it('should render children if single feature is enabled', () => {
      vi.mocked(useTenantContext).mockReturnValue({
        tenant: { id: 'clinic-1' } as any,
        user: null,
        clinicConfig: null,
        featureFlags: { enableWhatsApp: true },
        loading: false,
        loaded: true,
        error: null,
        unauthenticated: false,
        refresh: async () => {},
      });

      render(
        <FeatureGate feature="WHATSAPP">
          <div data-testid="gate-children">Feature Gate Content</div>
        </FeatureGate>
      );

      expect(screen.getByTestId('gate-children').textContent).toBe('Feature Gate Content');
    });

    it('should hide children and render fallback if feature is disabled', () => {
      vi.mocked(useTenantContext).mockReturnValue({
        tenant: { id: 'clinic-1' } as any,
        user: null,
        clinicConfig: null,
        featureFlags: { enableWhatsApp: false },
        loading: false,
        loaded: true,
        error: null,
        unauthenticated: false,
        refresh: async () => {},
      });

      render(
        <FeatureGate feature="WHATSAPP" fallback={<span data-testid="fallback-el">Unavailable</span>}>
          <div data-testid="gate-children">Feature Gate Content</div>
        </FeatureGate>
      );

      expect(screen.queryByTestId('gate-children')).toBeNull();
      expect(screen.getByTestId('fallback-el').textContent).toBe('Unavailable');
    });

    it('should correctly support dynamic multi-feature gates with anyRequired and allRequired', () => {
      vi.mocked(useTenantContext).mockReturnValue({
        tenant: { id: 'clinic-1' } as any,
        user: null,
        clinicConfig: null,
        featureFlags: {
          enableWhatsApp: true,
          enableBilling: false,
        },
        loading: false,
        loaded: true,
        error: null,
        unauthenticated: false,
        refresh: async () => {},
      });

      const { rerender } = render(
        <FeatureGate features={['WHATSAPP', 'BILLING']}>
          <div data-testid="gate-any">Rendered Any</div>
        </FeatureGate>
      );

      expect(screen.getByTestId('gate-any').textContent).toBe('Rendered Any');

      rerender(
        <FeatureGate features={['WHATSAPP', 'BILLING']} allRequired={true} fallback={<div data-testid="fallback-all">Lacks All</div>}>
          <div data-testid="gate-all">Rendered All</div>
        </FeatureGate>
      );

      expect(screen.queryByTestId('gate-all')).toBeNull();
      expect(screen.getByTestId('fallback-all').textContent).toBe('Lacks All');
    });
  });
});
