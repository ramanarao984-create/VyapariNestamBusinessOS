/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient } from '../../supabase/client';
import { InboundEventContract } from './NormalizedEventContracts';
import { RouteResult } from './DeterministicRoutingEngine';
import { logger } from '../metadata/logger';

export interface ActiveFlowRecord {
  id: string;
  tenant_id: string;
  conversation_id: string;
  active_flow_type: string;
  current_step: string;
  structured_context: any;
  version: number;
  status: 'active' | 'completed' | 'expired' | 'paused';
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export class ActiveFlowService {
  /**
   * Retrieves active flow state for a conversation
   */
  public static async getActiveFlow(tenantId: string, conversationId: string): Promise<ActiveFlowRecord | null> {
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('whatsapp_flow_states')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('conversation_id', conversationId)
        .eq('status', 'active')
        .maybeSingle();

      if (data) {
        if (new Date(data.expires_at).getTime() < Date.now()) {
          // Flow expired
          await this.terminateFlow(tenantId, conversationId, 'expired');
          return null;
        }
        return data as ActiveFlowRecord;
      }
    } catch (err) {
      logger.warn('ActiveFlowService', `Failed to fetch active flow for conversation ${conversationId}`, err);
    }
    return null;
  }

  /**
   * Starts a new flow for a conversation
   */
  public static async startFlow(
    tenantId: string,
    conversationId: string,
    flowType: string,
    initialStep: string,
    context: any = {},
    ttlMinutes: number = 60
  ): Promise<ActiveFlowRecord> {
    const supabase = getSupabaseClient();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString();

    const record: Partial<ActiveFlowRecord> = {
      id: `flow_${tenantId}_${conversationId}`,
      tenant_id: tenantId,
      conversation_id: conversationId,
      active_flow_type: flowType,
      current_step: initialStep,
      structured_context: context,
      version: 1,
      status: 'active',
      expires_at: expiresAt,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    try {
      const { data } = await supabase
        .from('whatsapp_flow_states')
        .upsert(record, { onConflict: 'tenant_id,conversation_id' })
        .select()
        .single();

      return (data as ActiveFlowRecord) || (record as ActiveFlowRecord);
    } catch (err) {
      logger.error('ActiveFlowService', `Failed to start flow for conversation ${conversationId}`, err);
      return record as ActiveFlowRecord;
    }
  }

  /**
   * Evaluates active flow transition
   */
  public static handleFlowTransition(activeFlow: ActiveFlowRecord, event: InboundEventContract): RouteResult | null {
    if (activeFlow.active_flow_type === 'faq_triage') {
      if (activeFlow.current_step === 'AWAITING_CATEGORY_CHOICE') {
        return {
          routeCategory: 'ACTIVE_FLOW',
          confidenceClass: 'HIGH',
          reasonCode: 'FLOW_TRIAGE_STEP_2',
          deterministicResponseText: 'Thank you for selecting a category. A specialist from that department will review your query shortly.',
          requiresHandover: true,
          flowStep: 'CATEGORY_SELECTED',
        };
      }
    }
    return null;
  }

  /**
   * Updates an existing active flow with optimistic version locking
   */
  public static async updateFlowStep(
    tenantId: string,
    conversationId: string,
    currentVersion: number,
    nextStep: string,
    nextContext: any = {}
  ): Promise<{ success: boolean; record?: ActiveFlowRecord }> {
    const supabase = getSupabaseClient();
    const nowIso = new Date().toISOString();

    try {
      const { data, error } = await supabase
        .from('whatsapp_flow_states')
        .update({
          current_step: nextStep,
          structured_context: nextContext,
          version: currentVersion + 1,
          updated_at: nowIso,
        })
        .eq('tenant_id', tenantId)
        .eq('conversation_id', conversationId)
        .eq('version', currentVersion)
        .select()
        .maybeSingle();

      if (error || !data) {
        logger.warn('ActiveFlowService', `Optimistic lock failure or record missing for conversation ${conversationId}, version ${currentVersion}`);
        return { success: false };
      }

      return { success: true, record: data as ActiveFlowRecord };
    } catch (err) {
      logger.error('ActiveFlowService', `Failed to update flow step for ${conversationId}`, err);
      return { success: false };
    }
  }

  /**
   * Terminates or completes an active flow
   */
  public static async terminateFlow(
    tenantId: string,
    conversationId: string,
    status: 'completed' | 'expired' | 'paused'
  ): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('whatsapp_flow_states')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('conversation_id', conversationId);
    } catch (err) {
      logger.warn('ActiveFlowService', `Failed to terminate flow for ${conversationId}`, err);
    }
  }
}
