/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient } from '../../supabase/client';
import { logger } from '../metadata/logger';
import { StaffNotificationService } from './StaffNotificationService';

export interface SLAPolicyRecord {
  id: string;
  tenant_id: string;
  first_response_target_mins: number;
  follow_up_target_mins: number;
  acknowledgement_target_mins: number;
  resolution_target_mins: number;
  business_hours: { enabled: boolean; start?: string; end?: string; days?: number[] };
  warning_threshold_pct: number;
  created_at: string;
  updated_at: string;
}

export interface SLAInstanceRecord {
  id: string;
  tenant_id: string;
  conversation_id: string;
  sla_type: 'first_response' | 'follow_up' | 'acknowledgement' | 'resolution';
  status: 'NOT_STARTED' | 'ACTIVE' | 'WARNING' | 'BREACHED' | 'PAUSED' | 'COMPLETED';
  start_time: string;
  due_time: string;
  warning_time: string;
  acknowledged_at?: string | null;
  completed_at?: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export class SLAService {
  /**
   * Retrieves or creates default SLA policy for tenant
   */
  public static async getPolicy(tenantId: string): Promise<SLAPolicyRecord> {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('whatsapp_sla_policies')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (data) return data as SLAPolicyRecord;

      const defaultPolicy: SLAPolicyRecord = {
        id: `sla_pol_${tenantId}`,
        tenant_id: tenantId,
        first_response_target_mins: 15,
        follow_up_target_mins: 60,
        acknowledgement_target_mins: 10,
        resolution_target_mins: 240,
        business_hours: { enabled: false },
        warning_threshold_pct: 80,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await supabase.from('whatsapp_sla_policies').upsert(defaultPolicy, { onConflict: 'tenant_id' });
      return defaultPolicy;
    } catch (err) {
      logger.warn('SLAService', `Failed to load policy for tenant ${tenantId}, using default`, err);
      return {
        id: `sla_pol_${tenantId}`,
        tenant_id: tenantId,
        first_response_target_mins: 15,
        follow_up_target_mins: 60,
        acknowledgement_target_mins: 10,
        resolution_target_mins: 240,
        business_hours: { enabled: false },
        warning_threshold_pct: 80,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Starts an SLA instance for a conversation (e.g. on handover creation)
   */
  public static async startSLA(
    tenantId: string,
    conversationId: string,
    slaType: 'first_response' | 'follow_up' | 'acknowledgement' | 'resolution'
  ): Promise<SLAInstanceRecord> {
    const policy = await this.getPolicy(tenantId);
    const supabase = getSupabaseClient();
    const now = new Date();
    const nowIso = now.toISOString();

    let targetMins = policy.acknowledgement_target_mins;
    if (slaType === 'first_response') targetMins = policy.first_response_target_mins;
    else if (slaType === 'follow_up') targetMins = policy.follow_up_target_mins;
    else if (slaType === 'resolution') targetMins = policy.resolution_target_mins;

    const targetMs = targetMins * 60 * 1000;
    const warningMs = targetMs * (policy.warning_threshold_pct / 100);

    const dueTimeIso = new Date(now.getTime() + targetMs).toISOString();
    const warningTimeIso = new Date(now.getTime() + warningMs).toISOString();

    const instanceId = `sla_inst_${tenantId}_${conversationId}_${slaType}`;

    const newInstance: SLAInstanceRecord = {
      id: instanceId,
      tenant_id: tenantId,
      conversation_id: conversationId,
      sla_type: slaType,
      status: 'ACTIVE',
      start_time: nowIso,
      due_time: dueTimeIso,
      warning_time: warningTimeIso,
      version: 1,
      created_at: nowIso,
      updated_at: nowIso,
    };

    try {
      const { data, error } = await supabase
        .from('whatsapp_sla_instances')
        .upsert(newInstance, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        logger.error('SLAService', `Failed to upsert SLA instance for ${conversationId}`, error);
      }

      return (data as SLAInstanceRecord) || newInstance;
    } catch (err) {
      logger.error('SLAService', `Error starting SLA for ${conversationId}`, err);
      return newInstance;
    }
  }

  /**
   * Acknowledges or completes an SLA instance
   */
  public static async acknowledgeSLA(tenantId: string, conversationId: string, slaType?: string): Promise<void> {
    const supabase = getSupabaseClient();
    const nowIso = new Date().toISOString();

    try {
      let query = supabase
        .from('whatsapp_sla_instances')
        .update({ status: 'COMPLETED', acknowledged_at: nowIso, completed_at: nowIso, updated_at: nowIso })
        .eq('tenant_id', tenantId)
        .eq('conversation_id', conversationId)
        .in('status', ['ACTIVE', 'WARNING']);

      if (slaType) {
        query = query.eq('sla_type', slaType);
      }

      await query;
    } catch (err) {
      logger.error('SLAService', `Failed to acknowledge SLA for conversation ${conversationId}`, err);
    }
  }

  /**
   * Evaluates active SLA instances and triggers warning/breach notifications idempotently
   */
  public static async checkSLABreaches(tenantId: string, conversationId: string): Promise<SLAInstanceRecord | null> {
    const supabase = getSupabaseClient();
    const nowMs = Date.now();

    try {
      const { data: instances } = await supabase
        .from('whatsapp_sla_instances')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('conversation_id', conversationId)
        .in('status', ['ACTIVE', 'WARNING']);

      if (!instances || instances.length === 0) return null;

      for (const instance of instances as SLAInstanceRecord[]) {
        const dueMs = new Date(instance.due_time).getTime();
        const warnMs = new Date(instance.warning_time).getTime();

        if (nowMs >= dueMs && instance.status !== 'BREACHED') {
          // SLA BREACHED
          await supabase
            .from('whatsapp_sla_instances')
            .update({ status: 'BREACHED', updated_at: new Date().toISOString() })
            .eq('id', instance.id);

          await StaffNotificationService.createNotification({
            tenantId,
            recipientRole: 'Admin',
            notificationType: 'SLA_BREACHED',
            conversationId,
            title: `SLA Breached: ${instance.sla_type}`,
            summary: `Conversation ${conversationId} breached ${instance.sla_type} SLA target.`,
            deduplicationKey: `sla_breached_${instance.id}`,
          });

          return { ...instance, status: 'BREACHED' };
        } else if (nowMs >= warnMs && instance.status === 'ACTIVE') {
          // SLA WARNING
          await supabase
            .from('whatsapp_sla_instances')
            .update({ status: 'WARNING', updated_at: new Date().toISOString() })
            .eq('id', instance.id);

          await StaffNotificationService.createNotification({
            tenantId,
            recipientRole: 'Admin',
            notificationType: 'SLA_WARNING',
            conversationId,
            title: `SLA Warning: ${instance.sla_type}`,
            summary: `Conversation ${conversationId} is nearing SLA deadline.`,
            deduplicationKey: `sla_warning_${instance.id}`,
          });

          return { ...instance, status: 'WARNING' };
        }
      }

      return instances[0] as SLAInstanceRecord;
    } catch (err) {
      logger.error('SLAService', `Error checking SLA breaches`, err);
      return null;
    }
  }
}
