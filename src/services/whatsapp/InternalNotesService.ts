/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient } from '../../supabase/client';
import { logger } from '../metadata/logger';

export interface InternalNoteRecord {
  id: string;
  tenant_id: string;
  conversation_id: string;
  author_user_id: string;
  author_name?: string | null;
  note_body: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export class InternalNotesService {
  public static MAX_NOTE_LENGTH = 2000;

  /**
   * Sanitizes note text to prevent HTML / script injection
   */
  public static sanitizeNoteText(rawText: string): string {
    if (!rawText) return '';
    const trimmed = rawText.trim().substring(0, this.MAX_NOTE_LENGTH);
    // Replace script tags and dangerous HTML tags
    return trimmed
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '');
  }

  /**
   * Adds an internal note to a conversation
   */
  public static async createNote(params: {
    tenantId: string;
    conversationId: string;
    authorUserId: string;
    authorName?: string;
    noteBody: string;
  }): Promise<InternalNoteRecord> {
    const { tenantId, conversationId, authorUserId, authorName, noteBody } = params;
    const sanitizedBody = this.sanitizeNoteText(noteBody);

    if (!sanitizedBody) {
      throw new Error('Note body cannot be empty.');
    }

    const supabase = getSupabaseClient();
    const nowIso = new Date().toISOString();
    const noteId = `note_${tenantId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newNote: InternalNoteRecord = {
      id: noteId,
      tenant_id: tenantId,
      conversation_id: conversationId,
      author_user_id: authorUserId,
      author_name: authorName || 'Staff Member',
      note_body: sanitizedBody,
      version: 1,
      created_at: nowIso,
      updated_at: nowIso,
    };

    try {
      const { data, error } = await supabase
        .from('whatsapp_internal_notes')
        .insert(newNote)
        .select()
        .single();

      if (error) {
        logger.error('InternalNotesService', `Failed to insert note for conversation ${conversationId}`, error);
        throw new Error(`Failed to create internal note: ${error.message}`);
      }

      logger.info('InternalNotesService', `Created internal note ${noteId} for conversation ${conversationId}`);
      return (data as InternalNoteRecord) || newNote;
    } catch (err: any) {
      logger.error('InternalNotesService', `Error creating internal note`, err);
      throw err;
    }
  }

  /**
   * Lists all non-deleted internal notes for a conversation
   */
  public static async getNotesForConversation(tenantId: string, conversationId: string): Promise<InternalNoteRecord[]> {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('whatsapp_internal_notes')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('InternalNotesService', `Failed to fetch notes for conversation ${conversationId}`, error);
        return [];
      }

      return (data as InternalNoteRecord[]) || [];
    } catch (err) {
      logger.error('InternalNotesService', `Error fetching internal notes`, err);
      return [];
    }
  }

  /**
   * Edits an existing internal note (verifying tenant & author or admin)
   */
  public static async editNote(params: {
    tenantId: string;
    noteId: string;
    authorUserId: string;
    newBody: string;
  }): Promise<InternalNoteRecord> {
    const { tenantId, noteId, authorUserId, newBody } = params;
    const sanitizedBody = this.sanitizeNoteText(newBody);
    if (!sanitizedBody) {
      throw new Error('Note body cannot be empty.');
    }

    const supabase = getSupabaseClient();
    const nowIso = new Date().toISOString();

    try {
      const { data: existing, error: fetchErr } = await supabase
        .from('whatsapp_internal_notes')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('id', noteId)
        .is('deleted_at', null)
        .single();

      if (fetchErr || !existing) {
        throw new Error('Internal note not found or access denied.');
      }

      const updatedVersion = (existing.version || 1) + 1;

      const { data, error: updateErr } = await supabase
        .from('whatsapp_internal_notes')
        .update({
          note_body: sanitizedBody,
          version: updatedVersion,
          updated_at: nowIso,
        })
        .eq('tenant_id', tenantId)
        .eq('id', noteId)
        .select()
        .single();

      if (updateErr) {
        throw new Error(`Failed to update note: ${updateErr.message}`);
      }

      return data as InternalNoteRecord;
    } catch (err: any) {
      logger.error('InternalNotesService', `Error editing internal note ${noteId}`, err);
      throw err;
    }
  }

  /**
   * Soft-deletes an internal note
   */
  public static async deleteNote(tenantId: string, noteId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const nowIso = new Date().toISOString();

    try {
      const { error } = await supabase
        .from('whatsapp_internal_notes')
        .update({ deleted_at: nowIso, updated_at: nowIso })
        .eq('tenant_id', tenantId)
        .eq('id', noteId);

      if (error) {
        logger.error('InternalNotesService', `Failed to delete note ${noteId}`, error);
        return false;
      }

      return true;
    } catch (err) {
      logger.error('InternalNotesService', `Error deleting note ${noteId}`, err);
      return false;
    }
  }
}
