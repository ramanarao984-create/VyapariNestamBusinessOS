import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { processWebhookPayload } from './webhookProcessor.js';

export function getDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw Object.assign(new Error('Supabase server configuration is missing.'), { code: 'WHATSAPP_DATABASE_UNAVAILABLE' });
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function getKey() {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) throw Object.assign(new Error('ENCRYPTION_SECRET is missing or too short.'), { code: 'WHATSAPP_ENCRYPTION_FAILED' });
  return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `v1:${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(value: string) {
  if (!value) return '';
  if (!value.startsWith('v1:')) return value;
  const [ivHex, tagHex, encryptedHex] = value.slice(3).split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]).toString('utf8');
}

function mask(value: string | null) {
  if (!value || value.length < 10) return value ? '••••••••' : null;
  return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
}

function authError(res: any, status: number, code: string, message: string): null {
  res.status(status).json({ error: { code, message } });
  return null;
}

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function decodeFirebaseClaims(token: string): Record<string, any> {
  try {
    const payload = token.split('.')[1];
    return payload ? JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) : {};
  } catch {
    return {};
  }
}

export function resolveFirebaseEmail(account: any, token: string) {
  const directEmail = normalizeEmail(account?.email);
  if (directEmail && account?.emailVerified !== false) return directEmail;

  const googleProvider = Array.isArray(account?.providerUserInfo)
    ? account.providerUserInfo.find((provider: any) => provider?.providerId === 'google.com' && provider?.email)
    : null;
  const providerEmail = normalizeEmail(googleProvider?.email);
  if (providerEmail) return providerEmail;

  // accounts:lookup above validates the Firebase token. The signed claims are a
  // reliable fallback when Identity Toolkit omits email from the account record.
  const claims = decodeFirebaseClaims(token);
  const claimUid = String(claims.user_id || claims.sub || '');
  const claimEmail = normalizeEmail(claims.email);
  if (claimEmail && claims.email_verified === true && (!claimUid || claimUid === account?.localId)) {
    return claimEmail;
  }

  return '';
}

export async function authenticate(req: any, res: any) {
  const header = String(req.headers?.authorization || '');
  if (!header.startsWith('Bearer ')) {
    authError(res, 401, 'UNAUTHENTICATED', 'Missing or invalid Authorization header.');
    return null;
  }

  const token = header.slice(7).trim();
  try {
    const firebaseApiKey = process.env.FIREBASE_WEB_API_KEY || 'AIzaSyCaNUS0QlroJGEJw_3QcUs66r1VSMw78RM';
    const firebaseResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      },
    );
    const firebasePayload = await firebaseResponse.json();
    const account = firebasePayload.users?.[0];
    if (!firebaseResponse.ok || !account?.localId) {
      return authError(res, 401, 'UNAUTHENTICATED', 'Invalid or expired Firebase authentication token.');
    }

    const db = getDb();
    let { data: user, error: userError } = await db
      .from('users')
      .select('tenant_id, role')
      .eq('id', account.localId)
      .maybeSingle();

    // A fresh deployment needs one explicit workspace owner. This path is
    // intentionally limited to the configured owner email and tenant; it
    // cannot grant access to arbitrary Google accounts.
    if (userError) {
      console.error('Workspace membership lookup failed', { code: userError.code });
      return authError(
        res,
        503,
        'MEMBERSHIP_DATABASE_UNAVAILABLE',
        'Workspace membership storage is unavailable. Verify the Supabase URL and service-role key.',
      );
    }

    if (!user) {
      const ownerEmail = String(process.env.WORKSPACE_OWNER_EMAIL || '').trim().toLowerCase();
      const bootstrapTenantId = String(process.env.WORKSPACE_TENANT_ID || '').trim();
      const accountEmail = resolveFirebaseEmail(account, token);

      if (!ownerEmail || !bootstrapTenantId) {
        return authError(
          res,
          503,
          'WORKSPACE_BOOTSTRAP_NOT_CONFIGURED',
          'Workspace owner setup is incomplete in Vercel. Configure WORKSPACE_OWNER_EMAIL and WORKSPACE_TENANT_ID, then redeploy.',
        );
      }

      if (!accountEmail) {
        return authError(
          res,
          403,
          'WORKSPACE_AUTH_EMAIL_UNAVAILABLE',
          'Google sign-in did not provide a verified email. Sign out, then sign in again and grant email access.',
        );
      }

      if (accountEmail !== ownerEmail) {
        console.warn('Workspace owner email mismatch', {
          authenticatedDomain: accountEmail.split('@')[1] || 'unknown',
          configuredDomain: ownerEmail.split('@')[1] || 'unknown',
        });
        return authError(
          res,
          403,
          'WORKSPACE_OWNER_EMAIL_MISMATCH',
          'The signed-in Google email does not match WORKSPACE_OWNER_EMAIL in Vercel.',
        );
      }

      const { data: createdUser, error: createUserError } = await db
        .from('users')
        .upsert(
          { id: account.localId, tenant_id: bootstrapTenantId, role: 'Owner' },
          { onConflict: 'id' },
        )
        .select('tenant_id, role')
        .maybeSingle();

      if (createUserError || !createdUser) {
        console.error('Workspace owner bootstrap failed', { code: createUserError?.code });
        return authError(
          res,
          503,
          'WORKSPACE_BOOTSTRAP_FAILED',
          'Workspace owner mapping could not be created. Verify the Supabase service-role key and tenant ID.',
        );
      }

      user = createdUser;
    }
    if (!['Owner', 'Admin'].includes(user.role)) return authError(res, 403, 'FORBIDDEN', 'Only workspace owners and admins can manage WhatsApp settings.');
    const { data: tenant, error: tenantError } = await db.from('tenants').select('id, subscription_status').eq('id', user.tenant_id).maybeSingle();
    if (tenantError || !tenant) return authError(res, 403, 'TENANT_NOT_MAPPED', 'Tenant mapping does not exist.');
    if (!['active', 'trial', 'active_trial'].includes(String(tenant.subscription_status || '').toLowerCase())) {
      return authError(res, 403, 'TENANT_INACTIVE', 'Tenant account is not active.');
    }
    return { uid: account.localId, tenantId: tenant.id };
  } catch {
    return authError(res, 401, 'UNAUTHENTICATED', 'Invalid or expired Firebase authentication token.');
  }
}

async function readConnection(tenantId: string) {
  const { data, error } = await getDb().from('whatsapp_connections').select('*').eq('tenant_id', tenantId).maybeSingle();
  if (error) throw Object.assign(new Error('WhatsApp connection storage is unavailable.'), { code: error.code === 'PGRST205' ? 'WHATSAPP_SCHEMA_NOT_READY' : 'WHATSAPP_DATABASE_UNAVAILABLE' });
  if (!data) return {
    isConnected: false,
    tenantId,
    phoneNumberId: null,
    wabaId: null,
    displayPhoneNumber: null,
    verifiedName: null,
    connectionStatus: 'disconnected',
    hasAccessToken: false,
    maskedToken: null,
    hasVerifyToken: false,
    maskedVerifyToken: null,
    lastVerifiedAt: null,
  };

  let maskedToken = null;
  let maskedVerifyToken = null;
  try { maskedToken = data.token_ciphertext ? mask(decrypt(data.token_ciphertext)) : null; } catch { maskedToken = '••••••••'; }
  try { maskedVerifyToken = data.verify_token ? mask(decrypt(data.verify_token)) : null; } catch { maskedVerifyToken = '••••••••'; }

  return {
    isConnected: data.connection_status === 'connected',
    tenantId: data.tenant_id,
    phoneNumberId: data.phone_number_id,
    wabaId: data.waba_id,
    displayPhoneNumber: data.display_phone_number,
    verifiedName: data.verified_name,
    connectionStatus: data.connection_status,
    hasAccessToken: Boolean(data.token_ciphertext),
    maskedToken,
    hasVerifyToken: Boolean(data.verify_token),
    maskedVerifyToken,
    lastVerifiedAt: data.last_verified_at,
  };
}


async function serveInbox(identity: { uid: string; tenantId: string }, req: any, res: any) {
  const viewFilter = String(req.query?.viewFilter || 'all');
  const searchQuery = String(req.query?.searchQuery || '').trim().toLowerCase();
  const db = getDb();
  let query = db.from('whatsapp_conversations')
    .select('id, tenant_id, external_contact_identifier, contact_name, status, assigned_user_id, automation_mode, last_message_at, created_at, updated_at')
    .eq('tenant_id', identity.tenantId).order('last_message_at', { ascending: false }).limit(100);
  if (viewFilter === 'mine') query = query.eq('assigned_user_id', identity.uid);
  if (viewFilter === 'assigned') query = query.not('assigned_user_id', 'is', null);
  const { data: conversations, error } = await query;
  if (error) throw error;
  const filtered = (conversations || []).filter((conversation: any) => !searchQuery || [conversation.contact_name, conversation.external_contact_identifier]
    .some((value) => String(value || '').toLowerCase().includes(searchQuery)));
  const ids = filtered.map((conversation: any) => conversation.id);
  const latestByConversation = new Map<string, any>();
  if (ids.length) {
    const { data: messages, error: messageError } = await db.from('whatsapp_messages')
      .select('conversation_id, body, direction, created_at').eq('tenant_id', identity.tenantId).in('conversation_id', ids)
      .order('created_at', { ascending: false });
    if (messageError) throw messageError;
    for (const message of messages || []) if (!latestByConversation.has(message.conversation_id)) latestByConversation.set(message.conversation_id, message);
  }
  const { data: windows, error: windowError } = ids.length
    ? await db.from('whatsapp_conversation_windows').select('conversation_id, window_expires_at').eq('tenant_id', identity.tenantId).in('conversation_id', ids)
    : { data: [], error: null };
  if (windowError) throw windowError;
  const windowsByConversation = new Map((windows || []).map((window: any) => [window.conversation_id, window]));
  return res.status(200).json({ items: filtered.map((conversation: any) => {
    const latest = latestByConversation.get(conversation.id);
    const window: any = windowsByConversation.get(conversation.id);
    return { ...conversation, latest_message_body: latest?.body || '', latest_message_direction: latest?.direction || null,
      latest_message_timestamp: latest?.created_at || conversation.last_message_at,
      is_24h_window_open: Boolean(window?.window_expires_at && new Date(window.window_expires_at).getTime() > Date.now()),
      window_expires_at: window?.window_expires_at || null, consent_status: 'unknown' };
  }) });
}

async function serveMessages(identity: { uid: string; tenantId: string }, req: any, res: any) {
  const conversationId = String(req.query?.conversationId || '').trim();
  if (!conversationId || conversationId.length > 200) return res.status(400).json({ error: { code: 'INVALID_CONVERSATION', message: 'A valid conversation is required.' } });
  const { data, error } = await getDb().from('whatsapp_messages')
    .select('id, conversation_id, direction, message_type, body, status, created_at, provider_timestamp')
    .eq('tenant_id', identity.tenantId).eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(250);
  if (error) throw error;
  return res.status(200).json(data || []);
}

async function serveTemplates(identity: { uid: string; tenantId: string }, req: any, res: any) {
  const db = getDb();
  if (req.method === 'GET') {
    const { data, error } = await db.from('whatsapp_templates')
      .select('id, name, language, category, status, components, updated_at')
      .eq('tenant_id', identity.tenantId).eq('status', 'APPROVED').order('name').limit(100);
    if (error) throw error;
    return res.status(200).json({ items: data || [] });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { data: connection, error: connectionError } = await db.from('whatsapp_connections')
    .select('waba_id, token_ciphertext, connection_status').eq('tenant_id', identity.tenantId).maybeSingle();
  if (connectionError) throw connectionError;
  if (!connection?.waba_id || !connection?.token_ciphertext || connection.connection_status !== 'connected') {
    return res.status(409).json({ error: { code: 'CONNECTION_NOT_ACTIVE', message: 'Save an active WhatsApp Cloud API connection before syncing templates.' } });
  }

  const response = await fetch('https://graph.facebook.com/' + (process.env.META_GRAPH_API_VERSION || 'v25.0') + '/' +
    encodeURIComponent(connection.waba_id) + '/message_templates?fields=name,language,status,category,components&limit=250', {
    headers: { Authorization: 'Bearer ' + decrypt(connection.token_ciphertext) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Meta template sync rejected.', { status: response.status, code: payload?.error?.code });
    return res.status(422).json({ error: { code: 'META_TEMPLATE_SYNC_FAILED', message: String(payload?.error?.message || 'Meta rejected the template sync.') } });
  }

  const now = new Date().toISOString();
  const rows = (Array.isArray(payload?.data) ? payload.data : [])
    .filter((template: any) => template?.name && template?.language)
    .map((template: any) => ({
      id: 'tmpl_' + crypto.createHash('sha256').update(identity.tenantId + ':' + template.name + ':' + template.language).digest('hex').slice(0, 30),
      tenant_id: identity.tenantId,
      name: String(template.name),
      language: String(template.language),
      category: String(template.category || 'UTILITY'),
      status: String(template.status || 'PENDING'),
      components: Array.isArray(template.components) ? template.components : [],
      updated_at: now,
    }));
  if (rows.length) {
    const { error } = await db.from('whatsapp_templates').upsert(rows, { onConflict: 'tenant_id,name,language' });
    if (error) throw error;
  }
  return serveTemplates(identity, { method: 'GET' }, res);
}

function outboundFail(res: any, status: number, code: string, message: string) {
  return res.status(status).json({ success: false, error: message, errorCode: code });
}

async function serveSend(identity: { uid: string; tenantId: string }, req: any, res: any) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  const recipient = String(req.body?.recipient || '').replace(/[^0-9]/g, '');
  const message = String(req.body?.message || '').trim();
  const messageType = String(req.body?.messageType || 'text');
  const templateName = String(req.body?.templateName || '').trim();
  const templateLanguage = String(req.body?.templateLanguage || 'en_US').trim() || 'en_US';
  const templateComponents = Array.isArray(req.body?.templateComponents) ? req.body.templateComponents : [];
  const contactName = String(req.body?.contactName || '').trim().slice(0, 100);
  const suppliedConversationId = String(req.body?.conversationId || '').trim();
  if (!/^\d{8,15}$/.test(recipient)) return outboundFail(res, 400, 'INVALID_RECIPIENT', 'Enter a valid WhatsApp number with country code, for example 919087779869.');
  if (!['text', 'template'].includes(messageType)) return outboundFail(res, 400, 'UNSUPPORTED_MESSAGE_TYPE', 'Only text and approved template messages are supported here.');
  if (messageType === 'text' && (!message || message.length > 4096)) return outboundFail(res, 400, 'INVALID_MESSAGE_BODY', 'Text messages must contain between 1 and 4096 characters.');
  if (messageType === 'template' && !/^[a-z0-9_]{1,512}$/i.test(templateName)) return outboundFail(res, 400, 'INVALID_TEMPLATE', 'Choose an approved WhatsApp template before sending the first message.');
  if (templateComponents.some((component: any) => !component || typeof component !== 'object')) return outboundFail(res, 400, 'INVALID_TEMPLATE_COMPONENTS', 'Template parameters are invalid.');
  const db = getDb();
  if (messageType === 'template') {
    const { data: template, error: templateError } = await db.from('whatsapp_templates')
      .select('id').eq('tenant_id', identity.tenantId).eq('name', templateName).eq('language', templateLanguage).eq('status', 'APPROVED').maybeSingle();
    if (templateError) throw templateError;
    if (!template) return outboundFail(res, 409, 'TEMPLATE_NOT_SYNCED', 'Sync and select an approved Meta template before sending it.');
  }
  const { data: connection, error: connectionError } = await db.from('whatsapp_connections')
    .select('id, phone_number_id, token_ciphertext, connection_status').eq('tenant_id', identity.tenantId).maybeSingle();
  if (connectionError) throw connectionError;
  if (!connection?.phone_number_id || !connection.token_ciphertext || connection.connection_status !== 'connected') return outboundFail(res, 409, 'CONNECTION_NOT_ACTIVE', 'Connect and save an active WhatsApp Cloud API account before sending messages.');
  let conversation: any = null;
  if (suppliedConversationId) {
    const { data, error } = await db.from('whatsapp_conversations').select('id, external_contact_identifier, contact_name')
      .eq('tenant_id', identity.tenantId).eq('id', suppliedConversationId).maybeSingle();
    if (error) throw error;
    if (!data || data.external_contact_identifier !== recipient) return outboundFail(res, 404, 'INVALID_CONVERSATION_CONTEXT', 'This chat is no longer available for the selected contact.');
    conversation = data;
  } else {
    const { data, error } = await db.from('whatsapp_conversations').select('id, external_contact_identifier, contact_name')
      .eq('tenant_id', identity.tenantId).eq('external_contact_identifier', recipient).maybeSingle();
    if (error) throw error;
    conversation = data;
  }
  const now = new Date().toISOString();
  // Do the 24-hour policy check before creating a new chat. A rejected
  // free-text first message must not leave a misleading empty contact behind.
  const conversationIdForPolicy = conversation?.id || 'conv_' + identity.tenantId + '_' + recipient;
  if (messageType === 'text') {
    const { data: window, error: windowError } = await db.from('whatsapp_conversation_windows').select('window_expires_at')
      .eq('tenant_id', identity.tenantId).eq('conversation_id', conversationIdForPolicy).maybeSingle();
    if (windowError) throw windowError;
    if (!window?.window_expires_at || new Date(window.window_expires_at).getTime() <= Date.now()) return outboundFail(res, 409, 'TEMPLATE_REQUIRED', 'WhatsApp allows free-text replies only within 24 hours after the customer messages you. Ask this contact to message your business number first, or send an approved template.');
  }
  if (!conversation) {
    const candidate = { id: conversationIdForPolicy, tenant_id: identity.tenantId, external_contact_identifier: recipient,
      contact_name: contactName || 'New contact', status: 'open', automation_mode: 'ai_active', last_message_at: now, created_at: now, updated_at: now };
    const { data, error } = await db.from('whatsapp_conversations').upsert(candidate, { onConflict: 'tenant_id,external_contact_identifier' })
      .select('id, external_contact_identifier, contact_name').single();
    if (error) throw error;
    conversation = data;
  }
  const payload = messageType === 'template'
    ? { messaging_product: 'whatsapp', to: recipient, type: 'template', template: { name: templateName, language: { code: templateLanguage }, ...(templateComponents.length ? { components: templateComponents } : {}) } }
    : { messaging_product: 'whatsapp', to: recipient, type: 'text', text: { body: message } };
  const response = await fetch('https://graph.facebook.com/' + (process.env.META_GRAPH_API_VERSION || 'v25.0') + '/' + connection.phone_number_id + '/messages',
    { method: 'POST', headers: { Authorization: 'Bearer ' + decrypt(connection.token_ciphertext), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const meta = await response.json().catch(() => ({}));
  if (!response.ok) { console.error('Meta WhatsApp send rejected.', { status: response.status, code: meta?.error?.code }); return outboundFail(res, 422, 'META_SEND_REJECTED', String(meta?.error?.message || 'Meta rejected the request.')); }
  const metaMessageId = String(meta?.messages?.[0]?.id || '');
  const { error: saveError } = await db.from('whatsapp_messages').insert({ id: 'msg_out_' + crypto.randomUUID(), tenant_id: identity.tenantId, conversation_id: conversation.id,
    whatsapp_connection_id: connection.id, meta_message_id: metaMessageId || null, direction: 'outbound', message_type: messageType,
    body: messageType === 'template' ? '[Template] ' + templateName : message, template_name: messageType === 'template' ? templateName : null,
    status: 'sent', source: 'human', created_at: now, updated_at: now });
  if (saveError) throw saveError;
  await db.from('whatsapp_conversations').update({ last_message_at: now, updated_at: now, contact_name: contactName || conversation.contact_name }).eq('tenant_id', identity.tenantId).eq('id', conversation.id);
  return res.status(200).json({ success: true, metaMessageId, conversationId: conversation.id });
}

export default async function handler(req: any, res: any) {
  const identity = await authenticate(req, res);
  if (!identity) return;

  try {
    const whatsappRoute = String(req.query?.whatsappRoute || '');
    if (['inbox', 'messages', 'send', 'templates'].includes(whatsappRoute)) {
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Vary', 'Authorization');
    }
    if (whatsappRoute === 'inbox') return await serveInbox(identity, req, res);
    if (whatsappRoute === 'messages') return await serveMessages(identity, req, res);
    if (whatsappRoute === 'send') return await serveSend(identity, req, res);
    if (whatsappRoute === 'templates') return await serveTemplates(identity, req, res);
    if (req.method === 'GET') return res.status(200).json(await readConnection(identity.tenantId));

    if (req.method === 'PUT') {
      const { senderPhone, senderName, message } = req.body || {};
      const cleanPhone = String(senderPhone || '').replace(/[^0-9]/g, '');
      const cleanName = String(senderName || '').trim();
      const cleanMessage = String(message || '').trim();

      if (!/^\\d{8,15}$/.test(cleanPhone) || !cleanName || cleanName.length > 100 || !cleanMessage || cleanMessage.length > 4096) {
        return res.status(400).json({ success: false, error: 'A valid sender phone, sender name, and message are required.' });
      }

      const { data: configured, error: configuredError } = await getDb()
        .from('whatsapp_connections')
        .select('phone_number_id')
        .eq('tenant_id', identity.tenantId)
        .maybeSingle();

      if (configuredError) throw Object.assign(new Error('WhatsApp connection storage is unavailable.'), { code: 'WHATSAPP_DATABASE_UNAVAILABLE' });
      if (!configured?.phone_number_id) {
        return res.status(409).json({ success: false, error: 'Save a WhatsApp Cloud API connection before testing inbound events.' });
      }

      const payload = {
        object: 'whatsapp_business_account',
        entry: [{
          id: `simulated-entry-${Date.now()}`,
          changes: [{
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { phone_number_id: configured.phone_number_id },
              contacts: [{ profile: { name: cleanName }, wa_id: cleanPhone }],
              messages: [{
                from: cleanPhone,
                id: `sim-msg-${crypto.randomUUID()}`,
                timestamp: Math.floor(Date.now() / 1000).toString(),
                text: { body: cleanMessage },
                type: 'text',
              }],
            },
          }],
        }],
      };

      const result = await processWebhookPayload(payload);
      return res.status(200).json({ success: true, result });
    }

    if (req.method === 'POST') {
      const { phoneNumberId, accessToken, wabaId, verifyToken, displayPhoneNumber, verifiedName } = req.body || {};
      if (!phoneNumberId || typeof phoneNumberId !== 'string') {
        return res.status(400).json({ success: false, error: 'phoneNumberId is required.' });
      }

      const db = getDb();
      const { data: existing, error: existingError } = await db.from('whatsapp_connections').select('*').eq('tenant_id', identity.tenantId).maybeSingle();
      if (existingError) throw Object.assign(new Error('WhatsApp connection storage is unavailable.'), { code: 'WHATSAPP_DATABASE_UNAVAILABLE' });

      const tokenCiphertext = accessToken?.trim() ? encrypt(accessToken.trim()) : (existing?.token_ciphertext || null);
      const verifyTokenCiphertext = verifyToken?.trim() ? encrypt(verifyToken.trim()) : (existing?.verify_token || '');
      const row = {
        id: existing?.id || `conn_${identity.tenantId}_${Date.now()}`,
        tenant_id: identity.tenantId,
        provider: 'meta',
        waba_id: wabaId || existing?.waba_id || null,
        phone_number_id: phoneNumberId.trim(),
        display_phone_number: displayPhoneNumber || existing?.display_phone_number || null,
        verified_name: verifiedName || existing?.verified_name || null,
        connection_status: 'connected',
        business_verification_status: existing?.business_verification_status || 'pending',
        display_name_status: existing?.display_name_status || 'pending',
        token_ciphertext: tokenCiphertext,
        token_expiry_at: null,
        verify_token: verifyTokenCiphertext,
        connected_at: existing?.connected_at || new Date().toISOString(),
        disconnected_at: null,
        last_verified_at: new Date().toISOString(),
      };

      const { error } = await db.from('whatsapp_connections').upsert(row, { onConflict: 'tenant_id' });
      if (error) throw Object.assign(new Error('WhatsApp connection could not be saved.'), { code: 'WHATSAPP_DATABASE_UNAVAILABLE' });
      return res.status(200).json({ success: true, connection: await readConnection(identity.tenantId) });
    }

    res.setHeader('Allow', 'GET, POST, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    const status = ['WHATSAPP_SCHEMA_NOT_READY', 'WHATSAPP_DATABASE_UNAVAILABLE'].includes(error.code) ? 503 : 500;
    return res.status(status).json({ success: false, error: error.message || 'Failed to access WhatsApp connection.', code: error.code });
  }
}
