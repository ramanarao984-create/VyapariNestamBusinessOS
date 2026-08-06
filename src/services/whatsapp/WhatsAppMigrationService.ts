/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient } from '../../supabase/client';
import { WhatsAppConnectionService } from './WhatsAppConnectionService';
import { logger } from '../metadata/logger';

export class WhatsAppMigrationService {
  /**
   * Safe migration helper that scans tenant clinic_config and migrates plain-text WhatsApp credentials
   * into the encrypted `whatsapp_connections` vault.
   */
  public static async runMigrationForExistingTenants(): Promise<{ processed: number; migrated: number }> {
    let processed = 0;
    let migrated = 0;

    try {
      const supabase = getSupabaseClient();
      const { data: tenants, error } = await supabase.from('tenants').select('id, clinic_config');

      if (error || !tenants) {
        logger.warn('WhatsAppMigrationService', 'No tenants table found or query failed during migration check.');
        return { processed, migrated };
      }

      for (const tenant of tenants) {
        processed++;
        const config = tenant.clinic_config || {};

        const phoneNumberId = config.metaPhoneNumberId || config.meta_whatsapp_phone_number_id;
        const accessToken = config.metaAccessToken || config.meta_whatsapp_access_token;
        const wabaId = config.metaWabaId || config.meta_whatsapp_waba_id;
        const verifyToken = config.metaVerifyToken || config.meta_whatsapp_verify_token;

        if (phoneNumberId && accessToken) {
          // Check if already in whatsapp_connections
          const existing = await WhatsAppConnectionService.getConnectionByTenantId(tenant.id);
          if (!existing || !existing.token_ciphertext) {
            logger.info('WhatsAppMigrationService', `Migrating plain-text credentials for tenant ${tenant.id} into encrypted vault.`);
            await WhatsAppConnectionService.saveConnection({
              tenantId: tenant.id,
              phoneNumberId,
              accessToken,
              wabaId,
              verifyToken,
            });
            migrated++;
          }
        }
      }

      logger.info('WhatsAppMigrationService', `Migration complete. Processed ${processed} tenants, migrated ${migrated} connections.`);
    } catch (err: any) {
      logger.error('WhatsAppMigrationService', 'Migration failed', err);
    }

    return { processed, migrated };
  }
}
