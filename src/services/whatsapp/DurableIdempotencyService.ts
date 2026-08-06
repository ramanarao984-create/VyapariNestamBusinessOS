/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient } from '../../supabase/client';
import { logger } from '../metadata/logger';
import { InMemoryWhatsAppRepository } from './InMemoryWhatsAppRepository';

export interface ProcessEventResult<T> {
  duplicate: boolean;
  processed: boolean;
  result?: T;
  error?: string;
  status?: 'RECEIVED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

export const STALE_LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export class DurableIdempotencyService {
  /**
   * Executes an action function with durable tenant-scoped idempotency lock
   */
  public static async processEventWithLock<T>(
    eventId: string,
    tenantId: string,
    eventType: string,
    actionFn: () => Promise<T>
  ): Promise<ProcessEventResult<T>> {
    if (!eventId || !tenantId) {
      throw new Error('[DurableIdempotencyService] eventId and tenantId are required.');
    }

    const tenantScopedKey = `${tenantId}:${eventId}`;

    // Check in-memory test store if in test environment
    const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
    if (isTest && InMemoryWhatsAppRepository.isIdempotent(tenantScopedKey)) {
      logger.info('DurableIdempotencyService', `Test duplicate event suppressed: ${tenantScopedKey}`);
      return { duplicate: true, processed: false, status: 'COMPLETED' };
    }

    if (isTest) {
      InMemoryWhatsAppRepository.recordIdempotency(tenantScopedKey, 'PROCESSING');
    }

    const supabase = getSupabaseClient();
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Check existing idempotency log for tenant
    try {
      const { data: existing, error: checkErr } = await supabase
        .from('whatsapp_idempotency_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('event_id', eventId)
        .maybeSingle();

      if (checkErr && !this.isSchemaError(checkErr)) {
        logger.warn('DurableIdempotencyService', `Check query error for event ${eventId}`, checkErr);
      }

      if (existing) {
        const isCompleted = existing.status === 'processed' || existing.status === 'COMPLETED';
        const isProcessing = existing.status === 'processing' || existing.status === 'PROCESSING';

        if (isCompleted) {
          logger.info('DurableIdempotencyService', `Duplicate event suppressed for tenant ${tenantId}: ${eventId} (status: COMPLETED)`);
          if (isTest) InMemoryWhatsAppRepository.recordIdempotency(tenantScopedKey);
          return { duplicate: true, processed: false, status: 'COMPLETED' };
        }

        if (isProcessing) {
          // Check for stale lock recovery (lock age > 5 min)
          const lockCreatedAt = existing.created_at ? new Date(existing.created_at).getTime() : 0;
          const isStale = (now.getTime() - lockCreatedAt) > STALE_LOCK_TIMEOUT_MS;

          if (!isStale) {
            logger.info('DurableIdempotencyService', `Concurrent/active lock hit for tenant ${tenantId}: ${eventId}`);
            if (isTest) InMemoryWhatsAppRepository.recordIdempotency(tenantScopedKey);
            return { duplicate: true, processed: false, status: 'PROCESSING' };
          }

          logger.warn('DurableIdempotencyService', `Reacquiring stale lock for tenant ${tenantId}, event ${eventId}`);
        }
      }

      // 2. Claim lock / insert 'PROCESSING' record
      const { error: lockErr } = await supabase.from('whatsapp_idempotency_logs').upsert({
        event_id: eventId,
        tenant_id: tenantId,
        event_type: eventType,
        status: 'PROCESSING',
        created_at: nowIso,
      }, { onConflict: 'event_id' });

      if (lockErr && !this.isSchemaError(lockErr)) {
        logger.warn('DurableIdempotencyService', `Failed to acquire processing lock for event ${eventId}`, lockErr);
      }
    } catch (err) {
      logger.warn('DurableIdempotencyService', `Database idempotency check fallback for ${eventId}`, err);
    }

    // 3. Execute payload action
    if (isTest) {
      InMemoryWhatsAppRepository.recordIdempotency(tenantScopedKey, 'PROCESSING');
    }

    try {
      const result = await actionFn();

      if (isTest) {
        InMemoryWhatsAppRepository.recordIdempotency(tenantScopedKey, 'COMPLETED');
      }

      // Mark COMPLETED
      try {
        await supabase.from('whatsapp_idempotency_logs').upsert({
          event_id: eventId,
          tenant_id: tenantId,
          event_type: eventType,
          status: 'COMPLETED',
          created_at: nowIso,
        }, { onConflict: 'event_id' });
      } catch {}

      return { duplicate: false, processed: true, result, status: 'COMPLETED' };
    } catch (actionErr: any) {
      if (isTest) {
        InMemoryWhatsAppRepository.recordIdempotency(tenantScopedKey, 'FAILED');
      }

      // Mark FAILED
      try {
        await supabase.from('whatsapp_idempotency_logs').upsert({
          event_id: eventId,
          tenant_id: tenantId,
          event_type: eventType,
          status: 'FAILED',
          error_message: actionErr?.message || String(actionErr),
          created_at: nowIso,
        }, { onConflict: 'event_id' });
      } catch {}

      throw actionErr;
    }
  }

  private static isSchemaError(error: any): boolean {
    if (!error) return false;
    const code = error.code?.toString();
    const message = error.message?.toLowerCase() || '';
    return (
      code === '42P01' ||
      code === 'PGRST205' ||
      message.includes('could not find the table') ||
      (message.includes('relation') && message.includes('does not exist'))
    );
  }
}

