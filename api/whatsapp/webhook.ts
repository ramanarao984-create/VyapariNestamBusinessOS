import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { CryptoService } from '../../src/services/whatsapp/CryptoService';
import { isWebhookSignatureValid, processWebhookPayload } from './webhookProcessor';

export const config = { api: { bodyParser: false } };

function matchesSecret(provided: string | undefined, expected: string): boolean {
  if (!provided || !expected) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}


function getDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('WhatsApp database configuration is missing.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function matchesStoredVerifyToken(provided: string): Promise<boolean> {
  if (!provided) return false;
  const { data, error } = await getDb()
    .from('whatsapp_connections')
    .select('verify_token')
    .not('verify_token', 'is', null)
    .limit(5000);

  if (error) throw error;
  return (data || []).some((row: any) => {
    try {
      return matchesSecret(provided, CryptoService.decrypt(String(row.verify_token || '')));
    } catch {
      return false;
    }
  });
}

function getRawBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    const query = req.query || {};
    if (query['hub.mode'] !== 'subscribe') return res.status(403).send('Forbidden');
    try {
      const isValid = await matchesStoredVerifyToken(String(query['hub.verify_token'] || ''));
      if (!isValid) return res.status(403).send('Forbidden');
    } catch (error: any) {
      console.error('WhatsApp webhook verification lookup failed.', { code: error?.code || 'WHATSAPP_DATABASE_UNAVAILABLE' });
      return res.status(503).send('Webhook verification temporarily unavailable');
    }
    return res.status(200).send(query['hub.challenge'] || '');
  }

  if (req.method === 'POST') {
    try {
      const rawBody = await getRawBody(req);
      const appSecret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || '';
      const signature = req.headers['x-hub-signature-256'] as string | undefined;

      if (!appSecret || !signature?.startsWith('sha256=')) {
        return res.status(503).json({ error: 'Webhook signature configuration missing' });
      }

      if (!isWebhookSignatureValid(rawBody, signature, appSecret)) {
        return res.status(401).json({ error: 'Invalid HMAC signature' });
      }

      let payload: any;
      try {
        payload = JSON.parse(rawBody.toString('utf8'));
      } catch {
        return res.status(400).json({ error: 'Invalid JSON payload' });
      }

      const result = await processWebhookPayload(payload);
      return res.status(200).json({ status: 'processed', ...result });
    } catch (error: any) {
      const code = error?.code || 'WHATSAPP_WEBHOOK_PROCESSING_FAILED';
      console.error('WhatsApp webhook processing failed.', { code });
      // A 5xx response tells Meta to retry a signed event after transient
      // database or configuration failures. Details remain server-side.
      return res.status(503).json({ error: 'Webhook processing temporarily unavailable', code });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
