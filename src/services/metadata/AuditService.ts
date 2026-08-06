/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient, isSupabaseConfigured } from '../../supabase/client';
import { AuditLog } from './types';
import { ValidationError, DatabaseError } from './errors';
import { logger } from './logger';

export class AuditService {
  private static readonly CONTEXT = 'AuditService';

  /**
   * Helper to map database rows to AuditLog interface
   */
  private static mapRow(row: any): AuditLog {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      eventType: row.event_type,
      metadata: row.metadata || {},
      createdAt: row.created_at,
    };
  }

  /**
   * Logs a security or lifecycle metadata event.
   */
  public static async logEvent(params: {
    tenantId: string | null;
    userId: string;
    eventType: 'LOGIN' | 'LOGOUT' | 'USER_CREATED' | 'ROLE_CHANGED' | 'CONFIG_UPDATED' | 'SUBSCRIPTION_UPDATED' | 'CLINIC_CREATED' | string;
    metadata?: Record<string, any>;
  }): Promise<AuditLog> {
    const { tenantId, userId, eventType, metadata = {} } = params;

    // Parameter Validations
    if (tenantId !== null && (typeof tenantId !== 'string' || tenantId.trim() === '')) {
      throw new ValidationError('Tenant ID must be null or a non-empty string.');
    }
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new ValidationError('User ID (UID or Email) is required for audit trails.');
    }
    if (!eventType || typeof eventType !== 'string' || eventType.trim() === '') {
      throw new ValidationError('An event type is required to index audit logs.');
    }
    if (metadata && (typeof metadata !== 'object' || Array.isArray(metadata))) {
      throw new ValidationError('Audit metadata must be a valid JSON-serializable object.');
    }

    if (!isSupabaseConfigured()) {
      logger.info(this.CONTEXT, 'Supabase not configured, bypassing audit log persistence', { tenantId, userId, eventType });
      return {
        id: Date.now(),
        tenantId,
        userId,
        eventType,
        metadata,
        createdAt: new Date().toISOString(),
      };
    }

    logger.info(this.CONTEXT, 'Recording metadata audit event', { tenantId, userId, eventType });

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          event_type: eventType,
          metadata,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return this.mapRow(data);
    } catch (err: any) {
      if (err instanceof ValidationError) {
        throw err;
      }
      logger.warn(this.CONTEXT, 'Database error recording audit log, returning fallback entry', { tenantId, eventType, message: err?.message || err });
      return {
        id: Date.now(),
        tenantId,
        userId,
        eventType,
        metadata,
        createdAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Fetches audit trail logs for a specific tenant clinic, ordered chronologically.
   */
  public static async getTenantAuditLogs(tenantId: string, limit = 100): Promise<AuditLog[]> {
    if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
      throw new ValidationError('Tenant ID is required to retrieve audit trails.');
    }

    if (!isSupabaseConfigured()) {
      logger.info(this.CONTEXT, 'Supabase not configured, returning empty audit logs list', { tenantId });
      return [];
    }

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return (data || []).map(row => this.mapRow(row));
    } catch (err: any) {
      if (err instanceof ValidationError) {
        throw err;
      }
      logger.error(this.CONTEXT, `Database error listing audit logs for tenant "${tenantId}"`, err);
      throw new DatabaseError(`Failed to fetch tenant audit logs: ${err.message || err}`, err);
    }
  }
}
