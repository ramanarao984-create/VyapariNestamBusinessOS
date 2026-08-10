import crypto from 'node:crypto';
import { isWebhookSignatureValid, processWebhookPayload } from './webhookProcessor';

export const config = { api: { bodyParser: false } };

function matchesSecret(provided: string | undefined, expected: string): boolean {
  if (!provided || !expected) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

function getVerifyToken(): string {
  return process.env.META_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN || '';
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
    const isValid = query['hub.mode'] === 'subscribe'
      && matchesSecret(query['hub.verify_token'], getVerifyToken());

    if (!isValid) return res.status(403).send('Forbidden');
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
