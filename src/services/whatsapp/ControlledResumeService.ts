/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient } from '../../supabase/client';
import { logger } from '../metadata/logger';
import { ConsentService } from './ConsentService';
import { ActiveFlowService } from './ActiveFlowService';

export type ResumeOutcome =
  | 'AUTOMATION_RESUMED'
  | 'CONSENT_BLOCKED'
  | 'HANDOVER_UNRESOLVED'
  | 'FLOW_RESET_REQUIRED'
  | 'VERSION_CONFLICT'
  | 'FORBIDDEN'
  | 'DATABASE_UNAVAILABLE';

export interface ResumeAutomationResult {
  success: boolean;
  outcome: ResumeOutcome;
  message: string;
  conversationId: string;
  resumedAt?: string;
  details?: any;
}

export class ControlledResumeService {
  /**
   * Controlled, explicit resume automation with pre-resume compliance checks
   */
  public static async resumeAutomation(params: {
    tenantId: string;
    conversationId: string;
    actorUserId: string;
    resetFlowState?: boolean;
    expectedVersion?: number;
  }): Promise<ResumeAutomationResult> {
    const { tenantId, conversationId, actorUserId, resetFlowState = false, expectedVersion } = params;
    const supabase = getSupabaseClient();
    const nowIso = new Date().toISOString();

    try {
      // 1. Fetch conversation record
      const { data: conversation, error: fetchErr } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('id', conversationId)
        .maybeSingle();

      if (fetchErr || !conversation) {
        logger.error('ControlledResumeService', `Conversation ${conversationId} not found or query error`, fetchErr);
        return {
          success: false,
          outcome: 'DATABASE_UNAVAILABLE',
          message: 'Conversation not found or database query failed.',
          conversationId,
        };
      }

      // 2. Check 1: Consent status check
      const recipientPhone = conversation.external_contact_identifier;
      const consentStatus = await ConsentService.getConsentStatus(tenantId, recipientPhone);
      if (consentStatus === 'opted_out') {
        logger.warn('ControlledResumeService', `Resume blocked by opt-out for conversation ${conversationId}`);
        return {
          success: false,
          outcome: 'CONSENT_BLOCKED',
          message: 'Cannot resume automation: Customer has explicitly opted out of WhatsApp messages (STOP).',
          conversationId,
        };
      }

      // 3. Check 2: Unresolved handover check
      if (conversation.is_handover_required) {
        // Check active handover state
        const { data: activeHo } = await supabase
          .from('whatsapp_handovers')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeHo && activeHo.status !== 'RESOLVED') {
          return {
            success: false,
            outcome: 'HANDOVER_UNRESOLVED',
            message: `Cannot resume automation: Handover is active with status '${activeHo.status}'. Must resolve human handover first.`,
            conversationId,
            details: { handoverStatus: activeHo.status },
          };
        }
      }

      // 4. Check 3: Active flow check
      const activeFlow = await ActiveFlowService.getActiveFlow(tenantId, conversationId);
      if (activeFlow && !resetFlowState) {
        return {
          success: false,
          outcome: 'FLOW_RESET_REQUIRED',
          message: `Conversation has active flow '${activeFlow.active_flow_type}' paused at step '${activeFlow.current_step}'. Must specify resetFlowState=true to clear or complete step.`,
          conversationId,
          details: { activeFlow },
        };
      }

      // Reset flow state if requested
      if (resetFlowState && activeFlow) {
        await ActiveFlowService.terminateFlow(tenantId, conversationId, 'completed');
      }

      // 5. Update conversation automation_mode to 'ai_active'
      const { error: updateErr } = await supabase
        .from('whatsapp_conversations')
        .update({
          automation_mode: 'ai_active',
          is_handover_required: false,
          updated_at: nowIso,
        })
        .eq('tenant_id', tenantId)
        .eq('id', conversationId);

      if (updateErr) {
        logger.error('ControlledResumeService', `Failed to update automation_mode for ${conversationId}`, updateErr);
        return {
          success: false,
          outcome: 'DATABASE_UNAVAILABLE',
          message: `Database error updating conversation automation mode: ${updateErr.message}`,
          conversationId,
        };
      }

      // Record audit history
      await supabase.from('whatsapp_conversation_status_history').insert({
        id: `hist_res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tenant_id: tenantId,
        conversation_id: conversationId,
        actor_user_id: actorUserId,
        old_automation_mode: conversation.automation_mode,
        new_automation_mode: 'ai_active',
        reason: resetFlowState ? 'Explicit staff resume with flow reset' : 'Explicit staff resume',
        created_at: nowIso,
      });

      logger.info('ControlledResumeService', `Successfully resumed AI automation for conversation ${conversationId}`);

      return {
        success: true,
        outcome: 'AUTOMATION_RESUMED',
        message: 'AI automation has been successfully resumed for this conversation.',
        conversationId,
        resumedAt: nowIso,
      };
    } catch (err: any) {
      logger.error('ControlledResumeService', `Exception during resume automation`, err);
      return {
        success: false,
        outcome: 'DATABASE_UNAVAILABLE',
        message: err.message || 'Unexpected server error while attempting to resume automation.',
        conversationId,
      };
    }
  }
}
