import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function getDb() {
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

function decrypt(value: string) {
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

function authError(res: any, status: number, code: string, message: string) {
  return res.status(status).json({ error: { code, message } });
}

async function authenticate(req: any, res: any) {
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
    const { data: user, error: userError } = await db.from('users').select('tenant_id, role').eq('id', account.localId).maybeSingle();
    if (userError || !user) return authError(res, 403, 'TENANT_NOT_MAPPED', 'Authenticated user is not assigned to a tenant.');
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
  if (!data) return { isConnected: false, tenantId, phoneNumberId: null, wabaId: null, displayPhoneNumber: null, verifiedName: null, connectionStatus: 'disconnected', maskedToken: null, verifyToken: '', lastVerifiedAt: null };
  let maskedToken = null;
  try { maskedToken = data.token_ciphertext ? mask(decrypt(data.token_ciphertext)) : null; } catch { maskedToken = '••••••••'; }
  return {
    isConnected: data.connection_status === 'connected',
    tenantId: data.tenant_id,
    phoneNumberId: data.phone_number_id,
    wabaId: data.waba_id,
    displayPhoneNumber: data.display_phone_number,
    verifiedName: data.verified_name,
    connectionStatus: data.connection_status,
    maskedToken,
    verifyToken: data.verify_token || '',
    lastVerifiedAt: data.last_verified_at,
  };
}

export default async function handler(req: any, res: any) {
  const identity = await authenticate(req, res);
  if (!identity) return;

  try {
    if (req.method === 'GET') return res.status(200).json(await readConnection(identity.tenantId));

    if (req.method === 'POST') {
      const { phoneNumberId, accessToken, wabaId, verifyToken, displayPhoneNumber, verifiedName } = req.body || {};
      if (!phoneNumberId || typeof phoneNumberId !== 'string') {
        return res.status(400).json({ success: false, error: 'phoneNumberId is required.' });
      }

      const db = getDb();
      const { data: existing, error: existingError } = await db.from('whatsapp_connections').select('*').eq('tenant_id', identity.tenantId).maybeSingle();
      if (existingError) throw Object.assign(new Error('WhatsApp connection storage is unavailable.'), { code: 'WHATSAPP_DATABASE_UNAVAILABLE' });

      const tokenCiphertext = accessToken?.trim() ? encrypt(accessToken.trim()) : (existing?.token_ciphertext || null);
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
        verify_token: verifyToken || existing?.verify_token || '',
        connected_at: existing?.connected_at || new Date().toISOString(),
        disconnected_at: null,
        last_verified_at: new Date().toISOString(),
      };

      const { error } = await db.from('whatsapp_connections').upsert(row, { onConflict: 'tenant_id' });
      if (error) throw Object.assign(new Error('WhatsApp connection could not be saved.'), { code: 'WHATSAPP_DATABASE_UNAVAILABLE' });
      return res.status(200).json({ success: true, connection: await readConnection(identity.tenantId) });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    const status = ['WHATSAPP_SCHEMA_NOT_READY', 'WHATSAPP_DATABASE_UNAVAILABLE'].includes(error.code) ? 503 : 500;
    return res.status(status).json({ success: false, error: error.message || 'Failed to access WhatsApp connection.', code: error.code });
  }
}
