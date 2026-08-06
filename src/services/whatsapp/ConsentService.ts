/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient } from '../../supabase/client';
import { logger } from '../metadata/logger';
import { ActiveFlowService } from './ActiveFlowService';
import { InMemoryWhatsAppRepository } from './InMemoryWhatsAppRepository';

export type ConsentStatus = 'opted_in' | 'opted_out';

const OPT_OUT_COMMANDS = new Set(['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']);
const OPT_IN_COMMANDS = new Set(['START']);

export class ConsentService {
  /**
   * Evaluates text for exact case-insensitive opt-out or opt-in command
   */
  public static evaluateConsentCommand(text?: string): 'OPT_OUT' | 'OPT_IN' | 'NEUTRAL' {
    if (!text) return 'NEUTRAL';
    const normalized = text.trim().replace(/^[^\w]+|[^\w]+$/g, '').toUpperCase();

    if (OPT_OUT_COMMANDS.has(normalized)) {
      return 'OPT_OUT';
    }

    if (OPT_IN_COMMANDS.has(normalized)) {
      return 'OPT_IN';
    }

    return 'NEUTRAL';
  }

  /**
   * Fetches current consent status for a tenant & contact
   */
  public static async getConsentStatus(tenantId: string, externalContactIdentifier: string): Promise<ConsentStatus> {
    const cleanPhone = externalContactIdentifier.replace(/[^0-9]/g, '');

    const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
    if (isTest) {
      const memConsent = InMemoryWhatsAppRepository.getConsent(tenantId, cleanPhone);
      if (memConsent) return memConsent;
    }

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('whatsapp_consents')
        .select('status')
        .eq('tenant_id', tenantId)
        .eq('external_contact_identifier', cleanPhone)
        .maybeSingle();

      if (error && !this.isSchemaError(error)) {
        logger.warn('ConsentService', `Error fetching consent for ${cleanPhone}`, error);
      }

      if (data?.status === 'opted_out') {
        return 'opted_out';
      }
    } catch (err) {
      logger.warn('ConsentService', `Database error checking consent for ${cleanPhone}`, err);
    }

    return 'opted_in';
  }

  /**
   * Updates consent status for tenant & contact, updating conversation state as needed
   */
  public static async updateConsent(
    tenantId: string,
    externalContactIdentifier: string,
    status: ConsentStatus,
    source: 'inbound_msg' | 'staff' | 'system' = 'inbound_msg',
    command?: string,
    conversationId?: string
  ): Promise<void> {
    const cleanPhone = externalContactIdentifier.replace(/[^0-9]/g, '');
    const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
    if (isTest) {
      InMemoryWhatsAppRepository.setConsent(tenantId, cleanPhone, status);
    }

    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    try {
      // 1. Upsert consent record
      await supabase.from('whatsapp_consents').upsert({
        id: `consent_${tenantId}_${cleanPhone}`,
        tenant_id: tenantId,
        external_contact_identifier: cleanPhone,
        status,
        source,
        last_command: command || null,
        updated_at: now,
      }, { onConflict: 'tenant_id,external_contact_identifier' });

      // 2. Update conversation automation_mode and consent_status
      const convUpdate: any = {
        consent_status: status,
        updated_at: now,
      };

      if (status === 'opted_out') {
        convUpdate.automation_mode = 'paused';
        convUpdate.is_handover_required = true;
      } else if (status === 'opted_in') {
        // Explicit policy requirement: opting in updates consent but does NOT automatically set automation_mode = 'ai_active'.
        // ControlledResumeService is the exclusive path for resuming AI automation.
        convUpdate.is_handover_required = false;
      }

      await supabase
        .from('whatsapp_conversations')
        .update(convUpdate)
        .eq('tenant_id', tenantId)
        .eq('external_contact_identifier', cleanPhone);

      // 3. If opted out and conversation ID provided, terminate any active flow
      if (status === 'opted_out' && conversationId) {
        await ActiveFlowService.terminateFlow(tenantId, conversationId, 'paused');
      }

      logger.info('ConsentService', `Updated consent for ${cleanPhone} to ${status} (tenant: ${tenantId})`);
    } catch (err) {
      logger.error('ConsentService', `Failed to update consent for ${cleanPhone}`, err);
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

