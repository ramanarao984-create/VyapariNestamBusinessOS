import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

type Db = any;

export type WebhookEvent =
  | {
      kind: 'message';
      phoneNumberId: string;
      wabaId: string | null;
      message: any;
      contact: any;
    }
  | {
      kind: 'status';
      phoneNumberId: string;
      wabaId: string | null;
      status: any;
    };

export interface ProcessResult {
  received: number;
  processed: number;
  duplicates: number;
  ignored: number;
}

function configurationError(message: string, code: string) {
  return Object.assign(new Error(message), { code });
}

function getDb(): Db {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw configurationError('WhatsApp webhook database configuration is missing.', 'WHATSAPP_DATABASE_UNAVAILABLE');
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizePhone(value: unknown): string {
  return String(value || '').replace(/[^0-9]/g, '');
}

function providerTimestamp(value: unknown): string {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return new Date().toISOString();
  return new Date(seconds * 1000).toISOString();
}

function shortHash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);
}

function bodyFor(message: any): { body: string; type: string; mediaMimeType: string | null; replyToMessageId: string | null } {
  const type = String(message?.type || 'text');
  if (message?.text?.body) return { body: message.text.body, type, mediaMimeType: null, replyToMessageId: message.context?.id || null };
  if (message?.button?.text) return { body: message.button.text, type, mediaMimeType: null, replyToMessageId: message.context?.id || null };
  if (message?.interactive?.button_reply?.title) return { body: message.interactive.button_reply.title, type, mediaMimeType: null, replyToMessageId: message.context?.id || null };
  if (message?.interactive?.list_reply?.title) return { body: message.interactive.list_reply.title, type, mediaMimeType: null, replyToMessageId: message.context?.id || null };

  const media = message?.[type];
  if (media && typeof media === 'object') {
    const filename = media.filename ? String(media.filename) : '';
    const caption = media.caption ? String(media.caption) : '';
    return {
      body: caption || filename || `[${type} received]`,
      type,
      mediaMimeType: media.mime_type || null,
      replyToMessageId: message.context?.id || null,
    };
  }

  return { body: `[Received ${type}]`, type, mediaMimeType: null, replyToMessageId: message?.context?.id || null };
}

export function isWebhookSignatureValid(rawBody: Buffer, signature: string | undefined, appSecret: string): boolean {
  if (!appSecret || !signature?.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const received = signature.slice('sha256='.length);
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const receivedBuffer = Buffer.from(received, 'utf8');
  return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function extractWebhookEvents(payload: any): WebhookEvent[] {
  if (payload?.object !== 'whatsapp_business_account' || !Array.isArray(payload.entry)) return [];

  const events: WebhookEvent[] = [];
  for (const entry of payload.entry) {
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      if (change?.field !== 'messages') continue;
      const value = change?.value;
      const phoneNumberId = String(value?.metadata?.phone_number_id || '').trim();
      if (!phoneNumberId) continue;
      const wabaId = entry?.id ? String(entry.id) : null;
      const contacts = Array.isArray(value?.contacts) ? value.contacts : [];

      for (const message of Array.isArray(value?.messages) ? value.messages : []) {
        if (!message?.id || !message?.from) continue;
        const contact = contacts.find((candidate: any) => candidate?.wa_id === message.from) || contacts[0] || null;
        events.push({ kind: 'message', phoneNumberId, wabaId, message, contact });
      }

      for (const status of Array.isArray(value?.statuses) ? value.statuses : []) {
        if (!status?.id || !status?.status) continue;
        events.push({ kind: 'status', phoneNumberId, wabaId, status });
      }
    }
  }

  return events;
}

async function resolveTenant(db: Db, phoneNumberId: string): Promise<string | null> {
  const { data, error } = await db
    .from('whatsapp_connections')
    .select('tenant_id')
    .eq('phone_number_id', phoneNumberId)
    .maybeSingle();

  if (error) throw configurationError('WhatsApp connection lookup failed.', error.code === 'PGRST205' ? 'WHATSAPP_SCHEMA_NOT_READY' : 'WHATSAPP_DATABASE_UNAVAILABLE');
  return data?.tenant_id || null;
}

async function claimEvent(db: Db, eventId: string, tenantId: string, eventType: string): Promise<boolean> {
  const { error } = await db.from('whatsapp_idempotency_logs').insert({
    event_id: eventId,
    tenant_id: tenantId,
    event_type: eventType,
    status: 'processing',
    error_message: null,
    created_at: new Date().toISOString(),
  });

  if (!error) return true;
  if (error.code === '23505') return false;
  throw configurationError('WhatsApp idempotency storage failed.', error.code === 'PGRST205' ? 'WHATSAPP_SCHEMA_NOT_READY' : 'WHATSAPP_DATABASE_UNAVAILABLE');
}

async function finishEvent(db: Db, eventId: string, status: 'processed' | 'failed', errorMessage: string | null = null) {
  const { error } = await db
    .from('whatsapp_idempotency_logs')
    .update({ status, error_message: errorMessage })
    .eq('event_id', eventId);

  if (error) throw configurationError('WhatsApp idempotency status update failed.', 'WHATSAPP_DATABASE_UNAVAILABLE');
}

async function ensureConversation(db: Db, tenantId: string, phoneNumber: string, contactName: string) {
  const { data: existing, error: readError } = await db
    .from('whatsapp_conversations')
    .select('id, contact_name')
    .eq('tenant_id', tenantId)
    .eq('external_contact_identifier', phoneNumber)
    .maybeSingle();

  if (readError) throw configurationError('WhatsApp conversation lookup failed.', readError.code === 'PGRST205' ? 'WHATSAPP_SCHEMA_NOT_READY' : 'WHATSAPP_DATABASE_UNAVAILABLE');
  if (existing) return existing;

  const now = new Date().toISOString();
  const conversation = {
    id: `conv_${tenantId}_${phoneNumber}`,
    tenant_id: tenantId,
    external_contact_identifier: phoneNumber,
    contact_name: contactName || 'New Lead',
    status: 'open',
    automation_mode: 'ai_active',
    last_message_at: now,
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await db
    .from('whatsapp_conversations')
    .upsert(conversation, { onConflict: 'tenant_id,external_contact_identifier' })
    .select('id, contact_name')
    .single();

  if (error) throw configurationError('WhatsApp conversation could not be saved.', error.code === 'PGRST205' ? 'WHATSAPP_SCHEMA_NOT_READY' : 'WHATSAPP_DATABASE_UNAVAILABLE');
  return data || conversation;
}

async function processInboundMessage(db: Db, tenantId: string, event: Extract<WebhookEvent, { kind: 'message' }>) {
  const metaMessageId = String(event.message.id);
  const eventId = `meta:message:${metaMessageId}`;
  if (!await claimEvent(db, eventId, tenantId, 'message')) return 'duplicate';

  try {
    const phoneNumber = normalizePhone(event.message.from);
    const contactName = String(event.contact?.profile?.name || 'New Lead');
    const conversation = await ensureConversation(db, tenantId, phoneNumber, contactName);
    const parsed = bodyFor(event.message);
    const now = new Date().toISOString();

    const { error: messageError } = await db.from('whatsapp_messages').upsert({
      id: `msg_in_${shortHash(metaMessageId)}`,
      tenant_id: tenantId,
      conversation_id: conversation.id,
      meta_message_id: metaMessageId,
      direction: 'inbound',
      message_type: parsed.type,
      body: parsed.body,
      media_url: null,
      media_mime_type: parsed.mediaMimeType,
      reply_to_message_id: parsed.replyToMessageId,
      template_name: null,
      status: 'received',
      source: 'webhook',
      error_code: null,
      error_details: null,
      provider_timestamp: providerTimestamp(event.message.timestamp),
      created_at: now,
      updated_at: now,
    }, { onConflict: 'meta_message_id' });

    if (messageError) throw configurationError('Inbound WhatsApp message could not be saved.', messageError.code === 'PGRST205' ? 'WHATSAPP_SCHEMA_NOT_READY' : 'WHATSAPP_DATABASE_UNAVAILABLE');

    const { error: conversationError } = await db
      .from('whatsapp_conversations')
      .update({ last_message_at: now, updated_at: now, contact_name: contactName || conversation.contact_name })
      .eq('tenant_id', tenantId)
      .eq('id', conversation.id);

    if (conversationError) throw configurationError('Inbound WhatsApp conversation could not be updated.', 'WHATSAPP_DATABASE_UNAVAILABLE');

    const inboundAt = providerTimestamp(event.message.timestamp);
    const windowExpiresAt = new Date(new Date(inboundAt).getTime() + 24 * 60 * 60 * 1000).toISOString();
    const { error: windowError } = await db.from('whatsapp_conversation_windows').upsert({
      id: `window_${tenantId}_${conversation.id}`,
      tenant_id: tenantId,
      conversation_id: conversation.id,
      last_inbound_at: inboundAt,
      window_expires_at: windowExpiresAt,
      updated_at: now,
    }, { onConflict: 'tenant_id,conversation_id' });

    // Keep the inbound message durable even when an older database has not yet
    // applied the service-window migration. Templates remain safe in that case.
    if (windowError) {
      console.error('WhatsApp service-window update failed.', { code: windowError.code || 'unknown' });
    }

    await finishEvent(db, eventId, 'processed');
    return 'processed';
  } catch (error: any) {
    await finishEvent(db, eventId, 'failed', error?.code || 'unknown_error');
    throw error;
  }
}

async function processStatus(db: Db, tenantId: string, event: Extract<WebhookEvent, { kind: 'status' }>) {
  const metaMessageId = String(event.status.id);
  const status = String(event.status.status);
  const timestamp = providerTimestamp(event.status.timestamp);
  const eventId = `meta:status:${metaMessageId}:${status}:${timestamp}`;
  if (!await claimEvent(db, eventId, tenantId, 'status')) return 'duplicate';

  try {
    const statusError = event.status.errors?.[0] || null;
    const now = new Date().toISOString();
    const { error: messageError } = await db
      .from('whatsapp_messages')
      .update({
        status,
        error_code: statusError?.code ? String(statusError.code) : null,
        error_details: statusError,
        updated_at: now,
      })
      .eq('tenant_id', tenantId)
      .eq('meta_message_id', metaMessageId);

    if (messageError) throw configurationError('WhatsApp message status could not be updated.', messageError.code === 'PGRST205' ? 'WHATSAPP_SCHEMA_NOT_READY' : 'WHATSAPP_DATABASE_UNAVAILABLE');

    const { error: eventError } = await db.from('whatsapp_message_status_events').insert({
      id: `evt_${shortHash(eventId)}`,
      tenant_id: tenantId,
      meta_message_id: metaMessageId,
      status,
      error_code: statusError?.code ? String(statusError.code) : null,
      error_details: statusError,
      created_at: now,
    });

    if (eventError) throw configurationError('WhatsApp message status event could not be saved.', eventError.code === 'PGRST205' ? 'WHATSAPP_SCHEMA_NOT_READY' : 'WHATSAPP_DATABASE_UNAVAILABLE');
    await finishEvent(db, eventId, 'processed');
    return 'processed';
  } catch (error: any) {
    await finishEvent(db, eventId, 'failed', error?.code || 'unknown_error');
    throw error;
  }
}

export async function processWebhookPayload(payload: any): Promise<ProcessResult> {
  const events = extractWebhookEvents(payload);
  const result: ProcessResult = { received: events.length, processed: 0, duplicates: 0, ignored: 0 };
  if (!events.length) return result;

  const db = getDb();
  for (const event of events) {
    const tenantId = await resolveTenant(db, event.phoneNumberId);
    if (!tenantId) {
      // Meta should not retry an event for an unconfigured number. Log only the
      // stable phone-number ID; payload content and contacts are not logged.
      console.warn('Ignoring WhatsApp webhook for an unconfigured phone number ID.', { phoneNumberId: event.phoneNumberId });
      result.ignored += 1;
      continue;
    }

    const outcome = event.kind === 'message'
      ? await processInboundMessage(db, tenantId, event)
      : await processStatus(db, tenantId, event);

    if (outcome === 'duplicate') result.duplicates += 1;
    else result.processed += 1;
  }

  return result;
}
