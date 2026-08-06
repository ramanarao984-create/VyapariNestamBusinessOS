import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import { WebhookService } from '../WebhookService';
import { WHATSAPP_CONFIG } from '../config';

describe('Meta Webhook Security & Signature Validation Specifications', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should validate webhook GET handshake with correct verify token', () => {
    const query = {
      'hub.mode': 'subscribe',
      'hub.verify_token': 'nestam_crm_secure_token',
      'hub.challenge': '1234567890',
    };

    const res = WebhookService.verifyWebhookHandshake(query, 'nestam_crm_secure_token');
    expect(res.success).toBe(true);
    expect(res.challenge).toBe('1234567890');
  });

  it('should reject webhook GET handshake with invalid verify token', () => {
    const query = {
      'hub.mode': 'subscribe',
      'hub.verify_token': 'wrong_token',
      'hub.challenge': '1234567890',
    };

    const res = WebhookService.verifyWebhookHandshake(query, 'custom_correct_token');
    expect(res.success).toBe(false);
    expect(res.reason).toBeDefined();
  });

  it('should validate x-hub-signature-256 using HMAC-SHA256', () => {
    const appSecret = 'test_meta_app_secret_12345';
    WHATSAPP_CONFIG.META_APP_SECRET = appSecret;

    const rawBody = Buffer.from(JSON.stringify({ object: 'whatsapp_business_account', entry: [] }));
    const computedHash = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
    const signatureHeader = `sha256=${computedHash}`;

    const isValid = WebhookService.validateWebhookSignature(rawBody, signatureHeader);
    expect(isValid).toBe(true);
  });

  it('should reject invalid x-hub-signature-256 headers', () => {
    const appSecret = 'test_meta_app_secret_12345';
    WHATSAPP_CONFIG.META_APP_SECRET = appSecret;

    const rawBody = Buffer.from(JSON.stringify({ object: 'whatsapp_business_account' }));
    const invalidHeader = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';

    const isValid = WebhookService.validateWebhookSignature(rawBody, invalidHeader);
    expect(isValid).toBe(false);
  });

  it('should parse inbound text messages with tenant ID', () => {
    const tenantId = 'tenant_clinic_a';
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '15551234567', phone_number_id: '10987654321' },
                contacts: [{ profile: { name: 'Patient John' }, wa_id: '919876543210' }],
                messages: [
                  {
                    from: '919876543210',
                    id: 'wamid.HBgMOTE5ODc2NTQzMjEwFQIAERgSQTFCMkMzRDQ1RTZGN0E4OTkA',
                    timestamp: '1700000000',
                    text: { body: 'I need an appointment tomorrow' },
                    type: 'text',
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const parsed = WebhookService.parseInboundMessages(payload, tenantId);
    expect(parsed.length).toBe(1);
    expect(parsed[0].tenantId).toBe(tenantId);
    expect(parsed[0].fromPhoneNumber).toBe('919876543210');
    expect(parsed[0].contactName).toBe('Patient John');
    expect(parsed[0].textBody).toBe('I need an appointment tomorrow');
  });
});
