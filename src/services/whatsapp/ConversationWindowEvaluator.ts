/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient } from '../../supabase/client';
import { logger } from '../metadata/logger';
import { ConsentService } from './ConsentService';

export const SERVICE_WINDOW_DURATION_MS = 24 * 60 * 60 * 1000; // 24 Hours = 86,400,000 ms

export type WindowOutcome =
  | 'WINDOW_OPEN'
  | 'TEMPLATE_REQUIRED'
  | 'TEMPLATE_NOT_APPROVED'
  | 'CONSENT_BLOCKED'
  | 'OUTBOUND_NOT_ALLOWED';

export interface WindowEvaluationResult {
  allowed: boolean;
  outcome: WindowOutcome;
  timeRemainingMs?: number;
  lastInboundAt?: string;
  windowExpiresAt?: string;
  reason?: string;
}

export class ConversationWindowEvaluator {
  /**
   * Records authoritative inbound timestamp & updates 24-hour customer service window
   */
  public static async recordInboundTimestamp(
    tenantId: string,
    conversationId: string,
    providerTimestampIso: string
  ): Promise<void> {
    const inboundTime = new Date(providerTimestampIso);
    const lastInboundMs = isNaN(inboundTime.getTime()) ? Date.now() : inboundTime.getTime();

    const expiresAt = new Date(lastInboundMs + SERVICE_WINDOW_DURATION_MS).toISOString();
    const lastInboundIso = new Date(lastInboundMs).toISOString();

    try {
      const supabase = getSupabaseClient();
      await supabase.from('whatsapp_conversation_windows').upsert({
        id: `window_${tenantId}_${conversationId}`,
        tenant_id: tenantId,
        conversation_id: conversationId,
        last_inbound_at: lastInboundIso,
        window_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,conversation_id' });

      logger.info('ConversationWindowEvaluator', `Updated 24h window for conversation ${conversationId}, expires at ${expiresAt}`);
    } catch (err) {
      logger.warn('ConversationWindowEvaluator', `Failed to persist 24h window for conversation ${conversationId}`, err);
    }
  }

  /**
   * Evaluates 24-hour customer service window & policy compliance for outbound messages
   */
  public static async evaluateOutboundPolicy(params: {
    tenantId: string;
    conversationId: string;
    recipientPhone: string;
    messageType: 'text' | 'template' | 'image' | 'document' | 'audio' | 'video' | 'interactive';
    templateName?: string;
    templateStatus?: string;
    nowMs?: number;
    lastInboundAtMs?: number;
    isOptOutConfirmation?: boolean;
  }): Promise<WindowEvaluationResult> {
    const { tenantId, conversationId, recipientPhone, messageType, templateName, templateStatus, nowMs = Date.now(), lastInboundAtMs, isOptOutConfirmation } = params;

    // 1. Check recipient consent status (except for transactional opt-out confirmation)
    const consent = await ConsentService.getConsentStatus(tenantId, recipientPhone);
    if (consent === 'opted_out' && !isOptOutConfirmation) {
      return {
        allowed: false,
        outcome: 'CONSENT_BLOCKED',
        reason: 'Recipient has explicitly opted out of WhatsApp communications (STOP).',
      };
    }

    // 2. Fetch last inbound window
    let windowExpiresAtMs = lastInboundAtMs ? lastInboundAtMs + SERVICE_WINDOW_DURATION_MS : 0;
    let lastInboundAtStr: string | undefined = lastInboundAtMs ? new Date(lastInboundAtMs).toISOString() : undefined;
    let windowExpiresAtStr: string | undefined = windowExpiresAtMs ? new Date(windowExpiresAtMs).toISOString() : undefined;

    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('whatsapp_conversation_windows')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('conversation_id', conversationId)
        .maybeSingle();

      if (data?.window_expires_at) {
        lastInboundAtStr = data.last_inbound_at;
        windowExpiresAtStr = data.window_expires_at;
        windowExpiresAtMs = new Date(data.window_expires_at).getTime();
      }
    } catch (err) {
      logger.warn('ConversationWindowEvaluator', `Window lookup fallback for conversation ${conversationId}`, err);
    }

    const timeRemainingMs = Math.max(0, windowExpiresAtMs - nowMs);
    const isWindowActive = windowExpiresAtMs > 0 && nowMs <= windowExpiresAtMs;

    // 3. Evaluate message type policy
    if (messageType === 'template') {
      if (templateStatus && templateStatus !== 'APPROVED') {
        return {
          allowed: false,
          outcome: 'TEMPLATE_NOT_APPROVED',
          reason: `Requested WhatsApp template '${templateName}' status is '${templateStatus}' (must be APPROVED).`,
        };
      }
      return {
        allowed: true,
        outcome: 'WINDOW_OPEN',
        timeRemainingMs,
        lastInboundAt: lastInboundAtStr,
        windowExpiresAt: windowExpiresAtStr,
      };
    }

    // Free-form messages (text, media, interactive) require active 24h window
    if (!isWindowActive) {
      return {
        allowed: false,
        outcome: 'TEMPLATE_REQUIRED',
        timeRemainingMs: 0,
        lastInboundAt: lastInboundAtStr,
        windowExpiresAt: windowExpiresAtStr,
        reason: '24-hour customer service window has expired. Free-form outbound messages are blocked by Meta policy. Must send an approved template.',
      };
    }

    return {
      allowed: true,
      outcome: 'WINDOW_OPEN',
      timeRemainingMs,
      lastInboundAt: lastInboundAtStr,
      windowExpiresAt: windowExpiresAtStr,
    };
  }
}
