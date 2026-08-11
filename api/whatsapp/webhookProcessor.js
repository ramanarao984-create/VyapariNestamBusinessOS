import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const db = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw Object.assign(new Error('WhatsApp database configuration is missing.'), { code: 'WHATSAPP_DATABASE_UNAVAILABLE' });
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
};
const hash = (v) => crypto.createHash('sha256').update(v).digest('hex').slice(0, 32);
const timestamp = (v) => Number.isFinite(Number(v)) && Number(v) > 0 ? new Date(Number(v) * 1000).toISOString() : new Date().toISOString();

export function isWebhookSignatureValid(raw, signature, secret) {
  if (!secret || !signature?.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const received = signature.slice(7);
  return expected.length === received.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export function extractWebhookEvents(payload) {
  if (payload?.object !== 'whatsapp_business_account' || !Array.isArray(payload.entry)) return [];
  const events = [];
  for (const entry of payload.entry) for (const change of Array.isArray(entry.changes) ? entry.changes : []) {
    if (change?.field !== 'messages') continue;
    const value = change.value || {};
    const phoneNumberId = String(value.metadata?.phone_number_id || '').trim();
    if (!phoneNumberId) continue;
    const contacts = Array.isArray(value.contacts) ? value.contacts : [];
    for (const message of Array.isArray(value.messages) ? value.messages : []) {
      if (!message?.id || !message?.from) continue;
      events.push({ kind: 'message', phoneNumberId, message, contact: contacts.find((c) => c?.wa_id === message.from) || contacts[0] || null });
    }
    for (const status of Array.isArray(value.statuses) ? value.statuses : []) {
      if (status?.id && status?.status) events.push({ kind: 'status', phoneNumberId, status });
    }
  }
  return events;
}

async function claim(database, id, tenantId, type) {
  const { error } = await database.from('whatsapp_idempotency_logs').insert({
    event_id: id, tenant_id: tenantId, event_type: type, status: 'processing',
    error_message: null, created_at: new Date().toISOString(),
  });
  if (!error) return true;
  if (error.code === '23505') return false;
  throw Object.assign(new Error('WhatsApp idempotency storage failed.'), { code: error.code });
}
async function finish(database, id, status, errorMessage = null) {
  await database.from('whatsapp_idempotency_logs').update({ status, error_message: errorMessage }).eq('event_id', id);
}
function messageBody(message) {
  if (message?.text?.body) return { body: String(message.text.body), type: 'text' };
  if (message?.button?.text) return { body: String(message.button.text), type: 'button' };
  if (message?.interactive?.button_reply?.title) return { body: String(message.interactive.button_reply.title), type: 'interactive' };
  if (message?.interactive?.list_reply?.title) return { body: String(message.interactive.list_reply.title), type: 'interactive' };
  return { body: `[Received ${String(message?.type || 'message')}]`, type: String(message?.type || 'message') };
}
async function saveMessage(database, tenantId, event) {
  const phone = String(event.message.from).replace(/[^0-9]/g, '');
  const name = String(event.contact?.profile?.name || 'New Lead');
  const existing = await database.from('whatsapp_conversations').select('id,contact_name')
    .eq('tenant_id', tenantId).eq('external_contact_identifier', phone).maybeSingle();
  if (existing.error) throw existing.error;
  const now = new Date().toISOString();
  const conversation = existing.data || {
    id: `conv_${tenantId}_${phone}`, tenant_id: tenantId, external_contact_identifier: phone,
    contact_name: name, status: 'open', automation_mode: 'ai_active',
    last_message_at: now, created_at: now, updated_at: now,
  };
  if (!existing.data) {
    const created = await database.from('whatsapp_conversations').upsert(conversation, { onConflict: 'tenant_id,external_contact_identifier' }).select('id,contact_name').single();
    if (created.error) throw created.error;
  }
  const parsed = messageBody(event.message);
  const saved = await database.from('whatsapp_messages').upsert({
    id: `msg_in_${hash(String(event.message.id))}`, tenant_id: tenantId, conversation_id: conversation.id,
    meta_message_id: String(event.message.id), direction: 'inbound', message_type: parsed.type,
    body: parsed.body, status: 'received', source: 'webhook', provider_timestamp: timestamp(event.message.timestamp),
    created_at: now, updated_at: now,
  }, { onConflict: 'meta_message_id' });
  if (saved.error) throw saved.error;
  await database.from('whatsapp_conversations').update({ last_message_at: now, updated_at: now, contact_name: name })
    .eq('tenant_id', tenantId).eq('id', conversation.id);

  // Every inbound customer message opens a fresh 24-hour customer-service window.
  // The operator UI and the send endpoint both rely on this durable record.
  const inboundAt = timestamp(event.message.timestamp);
  const expiresAt = new Date(new Date(inboundAt).getTime() + 24 * 60 * 60 * 1000).toISOString();
  const window = await database.from('whatsapp_conversation_windows').upsert({
    id: `window_${hash(`${tenantId}:${conversation.id}`)}`,
    tenant_id: tenantId,
    conversation_id: conversation.id,
    last_inbound_at: inboundAt,
    window_expires_at: expiresAt,
    created_at: now,
    updated_at: now,
  }, { onConflict: 'tenant_id,conversation_id' });
  if (window.error) throw window.error;
}
export async function processWebhookPayload(payload) {
  const events = extractWebhookEvents(payload);
  const result = { received: events.length, processed: 0, duplicates: 0, ignored: 0 };
  if (!events.length) return result;
  const database = db();
  for (const event of events) {
    const tenant = await database.from('whatsapp_connections').select('tenant_id').eq('phone_number_id', event.phoneNumberId).maybeSingle();
    if (tenant.error) throw tenant.error;
    if (!tenant.data?.tenant_id) { result.ignored++; continue; }
    const id = event.kind === 'message' ? `meta:message:${event.message.id}` : `meta:status:${event.status.id}:${event.status.status}`;
    if (!await claim(database, id, tenant.data.tenant_id, event.kind)) { result.duplicates++; continue; }
    try {
      if (event.kind === 'message') await saveMessage(database, tenant.data.tenant_id, event);
      else await database.from('whatsapp_messages').update({ status: String(event.status.status), updated_at: new Date().toISOString() }).eq('tenant_id', tenant.data.tenant_id).eq('meta_message_id', String(event.status.id));
      await finish(database, id, 'processed');
      result.processed++;
    } catch (error) {
      await finish(database, id, 'failed', error?.code || 'unknown_error');
      throw error;
    }
  }
  return result;
}
