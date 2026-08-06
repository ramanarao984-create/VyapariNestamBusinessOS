/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WhatsAppConnectionRecord } from './WhatsAppConnectionService';
import { ConversationRecord, MessageRecord } from './ConversationService';

/**
 * Isolated In-Memory WhatsApp Repository strictly reserved for unit testing and local testing environments.
 * 
 * CRITICAL PRODUCTION SECURITY GUARD:
 * This repository MUST NOT be instantiated or used in production environments.
 * It will throw a fatal error if invoked when NODE_ENV === 'production' or without explicit test mode flags.
 */
export class InMemoryWhatsAppRepository {
  private static connections = new Map<string, WhatsAppConnectionRecord>();
  private static conversations = new Map<string, ConversationRecord>();
  private static messages = new Map<string, MessageRecord[]>();
  private static idempotency = new Set<string>();
  private static idempotencyStatus = new Map<string, 'PROCESSING' | 'COMPLETED' | 'FAILED'>();
  private static consents = new Map<string, 'opted_in' | 'opted_out'>();

  constructor() {
    InMemoryWhatsAppRepository.assertTestEnvironmentAllowed();
  }

  private static assertTestEnvironmentAllowed(): void {
    const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true' || process.env.ALLOW_IN_MEMORY_STORAGE === 'true';
    const isProd = process.env.NODE_ENV === 'production';

    if (isProd || !isTest) {
      throw new Error(
        'SECURITY EXCEPTION: InMemoryWhatsAppRepository is strictly forbidden in production. ' +
        'Durable PostgreSQL/Supabase database storage MUST be used exclusively for WhatsApp persistence.'
      );
    }
  }

  public static clear(): void {
    this.assertTestEnvironmentAllowed();
    this.connections.clear();
    this.conversations.clear();
    this.messages.clear();
    this.idempotency.clear();
    this.idempotencyStatus.clear();
    this.consents.clear();
  }

  // Connection Operations
  public static saveConnection(tenantId: string, record: WhatsAppConnectionRecord): void {
    this.assertTestEnvironmentAllowed();
    this.connections.set(tenantId, record);
  }

  public static getConnection(tenantId: string): WhatsAppConnectionRecord | null {
    this.assertTestEnvironmentAllowed();
    return this.connections.get(tenantId) || null;
  }

  public static getConnectionByPhone(phoneNumberId: string): WhatsAppConnectionRecord | null {
    this.assertTestEnvironmentAllowed();
    for (const conn of this.connections.values()) {
      if (conn.phone_number_id === phoneNumberId) return conn;
    }
    return null;
  }

  // Conversation Operations
  public static saveConversation(record: ConversationRecord): void {
    this.assertTestEnvironmentAllowed();
    this.conversations.set(record.id, record);
  }

  public static getConversation(id: string): ConversationRecord | null {
    this.assertTestEnvironmentAllowed();
    return this.conversations.get(id) || null;
  }

  public static getConversationsForTenant(tenantId: string): ConversationRecord[] {
    this.assertTestEnvironmentAllowed();
    return Array.from(this.conversations.values())
      .filter(c => c.tenant_id === tenantId)
      .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
  }

  // Message Operations
  public static saveMessage(conversationId: string, message: MessageRecord): void {
    this.assertTestEnvironmentAllowed();
    const list = this.messages.get(conversationId) || [];
    list.push(message);
    this.messages.set(conversationId, list);
  }

  public static getMessages(conversationId: string): MessageRecord[] {
    this.assertTestEnvironmentAllowed();
    return this.messages.get(conversationId) || [];
  }

  // Idempotency Operations
  public static isIdempotent(eventId: string): boolean {
    this.assertTestEnvironmentAllowed();
    const status = this.idempotencyStatus.get(eventId);
    if (status === 'FAILED') return false;
    return status === 'COMPLETED' || status === 'PROCESSING' || this.idempotency.has(eventId);
  }

  public static getIdempotencyStatus(eventId: string): 'PROCESSING' | 'COMPLETED' | 'FAILED' | null {
    this.assertTestEnvironmentAllowed();
    return this.idempotencyStatus.get(eventId) || (this.idempotency.has(eventId) ? 'COMPLETED' : null);
  }

  public static recordIdempotency(eventId: string, status: 'PROCESSING' | 'COMPLETED' | 'FAILED' = 'COMPLETED'): void {
    this.assertTestEnvironmentAllowed();
    this.idempotency.add(eventId);
    this.idempotencyStatus.set(eventId, status);
  }

  // Consent Operations
  public static getConsent(tenantId: string, cleanPhone: string): 'opted_in' | 'opted_out' | null {
    this.assertTestEnvironmentAllowed();
    const key = `${tenantId}:${cleanPhone}`;
    return this.consents.get(key) || null;
  }

  public static setConsent(tenantId: string, cleanPhone: string, status: 'opted_in' | 'opted_out'): void {
    this.assertTestEnvironmentAllowed();
    const key = `${tenantId}:${cleanPhone}`;
    this.consents.set(key, status);
  }
}
