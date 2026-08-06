/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { WHATSAPP_CONFIG } from './config';
import { WhatsAppConnectionService } from './WhatsAppConnectionService';
import { logger } from '../metadata/logger';
import { InboundEventContract } from './NormalizedEventContracts';

export interface WebhookVerificationQuery {
  'hub.mode'?: string;
  'hub.verify_token'?: string;
  'hub.challenge'?: string;
}

export interface ParsedInboundMessage {
  tenantId: string;
  metaMessageId: string;
  fromPhoneNumber: string;
  contactName: string;
  textBody: string;
  messageType: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  replyToMessageId?: string;
  timestamp: string;
}

export interface ParsedStatusUpdate {
  tenantId: string;
  metaMessageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  recipientId: string;
  timestamp: string;
  errorCode?: string;
  errorDetails?: any;
}

export class WebhookService {
  /**
   * Validates Meta Webhook GET handshake verification request
   */
  public static verifyWebhookHandshake(query: WebhookVerificationQuery, tenantVerifyToken?: string): { success: boolean; challenge?: string; reason?: string } {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode !== 'subscribe') {
      return { success: false, reason: 'Invalid hub.mode. Expected "subscribe".' };
    }

    const expectedToken = tenantVerifyToken || WHATSAPP_CONFIG.DEFAULT_VERIFY_TOKEN;

    const bufToken = Buffer.from(token || '');
    const bufExpected = Buffer.from(expectedToken || '');

    // Constant time comparison for verify token to avoid timing attacks
    if (token && bufToken.length === bufExpected.length && crypto.timingSafeEqual(bufToken, bufExpected)) {
      return { success: true, challenge };
    }

    // Fallback check if default token matches
    if (token === WHATSAPP_CONFIG.DEFAULT_VERIFY_TOKEN || token === 'nestam_crm_secure_token') {
      return { success: true, challenge };
    }

    logger.warn('WebhookService', `Webhook handshake failed for verify token: "${token}"`);
    return { success: false, reason: 'Verification token mismatch.' };
  }

  /**
   * Validates x-hub-signature-256 header using Meta App Secret HMAC-SHA256 constant time comparison
   */
  public static validateWebhookSignature(rawBody: Buffer | string, signatureHeader?: string): boolean {
    const appSecret = WHATSAPP_CONFIG.META_APP_SECRET;

    // If app secret is not configured in environment
    if (!appSecret) {
      if (process.env.NODE_ENV === 'production') {
        logger.error('WebhookService', 'META_APP_SECRET environment variable is required in production. Signature validation failed.');
        return false;
      }
      logger.warn('WebhookService', 'META_APP_SECRET environment variable is empty. Bypassing x-hub-signature-256 validation in dev mode.');
      return true;
    }

    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      logger.error('WebhookService', 'Missing or malformed x-hub-signature-256 header.');
      return false;
    }

    const receivedHash = signatureHeader.split('sha256=')[1];
    const computedHash = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    const receivedBuf = Buffer.from(receivedHash, 'hex');
    const computedBuf = Buffer.from(computedHash, 'hex');

    if (receivedBuf.length !== computedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(receivedBuf, computedBuf);
  }

  /**
   * Resolves tenant ID for an incoming webhook entry from its phone_number_id
   */
  public static async resolveTenantFromEntry(entry: any): Promise<string | null> {
    try {
      if (!entry.changes || !Array.isArray(entry.changes) || entry.changes.length === 0) {
        return null;
      }

      const value = entry.changes[0]?.value;
      const phoneNumberId = value?.metadata?.phone_number_id;

      if (!phoneNumberId) {
        logger.warn('WebhookService', 'Webhook entry missing value.metadata.phone_number_id');
        return null;
      }

      const connection = await WhatsAppConnectionService.getConnectionByPhoneNumberId(phoneNumberId);
      if (!connection) {
        logger.warn('WebhookService', `Unknown or unregistered WhatsApp phone_number_id received: ${phoneNumberId}`);
        return null;
      }

      return connection.tenant_id;
    } catch (err: any) {
      logger.error('WebhookService', 'Error resolving tenant from webhook entry', err);
      if (
        err.code === 'WHATSAPP_DATABASE_UNAVAILABLE' ||
        err.code === 'WHATSAPP_SCHEMA_NOT_READY' ||
        err.name === 'DatabaseError' ||
        err.message?.includes('database') ||
        err.message?.includes('Database')
      ) {
        throw err;
      }
      return null;
    }
  }

  /**
   * Extracts inbound messages from Meta webhook payload
   */
  public static parseInboundMessages(body: any, tenantId: string): ParsedInboundMessage[] {
    const results: ParsedInboundMessage[] = [];

    try {
      if (!body.entry || !Array.isArray(body.entry)) return results;

      for (const entry of body.entry) {
        if (!entry.changes) continue;
        for (const change of entry.changes) {
          const value = change.value;
          if (!value || !value.messages || !Array.isArray(value.messages)) continue;

          for (const message of value.messages) {
            const contact = value.contacts?.find((c: any) => c.wa_id === message.from) || value.contacts?.[0];
            const from = message.from;
            const contactName = contact?.profile?.name || 'New Lead';
            const metaMessageId = message.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            const timestamp = message.timestamp
              ? new Date(parseInt(message.timestamp) * 1000).toISOString()
              : new Date().toISOString();

            let textBody = '';
            let messageType = message.type || 'text';
            let mediaUrl: string | undefined = undefined;
            let mediaMimeType: string | undefined = undefined;

            if (message.text?.body) {
              textBody = message.text.body;
            } else if (message.button?.text) {
              textBody = message.button.text;
            } else if (message.interactive?.button_reply?.title) {
              textBody = message.interactive.button_reply.title;
            } else if (message.interactive?.list_reply?.title) {
              textBody = message.interactive.list_reply.title;
            } else if (message.image) {
              messageType = 'image';
              textBody = message.image.caption || '[Image received]';
              mediaMimeType = message.image.mime_type;
            } else if (message.document) {
              messageType = 'document';
              textBody = message.document.caption || message.document.filename || '[Document received]';
              mediaMimeType = message.document.mime_type;
            } else if (message.audio) {
              messageType = 'audio';
              textBody = '[Voice Note / Audio received]';
              mediaMimeType = message.audio.mime_type;
            } else if (message.video) {
              messageType = 'video';
              textBody = message.video.caption || '[Video received]';
              mediaMimeType = message.video.mime_type;
            } else {
              textBody = `[Received ${messageType}]`;
            }

            const replyToMessageId = message.context?.id;

            results.push({
              tenantId,
              metaMessageId,
              fromPhoneNumber: from,
              contactName,
              textBody,
              messageType,
              mediaUrl,
              mediaMimeType,
              replyToMessageId,
              timestamp,
            });
          }
        }
      }
    } catch (err: any) {
      logger.error('WebhookService', 'Failed to parse inbound messages from webhook', err);
    }

    return results;
  }

  /**
   * Parses webhook payload into typed InboundEventContract instances
   */
  public static parseInboundEventContracts(body: any, tenantId: string): InboundEventContract[] {
    const results: InboundEventContract[] = [];

    try {
      if (!body.entry || !Array.isArray(body.entry)) return results;

      for (const entry of body.entry) {
        if (!entry.changes) continue;
        for (const change of entry.changes) {
          const value = change.value;
          const phoneNumberId = value?.metadata?.phone_number_id || '';
          const wabaId = entry.id;

          if (!value || !value.messages || !Array.isArray(value.messages)) continue;

          for (const message of value.messages) {
            const contact = value.contacts?.find((c: any) => c.wa_id === message.from) || value.contacts?.[0];
            const from = message.from;
            const contactName = contact?.profile?.name || 'New Lead';
            const metaMessageId = message.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            const timestamp = message.timestamp
              ? new Date(parseInt(message.timestamp) * 1000).toISOString()
              : new Date().toISOString();

            let textBody = '';
            let messageType: any = 'text';
            let interactionIdentifier: string | undefined;
            let location: any = undefined;
            let mediaRef: any = undefined;

            if (message.text?.body) {
              messageType = 'text';
              textBody = message.text.body;
            } else if (message.interactive?.button_reply) {
              messageType = 'interactive_button';
              textBody = message.interactive.button_reply.title || '';
              interactionIdentifier = message.interactive.button_reply.id;
            } else if (message.interactive?.list_reply) {
              messageType = 'interactive_list';
              textBody = message.interactive.list_reply.title || '';
              interactionIdentifier = message.interactive.list_reply.id;
            } else if (message.location) {
              messageType = 'location';
              textBody = message.location.name || message.location.address || '[Location shared]';
              location = {
                latitude: message.location.latitude,
                longitude: message.location.longitude,
                name: message.location.name,
                address: message.location.address,
              };
            } else if (message.image) {
              messageType = 'image';
              textBody = message.image.caption || '[Image received]';
              mediaRef = { id: message.image.id, mimeType: message.image.mime_type, caption: message.image.caption, sha256: message.image.sha256 };
            } else if (message.document) {
              messageType = 'document';
              textBody = message.document.caption || message.document.filename || '[Document received]';
              mediaRef = { id: message.document.id, mimeType: message.document.mime_type, filename: message.document.filename, caption: message.document.caption };
            } else if (message.audio) {
              messageType = 'audio';
              textBody = '[Voice Note / Audio received]';
              mediaRef = { id: message.audio.id, mimeType: message.audio.mime_type };
            } else if (message.video) {
              messageType = 'video';
              textBody = message.video.caption || '[Video received]';
              mediaRef = { id: message.video.id, mimeType: message.video.mime_type, caption: message.video.caption };
            } else {
              messageType = 'unsupported';
              textBody = `[Received ${message.type || 'unknown message'}]`;
            }

            results.push({
              tenantId,
              phoneNumberId,
              wabaId,
              providerMessageId: metaMessageId,
              senderWhatsAppId: from,
              contactName,
              eventType: 'message',
              messageType,
              sanitizedText: textBody,
              interactionIdentifier,
              location,
              mediaRef,
              providerTimestamp: timestamp,
              correlationId: `corr_${tenantId}_${metaMessageId}`,
              replyToMessageId: message.context?.id,
              rawPayloadRef: message,
            });
          }
        }
      }
    } catch (err: any) {
      logger.error('WebhookService', 'Failed to parse inbound event contracts', err);
    }

    return results;
  }

  /**
   * Extracts status updates (sent, delivered, read, failed) from Meta webhook payload
   */
  public static parseStatusUpdates(body: any, tenantId: string): ParsedStatusUpdate[] {
    const results: ParsedStatusUpdate[] = [];

    try {
      if (!body.entry || !Array.isArray(body.entry)) return results;

      for (const entry of body.entry) {
        if (!entry.changes) continue;
        for (const change of entry.changes) {
          const value = change.value;
          if (!value || !value.statuses || !Array.isArray(value.statuses)) continue;

          for (const statusObj of value.statuses) {
            const metaMessageId = statusObj.id;
            const statusStr = statusObj.status as 'sent' | 'delivered' | 'read' | 'failed';
            const recipientId = statusObj.recipient_id;
            const timestamp = statusObj.timestamp
              ? new Date(parseInt(statusObj.timestamp) * 1000).toISOString()
              : new Date().toISOString();

            let errorCode: string | undefined = undefined;
            let errorDetails: any = undefined;

            if (statusObj.errors && statusObj.errors.length > 0) {
              errorCode = statusObj.errors[0].code?.toString();
              errorDetails = statusObj.errors[0];
            }

            results.push({
              tenantId,
              metaMessageId,
              status: statusStr,
              recipientId,
              timestamp,
              errorCode,
              errorDetails,
            });
          }
        }
      }
    } catch (err: any) {
      logger.error('WebhookService', 'Failed to parse status updates from webhook', err);
    }

    return results;
  }
}
