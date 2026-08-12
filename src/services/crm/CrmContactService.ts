/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient } from '../../supabase/client';
import { logger } from '../metadata/logger';

export type CrmContactCategory = 'Lead' | 'Active' | 'Inactive' | 'Follow-up';
export type CrmInteractionType =
  | 'WhatsApp Sent'
  | 'Incoming Message'
  | 'Phone Call'
  | 'In-Person'
  | 'Email'
  | 'Calendar Follow-up'
  | 'Note';

export interface CrmContactRecord {
  id: string;
  tenant_id: string;
  normalized_phone: string;
  name: string;
  email?: string | null;
  category: CrmContactCategory;
  notes: string;
  last_contacted_at?: string | null;
  created_at: string;
  updated_at: string;
  treatment_type?: string | null;
  treatment_value?: number | null;
  amount_collected?: number | null;
  payment_method?: string | null;
  pipeline_stage?: string | null;
  photos?: string[] | null;
  ai_autopilot: boolean;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CrmInteractionRecord {
  id: string;
  tenant_id: string;
  contact_id: string;
  conversation_id?: string | null;
  type: CrmInteractionType;
  notes: string;
  outcome?: string | null;
  occurred_at: string;
  created_at: string;
}

export function normalizePatientPhone(phone: string): string {
  const normalized = String(phone || '').replace(/[^0-9]/g, '');
  if (!normalized) throw new Error('A patient phone number is required.');
  return normalized.length === 10 ? `91${normalized}` : normalized;
}

function contactId(tenantId: string, phone: string): string {
  return `contact_${tenantId}_${phone}`;
}

export class CrmContactService {
  private static isSchemaError(error: any): boolean {
    const message = String(error?.message || '').toLowerCase();
    const code = String(error?.code || '');
    return code === '42P01' || code === 'PGRST205' || message.includes('crm_contacts') || message.includes('crm_interactions');
  }

  private static handleError(error: any, context: string): never {
    logger.error('CrmContactService', `${context} failed`, error);
    const wrapped: any = new Error(this.isSchemaError(error)
      ? 'CRM patient directory schema is not ready.'
      : 'CRM patient directory is unavailable.');
    wrapped.code = this.isSchemaError(error) ? 'CRM_SCHEMA_NOT_READY' : 'CRM_DATABASE_UNAVAILABLE';
    throw wrapped;
  }

  static async ensureContact(input: {
    tenantId: string;
    phone: string;
    name?: string;
    source?: string;
  }): Promise<CrmContactRecord> {
    const normalizedPhone = normalizePatientPhone(input.phone);
    const now = new Date().toISOString();
    const id = contactId(input.tenantId, normalizedPhone);
    const supabase = getSupabaseClient();

    try {
      const { data: existing, error: fetchError } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('tenant_id', input.tenantId)
        .eq('normalized_phone', normalizedPhone)
        .maybeSingle();
      if (fetchError) this.handleError(fetchError, 'ensureContact lookup');

      const shouldReplaceName = Boolean(input.name && input.name.trim() && input.name.trim() !== 'New Lead');
      const payload: Partial<CrmContactRecord> = existing
        ? {
            ...existing,
            name: shouldReplaceName ? input.name!.trim() : existing.name,
            source: input.source || existing.source,
            updated_at: now,
          }
        : {
            id,
            tenant_id: input.tenantId,
            normalized_phone: normalizedPhone,
            name: shouldReplaceName ? input.name!.trim() : 'New Lead',
            category: 'Lead',
            notes: '',
            ai_autopilot: true,
            source: input.source || 'WhatsApp',
            created_at: now,
            updated_at: now,
          };

      const { data, error } = await supabase
        .from('crm_contacts')
        .upsert(payload, { onConflict: 'tenant_id,normalized_phone' })
        .select()
        .single();
      if (error) this.handleError(error, 'ensureContact upsert');
      return data as CrmContactRecord;
    } catch (error: any) {
      if (error?.code === 'CRM_SCHEMA_NOT_READY' || error?.code === 'CRM_DATABASE_UNAVAILABLE') throw error;
      this.handleError(error, 'ensureContact');
    }
  }

  static async recordInteraction(input: {
    tenantId: string;
    contactId: string;
    conversationId?: string;
    type: CrmInteractionType;
    notes: string;
    outcome?: string;
    occurredAt?: string;
    id?: string;
  }): Promise<CrmInteractionRecord> {
    const now = new Date().toISOString();
    const payload: CrmInteractionRecord = {
      id: input.id || `interaction_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenant_id: input.tenantId,
      contact_id: input.contactId,
      conversation_id: input.conversationId || null,
      type: input.type,
      notes: input.notes,
      outcome: input.outcome || null,
      occurred_at: input.occurredAt || now,
      created_at: now,
    };

    try {
      const { data, error } = await getSupabaseClient()
        .from('crm_interactions')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) this.handleError(error, 'recordInteraction');
      await getSupabaseClient()
        .from('crm_contacts')
        .update({ last_contacted_at: payload.occurred_at, updated_at: now })
        .eq('tenant_id', input.tenantId)
        .eq('id', input.contactId);
      return data as CrmInteractionRecord;
    } catch (error: any) {
      if (error?.code === 'CRM_SCHEMA_NOT_READY' || error?.code === 'CRM_DATABASE_UNAVAILABLE') throw error;
      this.handleError(error, 'recordInteraction');
    }
  }

  static async linkConversation(input: { tenantId: string; conversationId: string; contactId: string; contactName: string }): Promise<void> {
    try {
      const { error } = await getSupabaseClient()
        .from('whatsapp_conversations')
        .update({ contact_id: input.contactId, contact_name: input.contactName, updated_at: new Date().toISOString() })
        .eq('tenant_id', input.tenantId)
        .eq('id', input.conversationId);
      if (error) this.handleError(error, 'linkConversation');
    } catch (error: any) {
      if (error?.code === 'CRM_SCHEMA_NOT_READY' || error?.code === 'CRM_DATABASE_UNAVAILABLE') throw error;
      this.handleError(error, 'linkConversation');
    }
  }

  static async updateContact(
    tenantId: string,
    contactId: string,
    changes: Partial<Pick<CrmContactRecord,
      'name' | 'email' | 'category' | 'notes' | 'treatment_type' | 'treatment_value' |
      'amount_collected' | 'payment_method' | 'pipeline_stage' | 'photos' | 'ai_autopilot' |
      'source' | 'metadata' | 'last_contacted_at'
    >>
  ): Promise<CrmContactRecord> {
    const allowed = [
      'name', 'email', 'category', 'notes', 'treatment_type', 'treatment_value',
      'amount_collected', 'payment_method', 'pipeline_stage', 'photos', 'ai_autopilot',
      'source', 'metadata', 'last_contacted_at',
    ] as const;
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (changes[key] !== undefined) payload[key] = changes[key] as unknown;
    }

    try {
      const { data, error } = await getSupabaseClient()
        .from('crm_contacts')
        .update(payload)
        .eq('tenant_id', tenantId)
        .eq('id', contactId)
        .select()
        .maybeSingle();
      if (error) this.handleError(error, 'updateContact');
      if (!data) {
        const missing: any = new Error('Patient does not belong to this workspace.');
        missing.code = 'CRM_CONTACT_NOT_FOUND';
        throw missing;
      }
      return data as CrmContactRecord;
    } catch (error: any) {
      if (error?.code === 'CRM_SCHEMA_NOT_READY' || error?.code === 'CRM_DATABASE_UNAVAILABLE' || error?.code === 'CRM_CONTACT_NOT_FOUND') throw error;
      this.handleError(error, 'updateContact');
    }
  }

  static async listContacts(tenantId: string): Promise<CrmContactRecord[]> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('crm_contacts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('last_contacted_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) this.handleError(error, 'listContacts');
      return (data || []) as CrmContactRecord[];
    } catch (error: any) {
      if (error?.code === 'CRM_SCHEMA_NOT_READY' || error?.code === 'CRM_DATABASE_UNAVAILABLE') throw error;
      this.handleError(error, 'listContacts');
    }
  }

  static async listInteractions(tenantId: string, contactId?: string): Promise<CrmInteractionRecord[]> {
    try {
      let query = getSupabaseClient()
        .from('crm_interactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('occurred_at', { ascending: false });
      if (contactId) query = query.eq('contact_id', contactId);
      const { data, error } = await query;
      if (error) this.handleError(error, 'listInteractions');
      return (data || []) as CrmInteractionRecord[];
    } catch (error: any) {
      if (error?.code === 'CRM_SCHEMA_NOT_READY' || error?.code === 'CRM_DATABASE_UNAVAILABLE') throw error;
      this.handleError(error, 'listInteractions');
    }
  }
}
