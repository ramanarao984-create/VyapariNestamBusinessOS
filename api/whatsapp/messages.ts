import { authenticate, getDb } from './connection.ts';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const identity = await authenticate(req, res);
  if (!identity) return;

  const conversationId = String(req.query?.conversationId || '').trim();
  if (!conversationId || conversationId.length > 200) {
    return res.status(400).json({ error: { code: 'INVALID_CONVERSATION', message: 'A valid conversation is required.' } });
  }

  try {
    const { data, error } = await getDb()
      .from('whatsapp_messages')
      .select('id, conversation_id, direction, message_type, body, status, created_at, provider_timestamp')
      .eq('tenant_id', identity.tenantId)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(250);
    if (error) throw error;
    return res.status(200).json(data || []);
  } catch (error: any) {
    console.error('WhatsApp message load failed.', { code: error?.code || 'WHATSAPP_DATABASE_UNAVAILABLE' });
    return res.status(503).json({ error: { code: 'WHATSAPP_DATABASE_UNAVAILABLE', message: 'Messages could not be loaded. Please retry shortly.' } });
  }
}
