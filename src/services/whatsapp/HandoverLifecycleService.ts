/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient } from '../../supabase/client';
import { logger } from '../metadata/logger';
import { StaffNotificationService } from './StaffNotificationService';
import { ActiveFlowService } from './ActiveFlowService';
import { SLAService } from './SLAService';

export type HandoverStatus =
  | 'REQUIRED'
  | 'UNASSIGNED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_CUSTOMER'
  | 'WAITING_FOR_STAFF'
  | 'RESOLVED'
  | 'REOPENED';

export interface HandoverRecord {
  id: string;
  tenant_id: string;
  conversation_id: string;
  reason_code: string;
  sanitized_context: any;
  status: HandoverStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  branch_id?: string | null;
  assigned_user_id?: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export class HandoverLifecycleService {
  /**
   * Allowed state transition map for strict lifecycle validation
   */
  private static ALLOWED_TRANSITIONS: Record<HandoverStatus, HandoverStatus[]> = {
    REQUIRED: ['UNASSIGNED', 'ASSIGNED', 'RESOLVED'],
    UNASSIGNED: ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED'],
    ASSIGNED: ['IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_STAFF', 'UNASSIGNED', 'RESOLVED'],
    IN_PROGRESS: ['WAITING_FOR_CUSTOMER', 'WAITING_FOR_STAFF', 'ASSIGNED', 'RESOLVED'],
    WAITING_FOR_CUSTOMER: ['IN_PROGRESS', 'WAITING_FOR_STAFF', 'RESOLVED'],
    WAITING_FOR_STAFF: ['IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED'],
    RESOLVED: ['REOPENED'],
    REOPENED: ['UNASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'],
  };

  /**
   * Validates if state transition is allowed
   */
  public static isValidTransition(currentStatus: HandoverStatus, targetStatus: HandoverStatus): boolean {
    if (currentStatus === targetStatus) return true;
    const allowed = this.ALLOWED_TRANSITIONS[currentStatus] || [];
    return allowed.includes(targetStatus);
  }

  /**
   * Triggers or creates a new human handover required record
   */
  public static async triggerHandover(params: {
    tenantId: string;
    conversationId: string;
    reasonCode: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    branchId?: string;
    context?: any;
  }): Promise<HandoverRecord> {
    const { tenantId, conversationId, reasonCode, priority = 'medium', branchId, context = {} } = params;
    const supabase = getSupabaseClient();
    const nowIso = new Date().toISOString();

    const handoverId = `ho_${tenantId}_${conversationId}_${Date.now()}`;

    const newHandover: HandoverRecord = {
      id: handoverId,
      tenant_id: tenantId,
      conversation_id: conversationId,
      reason_code: reasonCode,
      sanitized_context: context,
      status: 'REQUIRED',
      priority,
      branch_id: branchId || null,
      version: 1,
      created_at: nowIso,
      updated_at: nowIso,
    };

    try {
      const { data, error } = await supabase
        .from('whatsapp_handovers')
        .insert(newHandover)
        .select()
        .single();

      if (error) {
        logger.error('HandoverLifecycleService', `Failed to insert handover record`, error);
      }

      // Update conversation state: automation_mode = 'human_takeover' & is_handover_required = true
      await supabase
        .from('whatsapp_conversations')
        .update({
          automation_mode: 'human_takeover',
          is_handover_required: true,
          updated_at: nowIso,
        })
        .eq('tenant_id', tenantId)
        .eq('id', conversationId);

      // Terminate active flow
      await ActiveFlowService.terminateFlow(tenantId, conversationId, 'paused');

      // Start SLA tracking
      await SLAService.startSLA(tenantId, conversationId, 'acknowledgement');

      // Send durable staff notification
      await StaffNotificationService.createNotification({
        tenantId,
        recipientRole: 'Admin',
        notificationType: 'HANDOVER_REQUIRED',
        conversationId,
        title: `Handover Required (${priority.toUpperCase()})`,
        summary: `Customer conversation requires staff assistance (Reason: ${reasonCode}).`,
        deduplicationKey: `notif_ho_${tenantId}_${conversationId}_${reasonCode}`,
      });

      // Record audit history
      await this.recordStatusHistory(tenantId, conversationId, 'system', 'open', 'open', 'NONE', 'REQUIRED', 'ai_active', 'human_takeover', `Handover triggered: ${reasonCode}`);

      logger.info('HandoverLifecycleService', `Triggered handover for conversation ${conversationId}`);
      return (data as HandoverRecord) || newHandover;
    } catch (err: any) {
      logger.error('HandoverLifecycleService', `Error triggering handover`, err);
      return newHandover;
    }
  }

  /**
   * Claims or assigns a conversation to a staff member with concurrency control
   */
  public static async assignConversation(params: {
    tenantId: string;
    conversationId: string;
    actorUserId: string;
    targetUserId: string;
    branchId?: string;
    action: 'CLAIM' | 'ASSIGN' | 'REASSIGN' | 'UNASSIGN' | 'RELEASE';
    expectedVersion?: number;
  }): Promise<{ success: boolean; handover?: HandoverRecord; error?: string; errorCode?: string }> {
    const { tenantId, conversationId, actorUserId, targetUserId, branchId, action, expectedVersion } = params;
    const supabase = getSupabaseClient();
    const nowIso = new Date().toISOString();

    try {
      // 1. Fetch current active handover for conversation
      const { data: currentHo, error: hoErr } = await supabase
        .from('whatsapp_handovers')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (hoErr || !currentHo) {
        return { success: false, error: 'No active handover found for conversation.', errorCode: 'HANDOVER_NOT_FOUND' };
      }

      const activeHo = currentHo as HandoverRecord;

      // Optimistic concurrency check
      if (expectedVersion !== undefined && activeHo.version !== expectedVersion) {
        return {
          success: false,
          error: `Concurrency conflict: Handover record version changed (expected ${expectedVersion}, got ${activeHo.version}).`,
          errorCode: 'VERSION_CONFLICT',
        };
      }

      const newStatus: HandoverStatus = action === 'UNASSIGN' || action === 'RELEASE' ? 'UNASSIGNED' : 'ASSIGNED';
      const assignedUser = action === 'UNASSIGN' || action === 'RELEASE' ? null : targetUserId;

      if (!this.isValidTransition(activeHo.status, newStatus)) {
        return {
          success: false,
          error: `Invalid handover lifecycle transition from ${activeHo.status} to ${newStatus}.`,
          errorCode: 'INVALID_HANDOVER_TRANSITION',
        };
      }

      const nextVersion = activeHo.version + 1;

      // Update handover record
      const { data: updatedHo, error: updateErr } = await supabase
        .from('whatsapp_handovers')
        .update({
          status: newStatus,
          assigned_user_id: assignedUser,
          branch_id: branchId || activeHo.branch_id,
          version: nextVersion,
          updated_at: nowIso,
        })
        .eq('tenant_id', tenantId)
        .eq('id', activeHo.id)
        .eq('version', activeHo.version)
        .select()
        .single();

      if (updateErr || !updatedHo) {
        return {
          success: false,
          error: 'Concurrent update conflict while assigning conversation. Please refresh.',
          errorCode: 'VERSION_CONFLICT',
        };
      }

      // Update conversation table assigned_user_id
      await supabase
        .from('whatsapp_conversations')
        .update({
          assigned_user_id: assignedUser,
          updated_at: nowIso,
        })
        .eq('tenant_id', tenantId)
        .eq('id', conversationId);

      // Record assignment history entry
      await supabase.from('whatsapp_conversation_assignments').insert({
        id: `asgn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tenant_id: tenantId,
        conversation_id: conversationId,
        assigner_user_id: actorUserId,
        assigned_user_id: assignedUser,
        branch_id: branchId || null,
        action,
        created_at: nowIso,
      });

      // Send staff notification to newly assigned user
      if (assignedUser && action !== 'RELEASE') {
        await StaffNotificationService.createNotification({
          tenantId,
          recipientUserId: assignedUser,
          notificationType: action === 'REASSIGN' ? 'REASSIGNED' : 'ASSIGNED',
          conversationId,
          title: action === 'CLAIM' ? 'Conversation Claimed' : 'Conversation Assigned',
          summary: `You have been assigned to conversation ${conversationId}.`,
          deduplicationKey: `notif_asgn_${activeHo.id}_${assignedUser}_${nextVersion}`,
        });
      }

      // Acknowledge SLA on staff assignment/claim
      await SLAService.acknowledgeSLA(tenantId, conversationId, 'acknowledgement');

      // Record status audit event
      await this.recordStatusHistory(
        tenantId,
        conversationId,
        actorUserId,
        'open',
        'open',
        activeHo.status,
        newStatus,
        'human_takeover',
        'human_takeover',
        `Action: ${action} to user ${assignedUser || 'none'}`
      );

      return { success: true, handover: updatedHo as HandoverRecord };
    } catch (err: any) {
      logger.error('HandoverLifecycleService', `Error in assignConversation`, err);
      return { success: false, error: err.message || 'Database execution error during assignment.' };
    }
  }

  /**
   * Resolves a human handover session (CRITICAL: Resolution does NOT automatically resume automation)
   */
  public static async resolveHandover(params: {
    tenantId: string;
    conversationId: string;
    actorUserId: string;
    notes?: string;
  }): Promise<{ success: boolean; error?: string; errorCode?: string }> {
    const { tenantId, conversationId, actorUserId, notes } = params;
    const supabase = getSupabaseClient();
    const nowIso = new Date().toISOString();

    try {
      const { data: currentHo } = await supabase
        .from('whatsapp_handovers')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (currentHo) {
        await supabase
          .from('whatsapp_handovers')
          .update({
            status: 'RESOLVED',
            updated_at: nowIso,
          })
          .eq('tenant_id', tenantId)
          .eq('id', currentHo.id);
      }

      // Update conversation: is_handover_required = false, but automation_mode remains 'paused' or 'human_takeover'
      await supabase
        .from('whatsapp_conversations')
        .update({
          status: 'closed',
          is_handover_required: false,
          updated_at: nowIso,
        })
        .eq('tenant_id', tenantId)
        .eq('id', conversationId);

      // Complete resolution SLA
      await SLAService.acknowledgeSLA(tenantId, conversationId, 'resolution');

      // Record status audit history
      await this.recordStatusHistory(
        tenantId,
        conversationId,
        actorUserId,
        'open',
        'closed',
        currentHo?.status || 'ASSIGNED',
        'RESOLVED',
        'human_takeover',
        'human_takeover', // Automation is NOT resumed automatically!
        notes || 'Handover marked resolved by staff.'
      );

      return { success: true };
    } catch (err: any) {
      logger.error('HandoverLifecycleService', `Failed to resolve handover for ${conversationId}`, err);
      return { success: false, error: err.message || 'Database error resolving handover.' };
    }
  }

  /**
   * Reopens a resolved conversation (e.g., when a new inbound customer message arrives or staff reopens)
   */
  public static async reopenConversation(params: {
    tenantId: string;
    conversationId: string;
    actorUserId: string;
    reason: string;
  }): Promise<{ success: boolean; error?: string }> {
    const { tenantId, conversationId, actorUserId, reason } = params;
    const supabase = getSupabaseClient();
    const nowIso = new Date().toISOString();

    try {
      await supabase
        .from('whatsapp_conversations')
        .update({
          status: 'open',
          is_handover_required: true,
          updated_at: nowIso,
        })
        .eq('tenant_id', tenantId)
        .eq('id', conversationId);

      // Create a reopened handover record
      await supabase.from('whatsapp_handovers').insert({
        id: `ho_reopen_${tenantId}_${conversationId}_${Date.now()}`,
        tenant_id: tenantId,
        conversation_id: conversationId,
        reason_code: 'REOPENED',
        sanitized_context: { reason },
        status: 'REOPENED',
        priority: 'high',
        version: 1,
        created_at: nowIso,
        updated_at: nowIso,
      });

      // Send staff notification for reopened conversation
      await StaffNotificationService.createNotification({
        tenantId,
        recipientRole: 'Admin',
        notificationType: 'REOPENED',
        conversationId,
        title: 'Conversation Reopened',
        summary: `Conversation ${conversationId} has been reopened: ${reason}.`,
        deduplicationKey: `notif_reopen_${conversationId}_${Date.now()}`,
      });

      await this.recordStatusHistory(tenantId, conversationId, actorUserId, 'closed', 'open', 'RESOLVED', 'REOPENED', 'human_takeover', 'human_takeover', reason);

      return { success: true };
    } catch (err: any) {
      logger.error('HandoverLifecycleService', `Error reopening conversation ${conversationId}`, err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Records audit history entry for conversation status / handover changes
   */
  private static async recordStatusHistory(
    tenantId: string,
    conversationId: string,
    actorUserId: string,
    oldStatus?: string,
    newStatus?: string,
    oldHandoverStatus?: string,
    newHandoverStatus?: string,
    oldAutomationMode?: string,
    newAutomationMode?: string,
    reason?: string
  ): Promise<void> {
    const supabase = getSupabaseClient();
    try {
      await supabase.from('whatsapp_conversation_status_history').insert({
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tenant_id: tenantId,
        conversation_id: conversationId,
        actor_user_id: actorUserId,
        old_status: oldStatus || null,
        new_status: newStatus || null,
        old_handover_status: oldHandoverStatus || null,
        new_handover_status: newHandoverStatus || null,
        old_automation_mode: oldAutomationMode || null,
        new_automation_mode: newAutomationMode || null,
        reason: reason || null,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      logger.warn('HandoverLifecycleService', `Failed to write status history audit log`, err);
    }
  }
}
