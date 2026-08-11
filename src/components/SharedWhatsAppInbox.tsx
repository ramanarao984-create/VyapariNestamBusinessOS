/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { Bot, CheckCheck, ChevronDown, MessageCircle, Plus, RefreshCw, Search, Send, Sparkles, X } from 'lucide-react';
import { authenticatedFetch } from '../auth/apiClient';
import type { MessageTemplate } from '../types';

interface Chat {
  id: string;
  external_contact_identifier: string;
  contact_name: string;
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

interface Template {
  id: string;
  name: string;
  language: string;
  category: string;
  components: Array<{ type?: string; text?: string }>;
}

export interface SharedWhatsAppInboxProps {
  currentUserId?: string;
  currentUserRole?: string;
  teamTemplates?: MessageTemplate[];
}

const apiRoute = (route: string, params = '') => '/api/whatsapp/connection?whatsappRoute=' + route + (params ? '&' + params : '');
const displayTime = (value?: string | null) => value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
const templateNeedsVariables = (template: Template) => JSON.stringify(template.components || []).includes('{{');

export const SharedWhatsAppInbox: React.FC<SharedWhatsAppInboxProps> = ({ teamTemplates = [] }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [composer, setComposer] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [teamTemplatesOpen, setTeamTemplatesOpen] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [aiOpen, setAiOpen] = useState(false);

  const fetchChats = async () => {
    setLoadingChats(true);
    try {
      const params = new URLSearchParams({ searchQuery: search, _: String(Date.now()) });
      const response = await authenticatedFetch(apiRoute('inbox', params.toString()));
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'Chats could not be loaded.');
      const items = Array.isArray(data.items) ? data.items : [];
      setChats(items);
      setSelectedChat((current) => current ? items.find((item: Chat) => item.id === current.id) || current : items[0] || null);
    } catch (requestError: any) {
      setError(requestError.message || 'Chats could not be loaded.');
    } finally {
      setLoadingChats(false);
    }
  };

  const fetchMessages = async (chat: Chat) => {
    setLoadingMessages(true);
    try {
      const query = new URLSearchParams({ conversationId: chat.id, _: String(Date.now()) });
      const response = await authenticatedFetch(apiRoute('messages', query.toString()));
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'Message history could not be loaded.');
      setMessages(Array.isArray(data) ? data : []);
    } catch (requestError: any) {
      setError(requestError.message || 'Message history could not be loaded.');
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadTemplates = async (sync = false) => {
    setTemplatesLoading(true);
    try {
      const response = await authenticatedFetch(apiRoute('templates'), { method: sync ? 'POST' : 'GET' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'Approved templates could not be loaded.');
      setTemplates(Array.isArray(data.items) ? data.items : []);
      if (sync) setStatus(data.items?.length ? 'Approved Meta templates are ready to use.' : 'No approved templates were returned by Meta yet.');
    } catch (requestError: any) {
      setError(requestError.message || 'Approved templates could not be loaded.');
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => { void fetchChats(); }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchChats(); }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (selectedChat) void fetchMessages(selectedChat);
    else setMessages([]);
  }, [selectedChat?.id]);
  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchChats();
      if (selectedChat) void fetchMessages(selectedChat);
    }, 20000);
    return () => window.clearInterval(interval);
  }, [selectedChat?.id]);

  const sendMessage = async (event: FormEvent, target?: { phone: string; contactName?: string }) => {
    event.preventDefault();
    const recipient = target?.phone || selectedChat?.external_contact_identifier || '';
    if (!recipient) return;
    const isTemplate = Boolean(selectedTemplate);
    const text = composer.trim();
    if (!isTemplate && !text) return;

    setSending(true);
    setError(null);
    setStatus(null);
    try {
      const response = await authenticatedFetch(apiRoute('send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient,
          message: isTemplate ? '' : text,
          messageType: isTemplate ? 'template' : 'text',
          templateName: selectedTemplate?.name,
          templateLanguage: selectedTemplate?.language,
          conversationId: target ? undefined : selectedChat?.id,
          contactName: target?.contactName || selectedChat?.contact_name,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Message could not be sent.');

      setComposer('');
      setSelectedTemplate(null);
      setShowNewChat(false);
      setNewName('');
      setNewPhone('');
      setStatus(isTemplate ? 'Approved template sent through WhatsApp Cloud API.' : 'Message sent through WhatsApp Cloud API.');
      await fetchChats();
      const chat = chats.find((item) => item.id === data.conversationId) || selectedChat;
      if (chat) {
        setSelectedChat(chat);
        await fetchMessages(chat);
      }
    } catch (requestError: any) {
      setError(requestError.message || 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const prepareAiDraft = () => {
    const lastInbound = [...messages].reverse().find((message) => message.direction === 'inbound');
    const contact = selectedChat?.contact_name || 'there';
    const context = lastInbound?.body ? ' regarding "' + lastInbound.body.slice(0, 90) + '"' : '';
    setComposer('Hello ' + contact + ', thank you for your message' + context + '. How may we help you today?');
    setSelectedTemplate(null);
    setAiOpen(true);
    setStatus('AI draft prepared for review. Edit it before sending.');
  };

  const visibleChats = useMemo(() => chats, [chats]);
  const canSendText = Boolean(selectedChat?.is_24h_window_open);
  const loadTeamSnippet = (template: MessageTemplate) => {
    const contactName = selectedChat?.contact_name || 'there';
    const message = template.text
      .replace(/\{\{name\}\}/g, contactName)
      .replace(/\{\{contactName\}\}/g, contactName);
    setComposer(message);
    setSelectedTemplate(null);
    setTeamTemplatesOpen(false);
    setStatus('Team snippet loaded. Review and edit it before sending.');
  };

  return (
    <section className="h-full min-h-[650px] rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
      <header className="border-b border-slate-200 p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2"><MessageCircle className="h-5 w-5 text-teal-600" />WhatsApp Chats</h2>
          <p className="text-xs text-slate-500 mt-1">Live customer conversations, approved templates, and reviewable AI drafts.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { void fetchChats(); if (selectedChat) void fetchMessages(selectedChat); }} className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" title="Refresh chats"><RefreshCw className={loadingChats ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /></button>
          <button type="button" onClick={() => { setError(null); setStatus(null); setShowNewChat(true); }} className="px-3 py-2 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 flex items-center gap-1.5"><Plus className="h-4 w-4" />New chat</button>
        </div>
      </header>

      {(error || status) && <div className={error ? 'mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex justify-between gap-3' : 'mx-4 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex justify-between gap-3'}>
        <span>{error || status}</span><button type="button" onClick={() => { setError(null); setStatus(null); }}><X className="h-4 w-4" /></button>
      </div>}

      <div className="flex flex-1 min-h-0">
        <aside className="w-full max-w-[380px] border-r border-slate-200 flex flex-col">
          <div className="p-3 border-b border-slate-200">
            <label className="relative block"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search contacts or phone numbers..." className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-teal-500" /></label>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingChats ? <div className="p-6 text-center text-xs text-slate-400">Loading chats...</div> : visibleChats.length === 0 ? <div className="p-8 text-center text-xs text-slate-500"><p className="font-bold text-slate-700">No chats yet</p><p className="mt-1">Ask a contact to message your business number, or start a compliant template message.</p></div> : visibleChats.map((chat) => <button key={chat.id} type="button" onClick={() => setSelectedChat(chat)} className={selectedChat?.id === chat.id ? 'w-full text-left px-4 py-3 border-b border-slate-100 bg-teal-50' : 'w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50'}>
              <div className="flex justify-between gap-2"><span className="truncate text-sm font-bold text-slate-800">{chat.contact_name || chat.external_contact_identifier}</span><span className="text-[10px] text-slate-400 whitespace-nowrap">{chat.latest_message_timestamp ? new Date(chat.latest_message_timestamp).toLocaleDateString() : ''}</span></div>
              <p className="mt-1 truncate text-xs text-slate-500">{chat.latest_message_body || chat.external_contact_identifier}</p>
            </button>)}
          </div>
        </aside>

        <main className="hidden min-w-0 flex-1 flex-col md:flex">
          {selectedChat ? <>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div><h3 className="font-bold text-slate-900">{selectedChat.contact_name || selectedChat.external_contact_identifier}</h3><p className="text-xs text-slate-500">+{selectedChat.external_contact_identifier}</p></div>
              <span className={canSendText ? 'rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700' : 'rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700'}>{canSendText ? 'Reply window open' : 'Template required'}</span>
            </div>
            <div className="flex-1 overflow-y-auto bg-[#efeae2] p-5 space-y-3">
              {loadingMessages ? <p className="text-center text-xs text-slate-400">Loading messages...</p> : messages.length === 0 ? <p className="pt-12 text-center text-xs text-slate-500">No messages have been delivered for this chat yet.</p> : messages.map((message) => <div key={message.id} className={message.direction === 'outbound' ? 'flex justify-end' : 'flex justify-start'}><div className={message.direction === 'outbound' ? 'max-w-[72%] rounded-lg rounded-br-none bg-[#d9fdd3] px-3 py-2 text-sm text-slate-800 shadow-sm' : 'max-w-[72%] rounded-lg rounded-bl-none bg-white px-3 py-2 text-sm text-slate-800 shadow-sm'}><p className="whitespace-pre-wrap">{message.body}</p><p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-400">{displayTime(message.created_at)}{message.direction === 'outbound' && <CheckCheck className="h-3 w-3 text-sky-500" />}</p></div></div>)}
            </div>
            <form onSubmit={(event) => void sendMessage(event)} className="border-t border-slate-200 bg-white p-3">
              {selectedTemplate && <div className="mb-2 flex items-center justify-between rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-900"><span>Template: <strong>{selectedTemplate.name}</strong> ({selectedTemplate.language})</span><button type="button" onClick={() => setSelectedTemplate(null)} title="Clear selected template"><X className="h-4 w-4" /></button></div>}
              {aiOpen && <div className="mb-2 flex items-center justify-between rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900"><span><strong>AI draft only:</strong> review and edit before sending.</span><button type="button" onClick={() => setAiOpen(false)} title="Close AI draft notice"><X className="h-4 w-4" /></button></div>}
              <div className="flex items-end gap-2">
                {canSendText && <div className="relative">
                  <button type="button" onClick={() => { setTeamTemplatesOpen((open) => !open); setTemplatesOpen(false); }} className="rounded-lg border border-teal-200 p-2 text-teal-700 hover:bg-teal-50" title="Load a saved team reply snippet"><Sparkles className="h-5 w-5" /></button>
                  {teamTemplatesOpen && <div className="absolute bottom-11 left-0 z-10 w-80 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
                    <div className="px-2 py-1 text-xs font-bold text-slate-700">Saved team snippets</div>
                    {teamTemplates.length === 0 ? <p className="p-3 text-xs text-slate-500">Create a reply template in Fast Reply Templates first.</p> : teamTemplates.map((template) => <button key={template.id} type="button" onClick={() => loadTeamSnippet(template)} className="block w-full rounded-md px-3 py-2 text-left hover:bg-slate-50"><span className="block text-xs font-bold text-slate-800">{template.title}</span><span className="text-[10px] text-slate-500">{template.category}</span></button>)}
                  </div>}
                </div>}
                <div className="relative">
                  <button type="button" onClick={() => { setTemplatesOpen((open) => !open); setTeamTemplatesOpen(false); if (!templates.length) void loadTemplates(); }} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" title="Approved Meta templates"><ChevronDown className="h-5 w-5" /></button>
                  {templatesOpen && <div className="absolute bottom-11 left-0 z-10 w-80 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
                    <div className="flex items-center justify-between px-2 py-1 text-xs font-bold text-slate-700"><span>Approved Meta templates</span><button type="button" onClick={() => void loadTemplates(true)} className="text-teal-700 hover:underline">{templatesLoading ? 'Syncing...' : 'Sync from Meta'}</button></div>
                    {templatesLoading ? <p className="p-3 text-xs text-slate-400">Loading templates...</p> : templates.length === 0 ? <p className="p-3 text-xs text-slate-500">No approved templates are synced yet. Select “Sync from Meta”.</p> : templates.map((template) => <button key={template.id} type="button" disabled={templateNeedsVariables(template)} onClick={() => { setSelectedTemplate(template); setTemplatesOpen(false); setComposer(''); }} className="block w-full rounded-md px-3 py-2 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><span className="block text-xs font-bold text-slate-800">{template.name}</span><span className="text-[10px] text-slate-500">{template.category} · {template.language}{templateNeedsVariables(template) ? ' · needs variable values' : ''}</span></button>)}
                  </div>}
                </div>
                <button type="button" onClick={prepareAiDraft} className="rounded-lg border border-violet-200 p-2 text-violet-700 hover:bg-violet-50" title="Prepare a reviewable AI draft"><Bot className="h-5 w-5" /></button>
                <textarea value={composer} disabled={Boolean(selectedTemplate)} onChange={(event) => { setComposer(event.target.value); setSelectedTemplate(null); }} rows={2} placeholder={selectedTemplate ? 'An approved template will be sent.' : canSendText ? 'Write a message...' : 'Choose an approved template to start a conversation.'} className="flex-1 resize-none rounded-lg border border-slate-200 p-2 text-sm outline-none focus:border-teal-500 disabled:bg-slate-50" />
                <button type="submit" disabled={sending || (!selectedTemplate && (!composer.trim() || !canSendText))} className="rounded-lg bg-teal-600 p-3 text-white disabled:opacity-50" title="Send message"><Send className="h-4 w-4" /></button>
              </div>
              <p className="mt-2 text-[10px] text-slate-500">Saved team snippets and free-text replies are available for 24 hours after a customer message. Outside that window, choose an approved Meta template.</p>
            </form>
          </> : <div className="flex flex-1 flex-col items-center justify-center text-slate-400"><MessageCircle className="h-10 w-10" /><p className="mt-3 text-sm font-bold text-slate-600">Select a chat</p><p className="mt-1 text-xs">Or create a new compliant conversation.</p></div>}
        </main>
      </div>

      {showNewChat && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><form onSubmit={(event) => void sendMessage(event, { phone: newPhone.replace(/[^0-9]/g, ''), contactName: newName.trim() || 'New contact' })} className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl space-y-4"><div className="flex items-center justify-between"><h3 className="font-extrabold text-slate-900">New WhatsApp chat</h3><button type="button" onClick={() => setShowNewChat(false)}><X className="h-5 w-5 text-slate-500" /></button></div><label className="block text-xs font-bold text-slate-700">Contact name<input value={newName} onChange={(event) => setNewName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm font-normal" placeholder="Optional" /></label><label className="block text-xs font-bold text-slate-700">WhatsApp number<input required value={newPhone} onChange={(event) => setNewPhone(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm font-normal" placeholder="919087779869" /></label><button type="button" onClick={() => { setTemplatesOpen((open) => !open); void loadTemplates(); }} className="flex w-full items-center justify-center gap-2 rounded-lg border border-teal-200 px-3 py-2 text-xs font-bold text-teal-700"><Sparkles className="h-4 w-4" />{selectedTemplate ? 'Template: ' + selectedTemplate.name : 'Choose approved template'}</button>{templatesOpen && <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 p-1">{templatesLoading ? <p className="p-3 text-xs text-slate-400">Loading templates...</p> : templates.length === 0 ? <div className="p-3 text-xs text-slate-500">No templates are synced. <button type="button" onClick={() => void loadTemplates(true)} className="font-bold text-teal-700 hover:underline">Sync from Meta</button></div> : templates.map((template) => <button key={template.id} type="button" disabled={templateNeedsVariables(template)} onClick={() => { setSelectedTemplate(template); setTemplatesOpen(false); }} className="block w-full rounded-md px-3 py-2 text-left text-xs hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><strong>{template.name}</strong><span className="ml-2 text-slate-500">{template.language}{templateNeedsVariables(template) ? ' · needs variable values' : ''}</span></button>)}</div>}<p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">A first business-initiated message must be an approved Meta template. Free text is only available after the contact messages your business number.</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowNewChat(false)} className="px-3 py-2 text-xs font-bold text-slate-600">Cancel</button><button type="submit" disabled={sending || !selectedTemplate} className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{sending ? 'Sending...' : 'Send template'}</button></div></form></div>}
    </section>
  );
};
