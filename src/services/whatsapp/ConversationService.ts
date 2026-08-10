/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient } from '../../supabase/client';
import { logger } from '../metadata/logger';
import { ParsedInboundMessage, ParsedStatusUpdate } from './WebhookService';

export interface ConversationRecord {
  id: string;
  tenant_id: string;
  whatsapp_connection_id?: string | null;
  contact_id?: string | null;
  external_contact_identifier: string;
  contact_name: string;
  status: 'open' | 'closed' | 'archived';
  assigned_user_id?: string | null;
  automation_mode: 'ai_active' | 'paused' | 'human_takeover';
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRecord {
  id: string;
  tenant_id: string;
  conversation_id: string;
  whatsapp_connection_id?: string | null;
  meta_message_id?: string | null;
  direction: 'inbound' | 'outbound';
  message_type: string;
  body?: string | null;
  media_url?: string | null;
  media_mime_type?: string | null;
  reply_to_message_id?: string | null;
  template_name?: string | null;
  status: 'received' | 'sent' | 'delivered' | 'read' | 'failed';
  source: 'human' | 'ai' | 'template' | 'automation' | 'webhook';
  error_code?: string | null;
  error_details?: any;
  provider_timestamp?: string | null;
  created_at: string;
  updated_at: string;
}

export class ConversationService {
  /**
   * Helper to identify missing database schema or stale schema cache
   */
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

  /**
   * Extract target table name for sanitized structured logging
   */
  private static extractTableName(context: string, message: string): string {
    if (context.includes('Conversation') || context.includes('conv')) return 'whatsapp_conversations';
    if (context.includes('Message') || context.includes('msg')) return 'whatsapp_messages';
    if (context.includes('Idempotency') || context.includes('idem')) return 'whatsapp_idempotency_logs';
    if (context.includes('Connection')) return 'whatsapp_connections';
    if (context.includes('Template')) return 'whatsapp_templates';
    
    const match = message.match(/table ['"]?public\.([a-z0-9_]+)['"]?/i) || message.match(/relation ['"]?([a-z0-9_]+)['"]?/i);
    return match ? match[1] : 'whatsapp_conversations';
  }

  /**
   * Throws a controlled domain error if the database schema is missing or query fails
   */
  private static handleDatabaseError(error: any, context: string, requestId?: string): never {
    const message = error?.message || String(error);
    const tableName = this.extractTableName(context, message);

    if (this.isSchemaError(error)) {
      const err = new Error(`[WHATSAPP_SCHEMA_NOT_READY] WhatsApp database schema missing or PostgREST schema cache stale for table '${tableName}' during ${context}`);
      (err as any).code = 'WHATSAPP_SCHEMA_NOT_READY';
      (err as any).table = tableName;

      logger.warn('ConversationService', `PostgREST schema cache or table missing for '${tableName}' during ${context}`, {
        service: 'ConversationService',
        operation: context,
        table: tableName,
        requestId,
        status: 'SCHEMA_NOT_READY',
        code: error?.code || 'PGRST205',
      });
      throw err;
    }

    const err = new Error(`[WHATSAPP_DATABASE_UNAVAILABLE] Database query failed for table '${tableName}' during ${context}: ${message}`);
    (err as any).code = 'WHATSAPP_DATABASE_UNAVAILABLE';
    (err as any).table = tableName;

    logger.error('ConversationService', `Database query failed for '${tableName}' during ${context}`, {
      name: error?.name,
      code: error?.code,
      message: error?.message,
    }, {
      service: 'ConversationService',
      operation: context,
      table: tableName,
      requestId,
      status: 'DATABASE_UNAVAILABLE',
    });
    throw err;
  }

  /**
   * Checks whether a webhook event or meta_message_id has already been processed (Database-backed Idempotency)
   */
  public static async isEventProcessed(eventId: string): Promise<boolean> {
    if (!eventId) return false;

    try {
      const supabase = getSupabaseClient();
      
      // Check idempotency table first
      const { data: idemData, error: idemErr } = await supabase
        .from('whatsapp_idempotency_logs')
        .select('event_id')
        .eq('event_id', eventId)
        .maybeSingle();

      if (idemErr) {
        this.handleDatabaseError(idemErr, `isEventProcessed.idem(${eventId})`);
      }

      if (idemData) return true;

      // Check messages table second
      const { data: msgData, error: msgErr } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .eq('meta_message_id', eventId)
        .maybeSingle();

      if (msgErr) {
        this.handleDatabaseError(msgErr, `isEventProcessed.msg(${eventId})`);
      }

      return !!msgData;
    } catch (err: any) {
      if (err.code === 'WHATSAPP_SCHEMA_NOT_READY' || err.code === 'WHATSAPP_DATABASE_UNAVAILABLE') {
        throw err;
      }
      this.handleDatabaseError(err, `isEventProcessed(${eventId})`);
    }
  }

  /**
   * Logs idempotency event start or completion in durable database
   */
  public static async recordIdempotencyEvent(eventId: string, tenantId: string, eventType: string, status: 'processing' | 'processed' | 'failed', errorMessage?: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('whatsapp_idempotency_logs').upsert({
        event_id: eventId,
        tenant_id: tenantId,
        event_type: eventType,
        status,
        error_message: errorMessage || null,
        created_at: new Date().toISOString()
      }, { onConflict: 'event_id' });

      if (error) {
        this.handleDatabaseError(error, `recordIdempotencyEvent(${eventId})`);
      }
    } catch (err: any) {
      if (err.code === 'WHATSAPP_SCHEMA_NOT_READY' || err.code === 'WHATSAPP_DATABASE_UNAVAILABLE') {
        throw err;
      }
      this.handleDatabaseError(err, `recordIdempotencyEvent(${eventId})`);
    }
  }

  /**
   * Ensures a conversation record exists for a tenant & contact phone number
   */
  public static async ensureConversation(tenantId: string, externalContactIdentifier: string, contactName: string = 'New Lead'): Promise<ConversationRecord> {
    const formattedPhone = externalContactIdentifier.replace(/[^0-9]/g, '');
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    try {
      // Try fetching existing conversation
      const { data: existing, error: fetchErr } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('external_contact_identifier', formattedPhone)
        .maybeSingle();

      if (fetchErr) {
        this.handleDatabaseError(fetchErr, `ensureConversation.fetch(${formattedPhone})`);
      }

      if (existing) {
        return existing as ConversationRecord;
      }

      const conversationId = `conv_${tenantId}_${formattedPhone}`;
      const newConv: ConversationRecord = {
        id: conversationId,
        tenant_id: tenantId,
        external_contact_identifier: formattedPhone,
        contact_name: contactName,
        status: 'open',
        automation_mode: 'ai_active',
        last_message_at: now,
        created_at: now,
        updated_at: now,
      };

      const { data, error: insertErr } = await supabase
        .from('whatsapp_conversations')
        .upsert(newConv, { onConflict: 'tenant_id,external_contact_identifier' })
        .select()
        .single();

      if (insertErr) {
        this.handleDatabaseError(insertErr, `ensureConversation.upsert(${formattedPhone})`);
      }

      return (data as ConversationRecord) || newConv;
    } catch (err: any) {
      if (err.code === 'WHATSAPP_SCHEMA_NOT_READY' || err.code === 'WHATSAPP_DATABASE_UNAVAILABLE') {
        throw err;
      }
      this.handleDatabaseError(err, `ensureConversation(${formattedPhone})`);
    }
  }

  /**
   * Saves an inbound message durably to database
   */
  public static async saveInboundMessage(msg: ParsedInboundMessage): Promise<{ conversation: ConversationRecord; message: MessageRecord }> {
    const conversation = await this.ensureConversation(msg.tenantId, msg.fromPhoneNumber, msg.contactName);
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const msgId = `msg_in_${msg.metaMessageId || Date.now()}`;

    const newMsgPayload: MessageRecord = {
      id: msgId,
      tenant_id: msg.tenantId,
      conversation_id: conversation.id,
      meta_message_id: msg.metaMessageId,
      direction: 'inbound',
      message_type: msg.messageType || 'text',
      body: msg.textBody,
      media_url: msg.mediaUrl,
      media_mime_type: msg.mediaMimeType,
      reply_to_message_id: msg.replyToMessageId,
      status: 'received',
      source: 'webhook',
      provider_timestamp: msg.timestamp,
      created_at: now,
      updated_at: now,
    };

    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .upsert(newMsgPayload, { onConflict: 'meta_message_id' })
        .select()
        .single();

      if (error) {
        this.handleDatabaseError(error, `saveInboundMessage(${msg.metaMessageId})`);
      }

      // Update conversation last_message_at
      await supabase
        .from('whatsapp_conversations')
        .update({ last_message_at: now, updated_at: now, contact_name: msg.contactName || conversation.contact_name })
        .eq('tenant_id', msg.tenantId)
        .eq('id', conversation.id);

      return {
        conversation,
        message: (data as MessageRecord) || newMsgPayload,
      };
    } catch (err: any) {
      if (err.code === 'WHATSAPP_SCHEMA_NOT_READY' || err.code === 'WHATSAPP_DATABASE_UNAVAILABLE') {
        throw err;
      }
      this.handleDatabaseError(err, `saveInboundMessage(${msg.metaMessageId})`);
    }
  }

  /**
   * Saves an outbound message durably to database
   */
  public static async saveOutboundMessage(params: {
    tenantId: string;
    conversationId: string;
    metaMessageId?: string;
    body: string;
    messageType?: string;
    templateName?: string;
    source?: 'human' | 'ai' | 'template' | 'automation';
    status?: 'sent' | 'failed';
    errorCode?: string;
    errorDetails?: any;
  }): Promise<MessageRecord> {
    const { tenantId, conversationId, metaMessageId, body, messageType = 'text', templateName, source = 'human', status = 'sent', errorCode, errorDetails } = params;
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const msgId = `msg_out_${metaMessageId || Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newMsgPayload: MessageRecord = {
      id: msgId,
      tenant_id: tenantId,
      conversation_id: conversationId,
      meta_message_id: metaMessageId || null,
      direction: 'outbound',
      message_type: messageType,
      body,
      template_name: templateName || null,
      status,
      source,
      error_code: errorCode || null,
      error_details: errorDetails || null,
      created_at: now,
      updated_at: now,
    };

    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .upsert(newMsgPayload)
        .select()
        .single();

      if (error) {
        this.handleDatabaseError(error, `saveOutboundMessage(${metaMessageId})`);
      }

      // Update conversation timestamp
      await supabase
        .from('whatsapp_conversations')
        .update({ last_message_at: now, updated_at: now })
        .eq('tenant_id', tenantId)
        .eq('id', conversationId);

      return (data as MessageRecord) || newMsgPayload;
    } catch (err: any) {
      if (err.code === 'WHATSAPP_SCHEMA_NOT_READY' || err.code === 'WHATSAPP_DATABASE_UNAVAILABLE') {
        throw err;
      }
      this.handleDatabaseError(err, `saveOutboundMessage(${metaMessageId})`);
    }
  }

  /**
   * Updates message status in durable database
   */
  public static async updateMessageStatus(statusUpdate: ParsedStatusUpdate): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      const now = new Date().toISOString();

      const updatePayload: any = {
        status: statusUpdate.status,
        updated_at: now,
      };

      if (statusUpdate.errorCode) {
        updatePayload.error_code = statusUpdate.errorCode;
        updatePayload.error_details = statusUpdate.errorDetails;
      }

      const { error } = await supabase
        .from('whatsapp_messages')
        .update(updatePayload)
        .eq('tenant_id', statusUpdate.tenantId)
        .eq('meta_message_id', statusUpdate.metaMessageId);

      if (error) {
        this.handleDatabaseError(error, `updateMessageStatus(${statusUpdate.metaMessageId})`);
      }

      // Record status event for detailed lifecycle tracking
      await supabase.from('whatsapp_message_status_events').insert({
        id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tenant_id: statusUpdate.tenantId,
        meta_message_id: statusUpdate.metaMessageId,
        status: statusUpdate.status,
        error_code: statusUpdate.errorCode || null,
        error_details: statusUpdate.errorDetails || null,
        created_at: now
      });

      logger.info('ConversationService', `Updated status for meta_message_id ${statusUpdate.metaMessageId} to ${statusUpdate.status}`);
    } catch (err: any) {
      if (err.code === 'WHATSAPP_SCHEMA_NOT_READY' || err.code === 'WHATSAPP_DATABASE_UNAVAILABLE') {
        throw err;
      }
      this.handleDatabaseError(err, `updateMessageStatus(${statusUpdate.metaMessageId})`);
    }
  }

  /**
   * Lists all conversations for a tenant from durable database
   */
  public static async getConversationsForTenant(tenantId: string): Promise<ConversationRecord[]> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('last_message_at', { ascending: false });

      if (error) {
        this.handleDatabaseError(error, `getConversationsForTenant(${tenantId})`);
      }

      return (data as ConversationRecord[]) || [];
    } catch (err: any) {
      if (err.code === 'WHATSAPP_SCHEMA_NOT_READY' || err.code === 'WHATSAPP_DATABASE_UNAVAILABLE') {
        throw err;
      }
      this.handleDatabaseError(err, `getConversationsForTenant(${tenantId})`);
    }
  }

  /**
   * Retrieves all messages for a specific conversation
   */
  public static async getMessagesForConversation(tenantId: string, conversationId: string): Promise<MessageRecord[]> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        this.handleDatabaseError(error, `getMessagesForConversation(${conversationId})`);
      }

      return (data as MessageRecord[]) || [];
    } catch (err: any) {
      if (err.code === 'WHATSAPP_SCHEMA_NOT_READY' || err.code === 'WHATSAPP_DATABASE_UNAVAILABLE') {
        throw err;
      }
      this.handleDatabaseError(err, `getMessagesForConversation(${conversationId})`);
    }
  }

  /**
   * Toggles automation mode for a conversation (AI vs Human Takeover)
   */
  public static async setAutomationMode(tenantId: string, conversationId: string, mode: 'ai_active' | 'paused' | 'human_takeover'): Promise<void> {
    if (mode === 'ai_active') {
      throw new Error('[ConversationService] Direct setting of ai_active is forbidden. Call ControlledResumeService.resumeAutomation instead.');
    }
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ automation_mode: mode, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('id', conversationId);

      if (error) {
        this.handleDatabaseError(error, `setAutomationMode(${conversationId})`);
      }

      logger.info('ConversationService', `Set conversation ${conversationId} automation_mode to ${mode}`);
    } catch (err: any) {
      if (err.code === 'WHATSAPP_SCHEMA_NOT_READY' || err.code === 'WHATSAPP_DATABASE_UNAVAILABLE') {
        throw err;
      }
      this.handleDatabaseError(err, `setAutomationMode(${conversationId})`);
    }
  }
}
