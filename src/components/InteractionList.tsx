/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { authenticatedFetch } from '../auth/apiClient';
import { Contact, Interaction, MessageTemplate, AIKnowledgeBase, AIChatTurn, ScheduledReminder } from '../types';
import { INDUSTRIES, IndustryType, getSectorDefinition } from '../industryConfig';
import { safeCopyToClipboard } from '../utils';
import {
  Send,
  Phone,
  Calendar,
  MessageSquare,
  FileText,
  Clock,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Loader2,
  Trash2,
  Copy,
  Check,
  Bell,
  Share2,
  Mail,
  Smartphone,
  Globe,
} from 'lucide-react';

interface InteractionListProps {
  contact: Contact;
  interactions: Interaction[];
  templates: MessageTemplate[];
  onLogInteraction: (type: string, notes: string, outcome: string) => void;
  onSendWhatsApp: (text: string) => void;
  businessName?: string;
  senderName?: string;
  reviewLink?: string;
  aiKnowledgeBase?: AIKnowledgeBase;
  onScheduleWithDetails?: (
    contact: Contact,
    e?: React.MouseEvent,
    summary?: string,
    notes?: string,
    date?: string,
    time?: string
  ) => void;
  aiChatHistory?: AIChatTurn[];
  onAddAiChatTurn?: (turn: {
    contactId: string;
    prompt: string;
    response: string;
    schedulingSuggestion?: {
      shouldSchedule: boolean;
      summary: string;
      date: string;
      time: string;
      description: string;
    };
  }) => void;
  onClearAiChatHistory?: (contactId: string) => void;
  industryId?: IndustryType;
  scheduledReminders?: ScheduledReminder[];
  onSetScheduledReminders?: React.Dispatch<React.SetStateAction<ScheduledReminder[]>>;
  whatsappMode?: 'simulated' | 'meta';
  metaPhoneNumberId?: string;
  metaAccessToken?: string;
  onToggleAiAutopilot?: (contactId: string) => void;
}

export const InteractionList: React.FC<InteractionListProps> = ({
  contact,
  interactions,
  templates,
  onLogInteraction,
  onSendWhatsApp,
  businessName = 'Sri Sai Dental Clinic',
  senderName = 'Dr. Prasad',
  reviewLink = 'https://g.page/srisaidental-vijayawada/review',
  aiKnowledgeBase,
  onScheduleWithDetails,
  aiChatHistory = [],
  onAddAiChatTurn,
  onClearAiChatHistory,
  industryId = 'dental',
  scheduledReminders = [],
  onSetScheduledReminders,
  whatsappMode = 'simulated',
  metaPhoneNumberId = '',
  metaAccessToken = '',
  onToggleAiAutopilot,
}) => {
  const config = getSectorDefinition(industryId);
  const term = config.terminology;

  const [inputText, setInputText] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [interactionType, setInteractionType] = useState<'WhatsApp' | 'Phone Call' | 'In-Person' | 'Note'>('WhatsApp');
  const [outcomeText, setOutcomeText] = useState('');
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  const [isAiCopilotOpen, setIsAiCopilotOpen] = useState(false);

  // Reminders form and view states
  const [activeSubView, setActiveSubView] = useState<'chat' | 'reminders'>('chat');
  const [remTitle, setRemTitle] = useState('[CRM Follow-up] Appointment Case Review');
  const [remDate, setRemDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [remTime, setRemTime] = useState('10:00');
  const [remChannel, setRemChannel] = useState<'WhatsApp' | 'Email' | 'Both'>('WhatsApp');
  const [remOffset, setRemOffset] = useState<number>(0);
  const [remMessage, setRemMessage] = useState('');
  const [copiedReminderId, setCopiedReminderId] = useState<string | null>(null);

  // Auto-interpolate message text when contact or date/time changes
  useEffect(() => {
    let formattedDate = 'tomorrow';
    if (remDate) {
      try {
        const d = new Date(`${remDate}T00:00:00`);
        formattedDate = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      } catch (err) {
        formattedDate = remDate;
      }
    }
    setRemMessage(`Hello ${contact.name}, this is an automated reminder regarding your upcoming scheduled ${remTitle || 'appointment'} with us on ${formattedDate} at ${remTime}. Please let us know if you need to reschedule or have any questions. Looking forward to seeing you!`);
  }, [contact.name, remTitle, remDate, remTime]);

  // Check for any pre-drafted reminder or inquiry message from localStorage
  useEffect(() => {
    const pendingDraft = localStorage.getItem(`nestam_pending_draft_${contact.id}`);
    if (pendingDraft) {
      setInputText(pendingDraft);
      localStorage.removeItem(`nestam_pending_draft_${contact.id}`);
    }
  }, [contact.id]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // AI Co-pilot states
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<{
    draftReply: string;
    schedulingSuggestion?: {
      shouldSchedule: boolean;
      summary: string;
      date: string;
      time: string;
      description: string;
    };
  } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleGenerateAiDraft = async (promptText: string) => {
    if (!promptText.trim()) return;
    setIsAiGenerating(true);
    setAiError(null);
    try {
      const chatHistory = contactInteractions.slice(-4).map(item => ({
        sender: item.type === 'WhatsApp Sent' ? (businessName || 'Business') : item.type === 'Incoming Message' ? term.patientLabel : 'Note',
        text: item.notes
      }));

      const kbText = aiKnowledgeBase 
        ? `Timings: ${aiKnowledgeBase.timings}\nTreatments: ${aiKnowledgeBase.treatments}\nDoctors: ${aiKnowledgeBase.doctors}\nReviews: ${aiKnowledgeBase.reviews}\nWorkflow: ${aiKnowledgeBase.workflow}`
        : 'Sri Sai Dental Clinic Vijayawada. Standard clinic timings: Mon-Sat 9:00 AM - 1:00 PM and 4:00 PM - 8:00 PM.';

      const response = await authenticatedFetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: promptText,
          knowledgeBase: kbText,
          conversationHistory: chatHistory,
          patientName: contact.name
        })
      });

      if (!response.ok) {
        throw new Error('AI Server responded with an error');
      }

      const data = await response.json();
      setAiResult(data);
      if (onAddAiChatTurn) {
        onAddAiChatTurn({
          contactId: contact.id,
          prompt: promptText,
          response: data.draftReply,
          schedulingSuggestion: data.schedulingSuggestion,
        });
      }
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Failed to generate draft.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Filter interactions for this contact
  const contactInteractions = interactions
    .filter(i => i.contactId === contact.id)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Reset AI Co-pilot states when contact changes
  useEffect(() => {
    setAiPrompt('');
    setAiResult(null);
    setAiError(null);
  }, [contact.id]);

  // Scroll to bottom when contact or interactions change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [contact.id, interactions.length]);

  // Handle template selection and interpolation
  const handleSelectTemplate = (tpl: MessageTemplate) => {
    let interpolatedText = tpl.text;
    interpolatedText = interpolatedText.replace(/{{name}}/g, contact.name);
    interpolatedText = interpolatedText.replace(/{{phone}}/g, contact.phone);
    interpolatedText = interpolatedText.replace(/{{businessName}}/g, businessName);
    interpolatedText = interpolatedText.replace(/{{senderName}}/g, senderName);
    interpolatedText = interpolatedText.replace(/{{dueDate}}/g, new Date(Date.now() + 7 * 24 * 3600 * 1000).toLocaleDateString());
    interpolatedText = interpolatedText.replace(/{{invoiceNo}}/g, 'INV-' + Math.floor(1000 + Math.random() * 9000));
    interpolatedText = interpolatedText.replace(/{{paymentLink}}/g, 'pay.lnk/test');
    interpolatedText = interpolatedText.replace(/{{reviewLink}}/g, reviewLink);
    interpolatedText = interpolatedText.replace(/{{dateTime}}/g, 'Tomorrow at 11:30 AM');
    interpolatedText = interpolatedText.replace(/{{productName}}/g, 'Dental Implant Kit');
    interpolatedText = interpolatedText.replace(/{{link}}/g, 'dent.lnk/treatment');

    setInputText(interpolatedText);
    setSelectedTemplateId(tpl.id);
    setIsTemplateDropdownOpen(false);
  };

  const handleSendOrLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (interactionType === 'WhatsApp') {
      // Trigger WhatsApp redirection
      onSendWhatsApp(inputText);
      // Log the interaction
      onLogInteraction('WhatsApp Sent', inputText, outcomeText || 'Sent click-to-chat URL');
    } else {
      // Log manual phone call / note
      onLogInteraction(
        interactionType === 'Phone Call' ? 'Phone Call' : interactionType === 'In-Person' ? 'In-Person' : 'Note',
        inputText,
        outcomeText || 'Logged successfully'
      );
    }

    // Reset inputs
    setInputText('');
    setOutcomeText('');
    setSelectedTemplateId('');
  };

  // Reminders Actions
  const handleScheduleReminderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remTitle.trim() || !remDate || !remTime || !remMessage.trim()) return;

    const scheduledIso = `${remDate}T${remTime}:00`;
    const newReminder: ScheduledReminder = {
      id: `rem-user-${Date.now()}`,
      contactId: contact.id,
      contactName: contact.name,
      contactPhone: contact.phone,
      contactEmail: contact.email,
      title: remTitle.trim(),
      scheduledTime: scheduledIso,
      reminderType: remChannel,
      message: remMessage.trim(),
      status: 'Scheduled',
      triggerOffsetMinutes: Number(remOffset) || 0,
      createdAt: new Date().toISOString(),
    };

    if (onSetScheduledReminders) {
      onSetScheduledReminders(prev => [newReminder, ...prev]);
    }

    setRemTitle('[CRM Follow-up] Case Review');
    alert(`⏰ Successfully scheduled automated reminder for ${contact.name}! It is armed and will trigger automatically when the scheduled time is reached.`);
  };

  const handleDeleteReminder = (reminderId: string) => {
    if (onSetScheduledReminders) {
      onSetScheduledReminders(prev => prev.filter(r => r.id !== reminderId));
    }
  };

  const handleCopyText = (text: string, id: string) => {
    safeCopyToClipboard(text);
    setCopiedReminderId(id);
    setTimeout(() => setCopiedReminderId(null), 2000);
  };

  const handleShareWhatsApp = (text: string, phone: string) => {
    const waUrl = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // Format dates in thread headers
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDateLabel = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) return 'TODAY';
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return 'YESTERDAY';
      return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[600px] bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden relative">
      
      {/* LEFT PANEL: Chat & Logs */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        
        {/* Thread Header Banner */}
        <div className="bg-white px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold font-display shadow-md shadow-indigo-100">
                {contact.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 leading-tight text-sm">{contact.name}</h3>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">{contact.phone}</p>
              </div>
            </div>

            {/* Sub-navigation tabs: Chat Logs vs Scheduled Reminders */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveSubView('chat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeSubView === 'chat'
                    ? 'bg-white text-slate-900 shadow-3xs'
                    : 'text-slate-500 hover:text-slate-850'
                }`}
              >
                💬 Chat Logs
              </button>
              <button
                type="button"
                onClick={() => setActiveSubView('reminders')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeSubView === 'reminders'
                    ? 'bg-white text-amber-650 shadow-3xs'
                    : 'text-slate-500 hover:text-slate-850'
                }`}
              >
                ⏰ Reminders
                {scheduledReminders.filter(r => r.contactId === contact.id && r.status === 'Scheduled').length > 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* AI Autopilot Switch */}
            <button
              type="button"
              onClick={() => onToggleAiAutopilot?.(contact.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                contact.aiAutopilot
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-850 shadow-3xs'
                  : 'bg-white border-slate-200 text-slate-550 hover:bg-slate-50'
              }`}
              title={contact.aiAutopilot ? "AI Autopilot is ENABLED for this contact. AI auto-responds to incoming queries." : "AI Autopilot is DISABLED. AI will not respond without receptionist approval."}
            >
              <div className={`w-2 h-2 rounded-full ${contact.aiAutopilot ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              <span>Autopilot: {contact.aiAutopilot ? 'ON' : 'OFF'}</span>
            </button>

            {/* AI Toggle Button */}
            <button
              type="button"
              onClick={() => setIsAiCopilotOpen(!isAiCopilotOpen)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isAiCopilotOpen
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs animate-pulse'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Sparkles className={`h-3.5 w-3.5 ${isAiCopilotOpen ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">AI Co-pilot</span>
            </button>

            {whatsappMode === 'meta' ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-800 px-3 py-1.5 rounded-xl text-xs font-bold shadow-3xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                  </span>
                  <Smartphone className="h-3.5 w-3.5 text-teal-600" />
                  <span>Meta API Linked</span>
                </div>
                <a
                  href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Fallback to WhatsApp Web"
                  className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 transition-colors font-medium cursor-pointer"
                >
                  WA Web
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            ) : (
              <a
                href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                title="Open direct in WhatsApp"
                className="flex items-center gap-1.5 text-xs text-teal-700 hover:text-white hover:bg-teal-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-150 transition-colors font-bold cursor-pointer"
              >
                WhatsApp Web
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {activeSubView === 'chat' ? (
          <>
            {/* Chat Thread Workspace */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/45">
              {contactInteractions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
                  <div className="w-12 h-12 bg-white text-slate-400 rounded-full flex items-center justify-center border border-slate-200">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-650">No interaction logs found</p>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      Your communication with {contact.name} is clean. Choose a quick template below to log or send a message.
                    </p>
                  </div>
                </div>
              ) : (
                contactInteractions.map((item, index) => {
                  const isWhatsApp = item.type === 'WhatsApp Sent';
                  const isIncoming = item.type === 'Incoming Message';
                  
                  // Format group date dividers
                  const showDivider =
                    index === 0 ||
                    formatDateLabel(contactInteractions[index - 1].timestamp) !==
                      formatDateLabel(item.timestamp);

                  return (
                    <div key={`${item.id || 'inter'}-${index}`} className="space-y-3">
                      {showDivider && (
                        <div className="flex justify-center my-3">
                          <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-md text-[10px] font-bold font-sans tracking-wide shadow-sm uppercase">
                            {formatDateLabel(item.timestamp)}
                          </span>
                        </div>
                      )}

                      {isWhatsApp || isIncoming ? (
                        /* WhatsApp Text Balloon */
                        <div className={`flex ${isWhatsApp ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[75%] px-4 py-2.5 rounded-2xl shadow-xs text-sm relative ${
                              isWhatsApp
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                            }`}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed">{item.notes}</p>
                            
                            {item.outcome && (
                              <div
                                className={`text-[10px] mt-1.5 pt-1 border-t ${
                                  isWhatsApp ? 'border-indigo-500 text-indigo-100' : 'border-slate-100 text-slate-400'
                                }`}
                              >
                                <span className="font-bold">Outcome:</span> {item.outcome}
                              </div>
                            )}
                            
                            <div
                              className={`text-[9px] mt-1 text-right block ${
                                isWhatsApp ? 'text-indigo-200' : 'text-slate-400'
                              }`}
                            >
                              {formatTime(item.timestamp)}
                              {isWhatsApp && <span className="ml-1 text-indigo-300">✓✓</span>}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* System/Manual Logs block (Phone calls, Calendar, etc.) */
                        <div className="flex justify-center">
                          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 max-w-[85%] w-full flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-slate-50 shrink-0 border border-slate-100">
                              {item.type === 'Phone Call' ? (
                                <Phone className="h-4 w-4 text-slate-600" />
                              ) : item.type === 'Calendar Follow-up' ? (
                                <Calendar className="h-4 w-4 text-amber-500" />
                              ) : (
                                <FileText className="h-4 w-4 text-indigo-500" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800">{item.type} Log</span>
                                <span className="text-[9px] text-slate-400 flex items-center gap-1 font-mono">
                                  <Clock className="h-2.5 w-2.5" />
                                  {formatTime(item.timestamp)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap">{item.notes}</p>
                              {item.outcome && (
                                <div className="mt-1.5 text-[10px] text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-150">
                                  <span className="font-bold text-slate-700">Result:</span> {item.outcome}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Messenger Actions bar */}
            <div className="bg-white border-t border-slate-200 p-4 shrink-0 z-10 space-y-3">
              
              {/* Template selector and quick controls */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interaction Type:</span>
                  <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-50 text-[11px] font-bold">
                    {(['WhatsApp', 'Phone Call', 'In-Person', 'Note'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setInteractionType(type)}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          interactionType === type
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick template loader */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
                    className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-150 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    Use WhatsApp Template
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>

                  {isTemplateDropdownOpen && (
                    <div className="absolute right-0 bottom-full mb-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 max-h-60 overflow-y-auto z-50 p-2 space-y-1">
                      <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        Select a Template
                      </div>
                      {templates.map(tpl => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => handleSelectTemplate(tpl)}
                          className="w-full text-left px-2.5 py-2 hover:bg-slate-50 rounded-lg text-xs transition-colors flex flex-col gap-0.5 cursor-pointer"
                        >
                          <span className="font-bold text-slate-800">{tpl.title}</span>
                          <span className="text-slate-400 text-[10px] truncate">{tpl.text}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Form panel */}
              <form onSubmit={handleSendOrLog} className="space-y-2">
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      interactionType === 'WhatsApp'
                        ? 'Type your WhatsApp message text...'
                        : `Log details of the ${interactionType}...`
                    }
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none transition-colors"
                  />
                  
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="px-5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-150 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex flex-col justify-center items-center gap-1 shrink-0 shadow-xs cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">
                      {interactionType === 'WhatsApp' ? 'Send' : 'Log'}
                    </span>
                  </button>
                </div>

                {/* Outcome Logging */}
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0 tracking-wider">Log Outcome:</span>
                  <input
                    type="text"
                    value={outcomeText}
                    onChange={(e) => setOutcomeText(e.target.value)}
                    placeholder="e.g. Interested, scheduled demo, paid invoice, busy..."
                    className="flex-1 bg-transparent border-none text-xs focus:outline-none p-0 text-slate-700"
                  />
                </div>
              </form>
            </div>
          </>
        ) : (
          /* REMINDERS WORKSPACE */
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/45">
            {/* Quick reminder scheduler form card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-500 shrink-0" />
                Schedule Automated Follow-up Reminder
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Register an automated communication sequence. The system background scheduler will automatically send the customized message when the scheduled trigger threshold is passed.
              </p>

              <form onSubmit={handleScheduleReminderSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Reminder Title / Subject
                  </label>
                  <input
                    type="text"
                    required
                    value={remTitle}
                    onChange={(e) => setRemTitle(e.target.value)}
                    placeholder="e.g. Dental Implant Check-up / Appointment Follow-up"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs focus:outline-none text-slate-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    required
                    value={remDate}
                    onChange={(e) => setRemDate(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs focus:outline-none text-slate-700 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Scheduled Time
                  </label>
                  <input
                    type="time"
                    required
                    value={remTime}
                    onChange={(e) => setRemTime(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs focus:outline-none text-slate-700 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Communication Channel
                  </label>
                  <select
                    value={remChannel}
                    onChange={(e) => setRemChannel(e.target.value as any)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs focus:outline-none text-slate-700 font-bold"
                  >
                    <option value="WhatsApp">WhatsApp Message Only</option>
                    {contact.email && <option value="Email">Email Only</option>}
                    {contact.email && <option value="Both">Both (WhatsApp + Email)</option>}
                  </select>
                  {!contact.email && (
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Add email address in contact details to unlock Email & Multi-Channel reminders.
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Auto-Send Timing Threshold
                  </label>
                  <select
                    value={remOffset}
                    onChange={(e) => setRemOffset(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs focus:outline-none text-slate-700 font-bold"
                  >
                    <option value={0}>At scheduled time (Instant Preview)</option>
                    <option value={15}>15 minutes before</option>
                    <option value={60}>1 hour before</option>
                    <option value={1440}>1 day before</option>
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Auto-Generated Reminder Message Draft
                    </label>
                    <span className="text-[9px] text-teal-600 font-extrabold uppercase">
                      ✓ Real-time Interpolation Active
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={remMessage}
                    onChange={(e) => setRemMessage(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs focus:outline-none text-slate-700 leading-relaxed resize-none font-sans"
                  />
                </div>

                <div className="md:col-span-2 pt-1">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Bell className="h-3.5 w-3.5" />
                    Arm Automatic Reminder Sequence
                  </button>
                </div>
              </form>
            </div>

            {/* List of Scheduled / Sent Reminders for this specific contact */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-400" />
                Scheduled Tasks Queue ({scheduledReminders.filter(r => r.contactId === contact.id).length})
              </h4>

              {scheduledReminders.filter(r => r.contactId === contact.id).length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs py-12">
                  No automated reminders scheduled for {contact.name}. Use the form above to arm your first automatic sequence.
                </div>
              ) : (
                <div className="space-y-3">
                  {scheduledReminders
                    .filter(r => r.contactId === contact.id)
                    .map((rem) => {
                      const isSent = rem.status === 'Sent';
                      return (
                        <div key={rem.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs hover:border-slate-300 transition-all space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-slate-800">{rem.title}</span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  isSent 
                                    ? 'bg-emerald-50 text-emerald-750 border border-emerald-100' 
                                    : 'bg-amber-50 text-amber-750 border border-amber-100 animate-pulse'
                                }`}>
                                  {isSent ? '✓ Dispatched' : '● Armed & Monitoring'}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(rem.scheduledTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {rem.triggerOffsetMinutes === 0 ? 'Trigger at scheduled time' : `${rem.triggerOffsetMinutes}m offset`}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleCopyText(rem.message, rem.id)}
                                className="p-1.5 text-slate-400 hover:text-slate-750 hover:bg-slate-50 border border-slate-200 rounded-lg transition-all cursor-pointer"
                                title="Copy reminder text"
                              >
                                {copiedReminderId === rem.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                onClick={() => handleShareWhatsApp(rem.message, rem.contactPhone)}
                                className="p-1.5 text-emerald-600 hover:text-white hover:bg-emerald-600 border border-emerald-200 rounded-lg transition-all cursor-pointer"
                                title="Share manually via WhatsApp"
                              >
                                <Share2 className="h-3.5 w-3.5" />
                              </button>
                              {!isSent && (
                                <button
                                  onClick={() => handleDeleteReminder(rem.id)}
                                  className="p-1.5 text-rose-500 hover:text-white hover:bg-rose-500 border border-rose-200 rounded-lg transition-all cursor-pointer"
                                  title="Cancel and delete reminder"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-xs leading-relaxed text-slate-600 whitespace-pre-wrap font-sans">
                            {rem.message}
                          </div>

                          <div className="flex items-center gap-3 text-[10px] text-slate-450 pt-1 border-t border-slate-50">
                            <span className="flex items-center gap-1">
                              Channel: 
                              {rem.reminderType === 'WhatsApp' && <span className="text-emerald-600 font-bold flex items-center gap-0.5">💬 WhatsApp</span>}
                              {rem.reminderType === 'Email' && <span className="text-indigo-600 font-bold flex items-center gap-0.5"><Mail className="h-3 w-3 animate-bounce" /> Email</span>}
                              {rem.reminderType === 'Both' && <span className="text-teal-600 font-bold flex items-center gap-0.5">💬+📧 WhatsApp + Email</span>}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* RIGHT PANEL: Nestam AI Co-pilot (collapsible) */}
      {isAiCopilotOpen && (
        <div className="w-full md:w-80 shrink-0 bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200 flex flex-col h-full z-10">
          <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-600 animate-pulse" />
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Vyapari Nestam AI Co-pilot</span>
            </div>
            <button
              onClick={() => setIsAiCopilotOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* Quick Presets for Selected Industry */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{term.patientLabel} Common Inquiries</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "Timings / Days", text: "Are you open on weekends? What are your daily operating timings?" },
                  { label: `${term.treatmentLabel} Costs`, text: `What is the cost of ${term.treatmentTypeLabel.toLowerCase()} / ${term.treatmentLabel.toLowerCase()}?` },
                  { label: `${term.doctorLabel} Experience`, text: `Who is the primary ${term.doctorLabel.toLowerCase()} and what are their qualifications?` },
                  { label: "Book tomorrow", text: `I want to book an appointment slot for tomorrow morning for ${contact.name}.` },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAiPrompt(preset.text);
                      handleGenerateAiDraft(preset.text);
                    }}
                    className="p-2 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl text-left text-[10px] text-slate-600 hover:text-indigo-800 transition-colors font-medium flex flex-col justify-between h-14 shadow-2xs cursor-pointer"
                  >
                    <span className="font-bold text-[9px] text-slate-700 block mb-0.5 truncate">{preset.label}</span>
                    <span className="text-[8px] text-slate-400 truncate w-full block">{preset.text}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input prompt area */}
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Ask Custom {term.patientLabel} Query</span>
              <div className="relative">
                <textarea
                  rows={2}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Can Ramesh come at 5 PM tomorrow for single tooth implant?"
                  className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none transition-colors"
                />
              </div>

              <button
                type="button"
                disabled={isAiGenerating || !aiPrompt.trim()}
                onClick={() => handleGenerateAiDraft(aiPrompt)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-250 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-100 cursor-pointer"
              >
                {isAiGenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Drafting reply...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Generate AI Draft</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Generation Error */}
            {aiError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[11px] text-red-800 font-medium">
                ⚠️ {aiError}
              </div>
            )}

            {/* Output container */}
            {aiResult && (
              <div className="space-y-4 animate-fade-in">
                {/* 1. Draft message output */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">AI Drafted Reply</span>
                    <button
                      type="button"
                      onClick={() => {
                        setInputText(aiResult.draftReply);
                        setInteractionType('WhatsApp');
                      }}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                    >
                      Use in Chat Box ➜
                    </button>
                  </div>
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-slate-700 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap select-text font-medium font-sans">
                    {aiResult.draftReply}
                  </div>
                </div>

                {/* 2. Google Calendar Event suggestion */}
                {aiResult.schedulingSuggestion?.shouldSchedule && (
                  <div className="bg-emerald-50 border border-emerald-150 p-3 rounded-xl space-y-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Calendar Proposal Extracted</span>
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-600">
                      <div>
                        <span className="font-bold text-slate-400 mr-1 text-[9px] uppercase block sm:inline">Title:</span>
                        <span className="font-bold text-slate-800">{aiResult.schedulingSuggestion.summary}</span>
                      </div>
                      <div className="flex gap-4">
                        <div>
                          <span className="font-bold text-slate-400 mr-1 text-[9px] uppercase block sm:inline">Date:</span>
                          <span className="font-semibold text-slate-700 font-mono">{aiResult.schedulingSuggestion.date}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-400 mr-1 text-[9px] uppercase block sm:inline">Time:</span>
                          <span className="font-semibold text-slate-700 font-mono">{aiResult.schedulingSuggestion.time}</span>
                        </div>
                      </div>
                      {aiResult.schedulingSuggestion.description && (
                        <div>
                          <span className="font-bold text-slate-400 mr-1 text-[9px] uppercase block sm:inline">Notes:</span>
                          <span className="text-slate-500 italic">{aiResult.schedulingSuggestion.description}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (onScheduleWithDetails && aiResult.schedulingSuggestion) {
                          onScheduleWithDetails(
                            contact,
                            undefined,
                            aiResult.schedulingSuggestion.summary,
                            aiResult.schedulingSuggestion.description,
                            aiResult.schedulingSuggestion.date,
                            aiResult.schedulingSuggestion.time
                          );
                        }
                      }}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                    >
                      <span>Book & Block Calendar Slot</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* AI Conversation History list */}
            {aiChatHistory.filter(turn => turn.contactId === contact.id).length > 0 && (
              <div className="space-y-2 border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">AI Q&A History ({aiChatHistory.filter(turn => turn.contactId === contact.id).length})</span>
                  {onClearAiChatHistory && (
                    <button
                      type="button"
                      onClick={() => onClearAiChatHistory(contact.id)}
                      className="text-[9px] font-bold text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                  {aiChatHistory
                    .filter(turn => turn.contactId === contact.id)
                    .map((turn) => (
                      <div key={turn.id} className="p-2.5 bg-white rounded-xl border border-slate-150 space-y-1 text-xs shadow-3xs">
                        <div className="flex items-center justify-between text-[9px] text-slate-400">
                          <span className="font-bold">Prompt</span>
                          <span>{new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-semibold italic bg-slate-50 p-1.5 rounded-lg">"{turn.prompt}"</p>
                        <div className="flex items-center justify-between text-[9px] text-indigo-400 pt-1">
                          <span className="font-bold">AI Draft</span>
                          <button
                            type="button"
                            onClick={() => {
                              setInputText(turn.response);
                              setInteractionType('WhatsApp');
                            }}
                            className="text-indigo-600 font-bold hover:underline cursor-pointer"
                          >
                            Use reply
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap select-text font-medium">{turn.response}</p>
                        {turn.schedulingSuggestion?.shouldSchedule && (
                          <div className="mt-1.5 bg-emerald-50 border border-emerald-100 p-1.5 rounded-lg text-[10px] space-y-1">
                            <div className="flex items-center gap-1 font-bold text-emerald-800 uppercase tracking-wider text-[8px]">
                              <Calendar className="h-3 w-3 text-emerald-600" />
                              <span>Calendar Event</span>
                            </div>
                            <div className="text-[10px] text-slate-700">
                              <span className="font-bold text-slate-500">Summary:</span> {turn.schedulingSuggestion.summary} <span className="text-[9px] text-slate-400">({turn.schedulingSuggestion.date} @ {turn.schedulingSuggestion.time})</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (onScheduleWithDetails && turn.schedulingSuggestion) {
                                  onScheduleWithDetails(
                                    contact,
                                    undefined,
                                    turn.schedulingSuggestion.summary,
                                    turn.schedulingSuggestion.description,
                                    turn.schedulingSuggestion.date,
                                    turn.schedulingSuggestion.time
                                  );
                                }
                              }}
                              className="w-full py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[9px] cursor-pointer"
                            >
                              Book Event
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
