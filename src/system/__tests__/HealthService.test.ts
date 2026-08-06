/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HealthService, ConfigurationValidationError } from '../HealthService';
import { checkDatabaseConnection } from '../../supabase/dbUtils';
import { WhatsAppReadinessService } from '../../services/whatsapp/WhatsAppReadinessService';

// Mock database connection check
vi.mock('../../supabase/dbUtils', () => ({
  checkDatabaseConnection: vi.fn()
}));

// Mock firebase config
vi.mock('../../../firebase-applet-config.json', () => ({
  default: {
    projectId: 'test-project',
    appId: '1:234:web:567',
    apiKey: 'test-api-key',
    authDomain: 'test-auth-domain'
  }
}));

describe('HealthService and Configuration Validation Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateStartup', () => {
    it('should pass validation when all required environment variables are valid', () => {
      process.env.GEMINI_API_KEY = 'valid-key';
      process.env.SUPABASE_URL = 'https://valid-supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-role-key';
      process.env.APP_URL = 'https://valid-app-url.com';

      expect(() => HealthService.validateStartup()).not.toThrow();
    });

    it('should throw ConfigurationValidationError when required variables are missing', () => {
      process.env.GEMINI_API_KEY = ''; // missing
      process.env.SUPABASE_URL = 'https://valid-supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-role-key';
      process.env.APP_URL = 'https://valid-app-url.com';

      expect(() => HealthService.validateStartup()).toThrow(ConfigurationValidationError);
    });

    it('should throw ConfigurationValidationError when SUPABASE_URL is malformed', () => {
      process.env.GEMINI_API_KEY = 'valid-key';
      process.env.SUPABASE_URL = 'http://invalid-supabase.co'; // malformed, needs https
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-role-key';
      process.env.APP_URL = 'https://valid-app-url.com';

      expect(() => HealthService.validateStartup()).toThrow(ConfigurationValidationError);
    });
  });

  describe('checkConfiguration', () => {
    it('should return healthy status when all configurations are valid', async () => {
      process.env.GEMINI_API_KEY = 'valid-key';
      process.env.SUPABASE_URL = 'https://valid-supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-role-key';
      process.env.APP_URL = 'https://valid-app-url.com';

      const result = await HealthService.checkConfiguration();
      expect(result.status).toBe('healthy');
      expect(result.message).toContain('fully validated');
    });

    it('should return unhealthy status when some configurations are missing', async () => {
      process.env.GEMINI_API_KEY = '';
      process.env.SUPABASE_URL = 'https://valid-supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-role-key';
      process.env.APP_URL = 'https://valid-app-url.com';

      const result = await HealthService.checkConfiguration();
      expect(result.status).toBe('unhealthy');
      expect(result.message).toContain('Missing required configurations');
    });
  });

  describe('checkSupabase', () => {
    it('should return healthy when database connection check succeeds', async () => {
      vi.mocked(checkDatabaseConnection).mockResolvedValueOnce({
        success: true,
        message: 'Successfully executed metadata ping query'
      });

      const result = await HealthService.checkSupabase();
      expect(result.status).toBe('healthy');
      expect(result.message).toBe('Successfully executed metadata ping query');
    });

    it('should return unhealthy when database connection check fails', async () => {
      vi.mocked(checkDatabaseConnection).mockResolvedValueOnce({
        success: false,
        message: 'Database connection failed'
      });

      const result = await HealthService.checkSupabase();
      expect(result.status).toBe('unhealthy');
      expect(result.message).toBe('Database connection failed');
    });
  });

  describe('checkGoogleWorkspace', () => {
    it('should return healthy when external Google API is responsive', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200
      });
      global.fetch = mockFetch;

      const result = await HealthService.checkGoogleWorkspace();
      expect(result.status).toBe('healthy');
      expect(result.message).toContain('connectivity to Google API services');
    });

    it('should return degraded when external Google API is unresponsive or fails', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
      global.fetch = mockFetch;

      const result = await HealthService.checkGoogleWorkspace();
      expect(result.status).toBe('degraded');
      expect(result.message).toContain('unreachable');
    });
  });

  describe('checkApplicationHealth', () => {
    it('should combine all service health checks correctly', async () => {
      process.env.GEMINI_API_KEY = 'valid-key';
      process.env.SUPABASE_URL = 'https://valid-supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-role-key';
      process.env.APP_URL = 'https://valid-app-url.com';

      vi.mocked(checkDatabaseConnection).mockResolvedValueOnce({
        success: true,
        message: 'Database is healthy'
      });

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200
      });
      global.fetch = mockFetch;

      vi.spyOn(WhatsAppReadinessService, 'checkReadiness').mockResolvedValueOnce({
        ready: true,
        status: 'ready',
        code: 'WHATSAPP_READY',
        message: 'WhatsApp operational',
        timestamp: new Date().toISOString(),
        details: {
          persistenceReady: true,
          webhookReady: true,
          outboundMessagingReady: true,
          embeddedSignupReady: true,
          databaseConnected: true,
          tablesExist: {
            whatsapp_connections: true,
            whatsapp_conversations: true,
            whatsapp_messages: true,
            whatsapp_idempotency_logs: true,
            whatsapp_templates: true,
            whatsapp_message_status_events: true,
            whatsapp_outbound_jobs: true,
            whatsapp_signup_states: true,
          },
          encryptionConfigured: true,
          webhookConfigured: true,
          memoryStorageInProduction: false,
          missingEnvironmentVariables: [],
          errors: [],
        },
      });

      const report = await HealthService.checkApplicationHealth();
      expect(report.status).toBe('healthy');
      expect(report.services.supabase.status).toBe('healthy');
      expect(report.services.googleWorkspace.status).toBe('healthy');
      expect(report.services.configuration.status).toBe('healthy');
    });
  });
});
