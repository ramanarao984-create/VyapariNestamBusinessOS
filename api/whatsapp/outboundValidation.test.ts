import { describe, expect, it } from 'vitest';
import { OutboundValidationError, validateOutboundRequest } from './outboundValidation';

describe('outbound WhatsApp request validation', () => {
  it('normalizes an international recipient and accepts a bounded text message', () => {
    expect(validateOutboundRequest({
      recipient: '+91 90877 79869',
      message: 'Appointment reminder',
    })).toMatchObject({
      recipient: '919087779869',
      messageType: 'text',
    });
  });

  it('requires a valid recipient and does not coerce arbitrary values into a send', () => {
    expect(() => validateOutboundRequest({ recipient: 'bad', message: 'Hello' }))
      .toThrowError(OutboundValidationError);
  });

  it('requires an approved-name shaped template and HTTPS media links', () => {
    expect(() => validateOutboundRequest({
      recipient: '919087779869',
      messageType: 'template',
      templateName: 'unsafe template name!',
    })).toThrowError(OutboundValidationError);

    expect(() => validateOutboundRequest({
      recipient: '919087779869',
      messageType: 'image',
      mediaUrl: 'http://example.com/file.jpg',
    })).toThrowError(OutboundValidationError);
  });
});
