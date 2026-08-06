/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient } from '../../supabase/client';
import { logger } from '../metadata/logger';
import { ActiveFlowService } from './ActiveFlowService';

export class HandoverMarkerService {
  /**
   * Marks a conversation as requiring human staff handover
   */
  public static async markHandoverRequired(
    tenantId: string,
    conversationId: string,
    reasonCode: string,
    context: any = {}
  ): Promise<void> {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    try {
      // 1. Insert handover record
      await supabase.from('whatsapp_handovers').insert({
        id: `ho_${tenantId}_${conversationId}_${Date.now()}`,
        tenant_id: tenantId,
        conversation_id: conversationId,
        reason_code: reasonCode,
        sanitized_context: context,
        status: 'pending',
        created_at: now,
        updated_at: now,
      });

      // 2. Update conversation automation_mode to 'paused' / 'human_takeover' & is_handover_required = true
      await supabase
        .from('whatsapp_conversations')
        .update({
          automation_mode: 'human_takeover',
          is_handover_required: true,
          updated_at: now,
        })
        .eq('tenant_id', tenantId)
        .eq('id', conversationId);

      // 3. Pause active flow state
      await ActiveFlowService.terminateFlow(tenantId, conversationId, 'paused');

      logger.info('HandoverMarkerService', `Marked conversation ${conversationId} for human handover (reason: ${reasonCode})`);
    } catch (err) {
      logger.error('HandoverMarkerService', `Failed to set handover marker for conversation ${conversationId}`, err);
    }
  }

  /**
   * Clears handover required flag when staff resolves or resumes automation
   */
  public static async clearHandover(tenantId: string, conversationId: string): Promise<void> {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    try {
      await supabase
        .from('whatsapp_handovers')
        .update({ status: 'resolved', updated_at: now })
        .eq('tenant_id', tenantId)
        .eq('conversation_id', conversationId)
        .eq('status', 'pending');

      await supabase
        .from('whatsapp_conversations')
        .update({
          is_handover_required: false,
          updated_at: now,
        })
        .eq('tenant_id', tenantId)
        .eq('id', conversationId);

      logger.info('HandoverMarkerService', `Cleared handover marker for conversation ${conversationId}`);
    } catch (err) {
      logger.error('HandoverMarkerService', `Failed to clear handover marker for conversation ${conversationId}`, err);
    }
  }
}

