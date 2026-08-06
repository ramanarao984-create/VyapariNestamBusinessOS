/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { checkDatabaseConnection } from '../supabase/dbUtils';
import firebaseConfig from '../../firebase-applet-config.json';
import { WhatsAppReadinessService } from '../services/whatsapp/WhatsAppReadinessService';

export class ConfigurationValidationError extends Error {
  public readonly missingFields: string[];
  constructor(message: string, missingFields: string[] = []) {
    super(message);
    this.name = 'ConfigurationValidationError';
    this.missingFields = missingFields;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message: string;
  durationMs?: number;
  details?: Record<string, any>;
}

export interface HealthReport {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptimeSeconds: number;
  services: {
    supabase: ServiceHealth;
    whatsapp: ServiceHealth;
    googleWorkspace: ServiceHealth;
    configuration: ServiceHealth;
  };
}

export class HealthService {
  private static startTime = Date.now();

  /**
   * Performs an overall application health check across all core services.
   */
  public static async checkApplicationHealth(): Promise<HealthReport> {
    const timestamp = new Date().toISOString();
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    const [supabaseReport, whatsappReport, googleReport, configReport] = await Promise.all([
      this.checkSupabase(),
      this.checkWhatsApp(),
      this.checkGoogleWorkspace(),
      this.checkConfiguration()
    ]);

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (supabaseReport.status === 'unhealthy' || configReport.status === 'unhealthy' || whatsappReport.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (googleReport.status === 'degraded' || supabaseReport.status === 'degraded' || whatsappReport.status === 'degraded') {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp,
      uptimeSeconds,
      services: {
        supabase: supabaseReport,
        whatsapp: whatsappReport,
        googleWorkspace: googleReport,
        configuration: configReport
      }
    };
  }

  /**
   * Verifies WhatsApp Cloud API integration & database persistence schema readiness.
   */
  public static async checkWhatsApp(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const report = await WhatsAppReadinessService.checkReadiness();
      const durationMs = Date.now() - start;

      let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
      if (report.status === 'schema_not_ready' || report.status === 'database_unavailable' || report.status === 'configuration_invalid') {
        status = 'unhealthy';
      } else if (report.status === 'unhealthy') {
        status = 'degraded';
      }

      return {
        status,
        message: report.message,
        durationMs,
        details: {
          code: report.code,
          tablesExist: report.details.tablesExist,
          errors: report.details.errors,
        }
      };
    } catch (err: any) {
      const durationMs = Date.now() - start;
      return {
        status: 'unhealthy',
        message: `WhatsApp readiness check exception: ${err.message || err}`,
        durationMs
      };
    }
  }

  /**
   * Verifies the Supabase metadata database connectivity and responsiveness.
   */
  public static async checkSupabase(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const dbCheck = await checkDatabaseConnection();
      const durationMs = Date.now() - start;

      if (!dbCheck.success) {
        return {
          status: 'unhealthy',
          message: dbCheck.message,
          durationMs
        };
      }

      return {
        status: 'healthy',
        message: dbCheck.message,
        durationMs
      };
    } catch (err: any) {
      const durationMs = Date.now() - start;
      return {
        status: 'unhealthy',
        message: err.message || 'Unknown database check failure',
        durationMs
      };
    }
  }

  /**
   * Verifies connectivity to external Google Workspace/API services.
   */
  public static async checkGoogleWorkspace(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch('https://www.googleapis.com/discovery/v1/apis', {
        method: 'HEAD',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const durationMs = Date.now() - start;

      if (!response.ok) {
        return {
          status: 'degraded',
          message: `Google APIs endpoint returned non-OK status: ${response.status}`,
          durationMs
        };
      }

      return {
        status: 'healthy',
        message: 'Outbound connectivity to Google API services is healthy.',
        durationMs
      };
    } catch (err: any) {
      const durationMs = Date.now() - start;
      return {
        status: 'degraded',
        message: `Google APIs endpoint is unreachable: ${err.message || err}`,
        durationMs
      };
    }
  }

  /**
   * Validates required system, Firebase, Supabase and Google environment configurations.
   */
  public static async checkConfiguration(): Promise<ServiceHealth> {
    const missing: string[] = [];

    const requiredEnv = [
      'GEMINI_API_KEY',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'APP_URL'
    ];

    for (const key of requiredEnv) {
      if (!process.env[key] || process.env[key]?.trim() === '') {
        missing.push(key);
      }
    }

    const requiredFirebase = ['projectId', 'appId', 'apiKey', 'authDomain'];
    for (const field of requiredFirebase) {
      if (!firebaseConfig || !(field in firebaseConfig) || !((firebaseConfig as any)[field])) {
        missing.push(`firebaseConfig.${field}`);
      }
    }

    if (missing.length > 0) {
      return {
        status: 'unhealthy',
        message: `Missing required configurations: ${missing.join(', ')}`,
        details: { missing }
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL || '';
    if (!supabaseUrl.startsWith('https://')) {
      return {
        status: 'unhealthy',
        message: 'Invalid SUPABASE_URL: must start with https://',
        details: { invalidFields: ['SUPABASE_URL'] }
      };
    }

    return {
      status: 'healthy',
      message: 'All system and environmental configurations are fully validated.'
    };
  }

  /**
   * Fast-fail on application startup if required configurations are invalid.
   */
  public static validateStartup(): void {
    const missing: string[] = [];

    const requiredEnv = [
      'GEMINI_API_KEY',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'APP_URL'
    ];

    for (const key of requiredEnv) {
      if (!process.env[key] || process.env[key]?.trim() === '') {
        missing.push(key);
      }
    }

    const requiredFirebase = ['projectId', 'appId', 'apiKey', 'authDomain'];
    for (const field of requiredFirebase) {
      if (!firebaseConfig || !(field in firebaseConfig) || !((firebaseConfig as any)[field])) {
        missing.push(`firebaseConfig.${field}`);
      }
    }

    if (missing.length > 0) {
      throw new ConfigurationValidationError(
        `[Startup Failed] Crucial environment/Firebase configuration fields are missing: ${missing.join(', ')}`,
        missing
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL || '';
    if (!supabaseUrl.startsWith('https://')) {
      throw new ConfigurationValidationError(
        '[Startup Failed] Invalid SUPABASE_URL: must start with https://',
        ['SUPABASE_URL']
      );
    }

    console.log('[System Initialization] Application startup configuration validated successfully.');
  }
}
