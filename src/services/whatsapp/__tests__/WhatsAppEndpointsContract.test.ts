/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationService } from '../ConversationService';
import { TemplateService } from '../TemplateService';
import { WhatsAppReadinessService } from '../WhatsAppReadinessService';
import { InMemoryWhatsAppRepository } from '../InMemoryWhatsAppRepository';

vi.mock('../../../supabase/client', () => ({
  getSupabaseClient: vi.fn(),
}));

import { getSupabaseClient } from '../../../supabase/client';

describe('WhatsApp Durable Persistence & Error Contract Specifications', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };
    vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase);
  });

  describe('Database Error Translation in Services', () => {
    it('should throw WHATSAPP_SCHEMA_NOT_READY when PostgREST schema cache is missing table (PGRST205)', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: {
          code: 'PGRST205',
          message: "Could not find the table 'public.whatsapp_conversations' in the schema cache",
        },
      });

      await expect(
        ConversationService.getConversationsForTenant('tenant_default')
      ).rejects.toMatchObject({
        code: 'WHATSAPP_SCHEMA_NOT_READY',
      });
    });

    it('should throw WHATSAPP_SCHEMA_NOT_READY when PostgreSQL relation does not exist (42P01)', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: {
          code: '42P01',
          message: 'relation "whatsapp_conversations" does not exist',
        },
      });

      await expect(
        ConversationService.getConversationsForTenant('tenant_default')
      ).rejects.toMatchObject({
        code: 'WHATSAPP_SCHEMA_NOT_READY',
      });
    });

    it('should throw WHATSAPP_DATABASE_UNAVAILABLE for transient database query errors', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: {
          code: '57P01',
          message: 'terminating connection due to administrator command',
        },
      });

      await expect(
        ConversationService.getConversationsForTenant('tenant_default')
      ).rejects.toMatchObject({
        code: 'WHATSAPP_DATABASE_UNAVAILABLE',
      });
    });

    it('should return empty array when query succeeds and genuinely finds no conversations', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await ConversationService.getConversationsForTenant('tenant_default');
      expect(result).toEqual([]);
    });
  });

  describe('WhatsAppReadinessService Verification', () => {
    it('should report schema_not_ready when required tables are missing', async () => {
      mockSupabase.limit = vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST205',
          message: 'Could not find table in schema cache',
        },
      });

      const readiness = await WhatsAppReadinessService.checkReadiness();
      expect(readiness.ready).toBe(false);
      expect(readiness.status).toBe('schema_not_ready');
      expect(readiness.code).toBe('WHATSAPP_SCHEMA_NOT_READY');
      expect(readiness.details.persistenceReady).toBe(false);
      expect(readiness.details.tablesExist.whatsapp_conversations).toBe(false);
    });

    it('should report unhealthy and ready: false when required environment variables are missing', async () => {
      mockSupabase.limit = vi.fn().mockResolvedValue({
        data: [{ id: 'test' }],
        error: null,
      });

      const originalSecret = process.env.META_APP_SECRET;
      delete process.env.META_APP_SECRET;

      try {
        const readiness = await WhatsAppReadinessService.checkReadiness();
        expect(readiness.ready).toBe(false);
        expect(readiness.status).toBe('unhealthy');
        expect(readiness.code).toBe('WHATSAPP_CONFIGURATION_WARNING');
        expect(readiness.details.persistenceReady).toBe(true);
        expect(readiness.details.webhookReady).toBe(false);
        expect(readiness.details.missingEnvironmentVariables).toContain('META_APP_SECRET');
      } finally {
        if (originalSecret !== undefined) process.env.META_APP_SECRET = originalSecret;
      }
    });

    it('should report ready: true when all required capabilities and tables exist', async () => {
      mockSupabase.limit = vi.fn().mockResolvedValue({
        data: [{ id: 'test' }],
        error: null,
      });

      const envBackup = { ...process.env };
      process.env.META_APP_SECRET = 'test_app_secret';
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'test_verify_token';
      process.env.META_ACCESS_TOKEN = 'test_access_token';
      process.env.WHATSAPP_PHONE_NUMBER_ID = '1234567890';
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = '0987654321';
      process.env.ENCRYPTION_SECRET = 'test_encryption_secret';

      try {
        const readiness = await WhatsAppReadinessService.checkReadiness();
        expect(readiness.ready).toBe(true);
        expect(readiness.status).toBe('ready');
        expect(readiness.code).toBe('WHATSAPP_READY');
        expect(readiness.details.persistenceReady).toBe(true);
        expect(readiness.details.webhookReady).toBe(true);
        expect(readiness.details.outboundMessagingReady).toBe(true);
        expect(readiness.details.embeddedSignupReady).toBe(true);
        expect(readiness.details.tablesExist.whatsapp_conversations).toBe(true);
        expect(readiness.details.tablesExist.whatsapp_connections).toBe(true);
      } finally {
        process.env = envBackup;
      }
    });
  });

  describe('Production Guard on InMemoryWhatsAppRepository', () => {
    it('should throw an exception when initialized or accessed in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        expect(() => new InMemoryWhatsAppRepository()).toThrow(
          /SECURITY EXCEPTION: InMemoryWhatsAppRepository is strictly forbidden in production/
        );
        expect(() => InMemoryWhatsAppRepository.getConversationsForTenant('tenant_default')).toThrow(
          /SECURITY EXCEPTION: InMemoryWhatsAppRepository is strictly forbidden in production/
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});
