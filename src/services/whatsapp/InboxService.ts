/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient } from '../../supabase/client';
import { logger } from '../metadata/logger';
import { ConsentService } from './ConsentService';
import { ConversationWindowEvaluator, SERVICE_WINDOW_DURATION_MS } from './ConversationWindowEvaluator';

export type InboxViewFilter =
  | 'all'
  | 'unassigned'
  | 'assigned_to_me'
  | 'handover_required'
  | 'waiting_for_customer'
  | 'waiting_for_staff'
  | 'resolved'
  | 'automation_paused';

export interface InboxItem {
  id: string;
  tenant_id: string;
  external_contact_identifier: string;
  contact_name: string;
  status: 'open' | 'closed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_user_id?: string | null;
  assigned_user_name?: string | null;
  automation_mode: 'ai_active' | 'paused' | 'human_takeover';
  is_handover_required: boolean;
  handover_status?: string | null;
  handover_reason?: string | null;
  branch_id?: string | null;
  unread_count: number;
  last_message_preview?: string | null;
  last_message_at: string;
  consent_status: 'opted_in' | 'opted_out' | 'unspecified';
  window_expires_at?: string | null;
  is_window_active: boolean;
  time_remaining_ms: number;
  sla_status?: 'ACTIVE' | 'WARNING' | 'BREACHED' | 'COMPLETED' | 'PAUSED' | 'NOT_STARTED';
  created_at: string;
  updated_at: string;
}

export interface InboxListParams {
  tenantId: string;
  currentUserId?: string;
  viewFilter?: InboxViewFilter;
  searchQuery?: string;
  statusFilter?: 'open' | 'closed' | 'archived';
  assigneeFilter?: string;
  priorityFilter?: 'low' | 'medium' | 'high' | 'urgent';
  branchFilter?: string;
  page?: number;
  pageSize?: number;
}

export class InboxService {
  /**
   * Helper to format customer display name / phone cleanly
   */
  public static sanitizeContactName(name?: string, phone?: string): string {
    if (name && name.trim() && name !== 'New Lead') return name.trim();
    if (phone) {
      const clean = phone.replace(/[^0-9]/g, '');
      if (clean.length >= 10) {
        return `+${clean.substring(0, clean.length - 10)} ${clean.substring(clean.length - 10, clean.length - 7)}-${clean.substring(clean.length - 7, clean.length - 4)}-${clean.substring(clean.length - 4)}`;
      }
      return `+${clean}`;
    }
    return 'WhatsApp Contact';
  }

  /**
   * Fetches rich shared inbox list for tenant with filtering, pagination, and deterministic SLA priority sorting
   */
  public static async getInboxItems(params: InboxListParams): Promise<{ items: InboxItem[]; totalCount: number }> {
    const {
      tenantId,
      currentUserId,
      viewFilter = 'all',
      searchQuery,
      statusFilter,
      assigneeFilter,
      priorityFilter,
      branchFilter,
      page = 1,
      pageSize = 25,
    } = params;

    const supabase = getSupabaseClient();
    const nowMs = Date.now();

    try {
      // Fetch core conversations
      let query = supabase.from('whatsapp_conversations').select('*', { count: 'exact' }).eq('tenant_id', tenantId);

      // Apply view filter
      if (viewFilter === 'unassigned') {
        query = query.is('assigned_user_id', null);
      } else if (viewFilter === 'assigned_to_me' && currentUserId) {
        query = query.eq('assigned_user_id', currentUserId);
      } else if (viewFilter === 'handover_required') {
        query = query.eq('is_handover_required', true);
      } else if (viewFilter === 'waiting_for_customer') {
        query = query.eq('is_handover_required', true).not('assigned_user_id', 'is', null);
      } else if (viewFilter === 'waiting_for_staff') {
        query = query.eq('is_handover_required', true);
      } else if (viewFilter === 'resolved') {
        query = query.eq('status', 'closed');
      } else if (viewFilter === 'automation_paused') {
        query = query.in('automation_mode', ['paused', 'human_takeover']);
      }

      // Apply optional status filter
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      // Apply optional assignee filter
      if (assigneeFilter) {
        if (assigneeFilter === 'unassigned') query = query.is('assigned_user_id', null);
        else query = query.eq('assigned_user_id', assigneeFilter);
      }

      // Apply optional priority filter
      if (priorityFilter) {
        query = query.eq('priority', priorityFilter);
      }

      // Apply optional branch filter
      if (branchFilter) {
        query = query.eq('branch_id', branchFilter);
      }

      // Apply search query filter
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.trim();
        query = query.or(`contact_name.ilike.%${q}%,external_contact_identifier.ilike.%${q}%`);
      }

      // Order by last_message_at descending initially
      query = query.order('last_message_at', { ascending: false });

      // Calculate pagination range
      const offset = (page - 1) * pageSize;
      query = query.range(offset, offset + pageSize - 1);

      let { data: convs, count, error } = await query;

      if (error) {
        // Fallback if is_handover_required or another column is not present in existing DB schema (42703)
        if (error.code === '42703') {
          logger.warn('InboxService', `Column missing on whatsapp_conversations (42703), executing fallback query without is_handover_required`);
          let fbQuery = supabase.from('whatsapp_conversations').select('*', { count: 'exact' }).eq('tenant_id', tenantId);

          if (viewFilter === 'unassigned') {
            fbQuery = fbQuery.is('assigned_user_id', null);
          } else if (viewFilter === 'assigned_to_me' && currentUserId) {
            fbQuery = fbQuery.eq('assigned_user_id', currentUserId);
          } else if (viewFilter === 'handover_required' || viewFilter === 'waiting_for_staff' || viewFilter === 'waiting_for_customer') {
            fbQuery = fbQuery.eq('automation_mode', 'human_takeover');
          } else if (viewFilter === 'resolved') {
            fbQuery = fbQuery.eq('status', 'closed');
          } else if (viewFilter === 'automation_paused') {
            fbQuery = fbQuery.in('automation_mode', ['paused', 'human_takeover']);
          }

          if (statusFilter) fbQuery = fbQuery.eq('status', statusFilter);
          if (assigneeFilter) {
            if (assigneeFilter === 'unassigned') fbQuery = fbQuery.is('assigned_user_id', null);
            else fbQuery = fbQuery.eq('assigned_user_id', assigneeFilter);
          }
          if (branchFilter) fbQuery = fbQuery.eq('branch_id', branchFilter);

          if (searchQuery && searchQuery.trim()) {
            const q = searchQuery.trim();
            fbQuery = fbQuery.or(`contact_name.ilike.%${q}%,external_contact_identifier.ilike.%${q}%`);
          }

          fbQuery = fbQuery.order('last_message_at', { ascending: false });
          const offset = (page - 1) * pageSize;
          fbQuery = fbQuery.range(offset, offset + pageSize - 1);

          const fbRes = await fbQuery;
          if (!fbRes.error && fbRes.data) {
            convs = fbRes.data;
            count = fbRes.count;
          } else {
            logger.warn('InboxService', `Fallback inbox query failed: ${fbRes.error?.message}`);
            return { items: [], totalCount: 0 };
          }
        } else if (error.code === 'PGRST205' || error.code === '42P01') {
          const schemaErr: any = new Error(`Database table 'whatsapp_conversations' not ready: ${error.message}`);
          schemaErr.code = 'WHATSAPP_SCHEMA_NOT_READY';
          throw schemaErr;
        } else {
          logger.warn('InboxService', `Database query failed for inbox: ${error.message}`);
          const dbErr: any = new Error(`Database query failed for inbox: ${error.message}`);
          dbErr.code = 'WHATSAPP_DATABASE_UNAVAILABLE';
          throw dbErr;
        }
      }

      if (!convs || convs.length === 0) {
        return { items: [], totalCount: count || 0 };
      }

      const convIds = convs.map((c) => c.id);

      // Batch fetch latest message previews
      const { data: latestMsgs } = await supabase
        .from('whatsapp_messages')
        .select('conversation_id, body, created_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false });

      const lastMsgMap = new Map<string, string>();
      if (latestMsgs) {
        for (const m of latestMsgs) {
          if (!lastMsgMap.has(m.conversation_id)) {
            lastMsgMap.set(m.conversation_id, m.body || '[Media message]');
          }
        }
      }

      // Batch fetch 24h window expiration
      const { data: windows } = await supabase
        .from('whatsapp_conversation_windows')
        .select('conversation_id, window_expires_at')
        .in('conversation_id', convIds);

      const windowMap = new Map<string, string>();
      if (windows) {
        for (const w of windows) {
          windowMap.set(w.conversation_id, w.window_expires_at);
        }
      }

      // Batch fetch active handovers
      const { data: handovers } = await supabase
        .from('whatsapp_handovers')
        .select('conversation_id, status, reason_code, priority, branch_id')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false });

      const handoverMap = new Map<string, { status: string; reason: string; priority: string }>();
      if (handovers) {
        for (const h of handovers) {
          if (!handoverMap.has(h.conversation_id)) {
            handoverMap.set(h.conversation_id, { status: h.status, reason: h.reason_code, priority: h.priority });
          }
        }
      }

      // Batch fetch active SLA instances
      const { data: slaInsts } = await supabase
        .from('whatsapp_sla_instances')
        .select('conversation_id, status')
        .in('conversation_id', convIds);

      const slaMap = new Map<string, 'ACTIVE' | 'WARNING' | 'BREACHED' | 'COMPLETED' | 'PAUSED'>();
      if (slaInsts) {
        for (const s of slaInsts) {
          slaMap.set(s.conversation_id, s.status as any);
        }
      }

      // Construct inbox items
      const items: InboxItem[] = [];

      for (const conv of convs) {
        const phone = conv.external_contact_identifier;
        const consent = await ConsentService.getConsentStatus(tenantId, phone);

        const expiresAt = windowMap.get(conv.id);
        const expiresMs = expiresAt ? new Date(expiresAt).getTime() : 0;
        const isWindowActive = expiresMs > nowMs;
        const timeRemainingMs = Math.max(0, expiresMs - nowMs);

        const ho = handoverMap.get(conv.id);
        const slaStatus = slaMap.get(conv.id) || 'NOT_STARTED';

        items.push({
          id: conv.id,
          tenant_id: conv.tenant_id,
          external_contact_identifier: phone,
          contact_name: this.sanitizeContactName(conv.contact_name, phone),
          status: conv.status || 'open',
          priority: (ho?.priority as any) || conv.priority || 'medium',
          assigned_user_id: conv.assigned_user_id || null,
          automation_mode: conv.automation_mode || 'ai_active',
          is_handover_required: conv.is_handover_required || false,
          handover_status: ho?.status || (conv.is_handover_required ? 'REQUIRED' : 'UNASSIGNED'),
          handover_reason: ho?.reason || null,
          branch_id: conv.branch_id || null,
          unread_count: conv.unread_count || 0,
          last_message_preview: lastMsgMap.get(conv.id) || null,
          last_message_at: conv.last_message_at || conv.created_at,
          consent_status: consent,
          window_expires_at: expiresAt || null,
          is_window_active: isWindowActive,
          time_remaining_ms: timeRemainingMs,
          sla_status: slaStatus,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
        });
      }

      // Sort with deterministic priority:
      // 1. SLA Breached
      // 2. Handover Required
      // 3. Unassigned
      // 4. Waiting longest for staff
      // 5. Most recently active
      items.sort((a, b) => {
        if (a.sla_status === 'BREACHED' && b.sla_status !== 'BREACHED') return -1;
        if (b.sla_status === 'BREACHED' && a.sla_status !== 'BREACHED') return 1;

        if (a.is_handover_required && !b.is_handover_required) return -1;
        if (b.is_handover_required && !a.is_handover_required) return 1;

        if (!a.assigned_user_id && b.assigned_user_id) return -1;
        if (!b.assigned_user_id && a.assigned_user_id) return 1;

        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });

      return { items, totalCount: count || items.length };
    } catch (err: any) {
      if (err?.code === 'WHATSAPP_DATABASE_UNAVAILABLE' || err?.code === 'WHATSAPP_SCHEMA_NOT_READY') {
        throw err;
      }
      logger.error('InboxService', `Failed to execute getInboxItems`, err);
      return { items: [], totalCount: 0 };
    }
  }
}
