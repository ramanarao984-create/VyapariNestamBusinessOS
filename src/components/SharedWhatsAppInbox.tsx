/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { CheckCheck, MessageCircle, Plus, RefreshCw, Search, Send, X } from 'lucide-react';
import { authenticatedFetch } from '../auth/apiClient';

interface Chat {
  id: string;
  external_contact_identifier: string;
  contact_name: string;
  assigned_user_id?: string | null;
  latest_message_body?: string;
  latest_message_direction?: 'inbound' | 'outbound' | null;
  latest_message_timestamp?: string | null;
  is_24h_window_open?: boolean;
  window_expires_at?: string | null;
}

interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  status?: string;
  created_at: string;
}

export interface SharedWhatsAppInboxProps {
  currentUserId?: string;
  currentUserRole?: string;
}

export const SharedWhatsAppInbox: React.FC<SharedWhatsAppInboxProps> = ({ currentUserId }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'all' | 'mine' | 'assigned'>('all');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [composer, setComposer] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const fetchChats = async () => {
    setLoadingChats(true);
    try {
      const params = new URLSearchParams({ viewFilter: view, searchQuery: search });
      const response = await authenticatedFetch('/api/whatsapp/inbox?' + params.toString());
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'Chats could not be loaded.');
      const items = Array.isArray(data.items) ? data.items : [];
      setChats(items);
      setSelectedChat((current) => current ? items.find((item: Chat) => item.id === current.id) || null : items[0] || null);
    } catch (requestError: any) {
      setError(requestError.message || 'Chats could not be loaded.');
    } finally {
      setLoadingChats(false);
    }
  };

  const fetchMessages = async (chat: Chat) => {
    setLoadingMessages(true);
    try {
      const response = await authenticatedFetch('/api/whatsapp/messages?conversationId=' + encodeURIComponent(chat.id));
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'Message history could not be loaded.');
      setMessages(Array.isArray(data) ? data : []);
    } catch (requestError: any) {
      setError(requestError.message || 'Message history could not be loaded.');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => { void fetchChats(); }, [view]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchChats(); }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (selectedChat) void fetchMessages(selectedChat);
    else setMessages([]);
  }, [selectedChat?.id]);

  const visibleChats = useMemo(() => chats, [chats]);

  const sendMessage = async (event: FormEvent, target?: { phone: string; conversationId?: string; contactName?: string }) => {
    event.preventDefault();
    const recipient = target?.phone || selectedChat?.external_contact_identifier || '';
    const text = (target ? newMessage : composer).trim();
    if (!recipient || !text) return;

    setSending(true);
    setError(null);
    setStatus(null);
    try {
      const response = await authenticatedFetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient,
          message: text,
          messageType: 'text',
          conversationId: target?.conversationId || selectedChat?.id,
          contactName: target?.contactName || selectedChat?.contact_name,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Message could not be sent.');

      setComposer('');
      setNewMessage('');
      setShowNewChat(false);
      setStatus('Message sent through WhatsApp Cloud API.');
      await fetchChats();
      const sentChat = chats.find((chat) => chat.id === data.conversationId) || selectedChat;
      if (sentChat) {
        setSelectedChat(sentChat);
        await fetchMessages(sentChat);
      }
    } catch (requestError: any) {
      setError(requestError.message || 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const submitNewChat = (event: FormEvent) => {
    const phone = newPhone.replace(/[^0-9]/g, '');
    return sendMessage(event, { phone, contactName: newName.trim() || 'New contact' });
  };

  return (
    <section className="h-full min-h-[620px] rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
      <header className="border-b border-slate-200 p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2"><MessageCircle className="h-5 w-5 text-teal-600" />WhatsApp Chats</h2>
          <p className="text-xs text-slate-500 mt-1">Contacts appear when they message your business number, or when you start a compliant conversation.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void fetchChats()} className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" title="Refresh chats"><RefreshCw className={loadingChats ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /></button>
          <button type="button" onClick={() => { setError(null); setStatus(null); setShowNewChat(true); }} className="px-3 py-2 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 flex items-center gap-1.5"><Plus className="h-4 w-4" />New chat</button>
        </div>
      </header>

      {(error || status) && <div className={error ? 'mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex justify-between gap-3' : 'mx-4 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800'}>
        <span>{error || status}</span><button type="button" onClick={() => { setError(null); setStatus(null); }}><X className="h-4 w-4" /></button>
      </div>}

      <div className="flex flex-1 min-h-0">
        <aside className="w-full max-w-[360px] border-r border-slate-200 flex flex-col">
          <div className="p-3 border-b border-slate-200 space-y-3">
            <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-bold">
              {(['all', 'mine', 'assigned'] as const).map((item) => <button key={item} type="button" onClick={() => setView(item)} className={view === item ? 'flex-1 rounded-md bg-white px-2 py-1.5 shadow-sm text-slate-900' : 'flex-1 rounded-md px-2 py-1.5 text-slate-500'}>
                {item === 'all' ? 'Chats' : item === 'mine' ? 'Mine' : 'Assigned'}
              </button>)}
            </div>
            <label className="relative block"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search contacts or phone numbers..." className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-teal-500" /></label>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingChats ? <div className="p-6 text-center text-xs text-slate-400">Loading chats...</div> : visibleChats.length === 0 ? <div className="p-8 text-center text-xs text-slate-500"><p className="font-bold text-slate-700">No chats yet</p><p className="mt-1">Use New chat or ask a contact to message your business WhatsApp number.</p></div> : visibleChats.map((chat) => <button key={chat.id} type="button" onClick={() => setSelectedChat(chat)} className={selectedChat?.id === chat.id ? 'w-full text-left px-4 py-3 border-b border-slate-100 bg-teal-50' : 'w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50'}>
              <div className="flex justify-between gap-2"><span className="truncate text-sm font-bold text-slate-800">{chat.contact_name || chat.external_contact_identifier}</span><span className="text-[10px] text-slate-400 whitespace-nowrap">{chat.latest_message_timestamp ? new Date(chat.latest_message_timestamp).toLocaleDateString() : ''}</span></div>
              <p className="mt-1 truncate text-xs text-slate-500">{chat.latest_message_body || chat.external_contact_identifier}</p>
            </button>)}
          </div>
        </aside>

        <main className="hidden min-w-0 flex-1 flex-col md:flex">
          {selectedChat ? <>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between"><div><h3 className="font-bold text-slate-900">{selectedChat.contact_name || selectedChat.external_contact_identifier}</h3><p className="text-xs text-slate-500">+{selectedChat.external_contact_identifier}</p></div><span className={selectedChat.is_24h_window_open ? 'rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700' : 'rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700'}>{selectedChat.is_24h_window_open ? 'Reply window open' : 'Template required'}</span></div>
            <div className="flex-1 overflow-y-auto bg-slate-50 p-5 space-y-3">{loadingMessages ? <p className="text-center text-xs text-slate-400">Loading messages...</p> : messages.length === 0 ? <p className="pt-12 text-center text-xs text-slate-500">No message history. A first free-text message needs the contact to message you first. Otherwise, use an approved template.</p> : messages.map((message) => <div key={message.id} className={message.direction === 'outbound' ? 'flex justify-end' : 'flex justify-start'}><div className={message.direction === 'outbound' ? 'max-w-[72%] rounded-2xl rounded-br-sm bg-teal-600 px-3 py-2 text-sm text-white' : 'max-w-[72%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800'}><p className="whitespace-pre-wrap">{message.body}</p><p className={message.direction === 'outbound' ? 'mt-1 flex items-center justify-end gap-1 text-[10px] text-teal-100' : 'mt-1 text-[10px] text-slate-400'}>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{message.direction === 'outbound' && <CheckCheck className="h-3 w-3" />}</p></div></div>)}</div>
            <form onSubmit={(event) => void sendMessage(event)} className="border-t border-slate-200 p-4"><div className="flex gap-2"><textarea value={composer} onChange={(event) => setComposer(event.target.value)} rows={2} placeholder={selectedChat.is_24h_window_open ? 'Write a message...' : 'Customer service window is closed; use an approved template.'} className="flex-1 resize-none rounded-lg border border-slate-200 p-2 text-sm outline-none focus:border-teal-500" /><button type="submit" disabled={sending || !composer.trim()} className="rounded-lg bg-teal-600 px-4 text-white disabled:opacity-50"><Send className="h-4 w-4" /></button></div><p className="mt-2 text-[10px] text-slate-500">Free-text replies can only be sent within 24 hours of the contact's message. This protects your WhatsApp account.</p></form>
          </> : <div className="flex flex-1 flex-col items-center justify-center text-slate-400"><MessageCircle className="h-10 w-10" /><p className="mt-3 text-sm font-bold text-slate-600">Select a chat</p><p className="mt-1 text-xs">Or create a new contact conversation.</p></div>}
        </main>
      </div>

      {showNewChat && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><form onSubmit={(event) => void submitNewChat(event)} className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl space-y-4"><div className="flex items-center justify-between"><h3 className="font-extrabold text-slate-900">New WhatsApp chat</h3><button type="button" onClick={() => setShowNewChat(false)}><X className="h-5 w-5 text-slate-500" /></button></div><label className="block text-xs font-bold text-slate-700">Contact name<input value={newName} onChange={(event) => setNewName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm font-normal" placeholder="Optional" /></label><label className="block text-xs font-bold text-slate-700">WhatsApp number<input required value={newPhone} onChange={(event) => setNewPhone(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm font-normal" placeholder="919087779869" /></label><label className="block text-xs font-bold text-slate-700">Message<textarea required value={newMessage} onChange={(event) => setNewMessage(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm font-normal" /></label><p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">For a first message, WhatsApp requires an approved template. Free text works after the contact messages your business number and opens the 24-hour reply window.</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowNewChat(false)} className="px-3 py-2 text-xs font-bold text-slate-600">Cancel</button><button type="submit" disabled={sending} className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{sending ? 'Sending...' : 'Send message'}</button></div></form></div>}
    </section>
  );
};
