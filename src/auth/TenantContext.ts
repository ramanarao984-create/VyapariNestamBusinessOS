/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tenant, UserMetadata, ClinicConfig, FeatureFlags } from '../services/metadata/types';

export interface ResolvedTenantContext {
  tenant: Tenant;
  user: UserMetadata;
  clinicConfig: ClinicConfig;
  featureFlags: FeatureFlags;
}
