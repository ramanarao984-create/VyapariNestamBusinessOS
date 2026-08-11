import { authenticate, getDb } from './connection.ts';

function sendError(res: any, status: number, code: string, message: string) {
  return res.status(status).json({ error: { code, message } });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const identity = await authenticate(req, res);
  if (!identity) return;

  try {
    const viewFilter = String(req.query?.viewFilter || 'all');
    const searchQuery = String(req.query?.searchQuery || '').trim().toLowerCase();
    const db = getDb();

    let query = db
      .from('whatsapp_conversations')
      .select('id, tenant_id, external_contact_identifier, contact_name, status, assigned_user_id, automation_mode, last_message_at, created_at, updated_at')
      .eq('tenant_id', identity.tenantId)
      .order('last_message_at', { ascending: false })
      .limit(100);

    if (viewFilter === 'mine') query = query.eq('assigned_user_id', identity.uid);
    if (viewFilter === 'assigned') query = query.not('assigned_user_id', 'is', null);

    const { data: conversations, error } = await query;
    if (error) throw error;

    const filtered = (conversations || []).filter((conversation: any) => {
      if (!searchQuery) return true;
      return [conversation.contact_name, conversation.external_contact_identifier]
        .some((value) => String(value || '').toLowerCase().includes(searchQuery));
    });

    const ids = filtered.map((conversation: any) => conversation.id);
    const latestByConversation = new Map<string, any>();
    if (ids.length) {
      const { data: messages, error: messageError } = await db
        .from('whatsapp_messages')
        .select('conversation_id, body, direction, created_at')
        .eq('tenant_id', identity.tenantId)
        .in('conversation_id', ids)
        .order('created_at', { ascending: false });
      if (messageError) throw messageError;
      for (const message of messages || []) {
        if (!latestByConversation.has(message.conversation_id)) latestByConversation.set(message.conversation_id, message);
      }
    }

    const { data: windows, error: windowError } = ids.length
      ? await db.from('whatsapp_conversation_windows').select('conversation_id, window_expires_at').eq('tenant_id', identity.tenantId).in('conversation_id', ids)
      : { data: [], error: null };
    if (windowError) throw windowError;
    const windowsByConversation = new Map((windows || []).map((window: any) => [window.conversation_id, window]));

    return res.status(200).json({
      items: filtered.map((conversation: any) => {
        const latest = latestByConversation.get(conversation.id);
        const window: any = windowsByConversation.get(conversation.id);
        return {
          ...conversation,
          latest_message_body: latest?.body || '',
          latest_message_direction: latest?.direction || null,
          latest_message_timestamp: latest?.created_at || conversation.last_message_at,
          is_24h_window_open: Boolean(window?.window_expires_at && new Date(window.window_expires_at).getTime() > Date.now()),
          window_expires_at: window?.window_expires_at || null,
          consent_status: 'unknown',
        };
      }),
    });
  } catch (error: any) {
    console.error('WhatsApp inbox load failed.', { code: error?.code || 'WHATSAPP_DATABASE_UNAVAILABLE' });
    return sendError(res, 503, 'WHATSAPP_DATABASE_UNAVAILABLE', 'WhatsApp chats could not be loaded. Please retry shortly.');
  }
}
