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
  | 'assigned'
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
      } else if (viewFilter === 'assigned') {
        query = query.not('assigned_user_id', 'is', null);
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