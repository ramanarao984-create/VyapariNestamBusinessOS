/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient } from '../../supabase/client';
import { WHATSAPP_CONFIG } from './config';
import { logger } from '../metadata/logger';

export interface WhatsAppReadinessReport {
  ready: boolean;
  status: 'ready' | 'unhealthy' | 'schema_not_ready' | 'database_unavailable' | 'configuration_invalid';
  code: string;
  message: string;
  timestamp: string;
  details: {
    persistenceReady: boolean;
    webhookReady: boolean;
    outboundMessagingReady: boolean;
    embeddedSignupReady: boolean;
    databaseConnected: boolean;
    tablesExist: {
      whatsapp_connections: boolean;
      whatsapp_conversations: boolean;
      whatsapp_messages: boolean;
      whatsapp_idempotency_logs: boolean;
      whatsapp_templates: boolean;
      whatsapp_message_status_events?: boolean;
      whatsapp_outbound_jobs?: boolean;
      whatsapp_signup_states?: boolean;
    };
    encryptionConfigured: boolean;
    webhookConfigured: boolean;
    memoryStorageInProduction: boolean;
    missingEnvironmentVariables: string[];
    errors: string[];
  };
}

export class WhatsAppReadinessService {
  /**
   * Performs an active readiness and schema health check on WhatsApp persistence and capability configurations
   */
  public static async checkReadiness(): Promise<WhatsAppReadinessReport> {
    const timestamp = new Date().toISOString();
    const errors: string[] = [];
    const missingEnvironmentVariables: string[] = [];
    const isProd = process.env.NODE_ENV === 'production';
    const allowMemory = process.env.ALLOW_IN_MEMORY_STORAGE === 'true';

    let memoryStorageInProduction = false;

    // Check production memory rule violation
    if (isProd && allowMemory) {
      memoryStorageInProduction = true;
      errors.push('CRITICAL SECURITY VIOLATION: ALLOW_IN_MEMORY_STORAGE is enabled in production environment.');
    }

    // 1. Check encryption secret configuration
    const hasEncryptionSecret = !!(
      process.env.ENCRYPTION_SECRET ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.GEMINI_API_KEY
    );
    if (!hasEncryptionSecret) {
      errors.push('Encryption secret is not explicitly configured in environment variables.');
    }

    // 2. Capability environment variable checks
    const hasAppSecret = !!(process.env.META_APP_SECRET || WHATSAPP_CONFIG.META_APP_SECRET);
    if (!hasAppSecret) {
      missingEnvironmentVariables.push('META_APP_SECRET');
      if (isProd) {
        errors.push('META_APP_SECRET is required in production. Webhook signature validation cannot be bypassed in production.');
      } else {
        errors.push('META_APP_SECRET is empty. Webhook signature validation (x-hub-signature-256) will be bypassed in development mode only.');
      }
    }

    const hasVerifyToken = !!(
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
      process.env.META_VERIFY_TOKEN ||
      process.env.WHATSAPP_VERIFY_TOKEN
    );
    if (!hasVerifyToken) {
      missingEnvironmentVariables.push('WHATSAPP_WEBHOOK_VERIFY_TOKEN');
      errors.push('WHATSAPP_WEBHOOK_VERIFY_TOKEN is missing. Webhook onboarding & handshake verification will fail.');
    }

    const hasAccessToken = !!(
      process.env.META_ACCESS_TOKEN ||
      process.env.WHATSAPP_TOKEN ||
      process.env.WHATSAPP_ACCESS_TOKEN
    );
    if (!hasAccessToken) {
      missingEnvironmentVariables.push('META_ACCESS_TOKEN');
      errors.push('META_ACCESS_TOKEN (or WHATSAPP_TOKEN) is missing. Outbound Meta Cloud API messaging requires an access token.');
    }

    const hasPhoneNumberId = !!(
      process.env.WHATSAPP_PHONE_NUMBER_ID ||
      process.env.META_PHONE_NUMBER_ID
    );
    if (!hasPhoneNumberId) {
      missingEnvironmentVariables.push('WHATSAPP_PHONE_NUMBER_ID');
      errors.push('WHATSAPP_PHONE_NUMBER_ID is missing.');
    }

    const hasBusinessAccountId = !!(
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ||
      process.env.META_WABA_ID ||
      process.env.META_BUSINESS_ACCOUNT_ID
    );
    if (!hasBusinessAccountId) {
      missingEnvironmentVariables.push('WHATSAPP_BUSINESS_ACCOUNT_ID');
      errors.push('WHATSAPP_BUSINESS_ACCOUNT_ID is missing.');
    }

    // 3. Verify Database Connectivity & Required Tables
    let databaseConnected = false;
    const tablesExist = {
      whatsapp_connections: false,
      whatsapp_conversations: false,
      whatsapp_messages: false,
      whatsapp_idempotency_logs: false,
      whatsapp_templates: false,
      whatsapp_message_status_events: false,
      whatsapp_outbound_jobs: false,
      whatsapp_signup_states: false,
    };

    try {
      const supabase = getSupabaseClient();
      databaseConnected = true;

      const requiredTables: (keyof typeof tablesExist)[] = [
        'whatsapp_connections',
        'whatsapp_conversations',
        'whatsapp_messages',
        'whatsapp_idempotency_logs',
        'whatsapp_templates',
        'whatsapp_message_status_events',
        'whatsapp_outbound_jobs',
        'whatsapp_signup_states',
      ];

      for (const table of requiredTables) {
        try {
          const { error } = await supabase.from(table).select('*').limit(1);
          if (!error) {
            tablesExist[table] = true;
          } else {
            const code = error.code?.toString();
            const msg = error.message?.toLowerCase() || '';
            if (code === '42P01' || code === 'PGRST205' || msg.includes('could not find the table') || msg.includes('does not exist')) {
              tablesExist[table] = false;
              errors.push(`Table '${table}' is missing or PostgREST schema cache is stale (${code || 'PGRST205'}).`);
            } else {
              tablesExist[table] = true;
            }
          }
        } catch (tblErr: any) {
          tablesExist[table] = false;
          errors.push(`Table check exception for '${table}': ${tblErr.message}`);
        }
      }
    } catch (dbErr: any) {
      databaseConnected = false;
      errors.push(`Database connection failed: ${dbErr.message || dbErr}`);
    }

    const allTablesPresent = Object.values(tablesExist).every(Boolean);

    // 4. Compute capability readiness sections
    const persistenceReady = databaseConnected && allTablesPresent;
    const webhookReady = hasAppSecret && hasVerifyToken;
    const outboundMessagingReady = hasAccessToken && hasPhoneNumberId;
    const embeddedSignupReady = hasBusinessAccountId;

    const overallReady =
      persistenceReady &&
      webhookReady &&
      outboundMessagingReady &&
      embeddedSignupReady &&
      hasEncryptionSecret &&
      !memoryStorageInProduction;

    let status: WhatsAppReadinessReport['status'] = 'ready';
    let code = 'WHATSAPP_READY';
    let message = 'WhatsApp Cloud API integration is fully provisioned and operational.';

    if (memoryStorageInProduction) {
      status = 'configuration_invalid';
      code = 'WHATSAPP_MEMORY_IN_PRODUCTION_FORBIDDEN';
      message = 'Fatal Configuration Error: In-memory storage is forbidden in production.';
    } else if (!databaseConnected) {
      status = 'database_unavailable';
      code = 'WHATSAPP_DATABASE_UNAVAILABLE';
      message = 'Database Connection Failed: Unable to connect to Supabase/PostgreSQL.';
    } else if (!allTablesPresent) {
      status = 'schema_not_ready';
      code = 'WHATSAPP_SCHEMA_NOT_READY';
      message = 'Database Schema Incomplete: One or more required WhatsApp tables are missing from Supabase.';
    } else if (!overallReady) {
      status = 'unhealthy';
      code = 'WHATSAPP_CONFIGURATION_WARNING';
      message = `WhatsApp configuration incomplete: missing required environment variables (${missingEnvironmentVariables.join(', ')}).`;
    }

    const report: WhatsAppReadinessReport = {
      ready: overallReady,
      status,
      code,
      message,
      timestamp,
      details: {
        persistenceReady,
        webhookReady,
        outboundMessagingReady,
        embeddedSignupReady,
        databaseConnected,
        tablesExist,
        encryptionConfigured: hasEncryptionSecret,
        webhookConfigured: webhookReady,
        memoryStorageInProduction,
        missingEnvironmentVariables,
        errors,
      },
    };

    if (!report.ready) {
      logger.warn('WhatsAppReadinessService', `WhatsApp Readiness Failure (${code}): ${message}`, report.details.errors);
    } else {
      logger.info('WhatsAppReadinessService', `WhatsApp Readiness Check Passed: ${message}`);
    }

    return report;
  }
}
