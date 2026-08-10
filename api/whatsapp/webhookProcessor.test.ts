import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { extractWebhookEvents, isWebhookSignatureValid } from './webhookProcessor';

describe('WhatsApp webhook processor', () => {
  it('extracts inbound messages and delivery statuses only from the Meta messages field', () => {
    const events = extractWebhookEvents({
      object: 'whatsapp_business_account',
      entry: [{
        id: 'waba_1',
        changes: [{
          field: 'messages',
          value: {
            metadata: { phone_number_id: 'phone_1' },
            contacts: [{ wa_id: '919000000000', profile: { name: 'Raman' } }],
            messages: [{ id: 'wamid.inbound', from: '919000000000', type: 'text', text: { body: 'Hello' } }],
            statuses: [{ id: 'wamid.outbound', status: 'delivered', timestamp: '1760000000' }],
          },
        }],
      }],
    });

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ kind: 'message', phoneNumberId: 'phone_1', wabaId: 'waba_1' });
    expect(events[1]).toMatchObject({ kind: 'status', phoneNumberId: 'phone_1' });
  });

  it('ignores a payload outside the WhatsApp Business webhook contract', () => {
    expect(extractWebhookEvents({ object: 'page', entry: [] })).toEqual([]);
    expect(extractWebhookEvents({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'statuses', value: {} }] }] })).toEqual([]);
  });

  it('accepts only the exact Meta HMAC signature', () => {
    const secret = 'app-secret';
    const body = Buffer.from(JSON.stringify({ object: 'whatsapp_business_account' }));
    const signature = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');

    expect(isWebhookSignatureValid(body, signature, secret)).toBe(true);
    expect(isWebhookSignatureValid(body, signature, 'wrong-secret')).toBe(false);
    expect(isWebhookSignatureValid(body, undefined, secret)).toBe(false);
  });
});
