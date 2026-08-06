/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WhatsAppConnectionService } from './WhatsAppConnectionService';
import { getMetaGraphUrl } from './config';
import { getSupabaseClient } from '../../supabase/client';
import { logger } from '../metadata/logger';

export interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components: any[];
}

export class TemplateService {
  /**
   * Fetches approved templates directly from Meta WABA for a tenant and syncs them to DB
   */
  public static async syncTemplatesForTenant(tenantId: string): Promise<WhatsAppTemplate[]> {
    const connection = await WhatsAppConnectionService.getConnectionByTenantId(tenantId);
    if (!connection || !connection.waba_id) {
      throw new Error('[TemplateService] WABA ID missing for this tenant connection.');
    }

    const token = await WhatsAppConnectionService.getDecryptedAccessToken(tenantId);
    if (!token) {
      throw new Error('[TemplateService] Access token missing or invalid for this tenant.');
    }

    try {
      const url = getMetaGraphUrl(`${connection.waba_id}/message_templates?limit=100`);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data: any = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Meta API error fetching templates.');
      }

      const templates: WhatsAppTemplate[] = (data.data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        language: t.language || 'en_US',
        status: t.status || 'APPROVED',
        category: t.category || 'UTILITY',
        components: t.components || [],
      }));

      // Save synced templates to database
      const supabase = getSupabaseClient();
      const now = new Date().toISOString();

      for (const tmpl of templates) {
        await supabase.from('whatsapp_templates').upsert({
          id: `tmpl_${tenantId}_${tmpl.name}_${tmpl.language}`,
          tenant_id: tenantId,
          name: tmpl.name,
          language: tmpl.language,
          category: tmpl.category,
          status: tmpl.status,
          components: tmpl.components,
          updated_at: now,
        }, { onConflict: 'tenant_id,name,language' });
      }

      logger.info('TemplateService', `Synced ${templates.length} templates for tenant ${tenantId}`);
      return templates;
    } catch (err: any) {
      logger.error('TemplateService', `Template sync failed for tenant ${tenantId}`, err);
      throw err;
    }
  }

  /**
   * Retrieves synced templates for a tenant
   */
  public static async getTemplatesForTenant(tenantId: string): Promise<WhatsAppTemplate[]> {
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('tenant_id', tenantId);

      if (data && data.length > 0) {
        return data as WhatsAppTemplate[];
      }
    } catch {}

    // Fallback sync if empty
    return this.syncTemplatesForTenant(tenantId).catch(() => []);
  }
}
