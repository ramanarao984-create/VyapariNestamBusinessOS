/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient } from '../../supabase/client';
import { CryptoService } from './CryptoService';
import { WHATSAPP_CONFIG, getMetaGraphUrl } from './config';
import { logger } from '../metadata/logger';

export interface WhatsAppConnectionRecord {
  id: string;
  tenant_id: string;
  provider: string;
  waba_id: string | null;
  phone_number_id: string;
  display_phone_number: string | null;
  verified_name: string | null;
  connection_status: 'connected' | 'disconnected' | 'expired' | 'revoked';
  business_verification_status: string | null;
  display_name_status: string | null;
  token_ciphertext: string | null;
  token_expiry_at: string | null;
  verify_token: string;
  connected_at: string | null;
  disconnected_at: string | null;
  last_verified_at: string | null;
}

export interface RedactedConnectionDTO {
  isConnected: boolean;
  tenantId: string;
  phoneNumberId: string | null;
  wabaId: string | null;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  connectionStatus: string;
  maskedToken: string | null;
  verifyToken: string;
  lastVerifiedAt: string | null;
}

export class WhatsAppConnectionService {
  /**
   * Helper to check for missing database schema or PostgREST schema cache errors
   */
  private static isSchemaError(error: any): boolean {
    if (!error) return false;
    const code = error.code?.toString();
    const message = error.message?.toLowerCase() || '';
    return (
      code === '42P01' ||
      code === 'PGRST205' ||
      message.includes('could not find the table') ||
      (message.includes('relation') && message.includes('does not exist'))
    );
  }

  /**
   * Throws a controlled domain error if the database schema is missing or unavailable
   */
  private static handleDatabaseError(error: any, context: string, requestId?: string): never {
    const message = error?.message || String(error);
    const tableName = 'whatsapp_connections';

    if (this.isSchemaError(error)) {
      const err = new Error(`[WHATSAPP_SCHEMA_NOT_READY] WhatsApp database schema missing or PostgREST schema cache stale for table '${tableName}' during ${context}`);
      (err as any).code = 'WHATSAPP_SCHEMA_NOT_READY';
      (err as any).table = tableName;

      logger.warn('WhatsAppConnectionService', `PostgREST schema cache or table missing for '${tableName}' during ${context}`, {
        service: 'WhatsAppConnectionService',
        operation: context,
        table: tableName,
        requestId,
        status: 'SCHEMA_NOT_READY',
        code: error?.code || 'PGRST205',
      });
      throw err;
    }

    const err = new Error(`[WHATSAPP_DATABASE_UNAVAILABLE] Database query failed for table '${tableName}' during ${context}: ${message}`);
    (err as any).code = 'WHATSAPP_DATABASE_UNAVAILABLE';
    (err as any).table = tableName;

    logger.error('WhatsAppConnectionService', `Database query failed for '${tableName}' during ${context}`, {
      name: error?.name,
      code: error?.code,
      message: error?.message,
    }, {
      service: 'WhatsAppConnectionService',
      operation: context,
      table: tableName,
      requestId,
      status: 'DATABASE_UNAVAILABLE',
    });
    throw err;
  }

  /**
   * Retrieves connection metadata for a tenant directly from durable database
   */
  public static async getConnectionForTenant(tenantId: string): Promise<WhatsAppConnectionRecord | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) {
        this.handleDatabaseError(error, `getConnectionForTenant(${tenantId})`);
      }

      return (data as WhatsAppConnectionRecord) || null;
    } catch (err: any) {
      if (err.code === 'WHATSAPP_SCHEMA_NOT_READY' || err.code === 'WHATSAPP_DATABASE_UNAVAILABLE') {
        throw err;
      }
      this.handleDatabaseError(err, `getConnectionForTenant(${tenantId})`);
    }
  }

  /**
   * Alias for getConnectionForTenant
   */
  public static async getConnectionByTenantId(tenantId: string): Promise<WhatsAppConnectionRecord | null> {
    return this.getConnectionForTenant(tenantId);
  }

  /**
   * Performs tenant resolution from phone_number_id
   */
  public static async getConnectionByPhoneNumberId(phoneNumberId: string): Promise<WhatsAppConnectionRecord | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('phone_number_id', phoneNumberId);

      if (error) {
        this.handleDatabaseError(error, `getConnectionByPhoneNumberId(${phoneNumberId})`);
      }

      if (!data || data.length === 0) {
        return null;
      }

      if (data.length > 1) {
        throw new Error(`[WHATSAPP_AMBIGUOUS_MAPPING] Multiple tenant connections found for phone_number_id: ${phoneNumberId}`);
      }

      return data[0] as WhatsAppConnectionRecord;
    } catch (err: any) {
      if (err.code === 'WHATSAPP_SCHEMA_NOT_READY' || err.code === 'WHATSAPP_DATABASE_UNAVAILABLE' || err.message?.includes('AMBIGUOUS')) {
        throw err;
      }
      this.handleDatabaseError(err, `getConnectionByPhoneNumberId(${phoneNumberId})`);
    }
  }

  /**
   * Safely retrieves and decrypts the Meta access token on the trusted server
   */
  public static async getDecryptedAccessToken(tenantId: string): Promise<string | null> {
    const connection = await this.getConnectionForTenant(tenantId);
    if (!connection || !connection.token_ciphertext) {
      return null;
    }

    try {
      return CryptoService.decrypt(connection.token_ciphertext);
    } catch (cryptoErr: any) {
      logger.error('WhatsAppConnectionService', `Decryption failed for tenant ${tenantId}`, cryptoErr);
      throw new Error(`[WHATSAPP_ENCRYPTION_FAILED] Failed to decrypt access token: ${cryptoErr.message}`);
    }
  }

  /**
   * Returns redacted connection details safe to display on client applications
   */
  public static async getRedactedConnection(tenantId: string): Promise<RedactedConnectionDTO> {
    let connection: WhatsAppConnectionRecord | null = null;
    try {
      connection = await this.getConnectionForTenant(tenantId);
    } catch (err: any) {
      if (err.code === 'WHATSAPP_SCHEMA_NOT_READY') {
        return {
          isConnected: false,
          tenantId,
          phoneNumberId: null,
          wabaId: null,
          displayPhoneNumber: null,
          verifiedName: null,
          connectionStatus: 'schema_not_ready',
          maskedToken: null,
          verifyToken: WHATSAPP_CONFIG.DEFAULT_VERIFY_TOKEN,
          lastVerifiedAt: null,
        };
      }
      throw err;
    }

    if (!connection) {
      return {
        isConnected: false,
        tenantId,
        phoneNumberId: null,
        wabaId: null,
        displayPhoneNumber: null,
        verifiedName: null,
        connectionStatus: 'disconnected',
        maskedToken: null,
        verifyToken: WHATSAPP_CONFIG.DEFAULT_VERIFY_TOKEN,
        lastVerifiedAt: null,
      };
    }

    let maskedToken: string | null = null;
    if (connection.token_ciphertext) {
      try {
        const decrypted = CryptoService.decrypt(connection.token_ciphertext);
        maskedToken = CryptoService.maskToken(decrypted);
      } catch {
        maskedToken = '••••••••';
      }
    }

    return {
      isConnected: connection.connection_status === 'connected',
      tenantId: connection.tenant_id,
      phoneNumberId: connection.phone_number_id,
      wabaId: connection.waba_id,
      displayPhoneNumber: connection.display_phone_number,
      verifiedName: connection.verified_name,
      connectionStatus: connection.connection_status,
      maskedToken,
      verifyToken: connection.verify_token || WHATSAPP_CONFIG.DEFAULT_VERIFY_TOKEN,
      lastVerifiedAt: connection.last_verified_at,
    };
  }

  /**
   * Saves or updates encrypted WhatsApp credentials in durable database
   */
  public static async saveConnection(params: {
    tenantId: string;
    phoneNumberId: string;
    accessToken?: string;
    wabaId?: string;
    verifyToken?: string;
    displayPhoneNumber?: string;
    verifiedName?: string;
  }): Promise<RedactedConnectionDTO> {
    const { tenantId, phoneNumberId, accessToken, wabaId, verifyToken, displayPhoneNumber, verifiedName } = params;

    const existing = await this.getConnectionForTenant(tenantId);
    let tokenCiphertext = existing?.token_ciphertext || null;

    if (accessToken && accessToken.trim()) {
      tokenCiphertext = CryptoService.encrypt(accessToken.trim());
    }

    const connectionId = existing?.id || `conn_${tenantId}_${Date.now()}`;
    const now = new Date().toISOString();
    const finalVerifyToken = verifyToken || existing?.verify_token || WHATSAPP_CONFIG.DEFAULT_VERIFY_TOKEN;

    const payload: WhatsAppConnectionRecord = {
      id: connectionId,
      tenant_id: tenantId,
      provider: 'meta',
      waba_id: wabaId || existing?.waba_id || null,
      phone_number_id: phoneNumberId,
      display_phone_number: displayPhoneNumber || existing?.display_phone_number || null,
      verified_name: verifiedName || existing?.verified_name || null,
      connection_status: 'connected',
      business_verification_status: existing?.business_verification_status || 'pending',
      display_name_status: existing?.display_name_status || 'pending',
      token_ciphertext: tokenCiphertext,
      token_expiry_at: null,
      verify_token: finalVerifyToken,
      connected_at: existing?.connected_at || now,
      disconnected_at: null,
      last_verified_at: now,
    };

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('whatsapp_connections')
        .upsert(payload, { onConflict: 'tenant_id' });

      if (error) {
        this.handleDatabaseError(error, `saveConnection(${tenantId})`);
      }

      logger.info('WhatsAppConnectionService', `Saved encrypted WhatsApp connection in durable database for tenant ${tenantId}`);
      return this.getRedactedConnection(tenantId);
    } catch (err: any) {
      if (err.code === 'WHATSAPP_SCHEMA_NOT_READY' || err.code === 'WHATSAPP_DATABASE_UNAVAILABLE') {
        throw err;
      }
      this.handleDatabaseError(err, `saveConnection(${tenantId})`);
    }
  }

  /**
   * Tests connection against Meta Graph API
   */
  public static async testConnection(tenantId: string): Promise<{ success: boolean; message: string; details?: any }> {
    const connection = await this.getConnectionForTenant(tenantId);
    if (!connection) {
      return { success: false, message: 'No WhatsApp connection found for this tenant.' };
    }

    const token = await this.getDecryptedAccessToken(tenantId);
    if (!token) {
      return { success: false, message: 'No access token available for this tenant.' };
    }

    try {
      const url = getMetaGraphUrl(`${connection.phone_number_id}?fields=id,display_phone_number,verified_name,quality_rating`);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data: any = await response.json();

      if (response.ok && data.id) {
        // Update connection metadata in database
        const supabase = getSupabaseClient();
        await supabase
          .from('whatsapp_connections')
          .update({
            display_phone_number: data.display_phone_number || connection.display_phone_number,
            verified_name: data.verified_name || connection.verified_name,
            connection_status: 'connected',
            last_verified_at: new Date().toISOString(),
          })
          .eq('tenant_id', tenantId);

        return {
          success: true,
          message: `✅ Connection verified! Verified Phone: ${data.display_phone_number || connection.phone_number_id} (${data.verified_name || 'Verified Business'})`,
          details: data,
        };
      }

      return {
        success: false,
        message: `❌ Meta API Verification Error: ${data.error?.message || response.statusText}`,
        details: data,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `❌ Network / API Exception: ${err.message || err}`,
      };
    }
  }

  /**
   * Safely disconnects a tenant's WhatsApp connection
   */
  public static async disconnectConnection(tenantId: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('whatsapp_connections')
        .update({
          connection_status: 'disconnected',
          token_ciphertext: null,
          disconnected_at: now,
          updated_at: now,
        })
        .eq('tenant_id', tenantId);

      if (error) {
        this.handleDatabaseError(error, `disconnectConnection(${tenantId})`);
      }

      logger.info('WhatsAppConnectionService', `Disconnected WhatsApp connection in database for tenant ${tenantId}`);
    } catch (err: any) {
      if (err.code === 'WHATSAPP_SCHEMA_NOT_READY' || err.code === 'WHATSAPP_DATABASE_UNAVAILABLE') {
        throw err;
      }
      this.handleDatabaseError(err, `disconnectConnection(${tenantId})`);
    }
  }
}
