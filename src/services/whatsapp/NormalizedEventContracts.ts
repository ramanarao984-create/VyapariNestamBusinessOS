/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type InboundEventType = 'message' | 'status' | 'handshake';

export type InboundMessageType =
  | 'text'
  | 'interactive_button'
  | 'interactive_list'
  | 'location'
  | 'image'
  | 'document'
  | 'audio'
  | 'video'
  | 'contact'
  | 'unsupported'
  | 'status_update';

export interface LocationPayload {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface MediaRefPayload {
  id?: string;
  mimeType?: string;
  filename?: string;
  sha256?: string;
  caption?: string;
}

export interface InboundEventContract {
  tenantId: string;
  phoneNumberId: string;
  wabaId?: string;
  providerMessageId: string;
  senderWhatsAppId: string;
  contactName: string;
  eventType: InboundEventType;
  messageType: InboundMessageType;
  sanitizedText?: string;
  interactionIdentifier?: string; // ID of button or list item clicked
  location?: LocationPayload;
  mediaRef?: MediaRefPayload;
  providerTimestamp: string; // ISO 8601 string
  correlationId: string;
  replyToMessageId?: string;
  rawPayloadRef?: any;
}

export interface NormalizedStatusEventContract {
  tenantId: string;
  phoneNumberId: string;
  providerMessageId: string;
  recipientWhatsAppId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  providerTimestamp: string;
  errorCode?: string;
  errorDetails?: any;
}
