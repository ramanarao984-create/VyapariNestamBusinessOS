/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useState, useEffect, useMemo, useCallback, ReactNode, useRef } from 'react';
import { useAuth } from './AuthHooks';
import { TenantResolver } from './TenantResolver';
import { Tenant, UserMetadata, ClinicConfig, FeatureFlags } from '../services/metadata/types';

export interface TenantContextType {
  tenant: Tenant | null;
  user: UserMetadata | null;
  clinicConfig: ClinicConfig | null;
  featureFlags: FeatureFlags | null;
  loading: boolean;
  loaded: boolean;
  error: Error | null;
  unauthenticated: boolean;
  refresh: () => Promise<void>;
}

export const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const { user: firebaseUser, isLoggingIn: authLoading } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [userMetadata, setUserMetadata] = useState<UserMetadata | null>(null);

  // Keep a ref to the last resolved Firebase UID to avoid duplicate or redundant resolution requests
  const lastResolvedUid = useRef<string | null>(null);
  // Keep track of any active resolve operation to prevent overlapping parallel calls
  const resolvingUidRef = useRef<string | null>(null);

  const resolveTenant = useCallback(async (uid: string, force: boolean = false) => {
    if (!force && lastResolvedUid.current === uid) {
      return;
    }
    if (!force && resolvingUidRef.current === uid) {
      return;
    }

    resolvingUidRef.current = uid;
    setLoading(true);
    setError(null);

    try {
      const context = await TenantResolver.resolve(uid, { forceRefresh: force });
      setTenant(context.tenant);
      setUserMetadata(context.user);
      setLoaded(true);
      lastResolvedUid.current = uid;
    } catch (err: any) {
      const typedError = err instanceof Error ? err : new Error(String(err));
      setError(typedError);
      setTenant(null);
      setUserMetadata(null);
      setLoaded(false);
      lastResolvedUid.current = null;
    } finally {
      setLoading(false);
      resolvingUidRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      setLoaded(false);
      setError(null);
      return;
    }

    if (!firebaseUser) {
      setLoading(false);
      setLoaded(false);
      setError(null);
      setTenant(null);
      setUserMetadata(null);
      lastResolvedUid.current = null;
      resolvingUidRef.current = null;
      return;
    }

    resolveTenant(firebaseUser.uid);
  }, [firebaseUser, authLoading, resolveTenant]);

  const refresh = useCallback(async () => {
    if (!firebaseUser) {
      throw new Error('Cannot refresh tenant metadata: unauthenticated.');
    }
    await resolveTenant(firebaseUser.uid, true);
  }, [firebaseUser, resolveTenant]);

  const unauthenticated = useMemo(() => {
    return !authLoading && !firebaseUser;
  }, [authLoading, firebaseUser]);

  const contextValue = useMemo<TenantContextType>(() => {
    const isCurrentlyLoading = authLoading || loading;
    return {
      tenant,
      user: userMetadata,
      clinicConfig: tenant ? tenant.clinicConfig : null,
      featureFlags: tenant ? tenant.featureFlags : null,
      loading: isCurrentlyLoading,
      loaded: loaded && !isCurrentlyLoading,
      error,
      unauthenticated,
      refresh,
    };
  }, [tenant, userMetadata, authLoading, loading, loaded, error, unauthenticated, refresh]);

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
};
