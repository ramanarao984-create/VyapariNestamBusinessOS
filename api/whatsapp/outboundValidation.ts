export type SupportedMessageType = 'text' | 'template' | 'image' | 'document' | 'audio' | 'video' | 'interactive';

export interface OutboundRequest {
  recipient?: unknown;
  message?: unknown;
  messageType?: unknown;
  templateName?: unknown;
  templateLanguage?: unknown;
  templateComponents?: unknown;
  mediaUrl?: unknown;
  conversationId?: unknown;
}

export interface ValidatedOutboundRequest {
  recipient: string;
  message: string;
  messageType: SupportedMessageType;
  templateName?: string;
  templateLanguage?: string;
  templateComponents?: any[];
  mediaUrl?: string;
  conversationId?: string;
}

export class OutboundValidationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

const supportedMessageTypes = new Set<SupportedMessageType>([
  'text', 'template', 'image', 'document', 'audio', 'video', 'interactive',
]);

function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function validateOutboundRequest(input: OutboundRequest): ValidatedOutboundRequest {
  const recipient = String(input.recipient || '').replace(/[^0-9]/g, '');
  if (!/^\d{8,15}$/.test(recipient)) {
    throw new OutboundValidationError('INVALID_RECIPIENT', 'Recipient must be a valid international phone number.');
  }

  const templateName = optionalString(input.templateName);
  const mediaUrl = optionalString(input.mediaUrl);
  const explicitType = optionalString(input.messageType);
  const inferredType = explicitType || (templateName ? 'template' : mediaUrl ? 'image' : 'text');

  if (!supportedMessageTypes.has(inferredType as SupportedMessageType)) {
    throw new OutboundValidationError('UNSUPPORTED_MESSAGE_TYPE', 'This WhatsApp message type is not supported.');
  }

  const messageType = inferredType as SupportedMessageType;
  const message = optionalString(input.message) || '';

  if (messageType === 'template') {
    if (!templateName || !/^[a-z0-9_]{1,512}$/i.test(templateName)) {
      throw new OutboundValidationError('INVALID_TEMPLATE', 'An approved WhatsApp template name is required.');
    }
  } else if (['image', 'document', 'audio', 'video'].includes(messageType)) {
    if (!mediaUrl) {
      throw new OutboundValidationError('MEDIA_URL_REQUIRED', 'A secure media URL is required for this message type.');
    }

    try {
      const url = new URL(mediaUrl);
      if (url.protocol !== 'https:') throw new Error('not https');
    } catch {
      throw new OutboundValidationError('INVALID_MEDIA_URL', 'Media URLs must use HTTPS.');
    }
  } else if (!message || message.length > 4096) {
    throw new OutboundValidationError(
      'INVALID_MESSAGE_BODY',
      'Text messages must contain between 1 and 4096 characters.',
    );
  }

  if (templateName && templateName.length > 512) {
    throw new OutboundValidationError('INVALID_TEMPLATE', 'Template name is too long.');
  }

  const templateComponents = input.templateComponents === undefined ? undefined : input.templateComponents;
  if (templateComponents !== undefined && !Array.isArray(templateComponents)) {
    throw new OutboundValidationError('INVALID_TEMPLATE_COMPONENTS', 'Template components must be a list.');
  }

  return {
    recipient,
    message,
    messageType,
    templateName,
    templateLanguage: optionalString(input.templateLanguage) || 'en_US',
    templateComponents: templateComponents as any[] | undefined,
    mediaUrl,
    conversationId: optionalString(input.conversationId),
  };
}
