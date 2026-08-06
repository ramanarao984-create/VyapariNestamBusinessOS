/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient } from '../../supabase/client';
import { logger } from '../metadata/logger';

export interface StaffNotificationRecord {
  id: string;
  tenant_id: string;
  recipient_user_id?: string | null;
  recipient_role?: string | null;
  notification_type: 'HANDOVER_REQUIRED' | 'ASSIGNED' | 'REASSIGNED' | 'SLA_WARNING' | 'SLA_BREACHED' | 'CUSTOMER_REPLIED' | 'REOPENED';
  conversation_id?: string | null;
  title: string;
  summary: string;
  deduplication_key: string;
  read_at?: string | null;
  created_at: string;
}

export class StaffNotificationService {
  /**
   * Creates a durable staff notification idempotently using deduplication_key
   */
  public static async createNotification(params: {
    tenantId: string;
    recipientUserId?: string | null;
    recipientRole?: string | null;
    notificationType: StaffNotificationRecord['notification_type'];
    conversationId?: string | null;
    title: string;
    summary: string;
    deduplicationKey: string;
  }): Promise<StaffNotificationRecord | null> {
    const { tenantId, recipientUserId, recipientRole, notificationType, conversationId, title, summary, deduplicationKey } = params;
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const notifId = `notif_${tenantId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Sanitize summary to ensure no raw secrets or unneeded patient details
    const sanitizedSummary = summary.substring(0, 500);

    const recordPayload = {
      id: notifId,
      tenant_id: tenantId,
      recipient_user_id: recipientUserId || null,
      recipient_role: recipientRole || null,
      notification_type: notificationType,
      conversation_id: conversationId || null,
      title,
      summary: sanitizedSummary,
      deduplication_key: deduplicationKey,
      created_at: now,
    };

    try {
      const { data, error } = await supabase
        .from('whatsapp_staff_notifications')
        .upsert(recordPayload, { onConflict: 'deduplication_key' })
        .select()
        .single();

      if (error) {
        logger.warn('StaffNotificationService', `Notification creation failed/conflict for key ${deduplicationKey}: ${error.message}`);
        return null;
      }

      logger.info('StaffNotificationService', `Created notification [${notificationType}] for tenant ${tenantId}`);
      return (data as StaffNotificationRecord) || recordPayload;
    } catch (err: any) {
      logger.error('StaffNotificationService', `Failed to create notification for key ${deduplicationKey}`, err);
      return null;
    }
  }

  /**
   * Lists notifications for a specific staff user & tenant
   */
  public static async getNotificationsForUser(tenantId: string, userId: string, role?: string): Promise<StaffNotificationRecord[]> {
    const supabase = getSupabaseClient();
    try {
      let query = supabase
        .from('whatsapp_staff_notifications')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (role) {
        query = query.or(`recipient_user_id.eq.${userId},recipient_role.eq.${role},recipient_user_id.is.null`);
      } else {
        query = query.or(`recipient_user_id.eq.${userId},recipient_user_id.is.null`);
      }

      const { data, error } = await query;
      if (error) {
        if (error.code === 'PGRST205' || error.code === '42P01') {
          logger.warn('StaffNotificationService', `Notification table 'whatsapp_staff_notifications' not ready in schema cache. Returning empty list.`);
        } else {
          logger.warn('StaffNotificationService', `Failed to fetch notifications for user ${userId}: ${error.message}`);
        }
        return [];
      }

      return (data as StaffNotificationRecord[]) || [];
    } catch (err) {
      logger.error('StaffNotificationService', `Database error fetching notifications`, err);
      return [];
    }
  }

  /**
   * Marks a notification as read
   */
  public static async markAsRead(tenantId: string, notificationId: string, userId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    try {
      const { error } = await supabase
        .from('whatsapp_staff_notifications')
        .update({ read_at: now })
        .eq('tenant_id', tenantId)
        .eq('id', notificationId);

      if (error) {
        logger.error('StaffNotificationService', `Failed to mark notification ${notificationId} as read`, error);
        return false;
      }

      return true;
    } catch (err) {
      logger.error('StaffNotificationService', `Failed to mark notification as read`, err);
      return false;
    }
  }
}
