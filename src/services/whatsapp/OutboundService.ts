/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WhatsAppConnectionService } from './WhatsAppConnectionService';
import { ConversationService, MessageRecord } from './ConversationService';
import { ConversationWindowEvaluator } from './ConversationWindowEvaluator';
import { CostMeteringService } from './CostMeteringService';
import { getMetaGraphUrl, WHATSAPP_CONFIG } from './config';
import { logger } from '../metadata/logger';
import { getSupabaseClient } from '../../supabase/client';
import { OutboundValidationError, validateOutboundRequest } from '../../../api/whatsapp/outboundValidation';

export interface SendMessageOptions {
  tenantId: string;
  recipientPhone: string;
  messageType?: 'text' | 'template' | 'image' | 'document' | 'audio' | 'video' | 'interactive';
  textBody?: string;
  templateName?: string;
  templateLanguage?: string;
  templateComponents?: any[];
  mediaUrl?: string;
  source?: 'human' | 'ai' | 'template' | 'automation';
  conversationId?: string;
  contactName?: string;
  isOptOutConfirmation?: boolean;
}

export interface SendMessageResult {
  success: boolean;
  metaMessageId?: string;
  messageRecord?: MessageRecord;
  error?: string;
  errorCode?: string;
  details?: any;
}

export class OutboundService {
  /**
   * Enqueues an outbound job durably in whatsapp_outbound_jobs with tenant-scoped idempotency key
   */
  public static async enqueueOutboundJob(
    tenantId: string,
    idempotencyKey: string,
    recipientPhone: string,
    payload: SendMessageOptions
  ): Promise<{ jobId: string; status: 'queued' | 'already_processed' }> {
    const supabase = getSupabaseClient();
    const jobId = `job_${tenantId}_${idempotencyKey}`;
    const nowIso = new Date().toISOString();

    try {
      const { data: existing } = await supabase
        .from('whatsapp_outbound_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'completed') {
          return { jobId, status: 'already_processed' };
        }
      }

      await supabase.from('whatsapp_outbound_jobs').upsert({
        id: jobId,
        tenant_id: tenantId,
        recipient: recipientPhone,
        payload,
        status: 'pending',
        attempts: 0,
        created_at: nowIso,
        updated_at: nowIso,
      }, { onConflict: 'id' });

      return { jobId, status: 'queued' };
    } catch (err) {
      logger.warn('OutboundService', `Enqueue job database check fallback for ${jobId}`, err);
      return { jobId, status: 'queued' };
    }
  }

  /**
   * Classifies Meta API errors into retryable vs permanent
   */
  private static isRetryableError(status: number, errorCode?: number): boolean {
    // 5xx Server Errors or network drop
    if (status >= 500) return true;
    // Meta Rate Limit / Transient Errors: 1, 2, 130429 (Rate limit), 131016 (Service unavailable)
    if (errorCode && [1, 2, 4, 17, 341, 130429, 131016].includes(errorCode)) return true;
    return false;
  }

  /**
   * Main server-side outbound message dispatch with retry logic & token decryption
   */
  public static async sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    let {
      tenantId,
      recipientPhone,
      messageType = 'text',
      textBody = '',
      templateName,
      templateLanguage = 'en_US',
      templateComponents = [],
      mediaUrl,
      source = 'human',
      conversationId: providedConvId,
      contactName,
    } = options;

    if (!tenantId || !recipientPhone) {
      return { success: false, error: 'tenantId and recipientPhone are required.', errorCode: 'INVALID_RECIPIENT' };
    }

    try {
      const validated = validateOutboundRequest({
        recipient: recipientPhone,
        message: textBody,
        messageType,
        templateName,
        templateLanguage,
        templateComponents,
        mediaUrl,
        conversationId: providedConvId,
      });
      recipientPhone = validated.recipient;
      textBody = validated.message;
      messageType = validated.messageType;
      templateName = validated.templateName;
      templateLanguage = validated.templateLanguage || 'en_US';
      templateComponents = validated.templateComponents || [];
      mediaUrl = validated.mediaUrl;
      providedConvId = validated.conversationId;
    } catch (error: any) {
      if (error instanceof OutboundValidationError) {
        return { success: false, error: error.message, errorCode: error.code };
      }
      return { success: false, error: 'Outbound message validation failed.', errorCode: 'INVALID_OUTBOUND_REQUEST' };
    }

    const cleanPhone = recipientPhone;

    // 1. Resolve or ensure conversation
    let conversation: { id: string };
    try {
      if (providedConvId) {
        const { data, error } = await getSupabaseClient()
          .from('whatsapp_conversations')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('id', providedConvId)
          .maybeSingle();

        if (error) {
          logger.error('OutboundService', 'Conversation ownership lookup failed.', error, { tenantId });
          return { success: false, error: 'Message context could not be verified.', errorCode: 'CONVERSATION_CONTEXT_UNAVAILABLE' };
        }
        if (!data) {
          return { success: false, error: 'The selected conversation is not part of this workspace.', errorCode: 'INVALID_CONVERSATION_CONTEXT' };
        }
        conversation = { id: data.id };
      } else {
        conversation = await ConversationService.ensureConversation(tenantId, cleanPhone, contactName || 'New Lead');
      }
    } catch (convErr: any) {
      logger.error('OutboundService', 'Failed to ensure outbound conversation.', convErr, { tenantId });
      return { success: false, error: 'Failed to prepare message delivery.', errorCode: 'CONVERSATION_CONTEXT_UNAVAILABLE' };
    }

    // 2. Evaluate outbound policy (24-hour service window & consent)
    const policyEval = await ConversationWindowEvaluator.evaluateOutboundPolicy({
      tenantId,
      conversationId: conversation.id,
      recipientPhone: cleanPhone,
      messageType,
      templateName,
      isOptOutConfirmation: options.isOptOutConfirmation,
    });

    if (!policyEval.allowed) {
      logger.warn('OutboundService', `Outbound message blocked by policy: ${policyEval.outcome} (${policyEval.reason})`);
      return {
        success: false,
        error: policyEval.reason || `Outbound message blocked by policy: ${policyEval.outcome}`,
        errorCode: policyEval.outcome,
      };
    }

    // 3. Get decrypted access token on trusted backend
    const connection = await WhatsAppConnectionService.getConnectionByTenantId(tenantId);
    if (!connection) {
      return { success: false, error: 'No WhatsApp connection found for this tenant.', errorCode: 'CONNECTION_NOT_ACTIVE' };
    }
    if (connection.connection_status !== 'connected') {
      return { success: false, error: 'No active WhatsApp connection is available for this workspace.', errorCode: 'CONNECTION_NOT_ACTIVE' };
    }

    const token = await WhatsAppConnectionService.getDecryptedAccessToken(tenantId);
    if (!token) {
      return { success: false, error: 'No active WhatsApp credential is available for this workspace.', errorCode: 'CONNECTION_NOT_ACTIVE' };
    }

    // 3. Construct Meta Graph API payload
    const graphUrl = getMetaGraphUrl(`${connection.phone_number_id}/messages`);
    let payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: messageType,
    };

    if (messageType === 'text') {
      payload.text = { preview_url: false, body: textBody };
    } else if (messageType === 'template' && templateName) {
      payload.template = {
        name: templateName,
        language: { code: templateLanguage },
        components: templateComponents,
      };
    } else if (['image', 'document', 'audio', 'video'].includes(messageType) && mediaUrl) {
      payload[messageType] = { link: mediaUrl, caption: textBody || undefined };
    } else {
      payload.text = { preview_url: false, body: textBody };
    }

    let attempt = 0;
    let lastErrorMsg = '';
    let lastErrorCode = '';
    let responseData: any = null;

    // 4. Retry loop with exponential backoff & jitter
    while (attempt < WHATSAPP_CONFIG.MAX_RETRIES) {
      attempt++;
      try {
        logger.info('OutboundService', `Dispatching ${messageType} to ${cleanPhone} (tenant: ${tenantId}, attempt ${attempt}/${WHATSAPP_CONFIG.MAX_RETRIES})`);

        const res = await fetch(graphUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        responseData = await res.json();

        if (res.ok && responseData.messages?.[0]?.id) {
          const metaMessageId = responseData.messages[0].id;
          logger.info('OutboundService', `Successfully dispatched message ${metaMessageId} to ${cleanPhone}`);

          // Save outbound message record to persistent storage
          const msgRecord = await ConversationService.saveOutboundMessage({
            tenantId,
            conversationId: conversation.id,
            metaMessageId,
            body: textBody || (templateName ? `[Template: ${templateName}]` : '[Media Message]'),
            messageType,
            templateName,
            source,
            status: 'sent',
          });

          // Meter usage
          const eventCat = messageType === 'template' ? 'outbound_template' : 'outbound_freeform';
          await CostMeteringService.trackUsage(tenantId, eventCat, messageType);

          return {
            success: true,
            metaMessageId,
            messageRecord: msgRecord,
          };
        }

        // Handle Graph API error response
        const errObj = responseData.error || {};
        lastErrorMsg = errObj.message || `Meta Graph API returned HTTP ${res.status}`;
        lastErrorCode = errObj.code?.toString() || res.status.toString();

        // Check if token revoked or expired (e.g. Error code 190)
        if (errObj.code === 190 || res.status === 401) {
          logger.error('OutboundService', `Meta access token expired or revoked for tenant ${tenantId}. Marking connection expired.`);
          await WhatsAppConnectionService.disconnectConnection(tenantId);
          break; // Do not retry invalid/expired auth tokens
        }

        if (!this.isRetryableError(res.status, errObj.code)) {
          logger.warn('OutboundService', `Permanent error returned from Meta (code: ${lastErrorCode}): ${lastErrorMsg}`);
          break; // Do not retry permanent errors (e.g. invalid recipient, bad template format)
        }
      } catch (netErr: any) {
        lastErrorMsg = netErr.message || 'Network exception connecting to Meta Graph API';
        logger.warn('OutboundService', `Network attempt ${attempt} failed: ${lastErrorMsg}`);
      }

      // Exponential backoff delay before next attempt
      if (attempt < WHATSAPP_CONFIG.MAX_RETRIES) {
        const backoffMs = WHATSAPP_CONFIG.RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 200;
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }

    // Save failed message record for auditing
    const failedMsgRecord = await ConversationService.saveOutboundMessage({
      tenantId,
      conversationId: conversation.id,
      body: textBody || `[Failed send attempt]`,
      messageType,
      templateName,
      source,
      status: 'failed',
      errorCode: lastErrorCode,
      errorDetails: responseData,
    });

    return {
      success: false,
      error: lastErrorMsg,
      errorCode: lastErrorCode,
      messageRecord: failedMsgRecord,
      details: undefined,
    };
  }
}
