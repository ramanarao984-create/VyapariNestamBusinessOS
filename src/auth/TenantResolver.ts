/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { isSupabaseConfigured } from '../supabase/client';
import { isDemoModeEnabled } from './demoConfig';
import { Tenant, UserMetadata } from '../services/metadata/types';
import { TenantService } from '../services/metadata/TenantService';
import { UserService } from '../services/metadata/UserService';
import { AuditService } from '../services/metadata/AuditService';
import { TenantCache } from './TenantCache';
import { ResolvedTenantContext } from './TenantContext';
import { ValidationError, DatabaseError, MetadataServiceError } from '../services/metadata/errors';
import { logger } from '../services/metadata/logger';

export class TenantResolver {
  private static readonly CONTEXT = 'TenantResolver';

  /**
   * Resolves the full Tenant context for a given Firebase UID.
   * Performs validation, checks cache, resolves UserService & TenantService on miss,
   * fires a one-off LOGIN audit event on miss, and profiles the performance.
   */
  public static async resolve(firebaseUid: string, options?: { forceRefresh?: boolean }): Promise<ResolvedTenantContext> {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(2, 15);

    if (!firebaseUid || typeof firebaseUid !== 'string' || firebaseUid.trim() === '') {
      throw new ValidationError('A non-empty Firebase UID is required for tenant resolution.');
    }

    // 1. Check cache (unless forceRefresh is requested)
    if (!options?.forceRefresh) {
      const cachedContext = TenantCache.get(firebaseUid);
      if (cachedContext) {
        const durationMs = Date.now() - startTime;
        logger.info(this.CONTEXT, 'Tenant context resolved from cache', {
          requestId,
          firebaseUid,
          tenantId: cachedContext.tenant.id,
          cacheHit: true,
          durationMs,
        });
        return cachedContext;
      }
    }

    // 2. Cache miss: Fetch user and tenant from metadata services
    try {
      logger.info(this.CONTEXT, 'Cache miss. Resolving tenant metadata from database', {
        requestId,
        firebaseUid,
      });

      let userMetadata: UserMetadata;
      let tenant: Tenant;

      if (firebaseUid.startsWith('demo-')) {
        logger.info(this.CONTEXT, 'Demo mode active for demo UID. Utilizing fallback tenant context.', { firebaseUid });
        
        userMetadata = {
          id: firebaseUid,
          tenantId: 'demo-tenant-id',
          email: firebaseUid.includes('gmail') ? 'ramanarao984@gmail.com' : 'demo@nestam.com',
          role: 'Doctor',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        tenant = {
          id: 'demo-tenant-id',
          name: 'Demo Health Clinic',
          spreadsheetId: 'demo-spreadsheet-id',
          calendarId: 'demo-calendar-id',
          driveFolderId: 'demo-drive-folder-id',
          clinicConfig: {
            clinicName: 'Demo Health Clinic',
            timeZone: 'Asia/Kolkata',
          },
          featureFlags: {
            enableWhatsAppAutomation: true,
          },
          subscriptionStatus: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      } else {
        userMetadata = await UserService.getUserByFirebaseUid(firebaseUid);
        tenant = await TenantService.getTenantById(userMetadata.tenantId);
      }

      const resolvedContext: ResolvedTenantContext = {
        tenant,
        user: userMetadata,
        clinicConfig: tenant.clinicConfig || {},
        featureFlags: tenant.featureFlags || {},
      };

      // 3. Write to cache
      TenantCache.set(firebaseUid, resolvedContext);

      // 4. Log LOGIN event once per successful resolve (on cache miss)
      try {
        await AuditService.logEvent({
          tenantId: tenant.id,
          userId: firebaseUid,
          eventType: 'LOGIN',
          metadata: {
            requestId,
            resolvedAt: new Date().toISOString(),
          },
        });
      } catch (auditErr: any) {
        // Log auditing failure, but don't crash tenant resolution for the client
        logger.warn(this.CONTEXT, 'Failed to write LOGIN audit trail during resolution', {
          requestId,
          firebaseUid,
          tenantId: tenant.id,
          error: auditErr.message || auditErr,
        });
      }

      const durationMs = Date.now() - startTime;
      logger.info(this.CONTEXT, 'Tenant context resolved from database', {
        requestId,
        firebaseUid,
        tenantId: tenant.id,
        cacheHit: false,
        durationMs,
      });

      return resolvedContext;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      
      logger.error(this.CONTEXT, 'Resolution flow encountered a metadata failure', err, {
        requestId,
        firebaseUid,
        durationMs,
      });

      if (err instanceof MetadataServiceError) {
        throw err;
      }

      throw new DatabaseError(`Tenant resolution failed: ${err.message || err}`, err);
    }
  }

  /**
   * Helper to invalidate cache for a single UID.
   */
  public static invalidate(firebaseUid: string): void {
    if (!firebaseUid) return;
    logger.info(this.CONTEXT, 'Manual cache invalidation for user', { firebaseUid });
    TenantCache.invalidate(firebaseUid);
  }

  /**
   * Helper to invalidate cache for all users belonging to a tenant.
   */
  public static invalidateTenant(tenantId: string): void {
    if (!tenantId) return;
    logger.info(this.CONTEXT, 'Manual cache invalidation for tenant', { tenantId });
    TenantCache.invalidateTenant(tenantId);
  }
}
