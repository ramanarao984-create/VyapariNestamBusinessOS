/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Inbox, UserCheck, ShieldAlert, Clock, AlertTriangle, CheckCircle2, 
  RotateCcw, Play, MessageSquare, Send, Paperclip, FileText, User, 
  Search, Filter, RefreshCw, Bell, Tag, Shield, AlertCircle, CornerDownRight,
  MoreVertical, ChevronRight, X, Sparkles, Check, CheckCheck, Lock
} from 'lucide-react';
import { authenticatedFetch } from '../auth/apiClient';

export interface InboxItem {
  id: string;
  tenant_id: string;
  external_contact_identifier: string;
  contact_name: string;
  automation_mode: 'ai_active' | 'paused' | 'human_takeover';
  is_handover_required: boolean;
  handover_reason_code?: string;
  handover_created_at?: string;
  assigned_user_id?: string;
  version: number;
  last_inbound_timestamp?: string;
  is_24h_window_open: boolean;
  window_expires_at?: string;
  consent_status: 'opted_in' | 'opted_out' | 'unknown';
  latest_message_body?: string;
  latest_message_direction?: 'inbound' | 'outbound';
  latest_message_timestamp?: string;
  sla_status?: 'ok' | 'warning' | 'breached';
  sla_breach_target?: string;
  sla_target_timestamp?: string;
  handover_status?: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED';
  unread_count?: number;
}

export interface InternalNote {
  id: string;
  conversation_id: string;
  author_user_id: string;
  author_name: string;
  note_body: string;
  created_at: string;
}

export interface StaffNotification {
  id: string;
  tenant_id: string;
  notification_type: string;
  title: string;
  body: string;
  conversation_id?: string;
  target_user_id?: string;
  target_role?: string;
  is_read: boolean;
  created_at: string;
}

export interface SharedWhatsAppInboxProps {
  currentUserId?: string;
  currentUserRole?: string;
}

export const SharedWhatsAppInbox: React.FC<SharedWhatsAppInboxProps> = ({
  currentUserId = 'demo-staff-user',
  currentUserRole = 'Admin'
}) => {
  // Inbox View Filters
  const [viewFilter, setViewFilter] = useState<'all' | 'mine' | 'assigned'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected Conversation Workspace State
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [selectedConv, setSelectedConv] = useState<InboxItem | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);

  // Notes state
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [isNotesLoading, setIsNotesLoading] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'chat' | 'notes' | 'sla_audit'>('chat');

  // Staff Reply state
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replySuccess, setReplySuccess] = useState<string | null>(null);

  // Resume & Handover Action States
  const [isActionExecuting, setIsActionExecuting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [resetFlowStateOnResume, setResetFlowStateOnResume] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const unreadNotifCount = notifications.filter(n => !n.is_read).length;

  // Load Inbox Items
  const fetchInbox = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const queryParams = new URLSearchParams({
        viewFilter,
        searchQuery,
        ...(statusFilter !== 'ALL' && { statusFilter }),
      });
      const res = await authenticatedFetch(`/api/whatsapp/inbox?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`Inbox request failed (${res.status})`);
      }
      const data = await res.json();
      const items: InboxItem[] = data.items || [];
      setInboxItems(items);

      if (items.length > 0 && !selectedConvId) {
        setSelectedConvId(items[0].id);
        setSelectedConv(items[0]);
      } else if (selectedConvId) {
        const matched = items.find(i => i.id === selectedConvId);
        if (matched) setSelectedConv(matched);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load inbox.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load Messages for Selected Conversation
  const fetchMessages = async (convId: string) => {
    setIsMessagesLoading(true);
    try {
      const res = await authenticatedFetch(`/api/whatsapp/messages?conversationId=${convId}`);
      if (res.ok) {
        const msgs = await res.json();
        setMessages(Array.isArray(msgs) ? msgs : []);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setIsMessagesLoading(false);
    }
  };

  // Load Notes for Selected Conversation
  const fetchNotes = async (convId: string) => {
    setIsNotesLoading(true);
    try {
      const res = await authenticatedFetch(`/api/whatsapp/conversations/${convId}/notes`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    } finally {
      setIsNotesLoading(false);
    }
  };

  // Load Notifications
  const fetchNotifications = async () => {
    try {
      const res = await authenticatedFetch(`/api/whatsapp/notifications`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchInbox();
    fetchNotifications();
  }, [viewFilter, statusFilter]);

  useEffect(() => {
    if (selectedConvId) {
      fetchMessages(selectedConvId);
      fetchNotes(selectedConvId);
    }
  }, [selectedConvId]);

  // Handover Action Handlers
  const handleAssign = async (action: 'CLAIM' | 'REASSIGN') => {
    if (!selectedConvId || !selectedConv) return;
    setIsActionExecuting(true);
    setActionMessage(null);
    try {
      const res = await authenticatedFetch(`/api/whatsapp/conversations/${selectedConvId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          targetUserId: currentUserId,
          expectedVersion: selectedConv.version,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to assign conversation.');
      }
      setActionMessage(`Conversation ${action === 'CLAIM' ? 'claimed' : 'reassigned'} successfully!`);
      await fetchInbox();
      if (selectedConvId) await fetchMessages(selectedConvId);
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setIsActionExecuting(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedConvId) return;
    setIsActionExecuting(true);
    setActionMessage(null);
    try {
      const res = await authenticatedFetch(`/api/whatsapp/conversations/${selectedConvId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: 'Handover resolved by staff operator.',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to resolve handover.');
      }
      setActionMessage('Handover resolved! Note: AI Automation remains paused until explicitly resumed.');
      await fetchInbox();
      await fetchMessages(selectedConvId);
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setIsActionExecuting(false);
    }
  };

  const handleReopen = async () => {
    if (!selectedConvId) return;
    setIsActionExecuting(true);
    setActionMessage(null);
    try {
      const res = await authenticatedFetch(`/api/whatsapp/conversations/${selectedConvId}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Customer requested further assistance.',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reopen conversation.');
      }
      setActionMessage('Conversation reopened!');
      await fetchInbox();
      await fetchMessages(selectedConvId);
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setIsActionExecuting(false);
    }
  };

  const handleControlledResume = async () => {
    if (!selectedConvId || !selectedConv) return;
    setIsActionExecuting(true);
    setActionMessage(null);
    try {
      const res = await authenticatedFetch(`/api/whatsapp/conversations/${selectedConvId}/resume-automation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetFlowState: resetFlowStateOnResume,
          expectedVersion: selectedConv.version,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to resume automation.');
      }
      setActionMessage('AI Automation controlled resume completed! Mode set to ai_active.');
      await fetchInbox();
      await fetchMessages(selectedConvId);
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setIsActionExecuting(false);
    }
  };

  const handleSendStaffReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConvId || !replyText.trim()) return;
    setIsSendingReply(true);
    setReplyError(null);
    setReplySuccess(null);

    try {
      const res = await authenticatedFetch(`/api/whatsapp/conversations/${selectedConvId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyText.trim(),
          messageType: 'text',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Reply dispatch failed.');
      }
      setReplySuccess('Reply queued & dispatched via Outbound Pipeline!');
      setReplyText('');
      await fetchMessages(selectedConvId);
      await fetchInbox();
    } catch (err: any) {
      setReplyError(err.message || 'Staff reply dispatch failed.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConvId || !newNoteText.trim()) return;

    try {
      const res = await authenticatedFetch(`/api/whatsapp/conversations/${selectedConvId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteBody: newNoteText.trim() }),
      });
      if (res.ok) {
        setNewNoteText('');
        await fetchNotes(selectedConvId);
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!selectedConvId) return;
    try {
      const res = await authenticatedFetch(`/api/whatsapp/notes/${noteId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchNotes(selectedConvId);
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const markNotificationRead = async (notifId: string) => {
    try {
      await authenticatedFetch(`/api/whatsapp/notifications/${notifId}/read`, {
        method: 'PUT',
      });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[780px] w-full overflow-hidden" id="shared-whatsapp-inbox-root">
      {/* Top Navigation & Status Bar */}
      <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/10 rounded-xl border border-teal-500/20 text-teal-400">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              WhatsApp Chats
              <span className="px-2 py-0.5 bg-teal-500/20 text-teal-300 text-[10px] font-mono rounded-md border border-teal-500/30">
                Phase 4
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Contacts and WhatsApp conversations for your workspace.
            </p>
          </div>
        </div>

        {/* Right Tools: In-app Notification Bell */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowNotificationCenter(!showNotificationCenter)}
            className="relative p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
            title="In-App Staff Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-amber-500 text-slate-950 text-[9px] font-extrabold rounded-full flex items-center justify-center animate-pulse">
                {unreadNotifCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={fetchInbox}
            className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
            title="Refresh Inbox"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Workspace Split View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Conversation List Filters & Items */}
        <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50/50">
          {/* View Mode Tabs */}
          <div className="p-2.5 border-b border-slate-200 bg-white grid grid-cols-3 gap-1 text-[11px] font-bold">
            {[
              ['all', 'Chats'],
              ['mine', 'Mine'],
              ['assigned', 'Assigned'],
            ].map(([filter, label]) => (
              <button
                key={filter}
                type="button"
                onClick={() => setViewFilter(filter as 'all' | 'mine' | 'assigned')}
                className={`py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${viewFilter === filter ? 'bg-teal-600 text-white font-extrabold shadow-2xs' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Secondary Filters & Search */}
          <div className="p-3 border-b border-slate-200 bg-white space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search contacts and chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchInbox()}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-100 border border-slate-200 focus:border-teal-500 rounded-lg text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
              <span className="font-bold uppercase tracking-wider text-slate-400">Status:</span>
              <div className="flex gap-1">
                {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase cursor-pointer ${
                      statusFilter === st ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-150">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-teal-600" />
                Loading conversations...
              </div>
            ) : inboxItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs space-y-1">
                <p className="font-bold text-slate-600">No conversations found</p>
                <p className="text-[11px]">Try Chats, Mine, or Assigned, or change your search.</p>
              </div>
            ) : (
              inboxItems.map(item => {
                const isSelected = item.id === selectedConvId;
                const isHandover = item.is_handover_required || item.handover_status === 'OPEN';
                const isBreached = item.sla_status === 'breached';

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedConvId(item.id);
                      setSelectedConv(item);
                    }}
                    className={`p-3 cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-teal-50/80 border-l-4 border-l-teal-600 font-medium' 
                        : 'hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-800 text-xs truncate max-w-[150px]">
                        {item.contact_name || item.external_contact_identifier}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.latest_message_timestamp ? new Date(item.latest_message_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-1 mb-2 font-normal">
                      {item.latest_message_body || 'No messages yet.'}
                    </p>

                    {/* Status Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[9px] font-bold">
                      {isHandover && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-200 rounded-md flex items-center gap-1">
                          <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
                          Handover
                        </span>
                      )}

                      {isBreached && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-900 border border-red-200 rounded-md flex items-center gap-1">
                          <ShieldAlert className="h-2.5 w-2.5 text-red-600" />
                          SLA Breach
                        </span>
                      )}

                      <span className={`px-2 py-0.5 rounded-md ${
                        item.automation_mode === 'ai_active' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : item.automation_mode === 'paused'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      }`}>
                        {item.automation_mode === 'ai_active' ? 'AI Active' : item.automation_mode === 'paused' ? 'Paused' : 'Human Takeover'}
                      </span>

                      {!item.is_24h_window_open && (
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md" title="24h Service Window Closed (Template required)">
                          Window Closed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center/Right Panel: Selected Conversation Workspace */}
        {selectedConv ? (
          <div className="flex-1 flex flex-col bg-slate-100/50 overflow-hidden">
            {/* Conversation Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-teal-100 text-teal-800 rounded-full flex items-center justify-center font-extrabold text-sm border border-teal-200">
                  {selectedConv.contact_name ? selectedConv.contact_name.charAt(0).toUpperCase() : 'P'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    {selectedConv.contact_name}
                    <span className="text-xs text-slate-500 font-mono font-normal">
                      ({selectedConv.external_contact_identifier})
                    </span>
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="h-3 w-3 text-slate-400" />
                      24h Window: {selectedConv.is_24h_window_open ? (
                        <strong className="text-emerald-600 font-bold">OPEN</strong>
                      ) : (
                        <strong className="text-red-600 font-bold">EXPIRED (Template Needed)</strong>
                      )}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-medium">
                      Consent: {selectedConv.consent_status === 'opted_out' ? (
                        <strong className="text-red-600 font-bold">OPTED OUT</strong>
                      ) : (
                        <strong className="text-emerald-600 font-bold">OPTED IN</strong>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Top Control Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveWorkspaceTab('chat')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeWorkspaceTab === 'chat' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Chat & Handover
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWorkspaceTab('notes')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    activeWorkspaceTab === 'notes' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Internal Notes
                  {notes.length > 0 && (
                    <span className="px-1.5 py-0.2 bg-teal-100 text-teal-800 text-[10px] rounded-full">
                      {notes.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Action Status Alert Bar */}
            {actionMessage && (
              <div className="px-4 py-2 bg-slate-900 text-teal-300 text-xs font-medium border-b border-slate-800 flex items-center justify-between">
                <span>{actionMessage}</span>
                <button type="button" onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Handover & Automation Banner */}
            <div className="p-4 bg-amber-50/80 border-b border-amber-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-amber-200 text-amber-900 font-extrabold text-[10px] rounded-md uppercase tracking-wider">
                    Handover Status: {selectedConv.handover_status || (selectedConv.is_handover_required ? 'OPEN' : 'RESOLVED')}
                  </span>
                  {selectedConv.handover_reason_code && (
                    <span className="text-xs font-bold text-amber-950 font-mono">
                      Reason: {selectedConv.handover_reason_code}
                    </span>
                  )}
                </div>
                <p className="text-xs text-amber-900/80">
                  Automation is currently <strong>{selectedConv.automation_mode}</strong>. Resolving handover will keep AI paused until explicitly resumed.
                </p>
              </div>

              {/* Handover & Resume Control Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={isActionExecuting}
                  onClick={() => handleAssign('CLAIM')}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  Claim Conversation
                </button>

                <button
                  type="button"
                  disabled={isActionExecuting}
                  onClick={handleResolve}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Resolve Handover
                </button>

                <button
                  type="button"
                  disabled={isActionExecuting}
                  onClick={handleReopen}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reopen
                </button>

                {/* Controlled Automation Resume Button */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-teal-200 shadow-2xs">
                  <label className="text-[10px] text-slate-600 font-bold px-1 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={resetFlowStateOnResume}
                      onChange={(e) => setResetFlowStateOnResume(e.target.checked)}
                      className="rounded text-teal-600"
                    />
                    Reset Flow
                  </label>
                  <button
                    type="button"
                    disabled={isActionExecuting}
                    onClick={handleControlledResume}
                    className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-xs font-extrabold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Play className="h-3 w-3" />
                    Resume AI
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content View (Chat vs Notes) */}
            {activeWorkspaceTab === 'chat' ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Messages Stream */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/60">
                  {isMessagesLoading ? (
                    <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-teal-600" />
                      Loading messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No message history recorded yet.
                    </div>
                  ) : (
                    messages.map((m: any) => {
                      const isInbound = m.direction === 'inbound';
                      return (
                        <div
                          key={m.id}
                          className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}
                        >
                          <div
                            className={`max-w-[75%] p-3 rounded-2xl text-xs space-y-1 ${
                              isInbound 
                                ? 'bg-white border border-slate-200 text-slate-800 shadow-2xs rounded-bl-none' 
                                : 'bg-teal-700 text-white shadow-2xs rounded-br-none'
                            }`}
                          >
                            <p className="leading-relaxed whitespace-pre-wrap">{m.body}</p>
                            <div className={`flex items-center justify-end gap-1 text-[9px] ${
                              isInbound ? 'text-slate-400' : 'text-teal-200'
                            }`}>
                              <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {!isInbound && <CheckCheck className="h-3 w-3" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Staff Reply Pipeline Composer */}
                <div className="p-4 bg-white border-t border-slate-200 space-y-2">
                  {replyError && (
                    <div className="p-2 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-center justify-between">
                      <span>{replyError}</span>
                      <button type="button" onClick={() => setReplyError(null)} className="text-red-500">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {replySuccess && (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
                      <span>{replySuccess}</span>
                      <button type="button" onClick={() => setReplySuccess(null)} className="text-emerald-500">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Consent Block Warning */}
                  {selectedConv.consent_status === 'opted_out' ? (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-900 text-xs rounded-xl font-medium flex items-center gap-2">
                      <Lock className="h-4 w-4 text-red-600 shrink-0" />
                      Recipient has opted out of WhatsApp messages. Staff replies are blocked until contact opts back in.
                    </div>
                  ) : (
                    <form onSubmit={handleSendStaffReply} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <textarea
                          rows={2}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type staff reply (Dispatches via Outbound Service)..."
                          className="flex-1 p-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl text-xs focus:outline-none resize-none"
                        />
                        <button
                          type="submit"
                          disabled={isSendingReply || !replyText.trim()}
                          className="h-full px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isSendingReply ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              Send Reply
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Staff replies execute via the secure Outbound Service pipeline with durable queue support.
                      </p>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              /* Internal Notes Panel */
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/60">
                <form onSubmit={handleAddNote} className="space-y-2 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-teal-600" />
                    Add Staff Internal Note
                  </h4>
                  <textarea
                    rows={3}
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Write internal notes visible only to clinic staff..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl text-xs focus:outline-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!newNoteText.trim()}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      Save Internal Note
                    </button>
                  </div>
                </form>

                {/* Notes Timeline */}
                <div className="space-y-3">
                  {isNotesLoading ? (
                    <div className="p-4 text-center text-slate-400 text-xs">Loading notes...</div>
                  ) : notes.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs">No internal notes added yet.</div>
                  ) : (
                    notes.map(n => (
                      <div key={n.id} className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-teal-600" />
                            {n.author_name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(n.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteNote(n.id)}
                              className="text-slate-400 hover:text-red-600 transition-colors"
                              title="Delete note"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed font-normal">{n.note_body}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
            <Inbox className="h-10 w-10 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-700">Select a conversation</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Choose a contact from the left panel to open the chat.
            </p>
          </div>
        )}
      </div>

      {/* In-App Staff Notification Center Modal */}
      {showNotificationCenter && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-50 flex items-center justify-end p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full h-[600px] shadow-2xl flex flex-col overflow-hidden animate-fade-in">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-xs font-bold flex items-center gap-2">
                <Bell className="h-4 w-4 text-teal-400" />
                Staff In-App Notifications
              </h3>
              <button
                type="button"
                onClick={() => setShowNotificationCenter(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-2 divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No staff notifications found.
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && markNotificationRead(n.id)}
                    className={`pt-2.5 pb-2.5 px-2 cursor-pointer transition-all ${
                      n.is_read ? 'opacity-60' : 'bg-teal-50/50 rounded-xl font-medium'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-800">{n.title}</span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{n.body}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
