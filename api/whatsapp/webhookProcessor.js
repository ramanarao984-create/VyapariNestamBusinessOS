import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function configurationError(message, code) {
  return Object.assign(new Error(message), { code });
}

function getDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw configurationError('WhatsApp webhook database configuration is missing.', 'WHATSAPP_DATABASE_UNAVAILABLE');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function normalizePhone(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

function providerTimestamp(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return new Date().toISOString();
  return new Date(seconds * 1000).toISOString();
}

function shortHash(value) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);
}

function bodyFor(message) {
  const type = String(message?.type || 'text');
  if (message?.text?.body) return { body: message.text.body, type, mediaMimeType: null, replyToMessageId: message.context?.id || null };
  if (message?.button?.text) return { body: message.button.text, type, mediaMimeType: null, replyToMessageId: message.context?.id || null };
  if (message?.interactive?.button_reply?.title) return { body: message.interactive.button_reply.title, type, mediaMimeType: null, replyToMessageId: message.context?.id || null };
  if (message?.interactive?.list_reply?.title) return { body: message.interactive.list_reply.title, type, mediaMimeType: null, replyToMessageId: message.context?.id || null };
  const media = message?.[type];
  if (media && typeof media === 'object') {
    return {
      body: media.caption || media.filename || `[${type} received]`,
      type,
      mediaMimeType: media.mime_type || null,
      replyToMessageId: message.context?.id || null,
    };
  }
  return { body: `[Received ${type}]`, type, mediaMimeType: null, replyToMessageId: message?.context?.id || null };
}

export function isWebhookSignatureValid(rawBody, signature, appSecret) {
  if (!appSecret || !signature?.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const received = signature.slice(7);
  return expected.length === received.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export function extractWebhookEvents(payload) {
  if (payload?.object !== 'whatsapp_business_account' || !Array.isArray(payload.entry)) return [];
  const events = [];
  for (const entry of payload.entry) {
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      if (change?.field !== 'messages') continue;
      const value = change?.value || {};
      const phoneNumberId = String(value.metadata?.phone_number_id || '').trim();
      if (!phoneNumberId) continue;
      const contacts = Array.isArray(value.contacts) ? value.contacts : [];
      for (const message of Array.isArray(value.messages) ? value.messages : []) {
        if (message?.id && message?.from) {
          const contact = contacts.find((candidate) => candidate?.wa_id === message.from) || contacts[0] || null;
          events.push({ kind: 'message', phoneNumberId, wabaId: entry?.id ? String(entry.id) : null, message, contact });
        }
      }
      for (const status of Array.isArray(value.statuses) ? value.statuses : []) {
        if (status?.id && status?.status) events.push({ kind: 'status', phoneNumberId, wabaId: entry?.id ? String(entry.id) : null, status });
      }
    }
  }
  return events;
}

async function resolveTenant(db, phoneNumberId) {
  const { data, error } = await db.from('whatsapp_connections').select('tenant_id').eq('phone_number_id', phoneNumberId).maybeSingle();
  if (error) throw configurationError('WhatsApp connection lookup failed.', error.code === 'PGRST205' ? 'WHATSAPP_SCHEMA_NOT_READY' : 'WHATSAPP_DATABASE_UNAVAILABLE');
  return data?.tenant_id || null;
}

async function claimEvent(db, eventId, tenantId, eventType) {
  const { error } = await db.from('whatsapp_idempotency_logs').insert({
    event_id: eventId, tenant_id: tenantId, event_type: eventType, status: 'processing', error_message: null, created_at: new Date().toISOString(),
  });
  if (!error) return true;
  if (error.code === '23505') return false;
  throw configurationError('WhatsApp idempotency storage failed.', error.code === 'PGRST205' ? 'WHATSAPP_SCHEMA_NOT_READY' : 'WHATSAPP_DATABASE_UNAVAILABLE');
}

async function finishEvent(db, eventId, status, errorMessage = null) {
  const { error } = await db.from('whatsapp_idempotency_logs').update({ status, error_message: errorMessage }).eq('event_id', eventId);
  if (error) throw configurationError('WhatsApp idempotency status update failed.', 'WHATSAPP_DATABASE_UNAVAILABLE');
}

async function ensureConversation(db, tenantId, phoneNumber, contactName) {
  const { data: existing, error: readError } = await db.from('whatsapp_conversations')
    .select('id, contact_name').eq('tenant_id', tenantId).eq('external_contact_identifier', phoneNumber).maybeSingle();
  if (readError) throw configurationError('WhatsApp conversation lookup failed.', readError.code === 'PGRST205' ? 'WHATSAPP_SCHEMA_NOT_READY' : 'WHATSAPP_DATABASE_UNAVAILABLE');
  if (existing) return existing;
  const now = new Date().toISOString();
  const conversation = {
    id: `conv_${tenantId}_${phoneNumber}`, tenant_id: tenantId, external_contact_identifier: phoneNumber,
    contact_name: contactName || 'New Lead', status: 'open', automation_mode: 'ai_active',
    last_message_at: now, created_at: now, updated_at: now,
  };
  const { data, error } = await db.from('whatsapp_conversations')
    .upsert(conversation, { onConflict: 'tenant_id,external_contact_identifier' })
    .select('id, contact_name').single();
  if (error) throw configurationError('WhatsApp conversation could not be saved.', error.code === 'PGRST205' ? 'WHATSAPP_SCHEMA_NOT_READY' : 'WHATSAPP_DATABASE_UNAVAILABLE');
  return data || conversation;
}

async function processInboundMessage(db, tenantId, event) {
  const metaMessageId = String(event.message.id);
  const eventId = `meta:message:${metaMessageId}`;
  if (!await claimEvent(db, eventId, tenantId, 'message')) return 'duplicate';
  try {
    const phoneNumber = normalizePhone(event.message.from);
    const conversation = await ensureConversation(db, tenantId, phoneNumber, String(event.contact?.profile?.name || 'New Lead'));
    const parsed = bodyFor(event.message);
    const now = new Date().toISOString();
    const { error: messageError } = await db.from('whatsapp_messages').upsert({
      id: `msg_in_${shortHash(metaMessageId)}`, tenant_id: tenantId, conversation_id: conversation.id,
      meta_message_id: metaMessageId, direction: 'inbound', message_type: parsed.type, body: parsed.body,
      media_url: null, media_mime_type: parsed.mediaMimeType, reply_to_message_id: parsed.replyToMessageId,
      template_name: null, status: 'received', source: 'webhook', error_code: null, error_details: null,
      provider_timestamp: providerTimestamp(event.message.timestamp), created_at: now, updated_at: now,
    }, { onConflict: 'meta_message_id' });
    if (messageError) throw configurationError('Inbound WhatsApp message could not be saved.', messageError.code === 'PGRST205' ? 'WHATSAPP_SCHEMA_NOT_READY' : 'WHATSAPP_DATABASE_UNAVAILABLE');
    const { error: conversationError } = await db.from('whatsapp_conversations').update({
      last_message_at: now, updated_at: now, contact_name: String(event.contact?.profile?.name || conversation.contact_name),
    }).eq('tenant_id', tenantId).eq('id', conversation.id);
    if (conversationError) throw configurationError('Inbound WhatsApp conversation could not be updated.', 'WHATSAPP_DATABASE_UNAVAILABLE');
    const inboundAt = providerTimestamp(event.message.timestamp);
    const { error: windowError } = await db.from('whatsapp_conversation_windows').upsert({
      id: `window_${tenantId}_${conversation.id}`, tenant_id: tenantId, conversation_id: conversation.id,
      last_inbound_at: inboundAt, window_expires_at: new Date(new Date(inboundAt).getTime() + 86400000).toISOString(), updated_at: now,
    }, { onConflict: 'tenant_id,conversation_id' });
    if (windowError) console.error('WhatsApp service-window update failed.', { code: windowError.code || 'unknown' });
    await finishEvent(db, eventId, 'processed');
    return 'processed';
  } catch (error) {
    await finishEvent(db, eventId, 'failed', error?.code || 'unknown_error');
    throw error;
  }
}

async function processStatus(db, tenantId, event) {
  const metaMessageId = String(event.status.id);
  const status = String(event.status.status);
  const timestamp = providerTimestamp(event.status.timestamp);
  const eventId = `meta:status:${metaMessageId}:${status}:${timestamp}`;
  if (!await claimEvent(db, eventId, tenantId, 'status')) return 'duplicate';
  try {
    const statusError = event.status.errors?.[0] || null;
    const now = new Date().toISOString();
    const { error: messageError } = await db.from('whatsapp_messages').update({
      status, error_code: statusError?.code ? String(statusError.code) : null,
      error_details: statusError, updated_at: now,
    }).eq('tenant_id', tenantId).eq('meta_message_id', metaMessageId);
    if (messageError) throw configurationError('WhatsApp message status could not be updated.', messageError.code === 'PGRST205' ? 'WHATSAPP_SCHEMA_NOT_READY' : 'WHATSAPP_DATABASE_UNAVAILABLE');
    const { error: eventError } = await db.from('whatsapp_message_status_events').insert({
      id: `evt_${shortHash(eventId)}`, tenant_id: tenantId, meta_message_id: metaMessageId, status,
      error_code: statusError?.code ? String(statusError.code) : null, error_details: statusError, created_at: now,
    });
    if (eventError) throw configurationError('WhatsApp message status event could not be saved.', eventError.code === 'PGRST205' ? 'WHATSAPP_SCHEMA_NOT_READY' : 'WHATSAPP_DATABASE_UNAVAILABLE');
    await finishEvent(db, eventId, 'processed');
    return 'processed';
  } catch (error) {
    await finishEvent(db, eventId, 'failed', error?.code || 'unknown_error');
    throw error;
  }
}

export async function processWebhookPayload(payload) {
  const events = extractWebhookEvents(payload);
  const result = { received: events.length, processed: 0, duplicates: 0, ignored: 0 };
  if (!events.length) return result;
  const db = getDb();
  for (const event of events) {
    const tenantId = await resolveTenant(db, event.phoneNumberId);
    if (!tenantId) { result.ignored += 1; continue; }
    const outcome = event.kind === 'message' ? await processInboundMessage(db, tenantId, event) : await processStatus(db, tenantId, event);
    if (outcome === 'duplicate') result.duplicates += 1; else result.processed += 1;
  }
  return result;
}
