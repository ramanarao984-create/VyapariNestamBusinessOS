/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useFeatureFlags } from './useFeatureFlags';
import { FeatureFlag } from './FeatureFlag';

export interface FeatureGateProps {
  feature?: FeatureFlag;
  features?: FeatureFlag[];
  allRequired?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * FeatureGate wraps child elements and only renders them if the tenant has the
 * required feature flag(s) enabled.
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  features,
  allRequired = false,
  fallback = null,
  children,
}) => {
  const { isEnabled, isAnyEnabled, isAllEnabled } = useFeatureFlags();

  let isAuthorized = true;

  if (feature) {
    isAuthorized = isEnabled(feature);
  } else if (features && features.length > 0) {
    if (allRequired) {
      isAuthorized = isAllEnabled(features);
    } else {
      isAuthorized = isAnyEnabled(features);
    }
  }

  if (!isAuthorized) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
