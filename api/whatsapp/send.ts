import crypto from 'node:crypto';
import { authenticate, decrypt, getDb } from './connection.ts';

function fail(res: any, status: number, code: string, message: string) {
  return res.status(status).json({ success: false, error: message, errorCode: code });
}

function cleanPhone(value: unknown) {
  return String(value || '').replace(/[^0-9]/g, '');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const identity = await authenticate(req, res);
  if (!identity) return;

  const recipient = cleanPhone(req.body?.recipient);
  const message = String(req.body?.message || '').trim();
  const messageType = String(req.body?.messageType || 'text');
  const templateName = String(req.body?.templateName || '').trim();
  const templateLanguage = String(req.body?.templateLanguage || 'en_US').trim() || 'en_US';
  const contactName = String(req.body?.contactName || '').trim().slice(0, 100);
  const suppliedConversationId = String(req.body?.conversationId || '').trim();

  if (!/^\d{8,15}$/.test(recipient)) return fail(res, 400, 'INVALID_RECIPIENT', 'Enter a valid WhatsApp number with country code, for example 919087779869.');
  if (!['text', 'template'].includes(messageType)) return fail(res, 400, 'UNSUPPORTED_MESSAGE_TYPE', 'Only text and approved template messages are supported here.');
  if (messageType === 'text' && (!message || message.length > 4096)) return fail(res, 400, 'INVALID_MESSAGE_BODY', 'Text messages must contain between 1 and 4096 characters.');
  if (messageType === 'template' && !/^[a-z0-9_]{1,512}$/i.test(templateName)) return fail(res, 400, 'INVALID_TEMPLATE', 'Choose an approved WhatsApp template before sending the first message.');

  try {
    const db = getDb();
    const { data: connection, error: connectionError } = await db
      .from('whatsapp_connections')
      .select('id, phone_number_id, token_ciphertext, connection_status')
      .eq('tenant_id', identity.tenantId)
      .maybeSingle();
    if (connectionError) throw connectionError;
    if (!connection?.phone_number_id || !connection.token_ciphertext || connection.connection_status !== 'connected') {
      return fail(res, 409, 'CONNECTION_NOT_ACTIVE', 'Connect and save an active WhatsApp Cloud API account before sending messages.');
    }

    let conversation: any = null;
    if (suppliedConversationId) {
      const { data, error } = await db
        .from('whatsapp_conversations')
        .select('id, external_contact_identifier, contact_name')
        .eq('tenant_id', identity.tenantId)
        .eq('id', suppliedConversationId)
        .maybeSingle();
      if (error) throw error;
      if (!data || data.external_contact_identifier !== recipient) return fail(res, 404, 'INVALID_CONVERSATION_CONTEXT', 'This chat is no longer available for the selected contact.');
      conversation = data;
    } else {
      const { data, error } = await db
        .from('whatsapp_conversations')
        .select('id, external_contact_identifier, contact_name')
        .eq('tenant_id', identity.tenantId)
        .eq('external_contact_identifier', recipient)
        .maybeSingle();
      if (error) throw error;
      conversation = data;
    }

    const now = new Date().toISOString();
    if (!conversation) {
      conversation = {
        id: 'conv_' + identity.tenantId + '_' + recipient,
        tenant_id: identity.tenantId,
        external_contact_identifier: recipient,
        contact_name: contactName || 'New contact',
        status: 'open',
        automation_mode: 'ai_active',
        last_message_at: now,
        created_at: now,
        updated_at: now,
      };
      const { data, error } = await db
        .from('whatsapp_conversations')
        .upsert(conversation, { onConflict: 'tenant_id,external_contact_identifier' })
        .select('id, external_contact_identifier, contact_name')
        .single();
      if (error) throw error;
      conversation = data;
    }

    if (messageType === 'text') {
      const { data: window, error: windowError } = await db
        .from('whatsapp_conversation_windows')
        .select('window_expires_at')
        .eq('tenant_id', identity.tenantId)
        .eq('conversation_id', conversation.id)
        .maybeSingle();
      if (windowError) throw windowError;
      if (!window?.window_expires_at || new Date(window.window_expires_at).getTime() <= Date.now()) {
        return fail(res, 409, 'TEMPLATE_REQUIRED', 'WhatsApp allows free-text replies only within 24 hours after the customer messages you. Ask this contact to message your business number first, or send an approved template.');
      }
    }

    const payload = messageType === 'template'
      ? { messaging_product: 'whatsapp', to: recipient, type: 'template', template: { name: templateName, language: { code: templateLanguage } } }
      : { messaging_product: 'whatsapp', to: recipient, type: 'text', text: { body: message } };

    const response = await fetch(
      'https://graph.facebook.com/' + (process.env.META_GRAPH_API_VERSION || 'v25.0') + '/' + connection.phone_number_id + '/messages',
      { method: 'POST', headers: { Authorization: 'Bearer ' + decrypt(connection.token_ciphertext), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    );
    const meta = await response.json().catch(() => ({}));
    if (!response.ok) {
      const providerMessage = String(meta?.error?.message || 'Meta rejected the request.');
      console.error('Meta WhatsApp send rejected.', { status: response.status, code: meta?.error?.code });
      return fail(res, 422, 'META_SEND_REJECTED', providerMessage);
    }

    const metaMessageId = String(meta?.messages?.[0]?.id || '');
    const { error: saveError } = await db.from('whatsapp_messages').insert({
      id: 'msg_out_' + crypto.randomUUID(),
      tenant_id: identity.tenantId,
      conversation_id: conversation.id,
      whatsapp_connection_id: connection.id,
      meta_message_id: metaMessageId || null,
      direction: 'outbound',
      message_type: messageType,
      body: messageType === 'template' ? '[Template] ' + templateName : message,
      template_name: messageType === 'template' ? templateName : null,
      status: 'sent',
      source: 'human',
      created_at: now,
      updated_at: now,
    });
    if (saveError) throw saveError;
    await db.from('whatsapp_conversations').update({ last_message_at: now, updated_at: now, contact_name: contactName || conversation.contact_name }).eq('tenant_id', identity.tenantId).eq('id', conversation.id);

    return res.status(200).json({ success: true, metaMessageId, conversationId: conversation.id });
  } catch (error: any) {
    console.error('Outbound WhatsApp send failed.', { code: error?.code || 'OUTBOUND_MESSAGE_EXCEPTION' });
    return fail(res, 503, error?.code || 'OUTBOUND_MESSAGE_EXCEPTION', 'Message delivery is temporarily unavailable. Please retry shortly.');
  }
}
