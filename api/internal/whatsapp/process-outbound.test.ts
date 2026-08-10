import { describe, expect, it } from 'vitest';
import { boundedBatchSize, isRetryableDeliveryFailure, nextDeliveryAttempt, toSendOptions } from './process-outbound';

describe('WhatsApp outbound delivery worker helpers', () => {
  it('keeps worker batch sizes bounded', () => {
    expect(boundedBatchSize('0')).toBe(1);
    expect(boundedBatchSize('999')).toBe(100);
    expect(boundedBatchSize('invalid')).toBe(25);
  });

  it('retries only temporary provider failures', () => {
    expect(isRetryableDeliveryFailure('130429')).toBe(true);
    expect(isRetryableDeliveryFailure('503')).toBe(true);
    expect(isRetryableDeliveryFailure('190')).toBe(false);
    expect(isRetryableDeliveryFailure('INVALID_RECIPIENT')).toBe(false);
  });

  it('backs off retry attempts', () => {
    expect(nextDeliveryAttempt(1, new Date('2026-08-10T00:00:00.000Z'))).toBe('2026-08-10T00:01:00.000Z');
    expect(nextDeliveryAttempt(3, new Date('2026-08-10T00:00:00.000Z'))).toBe('2026-08-10T00:04:00.000Z');
  });

  it('never allows a job payload to override the tenant', () => {
    expect(() => toSendOptions({
      id: 'job_1',
      tenant_id: 'tenant_a',
      recipient: '919087779869',
      attempts: 1,
      max_attempts: 5,
      payload: { tenantId: 'tenant_b', messageType: 'template', templateName: 'appointment_reminder' },
    })).toThrow('tenant does not match');
  });

  it('uses the job tenant and recipient for a valid payload', () => {
    expect(toSendOptions({
      id: 'job_1',
      tenant_id: 'tenant_a',
      recipient: '919087779869',
      attempts: 1,
      max_attempts: 5,
      payload: { messageType: 'template', templateName: 'appointment_reminder', source: 'automation' },
    })).toMatchObject({
      tenantId: 'tenant_a',
      recipientPhone: '919087779869',
      messageType: 'template',
      templateName: 'appointment_reminder',
      source: 'automation',
    });
  });
});
