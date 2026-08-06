/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient } from '../../supabase/client';
import { logger } from '../metadata/logger';

export class CostMeteringService {
  /**
   * Tracks usage & cost metering events per tenant
   */
  public static async trackUsage(
    tenantId: string,
    eventCategory: 'inbound' | 'outbound_freeform' | 'outbound_template' | 'status',
    routingCategory: string = 'UNKNOWN'
  ): Promise<void> {
    const supabase = getSupabaseClient();
    const periodDate = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    try {
      // Upsert metering counter
      const id = `meter_${tenantId}_${eventCategory}_${routingCategory}_${periodDate}`;

      const { data: existing } = await supabase
        .from('whatsapp_usage_meters')
        .select('event_count')
        .eq('id', id)
        .maybeSingle();

      const newCount = (existing?.event_count || 0) + 1;

      await supabase.from('whatsapp_usage_meters').upsert({
        id,
        tenant_id: tenantId,
        event_category: eventCategory,
        routing_category: routingCategory,
        event_count: newCount,
        period_date: periodDate,
        updated_at: now,
      }, { onConflict: 'tenant_id,event_category,routing_category,period_date' });

      logger.info('CostMeteringService', `Metered ${eventCategory} (${routingCategory}) for tenant ${tenantId}, total: ${newCount}`);
    } catch (err) {
      logger.warn('CostMeteringService', `Failed to update metering for tenant ${tenantId}`, err);
    }
  }
}
