/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ResolvedTenantContext } from './TenantContext';

interface CacheEntry {
  context: ResolvedTenantContext;
  expiresAt: number;
}

export class TenantCache {
  private static cache = new Map<string, CacheEntry>();

  /**
   * Resolves cached tenant context for a Firebase UID.
   * Discards and deletes expired entries automatically.
   */
  public static get(firebaseUid: string): ResolvedTenantContext | null {
    if (!firebaseUid) return null;

    const entry = this.cache.get(firebaseUid);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(firebaseUid);
      return null;
    }

    return entry.context;
  }

  /**
   * Caches tenant context for a Firebase UID with a specific TTL in milliseconds.
   */
  public static set(firebaseUid: string, context: ResolvedTenantContext, ttlMs: number = 5 * 60 * 1000): void {
    if (!firebaseUid) return;

    this.cache.set(firebaseUid, {
      context,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Invalidates a single Firebase UID cache entry.
   */
  public static invalidate(firebaseUid: string): void {
    if (!firebaseUid) return;
    this.cache.delete(firebaseUid);
  }

  /**
   * Invalidates all cache entries belonging to a specific tenant clinic.
   */
  public static invalidateTenant(tenantId: string): void {
    if (!tenantId) return;

    for (const [firebaseUid, entry] of this.cache.entries()) {
      if (entry.context.tenant.id === tenantId) {
        this.cache.delete(firebaseUid);
      }
    }
  }

  /**
   * Completely clears the cache. Primarily used for testing purposes.
   */
  public static clear(): void {
    this.cache.clear();
  }

  /**
   * Gets the current size of the cache. Primarily used for testing.
   */
  public static size(): number {
    return this.cache.size;
  }
}
