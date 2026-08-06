/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useCallback } from 'react';
import { useTenantContext } from '../auth/useTenantContext';
import { FeatureFlagService } from './FeatureFlagService';
import { FeatureFlag } from './FeatureFlag';
import { FeatureFlags } from '../services/metadata/types';

export interface UseFeatureFlagsResult {
  featureFlags: FeatureFlags | null;
  isEnabled: (flag: FeatureFlag) => boolean;
  isAnyEnabled: (flags: FeatureFlag[]) => boolean;
  isAllEnabled: (flags: FeatureFlag[]) => boolean;
}

/**
 * Hook to consume tenant feature flags.
 */
export const useFeatureFlags = (): UseFeatureFlagsResult => {
  const { featureFlags } = useTenantContext();

  const isEnabled = useCallback(
    (flag: FeatureFlag): boolean => {
      return FeatureFlagService.isEnabled(featureFlags, flag);
    },
    [featureFlags]
  );

  const isAnyEnabled = useCallback(
    (flags: FeatureFlag[]): boolean => {
      return FeatureFlagService.isAnyEnabled(featureFlags, flags);
    },
    [featureFlags]
  );

  const isAllEnabled = useCallback(
    (flags: FeatureFlag[]): boolean => {
      return FeatureFlagService.isAllEnabled(featureFlags, flags);
    },
    [featureFlags]
  );

  return {
    featureFlags,
    isEnabled,
    isAnyEnabled,
    isAllEnabled,
  };
};
