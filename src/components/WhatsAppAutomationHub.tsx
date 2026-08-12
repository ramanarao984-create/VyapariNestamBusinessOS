/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  QrCode, MessageSquare, Bot, Workflow, Zap, RefreshCw, Smartphone, 
  CheckCircle2, XCircle, Play, Pause, Save, Plus, Trash2, ArrowRight, 
  Send, Phone, Search, Filter, ShieldAlert, Clock, Star, Calendar, Settings, AlertCircle,
  Globe, HelpCircle, Code, Key, Server, Copy, Check, FileText, Sparkles, ChevronRight, Megaphone,
  CheckCheck, User, Users, MapPin, CreditCard, Eye, EyeOff, ExternalLink, Share2, Paperclip,
  Smile, Tag, ChevronDown, ChevronUp, SlidersHorizontal, Layers, ListFilter, Building2, X,
  ZoomIn, ZoomOut, Maximize2, Pencil, GitBranch, Sliders, LayoutGrid, Image as ImageIcon,
  UserPlus, ListChecks, UserCheck, GripVertical, MoreVertical, BarChart3, History, Target, Download
} from 'lucide-react';
import { Contact, Interaction, MessageTemplate, AutomationRule, ChatbotNode } from '../types';
import { INDUSTRIES, IndustryType, getSectorDefinition } from '../industryConfig';
import { WhatsAppJourneysBuilder } from './WhatsAppJourneysBuilder';
import { SharedWhatsAppInbox } from './SharedWhatsAppInbox';
import { safeCopyToClipboard } from '../utils';
import { authenticatedFetch } from '../auth/apiClient';

interface WhatsAppAutomationHubProps {
  contacts: Contact[];
  onLogInteraction?: (contactId: string, type: string, notes: string, outcome: string) => void;
  businessName: string;
  senderName: string;
  reviewLink?: string;
  aiKnowledgeBase: {
    timings: string;
    treatments: string;
    doctors: string;
    reviews: string;
    workflow: string;
  };
  templates: MessageTemplate[];
  onAddTemplate: (title: string, category: string, text: string) => void;
  onDeleteTemplate: (id: string) => void;
  selectedIndustry?: IndustryType;

  // Lifted settings states & callbacks
  whatsappMode: 'simulated' | 'meta';
  onWhatsappModeChange: (mode: 'simulated' | 'meta') => void;
  metaPhoneNumberId: string;
  onMetaPhoneNumberIdChange: (val: string) => void;
  metaAccessToken: string;
  onMetaAccessTokenChange: (val: string) => void;
  metaWabaId: string;
  onMetaWabaIdChange: (val: string) => void;
  metaVerifyToken: string;
  onMetaVerifyTokenChange: (val: string) => void;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  onConnectionStatusChange: (status: 'disconnected' | 'connecting' | 'connected') => void;
  deviceDetails: {
    phoneName: string;
    phoneNumber: string;
    battery: number;
    signal: 'low' | 'medium' | 'high' | 'excellent';
    pairingTime?: string;
  } | null;
  onDeviceDetailsChange: (details: any) => void;

  spreadsheetId?: string | null;
  isSyncing?: boolean;
  onSyncSettings?: () => void;

  aiAgentActive?: boolean;
  onAiAgentActiveChange?: (val: boolean) => void;
  aiAgentType?: string;
  onAiAgentTypeChange?: (val: string) => void;
  customSystemPrompt?: string;
  onCustomSystemPromptChange?: (val: string) => void;
  customApiKey?: string;
  onCustomApiKeyChange?: (val: string) => void;
}

export const WhatsAppAutomationHub: React.FC<WhatsAppAutomationHubProps> = ({
  contacts,
  onLogInteraction,
  businessName = 'Sri Sai Dental Clinic',
  senderName = 'Dr. Prasad',
  reviewLink = '',
  aiKnowledgeBase,
  templates,
  onAddTemplate,
  onDeleteTemplate,
  selectedIndustry = 'dental',
  whatsappMode,
  onWhatsappModeChange,
  metaPhoneNumberId,
  onMetaPhoneNumberIdChange,
  metaAccessToken,
  onMetaAccessTokenChange,
  metaWabaId,
  onMetaWabaIdChange,
  metaVerifyToken,
  onMetaVerifyTokenChange,
  connectionStatus,
  onConnectionStatusChange,
  deviceDetails,
  onDeviceDetailsChange,
  spreadsheetId,
  isSyncing,
  onSyncSettings,

  aiAgentActive: propAiAgentActive,
  onAiAgentActiveChange,
  aiAgentType: propAiAgentType,
  onAiAgentTypeChange,
  customSystemPrompt: propCustomSystemPrompt,
  onCustomSystemPromptChange,
  customApiKey: propCustomApiKey,
  onCustomApiKeyChange,
}) => {
  // Navigation inside the WhatsApp Hub
  const [activeSubTab, setActiveSubTab] = useState<'inbox' | 'studio' | 'templates'>('inbox');
  const [studioInnerTab, setStudioInnerTab] = useState<'builder' | 'analytics'>('builder');
  const [botTitle, setBotTitle] = useState('New Patient Booking Bot');
  const [isEditingBotTitle, setIsEditingBotTitle] = useState(false);
  const [botStatus, setBotStatus] = useState<'Active' | 'Draft' | 'Paused'>('Active');
  const [lastPublishedTime, setLastPublishedTime] = useState('2 days ago');
  const [showTestBotModal, setShowTestBotModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [builderToast, setBuilderToast] = useState<string | null>(null);
  const [canvasZoom, setCanvasZoom] = useState(100);
  const [editNodeOptions, setEditNodeOptions] = useState<string[]>(['Book Appointment', 'Clinic Timings', 'Our Services', 'Talk to Human']);
  const [saveUserResponse, setSaveUserResponse] = useState(true);
  const [captureAsIntent, setCaptureAsIntent] = useState('Intent');
  const [nextStepOption, setNextStepOption] = useState('Continue to next step');
  const [templateSubView, setTemplateSubView] = useState<'replies' | 'journeys' | 'bulk_campaigns'>('replies');

  const currentIndustryConfig = getSectorDefinition(selectedIndustry);
  const term = currentIndustryConfig.terminology;

  // --- Readiness check state ---
  const [readinessStatus, setReadinessStatus] = useState<{
    checked: boolean;
    ready: boolean;
    code?: string;
    message?: string;
  } | null>(null);

  useEffect(() => {
    const checkReadiness = async () => {
      try {
        const res = await authenticatedFetch('/api/whatsapp/readiness');
        const data = await res.json();
        setReadinessStatus({
          checked: true,
          ready: !!data.ready,
          code: data.code,
          message: data.message,
        });
      } catch {
        setReadinessStatus({
          checked: true,
          ready: false,
          code: 'WHATSAPP_DATABASE_UNAVAILABLE',
          message: 'Could not connect to WhatsApp readiness endpoint.',
        });
      }
    };
    checkReadiness();
  }, []);

  // --- Live WhatsApp & Patient Inbox State ---
  const [activeInboxContactId, setActiveInboxContactId] = useState<string>('');
  const [inboxSearchQuery, setInboxSearchQuery] = useState('');
  const [inboxCategoryFilter, setInboxCategoryFilter] = useState<'All' | 'Unread' | 'Active' | 'Lead' | 'Follow-up' | 'Starred'>('All');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templatePickerCategory, setTemplatePickerCategory] = useState<string>('All');
  const [templatePickerSearch, setTemplatePickerSearch] = useState('');
  const [inboxInputText, setInboxInputText] = useState('');
  const [showCrmPanel, setShowCrmPanel] = useState(true);
  const [isGeneratingAiReply, setIsGeneratingAiReply] = useState(false);
  const [inboxToast, setInboxToast] = useState<string | null>(null);

  interface InboxMessage {
    id: string;
    sender: 'contact' | 'user' | 'system';
    text: string;
    timestamp: string;
    status?: 'sent' | 'delivered' | 'read';
    templateTitle?: string;
    mediaType?: 'invoice' | 'location' | 'appointment' | 'review';
    mediaMeta?: any;
  }

  const [chatThreads, setChatThreads] = useState<Record<string, InboxMessage[]>>({});

  useEffect(() => {
    if (!contacts || contacts.length === 0) return;

    setChatThreads((prev) => {
      const updated = { ...prev };
      contacts.forEach((c) => {
        if (!updated[c.id]) {
          const initialMsgs: InboxMessage[] = [];
          if (c.category === 'Active') {
            initialMsgs.push(
              {
                id: `m-init-1-${c.id}`,
                sender: 'contact',
                text: `Namaste ${senderName}! I visited last week for treatment. Just wanted to check if my next follow-up appointment is on schedule?`,
                timestamp: '10:15 AM',
              },
              {
                id: `m-init-2-${c.id}`,
                sender: 'user',
                text: `Namaste ${c.name} garu! Yes, your follow-up for ${c.treatmentType || 'consultation'} is scheduled. Our team is ready for your visit at ${businessName}.`,
                timestamp: '10:20 AM',
                status: 'read',
              },
              {
                id: `m-init-3-${c.id}`,
                sender: 'contact',
                text: `Thank you Doctor! Will reach on time.`,
                timestamp: '10:22 AM',
              }
            );
          } else if (c.category === 'Lead') {
            initialMsgs.push(
              {
                id: `m-init-1-${c.id}`,
                sender: 'contact',
                text: `Hello, I saw your advertisement regarding ${c.treatmentType || 'consultation'}. What are the consultation charges and timings?`,
                timestamp: 'Yesterday 4:30 PM',
              },
              {
                id: `m-init-2-${c.id}`,
                sender: 'user',
                text: `Hi ${c.name}! Consultation fee is ₹300. Clinic timings at ${businessName} are ${aiKnowledgeBase.timings || '9:00 AM - 8:00 PM'}. Would you like to book a slot for today or tomorrow?`,
                timestamp: 'Yesterday 4:35 PM',
                status: 'read',
                templateTitle: 'Inquiry Response',
              }
            );
          } else {
            initialMsgs.push(
              {
                id: `m-init-1-${c.id}`,
                sender: 'contact',
                text: `Hi! Can I get information regarding payment methods accepted at the clinic?`,
                timestamp: '2 days ago',
              },
              {
                id: `m-init-2-${c.id}`,
                sender: 'user',
                text: `Namaste ${c.name}! We accept UPI, PhonePe, Debit/Credit Cards, and Cash. Zero-click UPI payment links can also be sent via WhatsApp!`,
                timestamp: '2 days ago',
                status: 'read',
              }
            );
          }
          updated[c.id] = initialMsgs;
        }
      });
      return updated;
    });

    if (!activeInboxContactId && contacts.length > 0) {
      setActiveInboxContactId(contacts[0].id);
    }
  }, [contacts, businessName, senderName, aiKnowledgeBase]);

  const handleSendMessageInInbox = (overrideText?: string, templateTitleUsed?: string) => {
    const textToSend = (overrideText || inboxInputText).trim();
    if (!textToSend || !activeInboxContactId) return;

    const currentContact = contacts.find(c => c.id === activeInboxContactId);
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg: InboxMessage = {
      id: 'm-sent-' + Date.now(),
      sender: 'user',
      text: textToSend,
      timestamp: nowTime,
      status: 'read',
      templateTitle: templateTitleUsed,
    };

    setChatThreads(prev => ({
      ...prev,
      [activeInboxContactId]: [...(prev[activeInboxContactId] || []), newMsg]
    }));

    if (onLogInteraction) {
      onLogInteraction(
        activeInboxContactId,
        'WhatsApp Sent',
        textToSend,
        whatsappMode === 'meta' ? 'Meta Cloud API (Billed)' : 'WhatsApp Live Inbox'
      );
    }

    setInboxInputText('');
    setShowTemplatePicker(false);
    setInboxToast(`Message sent via WhatsApp to ${currentContact?.name || 'patient'}!`);
    setTimeout(() => setInboxToast(null), 3000);
  };

  const handleInsertTemplateIntoInbox = (template: MessageTemplate) => {
    const currentContact = contacts.find(c => c.id === activeInboxContactId);
    const resolvedText = resolveTemplateText(template.text)
      .replace(/\{\{name\}\}/g, currentContact?.name || 'Patient')
      .replace(/\{\{contactName\}\}/g, currentContact?.name || 'Patient');

    setInboxInputText(resolvedText);
    setShowTemplatePicker(false);
    setInboxToast(`Loaded template "${template.title}" into composer!`);
    setTimeout(() => setInboxToast(null), 2500);
  };

  const handleGenerateAiReplyInInbox = async () => {
    const currentContact = contacts.find(c => c.id === activeInboxContactId);
    if (!currentContact) return;

    setIsGeneratingAiReply(true);
    const contactMsgs = chatThreads[activeInboxContactId] || [];
    const lastIncoming = [...contactMsgs].reverse().find(m => m.sender === 'contact')?.text || 'Inquiry about appointment timings and charges';

    try {
      const response = await fetch('/api/ai-agent/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: currentContact.name,
          contactCategory: currentContact.category,
          userMessage: lastIncoming,
          aiKnowledgeBase,
          businessName,
          senderName,
          selectedIndustry,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.draftReply) {
          setInboxInputText(data.draftReply);
          setInboxToast(`AI Smart Reply generated!`);
          setTimeout(() => setInboxToast(null), 2500);
          setIsGeneratingAiReply(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Fallback to local intelligent reply generation');
    }

    const smartDraft = `Namaste ${currentContact.name} garu! Thank you for reaching out to ${businessName}. ${aiKnowledgeBase.timings ? `Our consulting timings are: ${aiKnowledgeBase.timings}. ` : ''}${aiKnowledgeBase.doctors ? `Consulting specialist: ${aiKnowledgeBase.doctors.split('\n')[0]}. ` : ''}How can we assist you today?`;
    setInboxInputText(smartDraft);
    setInboxToast(`AI Smart Reply generated!`);
    setTimeout(() => setInboxToast(null), 2500);
    setIsGeneratingAiReply(false);
  };

  // Aliases to route state changes directly to App.tsx callbacks
  const setWhatsappMode = onWhatsappModeChange;
  const setMetaPhoneNumberId = onMetaPhoneNumberIdChange;
  const setMetaAccessToken = onMetaAccessTokenChange;
  const setMetaWabaId = onMetaWabaIdChange;
  const setMetaVerifyToken = onMetaVerifyTokenChange;
  const setConnectionStatus = onConnectionStatusChange;
  const setDeviceDetails = onDeviceDetailsChange;

  const [metaTestPhone, setMetaTestPhone] = useState('');
  const [metaTestMessage, setMetaTestMessage] = useState('Namaste garu! This is an official test message from Sri Sai Dental Clinic.');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [connectionLogs, setConnectionLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] WhatsCRM Server initialized.`,
    `[${new Date().toLocaleTimeString()}] Waiting for client pairing initialization...`,
  ]);
  const [simulatedProgress, setSimulatedProgress] = useState(0);

  // --- Webhook Setup & Simulation State ---
  const [simulatedSenderName, setSimulatedSenderName] = useState('Ramanarao');
  const [simulatedSenderPhone, setSimulatedSenderPhone] = useState('+919440552671');
  const [simulatedSenderMessage, setSimulatedSenderMessage] = useState('Hi, I want to inquire about cosmetic smile design consultation prices.');
  const [isSimulatingWebhook, setIsSimulatingWebhook] = useState(false);
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [receivedWebhookFeed, setReceivedWebhookFeed] = useState<any[]>([]);
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [simulationAlert, setSimulationAlert] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // --- Bulk Broadcast Campaign Promotion State & Handlers ---
  const [selectedBroadcastTemplate, setSelectedBroadcastTemplate] = useState<MessageTemplate | null>(null);
  const [broadcastTargetCategory, setBroadcastTargetCategory] = useState<'All' | 'Lead' | 'Active' | 'Inactive' | 'Follow-up'>('All');
  const [selectedBroadcastContacts, setSelectedBroadcastContacts] = useState<string[]>([]);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [showBroadcastConfirmModal, setShowBroadcastConfirmModal] = useState(false);
  const isBroadcasting = false;
  const [broadcastProgress, setBroadcastProgress] = useState(0);
  const [broadcastLogs, setBroadcastLogs] = useState<string[]>([]);
  const [broadcastComplete, setBroadcastComplete] = useState(false);
  const [totalCostEstimate, setTotalCostEstimate] = useState(0);

  const handleInitiateBulkBroadcast = (template: MessageTemplate) => {
    setSelectedBroadcastTemplate(template);
    setTemplateSubView('bulk_campaigns');
    setBroadcastTargetCategory('All');
    setBroadcastComplete(false);
    setBroadcastLogs([]);
    setBroadcastProgress(0);
    
    const eligibleCount = contacts.length;
    setSelectedBroadcastContacts(contacts.map(c => c.id));
    setTotalCostEstimate(eligibleCount * 0.008);
  };

  useEffect(() => {
    const matched = broadcastTargetCategory === 'All'
      ? contacts
      : contacts.filter(c => c.category === broadcastTargetCategory);
    setSelectedBroadcastContacts(matched.map(c => c.id));
  }, [broadcastTargetCategory, contacts]);

  useEffect(() => {
    setTotalCostEstimate(selectedBroadcastContacts.length * 0.008);
  }, [selectedBroadcastContacts]);

  const handleStartBroadcast = () => {
    if (!selectedBroadcastTemplate) return;

    const targetContacts = contacts.filter(c => selectedBroadcastContacts.includes(c.id));
    setShowBroadcastConfirmModal(false);
    setBroadcastProgress(0);

    if (targetContacts.length === 0) {
      setBroadcastLogs([`[ERROR] Select at least one contact before preparing a campaign.`]);
      return;
    }

    // This product does not bulk-send local shortcuts. Meta approval, recipient consent,
    // and a durable queue are required before a campaign can become a live dispatch.
    setBroadcastLogs([
      `[${new Date().toLocaleTimeString()}] Campaign draft prepared for ${targetContacts.length} contact(s).`,
      `[CHECK] Selected team template: "${selectedBroadcastTemplate.title}".`,
      '[SAFE MODE] No WhatsApp messages were sent and no Meta charges were created.',
      '[NEXT] Use an approved Meta template and verified consent before enabling delivery.'
    ]);
    setBroadcastProgress(100);
    setBroadcastComplete(true);
  };

  // Poll or fetch received messages live feed
  const fetchWebhookFeed = async () => {
    if (!readinessStatus || !readinessStatus.ready) {
      return;
    }
    try {
      const response = await authenticatedFetch('/api/whatsapp/received-messages');
      if (response.status === 503 || response.status === 530) {
        setReadinessStatus({
          checked: true,
          ready: false,
          code: 'WHATSAPP_SCHEMA_NOT_READY',
          message: 'WhatsApp database schema missing or PostgREST schema cache stale.',
        });
        return;
      }
      if (!response.ok) return;

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return;
      }

      try {
        const data = await response.json();
        setReceivedWebhookFeed(Array.isArray(data) ? data : []);
      } catch (jsonErr) {
        // Safe silent handle
      }
    } catch (err) {
      console.error('Error fetching webhook feed:', err);
    }
  };

  useEffect(() => {
    if (!readinessStatus || !readinessStatus.ready) return;
    fetchWebhookFeed();
    // Auto-refresh feed every 5 seconds if tab is active and readiness is confirmed
    const feedInterval = setInterval(() => {
      if (activeSubTab === 'qr_link' && readinessStatus?.ready) {
        fetchWebhookFeed();
      }
    }, 5000);
    return () => clearInterval(feedInterval);
  }, [activeSubTab, readinessStatus?.ready]);

  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatedSenderPhone || !simulatedSenderMessage) return;

    setIsSimulatingWebhook(true);
    setSimulationAlert(null);
    try {
      const cleanPhone = simulatedSenderPhone.replace(/[^0-9]/g, '');
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'simulated-entry-' + Date.now(),
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '15555555555',
                    phone_number_id: metaPhoneNumberId || '106555198032'
                  },
                  contacts: [
                    {
                      profile: {
                        name: simulatedSenderName || 'New Lead'
                      },
                      wa_id: cleanPhone
                    }
                  ],
                  messages: [
                    {
                      from: cleanPhone,
                      id: 'sim-msg-' + Math.floor(100000 + Math.random() * 900000),
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      text: {
                        body: simulatedSenderMessage
                      },
                      type: 'text'
                    }
                  ]
                },
                field: 'messages'
              }
            ]
          }
        ]
      };

      const response = await fetch('/api/whatsapp/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // Clear message box, keep phone & name for easy re-testing
        setSimulatedSenderMessage('');
        // Immediately fetch updated feed
        await fetchWebhookFeed();
        setSimulationAlert({
          type: 'success',
          text: 'Webhook Simulation Dispatched! The message payload was processed by /api/whatsapp/webhook. Look at your CRM contact list or the log feed below!'
        });
      } else {
        setSimulationAlert({
          type: 'error',
          text: 'Webhook simulation failed: ' + response.statusText
        });
      }
    } catch (err: any) {
      setSimulationAlert({
        type: 'error',
        text: 'Webhook simulation network error: ' + err.message
      });
    } finally {
      setIsSimulatingWebhook(false);
    }
  };

  // --- No-Code Automations State & Dynamic Presets Loader ---
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [ruleName, setRuleName] = useState('');
  const [ruleTrigger, setRuleTrigger] = useState<'keyword' | 'first_message' | 'outside_hours' | 'appointment_booked'>('keyword');
  const [ruleKeywords, setRuleKeywords] = useState('');
  const [ruleActionValue, setRuleActionValue] = useState('');
  const [ruleCategory, setRuleCategory] = useState<'clinical' | 'marketing' | 'scheduler' | 'support'>('support');

  // --- Deterministic Chatbot Nodes State & Dynamic Presets Loader ---
  const [chatbotNodes, setChatbotNodes] = useState<ChatbotNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [editNodeTitle, setEditNodeTitle] = useState('');
  const [editNodeKeyword, setEditNodeKeyword] = useState('');
  const [editNodeResponse, setEditNodeResponse] = useState('');
  const [editNodeAction, setEditNodeAction] = useState<'calendar' | 'none' | 'alert_staff' | 'show_prices'>('none');
  const [editNodeParentId, setEditNodeParentId] = useState<string | null>(null);

  // Dynamic industry configuration loaders
  useEffect(() => {
    if (!selectedIndustry) return;
    const cacheKeyRules = `nestam_automation_rules_${selectedIndustry}`;
    const cacheKeyNodes = `nestam_chatbot_nodes_${selectedIndustry}`;
    
    const savedRules = localStorage.getItem(cacheKeyRules);
    const savedNodes = localStorage.getItem(cacheKeyNodes);
    
    const industryConfig = getSectorDefinition(selectedIndustry);
    if (industryConfig) {
      if (savedRules) {
        try {
          setAutomationRules(JSON.parse(savedRules));
        } catch(e) {
          setAutomationRules(industryConfig.defaultAutomationRules || []);
        }
      } else {
        setAutomationRules(industryConfig.defaultAutomationRules || []);
      }
      
      if (savedNodes) {
        try {
          const parsed = JSON.parse(savedNodes);
          setChatbotNodes(parsed);
          if (parsed.length > 0) {
            setSelectedNodeId(parsed[0].id);
          }
        } catch(e) {
          setChatbotNodes(industryConfig.defaultChatbotNodes || []);
          if (industryConfig.defaultChatbotNodes?.length > 0) {
            setSelectedNodeId(industryConfig.defaultChatbotNodes[0].id);
          }
        }
      } else {
        setChatbotNodes(industryConfig.defaultChatbotNodes || []);
        if (industryConfig.defaultChatbotNodes?.length > 0) {
          setSelectedNodeId(industryConfig.defaultChatbotNodes[0].id);
        }
      }
    }
  }, [selectedIndustry]);

  // Persist when local modifications are made to rules
  useEffect(() => {
    if (!selectedIndustry || automationRules.length === 0) return;
    localStorage.setItem(`nestam_automation_rules_${selectedIndustry}`, JSON.stringify(automationRules));
  }, [automationRules, selectedIndustry]);

  // Persist when local modifications are made to nodes
  useEffect(() => {
    if (!selectedIndustry || chatbotNodes.length === 0) return;
    localStorage.setItem(`nestam_chatbot_nodes_${selectedIndustry}`, JSON.stringify(chatbotNodes));
  }, [chatbotNodes, selectedIndustry]);

  // Load selected chatbot node into state editors
  useEffect(() => {
    const node = chatbotNodes.find(n => n.id === selectedNodeId);
    if (node) {
      setEditNodeTitle(node.title);
      setEditNodeKeyword(node.triggerKeyword);
      setEditNodeResponse(node.botResponse);
      setEditNodeAction(node.actionType || 'none');
      setEditNodeParentId(node.parentNodeId || null);
    }
  }, [selectedNodeId, chatbotNodes]);

  // --- AI Auto-Responder Agent States & Simulators ---
  const [localAiAgentType, setLocalAiAgentType] = useState<string>(() => {
    return localStorage.getItem('nestam_ai_agent_type') || 'gemini';
  });
  const aiAgentType = propAiAgentType !== undefined ? propAiAgentType : localAiAgentType;
  const setAiAgentType = (val: string) => {
    if (onAiAgentTypeChange) onAiAgentTypeChange(val);
    setLocalAiAgentType(val);
    localStorage.setItem('nestam_ai_agent_type', val);
  };

  const [localAiAgentActive, setLocalAiAgentActive] = useState<boolean>(() => {
    return localStorage.getItem('nestam_ai_agent_active') === 'true';
  });
  const aiAgentActive = propAiAgentActive !== undefined ? propAiAgentActive : localAiAgentActive;
  const setAiAgentActive = (val: boolean) => {
    if (onAiAgentActiveChange) onAiAgentActiveChange(val);
    setLocalAiAgentActive(val);
    localStorage.setItem('nestam_ai_agent_active', String(val));
  };

  const [localCustomSystemPrompt, setLocalCustomSystemPrompt] = useState<string>(() => {
    return localStorage.getItem('nestam_ai_custom_system_prompt') || '';
  });
  const customSystemPrompt = propCustomSystemPrompt !== undefined ? propCustomSystemPrompt : localCustomSystemPrompt;
  const setCustomSystemPrompt = (val: string) => {
    if (onCustomSystemPromptChange) onCustomSystemPromptChange(val);
    setLocalCustomSystemPrompt(val);
    localStorage.setItem('nestam_ai_custom_system_prompt', val);
  };

  const [localCustomApiKey, setLocalCustomApiKey] = useState<string>(() => {
    return localStorage.getItem('nestam_ai_custom_api_key') || '';
  });
  const customApiKey = propCustomApiKey !== undefined ? propCustomApiKey : localCustomApiKey;
  const setCustomApiKey = (val: string) => {
    if (onCustomApiKeyChange) onCustomApiKeyChange(val);
    setLocalCustomApiKey(val);
    localStorage.setItem('nestam_ai_custom_api_key', val);
  };

  const [aiAgentQuery, setAiAgentQuery] = useState('');
  const [aiAgentResponse, setAiAgentResponse] = useState('');
  const [aiAgentLoading, setAiAgentLoading] = useState(false);
  const [aiAgentLogs, setAiAgentLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] AI Responder Agent initialized in passive monitoring mode.`,
  ]);
  const [aiAgentScheduleSuggestion, setAiAgentScheduleSuggestion] = useState<any>(null);

  const handleSimulateAiAgent = async () => {
    if (!aiAgentQuery.trim()) return;
    setAiAgentLoading(true);
    setAiAgentResponse('');
    setAiAgentScheduleSuggestion(null);
    const timeStr = new Date().toLocaleTimeString();
    setAiAgentLogs(prev => [...prev, `[${timeStr}] Inbound customer inquiry: "${aiAgentQuery}"`]);
    setAiAgentLogs(prev => [...prev, `[${timeStr}] Invoking core model agent: ${aiAgentType} ...`]);
    
    try {
      const kbText = `Timings: ${aiKnowledgeBase.timings}\nTreatments: ${aiKnowledgeBase.treatments}\nDoctors: ${aiKnowledgeBase.doctors}\nReviews: ${aiKnowledgeBase.reviews}\nWorkflow: ${aiKnowledgeBase.workflow}`;
      
      const response = await authenticatedFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiAgentQuery,
          knowledgeBase: kbText,
          patientName: 'Demo Client',
          aiAgentType: aiAgentType,
          selectedIndustry: selectedIndustry,
          customSystemPrompt: customSystemPrompt,
          customApiKey: customApiKey,
        }),
      });

      if (!response.ok) {
        throw new Error('AI Engine failed to generate reply.');
      }

      const data = await response.json();
      setAiAgentResponse(data.draftReply || '');
      setAiAgentScheduleSuggestion(data.schedulingSuggestion || null);
      setAiAgentLogs(prev => [
        ...prev, 
        `[${new Date().toLocaleTimeString()}] Response generated successfully!`,
        ...(data.schedulingSuggestion?.shouldSchedule ? [`[${new Date().toLocaleTimeString()}] Scheduling intent detected: "${data.schedulingSuggestion.summary}" on ${data.schedulingSuggestion.date} at ${data.schedulingSuggestion.time}`] : [])
      ]);
    } catch (e: any) {
      console.error(e);
      setAiAgentResponse(`Namaste, we received your inquiry! We are experiencing high load but we'll review and reply to you shortly. Take care!`);
      setAiAgentLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Error: ${e.message || 'AI Engine offline fallback triggered.'}`]);
    } finally {
      setAiAgentLoading(false);
    }
  };

  // Chatbot Sandbox Simulator State
  const [simulatorChat, setSimulatorChat] = useState<Array<{ sender: 'user' | 'bot', text: string }>>([]);
  const [simulatorCurrentNodeId, setSimulatorCurrentNodeId] = useState<string>('');
  const [simulatorInput, setSimulatorInput] = useState('');

  // Start chatbot conversation
  useEffect(() => {
    if (chatbotNodes.length === 0) return;
    const rootNode = chatbotNodes.find(n => n.isRoot || !n.parentNodeId) || chatbotNodes[0];
    if (rootNode) {
      const resolvedResponse = resolveTemplateText(rootNode.botResponse);
      setSimulatorChat([
        { sender: 'bot', text: resolvedResponse }
      ]);
      setSimulatorCurrentNodeId(rootNode.id);
    }
  }, [chatbotNodes]);

  const handleSendSimulatorMessage = (msgText: string) => {
    const cleanMsg = msgText.trim().toLowerCase();
    if (!cleanMsg) return;

    // Add user message
    const updatedChat = [...simulatorChat, { sender: 'user' as const, text: msgText }];
    setSimulatorChat(updatedChat);
    setSimulatorInput('');

    // Find direct child match first
    let matchedNode = chatbotNodes.find(n => 
      n.parentNodeId === simulatorCurrentNodeId && 
      n.triggerKeyword.toLowerCase().split(',').map(k => k.trim()).includes(cleanMsg)
    );

    // If no direct child match, check global triggers
    if (!matchedNode) {
      matchedNode = chatbotNodes.find(n => 
        n.triggerKeyword.toLowerCase().split(',').map(k => k.trim()).includes(cleanMsg)
      );
    }

    setTimeout(() => {
      if (matchedNode) {
        const resolvedResponse = resolveTemplateText(matchedNode.botResponse);
        setSimulatorChat(prev => [
          ...prev, 
          { sender: 'bot', text: resolvedResponse }
        ]);
        setSimulatorCurrentNodeId(matchedNode.id);
        
        // Simulating trigger actions inside sandbox
        if (matchedNode.actionType === 'show_prices') {
          setSimulatorChat(prev => [...prev, { sender: 'bot', text: '🤖 [SYSTEM ACTION: Pricing list loaded successfully]' }]);
        } else if (matchedNode.actionType === 'calendar') {
          setSimulatorChat(prev => [...prev, { sender: 'bot', text: '🤖 [SYSTEM ACTION: Appointment Booking Form popup triggered]' }]);
        } else if (matchedNode.actionType === 'alert_staff') {
          setSimulatorChat(prev => [...prev, { sender: 'bot', text: '🤖 [SYSTEM ACTION: Staff Alert Sent! Desk phone ringing]' }]);
        }
      } else {
        setSimulatorChat(prev => [
          ...prev, 
          { sender: 'bot', text: '⚠️ Option not recognized. Please reply with one of the specified numbers/letters, or type "0" to go back to the Main Menu.' }
        ]);
      }
    }, 600);
  };

  // --- Message Template Form States ---
  const [tplTitle, setTplTitle] = useState('');
  const [tplCategory, setTplCategory] = useState('Appointments');
  const [tplText, setTplText] = useState('');
  const [searchTpl, setSearchTpl] = useState('');
  const [copiedTplId, setCopiedTplId] = useState<string | null>(null);

  // Simulated progress timer for QR scan
  useEffect(() => {
    let interval: any;
    if (connectionStatus === 'connecting') {
      interval = setInterval(() => {
        setSimulatedProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setConnectionStatus('connected');
            setDeviceDetails({
              phoneName: 'OnePlus 11 Pro Clinic Phone',
              phoneNumber: '+91 94405 52671',
              battery: 89,
              signal: 'excellent',
              pairingTime: new Date().toLocaleTimeString(),
            });
            setConnectionLogs((logs) => [
              ...logs,
              `[${new Date().toLocaleTimeString()}] Handshake received from linked phone (+91 94405 52671)...`,
              `[${new Date().toLocaleTimeString()}] Syncing recent chats (4 active conversations loaded)...`,
              `[${new Date().toLocaleTimeString()}] No-Code Automations Engine: ONLINE & ARMED.`,
              `[${new Date().toLocaleTimeString()}] Deterministic Chatbot flow parsed (Root: "${chatbotNodes[0].title}").`,
              `[${new Date().toLocaleTimeString()}] WhatsApp device pairing: SUCCESSFUL!`,
            ]);
            return 100;
          }
          const nextVal = prev + 25;
          setConnectionLogs((logs) => [
            ...logs,
            `[${new Date().toLocaleTimeString()}] Socket connection progress: ${nextVal}%...`,
          ]);
          return nextVal;
        });
      }, 600);
    }
    return () => clearInterval(interval);
  }, [connectionStatus, chatbotNodes]);

  // Handle Simulated QR Code Connection Trigger
  const handleSimulateConnection = () => {
    if (connectionStatus === 'disconnected') {
      setSimulatedProgress(0);
      setConnectionStatus('connecting');
      setConnectionLogs((logs) => [
        ...logs,
        `[${new Date().toLocaleTimeString()}] QR Code scan detected by WhatsCRM Android Service.`,
        `[${new Date().toLocaleTimeString()}] Opening WebSocket session with secure WhatsApp bridge...`,
      ]);
    } else {
      setConnectionStatus('disconnected');
      setDeviceDetails(null);
      setConnectionLogs((logs) => [
        ...logs,
        `[${new Date().toLocaleTimeString()}] Device unlinked by user.`,
        `[${new Date().toLocaleTimeString()}] Server idle. Ready to generate new pairing QR code.`,
      ]);
    }
  };

  // Save changes to edited Chatbot node
  const handleSaveChatbotNode = () => {
    setChatbotNodes(prev => prev.map(n => {
      if (n.id === selectedNodeId) {
        return {
          ...n,
          title: editNodeTitle,
          triggerKeyword: editNodeKeyword,
          botResponse: editNodeResponse,
          actionType: editNodeAction,
          parentNodeId: editNodeParentId,
        };
      }
      return n;
    }));
    alert(`Chatbot node "${editNodeTitle}" updated successfully!`);
  };

  // Add a new Chatbot Node branch
  const handleAddChatbotNode = () => {
    const newId = 'node-' + Date.now();
    const newNode: ChatbotNode = {
      id: newId,
      title: 'New Nested Branch',
      triggerKeyword: 'new',
      botResponse: 'Enter chatbot auto-reply text here...',
      isRoot: false,
      parentNodeId: selectedNodeId || 'node-root',
      actionType: 'none',
    };

    setChatbotNodes([...chatbotNodes, newNode]);
    setSelectedNodeId(newId);
  };

  const handleDeleteChatbotNode = (nodeId: string) => {
    const node = chatbotNodes.find(n => n.id === nodeId);
    if (!node) return;
    if (node.isRoot) {
      alert("Cannot delete the Welcome Root node! The bot requires a starting point.");
      return;
    }
    if (window.confirm(`Are you sure you want to delete "${node.title}"? This will also un-parent any children nested under this branch.`)) {
      setChatbotNodes(prev => prev
        .filter(n => n.id !== nodeId)
        .map(n => n.parentNodeId === nodeId ? { ...n, parentNodeId: 'node-root' } : n)
      );
      setSelectedNodeId('node-root');
    }
  };

  // No-code rules management
  const handleToggleRule = (id: string) => {
    setAutomationRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  const handleDeleteRule = (id: string) => {
    if (window.confirm("Delete this automation trigger?")) {
      setAutomationRules(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim() || !ruleActionValue.trim()) return;

    const newRule: AutomationRule = {
      id: 'rule-' + Date.now(),
      name: ruleName.trim(),
      trigger: ruleTrigger,
      conditionValue: ruleTrigger === 'keyword' ? ruleKeywords.trim() : undefined,
      action: 'send_reply',
      actionValue: ruleActionValue.trim(),
      isActive: true,
      category: ruleCategory,
    };

    setAutomationRules([newRule, ...automationRules]);
    setRuleName('');
    setRuleKeywords('');
    setRuleActionValue('');
    alert("New custom WhatsApp automation trigger armed successfully!");
  };

  // Helper to resolve knowledge base variables dynamically inside templates
  const resolveTemplateText = (text: string) => {
    return text
      .replace(/\{\{businessName\}\}/g, businessName)
      .replace(/\{\{senderName\}\}/g, senderName)
      .replace(/\{\{timings\}\}/g, aiKnowledgeBase.timings || '9 AM to 8 PM')
      .replace(/\{\{treatments\}\}/g, aiKnowledgeBase.treatments || 'General Dental Care')
      .replace(/\{\{doctors\}\}/g, aiKnowledgeBase.doctors || 'Our Clinical Consultants')
      .replace(/\{\{reviews\}\}/g, aiKnowledgeBase.reviews || '5-star rated service')
      .replace(/\{\{reviewLink\}\}/g, reviewLink || 'https://g.page/srisaidental');
  };

  const handleCopyText = (text: string, id: string) => {
    safeCopyToClipboard(resolveTemplateText(text));
    setCopiedTplId(id);
    setTimeout(() => setCopiedTplId(null), 2000);
  };

  const handleSubmitTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplTitle.trim() || !tplText.trim()) return;
    onAddTemplate(tplTitle.trim(), tplCategory, tplText.trim());
    setTplTitle('');
    setTplText('');
    alert("Fast response template saved successfully!");
  };

  // Meta Test send routine
  const handleSendMetaTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metaPhoneNumberId || !metaAccessToken || !metaTestPhone) {
      alert("Please fill in Phone ID, Access Token, and Target WhatsApp Phone Number!");
      return;
    }
    setIsSendingTest(true);
    setTestResult(null);

    try {
      const cleanedPhone = metaTestPhone.replace(/[^0-9]/g, '');
      const response = await fetch(`https://graph.facebook.com/v18.0/${metaPhoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${metaAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanedPhone,
          type: "text",
          text: { body: metaTestMessage },
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setTestResult({
          success: true,
          message: `WhatsApp API Success! Message ID: ${data.messages?.[0]?.id || 'unknown'}`
        });
        if (onLogInteraction) {
          const matchingContact = contacts.find(c => c.phone.replace(/\D/g, '').includes(cleanedPhone.replace(/\D/g, '')));
          onLogInteraction(matchingContact?.id || contacts[0]?.id || '1', "WhatsApp Sent", `Meta API Test: ${metaTestMessage}`, "API Success Response");
        }
      } else {
        setTestResult({
          success: false,
          message: `API Error: ${data.error?.message || response.statusText} (Code: ${data.error?.code || 'N/A'})`
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `HTTP Connection Failed: ${err.message}`
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(searchTpl.toLowerCase()) || 
                        t.text.toLowerCase().includes(searchTpl.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-3xs overflow-hidden flex flex-col h-full w-full" id="whatsapp-automation-hub-view">
      {/* Clean Header Card matching Patients section style */}
      <div className="px-4 sm:px-5 py-4 bg-white border-b border-slate-200/90 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black font-display text-slate-900 tracking-tight flex items-center gap-2">
              Communications
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Real-time two-way WhatsApp messaging, patient context lookup, and AI auto-response handling.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-teal-50 border border-teal-200/80 px-3 py-1.5 rounded-xl self-start md:self-auto shrink-0 shadow-3xs">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            <Globe className="h-3.5 w-3.5 text-teal-700" />
            <span className="text-[11px] font-bold text-teal-900">Meta Cloud API</span>
          </div>
        </div>

        {/* Sub Navigation Bar - Clean & Focused */}
        <div className="flex overflow-x-auto gap-2 pt-1 border-t border-slate-200/60 no-scrollbar">
          {[
            { id: 'inbox', label: '💬 Live WhatsApp Inbox', icon: MessageSquare },
            { id: 'studio', label: '🤖 Chatbot Builder & AI Studio', icon: Bot },
            { id: 'templates', label: '⚡ Fast Reply Templates & Campaigns', icon: FileText },
          ].map((sub) => {
            const Icon = sub.icon;
            const isSel = activeSubTab === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => setActiveSubTab(sub.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  isSel 
                    ? 'bg-teal-700 text-white shadow-2xs' 
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {sub.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-3 sm:p-4 flex-1 flex flex-col min-h-0">
        {readinessStatus && !readinessStatus.ready && (
          <div className="p-3.5 mb-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs font-medium flex items-start gap-3 shadow-xs shrink-0">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-amber-950 text-sm">WhatsApp Storage & Schema Notice: {readinessStatus.code || 'SCHEMA_NOT_READY'}</p>
              <p className="mt-0.5 text-amber-800">{readinessStatus.message}</p>
              <p className="mt-1 text-[11px] text-amber-700">
                To enable durable multi-tenant persistence for WhatsApp, apply the migration SQL in your Supabase database: <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold">/supabase/migrations/20260726000000_whatsapp_persistence.sql</code>.
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  const res = await authenticatedFetch('/api/whatsapp/readiness');
                  const data = await res.json();
                  setReadinessStatus({
                    checked: true,
                    ready: !!data.ready,
                    code: data.code,
                    message: data.message,
                  });
                } catch {
                  setReadinessStatus({
                    checked: true,
                    ready: false,
                    code: 'WHATSAPP_DATABASE_UNAVAILABLE',
                    message: 'Could not connect to WhatsApp readiness endpoint.',
                  });
                }
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 shadow-2xs"
            >
              Retry Readiness Check
            </button>
          </div>
        )}
        
        {/* ==================== SUB-TAB 0: LIVE WHATSAPP & PATIENT INBOX ==================== */}
        {activeSubTab === 'inbox' && (
          <div className="flex-1 flex flex-col min-h-0 space-y-3 animate-fade-in">
            <SharedWhatsAppInbox teamTemplates={templates} businessName={businessName} senderName={senderName} />
          </div>
        )}
              













        {/* ==================== SUB-TAB 1: DYNAMIC FAST RESPONSE TEMPLATES ==================== */}
        {activeSubTab === 'templates' && (
          <div className="space-y-6 animate-fade-in">
            {/* Template sub-selector pills */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/65 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Scripts & Campaign Journeys</h3>
                <p className="text-[11px] text-slate-400">Configure single response fast templates or multi-message drip campaign sequences.</p>
              </div>
              <div className="bg-slate-850 border border-slate-700 p-1 rounded-xl flex self-start sm:self-auto flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setTemplateSubView('replies')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    templateSubView === 'replies'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Reply Templates
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateSubView('journeys')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    templateSubView === 'journeys'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Campaign Journeys
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTemplateSubView('bulk_campaigns');
                    if (!selectedBroadcastTemplate && templates.length > 0) {
                      setSelectedBroadcastTemplate(templates[0]);
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    templateSubView === 'bulk_campaigns'
                      ? 'bg-teal-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Campaign Preflight
                </button>
              </div>
            </div>

            {templateSubView === 'replies' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Box: New Template Form */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <Plus className="h-4 w-4 text-teal-600" />
                Add {currentIndustryConfig.name.replace(/s$/, '')} Template
              </h3>

              <form onSubmit={handleSubmitTemplate} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Template Shortcut Name</label>
                  <input
                    type="text"
                    required
                    value={tplTitle}
                    onChange={(e) => setTplTitle(e.target.value)}
                    placeholder={
                      selectedIndustry === 'dental'
                        ? "e.g. Tooth Whitening Cost"
                        : selectedIndustry === 'gym'
                        ? "e.g. Personal Training Trial"
                        : selectedIndustry === 'realestate'
                        ? "e.g. Site Visit Confirmation"
                        : "e.g. Service Offerings overview"
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-xl text-xs focus:outline-none font-bold text-slate-700 shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category</label>
                  <select
                    value={tplCategory}
                    onChange={(e) => setTplCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-xl text-xs focus:outline-none font-semibold text-slate-600"
                  >
                    <option value="Appointments">Appointments & Recalls</option>
                    <option value="Billing">Billing & Pricing plans</option>
                    <option value="FAQ">FAQs & Info</option>
                    <option value="Clinical">{term.detailsLabel || 'Services/Clinical'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex justify-between">
                    <span>Message Body</span>
                    <span className="text-[9px] text-teal-600 lowercase font-medium">Auto-resolving tags</span>
                  </label>
                  <textarea
                    rows={6}
                    required
                    value={tplText}
                    onChange={(e) => setTplText(e.target.value)}
                    placeholder={`Namaste! {{senderName}} here. At {{businessName}}, our timings are {{timings}}. Our ${term.treatmentLabel.toLowerCase()}s are {{treatments}}.`}
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-xl text-xs focus:outline-none text-slate-700 shadow-inner leading-relaxed"
                  />
                  <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 text-[10px] text-amber-800 space-y-1 mt-1.5 font-medium leading-relaxed">
                    <p className="font-bold flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-amber-600" />
                      Dynamic tags to reuse:
                    </p>
                    <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 font-mono text-[9px] text-slate-600">
                      <div>{"{{businessName}}"}</div>
                      <div>{"{{senderName}}"}</div>
                      <div>{"{{timings}}"}</div>
                      <div>{"{{treatments}}"}</div>
                      <div>{"{{doctors}}"}</div>
                      <div>{"{{reviews}}"}</div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Save className="h-4 w-4" />
                  Save Message Template
                </button>
              </form>
            </div>

            {/* Right Box: Templates Explorer (Span 2) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-150">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-slate-500" />
                  Fast Response Directory ({filteredTemplates.length})
                </h3>
                <div className="relative max-w-xs w-full">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={searchTpl}
                    onChange={(e) => setSearchTpl(e.target.value)}
                    placeholder="Search shortcuts..."
                    className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 focus:outline-none focus:border-slate-400 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] text-amber-900 leading-relaxed">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p><strong>Team shortcuts, not Meta approvals:</strong> use these templates to help your staff reply consistently inside an open 24-hour customer service window. For a new outbound conversation or campaign, use a Meta-approved template and documented customer consent.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
                {filteredTemplates.length === 0 ? (
                  <div className="col-span-2 text-center p-12 bg-slate-50 rounded-2xl border border-slate-150 text-slate-500 text-xs font-medium">
                    No templates found matching your search.
                  </div>
                ) : (
                  filteredTemplates.map((t) => {
                    const resolved = resolveTemplateText(t.text);
                    return (
                      <div key={t.id} className="bg-white border border-slate-200 rounded-2xl shadow-3xs hover:border-slate-350 transition-all flex flex-col justify-between overflow-hidden">
                        <div className="p-4.5 space-y-3.5">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <h4 className="font-bold text-slate-800 text-xs">{t.title}</h4>
                              <span className="inline-block px-2 py-0.5 bg-teal-50 text-teal-700 text-[9px] font-bold rounded-md">
                                {t.category}
                              </span>
                            </div>
                            <button
                              onClick={() => onDeleteTemplate(t.id)}
                              className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete template"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3 text-[11px] font-medium text-slate-600 leading-relaxed font-sans max-h-[120px] overflow-y-auto">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1">Dynamic Live Preview:</span>
                            {resolved}
                          </div>
                        </div>

                        <div className="border-t border-slate-100 bg-slate-50/50 p-3 flex justify-between items-center">
                          <button
                            onClick={() => handleInitiateBulkBroadcast(t)}
                            className="px-3 py-1.5 bg-teal-650 hover:bg-teal-700 text-white rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer shadow-3xs"
                          >
                            <Megaphone className="h-3.5 w-3.5" />
                            Plan campaign
                          </button>

                          <button
                            onClick={() => handleCopyText(t.text, t.id)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              copiedTplId === t.id 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-slate-900 hover:bg-slate-800 text-white'
                            }`}
                          >
                            {copiedTplId === t.id ? (
                              <>
                                <Check className="h-3 w-3" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                Copy Resolved Text
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          )}

          {templateSubView === 'journeys' && (
            <WhatsAppJourneysBuilder
              industryId={selectedIndustry}
              templates={templates}
              businessName={businessName}
            />
          )}

          {templateSubView === 'bulk_campaigns' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in text-slate-800">
              {/* Left Side: Campaign Configurator (ColSpan 7) */}
              <div className="lg:col-span-7 space-y-6">
                {/* Step 1: Select/Change Template */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="bg-teal-150 text-teal-800 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black">1</span>
                      Select Campaign Template
                    </h3>
                    <span className="text-[10px] text-slate-400 font-bold">Matched with current industry</span>
                  </div>

                  {templates.length === 0 ? (
                    <div className="p-4 bg-amber-50 border border-amber-250 rounded-xl text-xs text-amber-700 font-bold">
                      No templates found. Please create a template first in the "Reply Templates" tab.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                      {templates.map(t => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setSelectedBroadcastTemplate(t);
                            setBroadcastComplete(false);
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer text-left space-y-1.5 ${
                            selectedBroadcastTemplate?.id === t.id
                              ? 'bg-teal-50 border-teal-500 shadow-3xs'
                              : 'bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <h4 className={`text-xs font-black truncate max-w-[140px] ${selectedBroadcastTemplate?.id === t.id ? 'text-teal-900' : 'text-slate-800'}`}>
                              {t.title}
                            </h4>
                            {selectedBroadcastTemplate?.id === t.id && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-teal-650 shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                            {t.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Step 2: Target Selection & Filtering */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2.5">
                    <span className="bg-teal-155 text-teal-800 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black">2</span>
                    Filter Target Recipients
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                          Recipient Category Group
                        </label>
                        <select
                          value={broadcastTargetCategory}
                          onChange={(e: any) => {
                            setBroadcastTargetCategory(e.target.value);
                            setBroadcastComplete(false);
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-xl text-xs text-slate-850 font-extrabold focus:outline-none"
                        >
                          <option value="All">All Registered ({contacts.length} profiles)</option>
                          <option value="Lead">Leads Only ({contacts.filter(c => c.category === 'Lead').length} profiles)</option>
                          <option value="Active">Active Cycle ({contacts.filter(c => c.category === 'Active').length} profiles)</option>
                          <option value="Inactive">Recall list ({contacts.filter(c => c.category === 'Inactive').length} profiles)</option>
                          <option value="Follow-up">Follow-up Only ({contacts.filter(c => c.category === 'Follow-up').length} profiles)</option>
                        </select>
                      </div>

                      <div className="bg-slate-100/50 p-3.5 rounded-xl border border-slate-200 flex flex-col justify-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Matched Target Size:</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-black text-slate-800">
                            {selectedBroadcastContacts.length}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold">profiles selected</span>
                        </div>
                      </div>
                    </div>

                    {/* Individual Contacts Checklist refinement option */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 flex flex-col h-[180px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Refine Selection</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const matched = broadcastTargetCategory === 'All'
                                ? contacts
                                : contacts.filter(c => c.category === broadcastTargetCategory);
                              setSelectedBroadcastContacts(matched.map(c => c.id));
                            }}
                            className="text-[9px] font-bold text-teal-600 hover:text-teal-800 underline transition-colors"
                          >
                            All
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedBroadcastContacts([])}
                            className="text-[9px] font-bold text-slate-400 hover:text-slate-600 underline transition-colors"
                          >
                            None
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        value={contactSearchQuery}
                        onChange={(e) => setContactSearchQuery(e.target.value)}
                        placeholder="Search filtered contacts..."
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-150 rounded-lg text-[10px] focus:outline-none focus:border-teal-500 text-slate-750 font-medium"
                      />

                      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-left">
                        {(broadcastTargetCategory === 'All'
                          ? contacts
                          : contacts.filter(c => c.category === broadcastTargetCategory)
                        ).filter(c => 
                          c.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) || 
                          c.phone.includes(contactSearchQuery)
                        ).map(c => {
                          const isChecked = selectedBroadcastContacts.includes(c.id);
                          return (
                            <label key={c.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer text-[10px] font-medium text-slate-700">
                              <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setSelectedBroadcastContacts(prev => prev.filter(id => id !== c.id));
                                    } else {
                                      setSelectedBroadcastContacts(prev => [...prev, c.id]);
                                    }
                                  }}
                                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-3 w-3 cursor-pointer"
                                />
                                <span className="truncate flex-1 font-bold">{c.name}</span>
                                <span className="text-[9px] text-slate-400 font-mono">{c.phone}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3: Meta Cloud API Billing Estimation */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2.5">
                    <span className="bg-teal-150 text-teal-800 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black">3</span>
                    Campaign budget estimate
                  </h3>

                  <div className="bg-teal-950/5 border border-teal-200/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-black text-teal-800 uppercase tracking-wider">
                        <span className="h-2 w-2 rounded-full bg-teal-600 animate-pulse"></span>
                        Planning estimate only
                      </div>
                      <p className="text-[10px] text-slate-500 max-w-sm font-medium">
                        Use this only to plan a future campaign. Actual Meta pricing depends on the recipient country, message category, and your current commercial terms.
                      </p>
                    </div>

                    <div className="bg-white border border-teal-250 p-3 rounded-xl text-center shrink-0 min-w-[120px] shadow-3xs">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Estimated Total</span>
                      <span className="text-base font-black text-teal-750">
                        ${totalCostEstimate.toFixed(3)}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold block">USD (~₹{(totalCostEstimate * 83).toFixed(2)})</span>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-250 p-3.5 rounded-xl flex gap-2.5">
                    <AlertCircle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-850 leading-relaxed font-semibold">
                      <strong>Safe by design:</strong> This screen prepares a campaign draft only. It cannot deliver messages, create Meta charges, or bypass the recipient consent and approved-template checks needed for a real campaign.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Side: Message Preview & Live Dispatch Console (ColSpan 5) */}
              <div className="lg:col-span-5 space-y-6">
                {/* Dynamic Message Preview */}
                <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
                  {/* Phone Header Mockup */}
                  <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 bg-teal-500/10 rounded-full flex items-center justify-center text-teal-400 border border-teal-500/20 font-bold text-xs">
                        {businessName.substring(0, 2).toUpperCase() || 'WP'}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white">{businessName}</h4>
                        <p className="text-[9px] text-teal-400 font-extrabold flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"></span>
                          Verified Business Account
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500">Preview Node</span>
                  </div>

                  {/* Chat Area */}
                  <div className="p-4 bg-slate-950/50 min-h-[160px] flex flex-col justify-end">
                    <div className="max-w-[85%] bg-teal-950/70 border border-teal-850 text-slate-100 p-3 rounded-2xl rounded-tl-none text-[11px] leading-relaxed relative self-start space-y-1.5">
                      <span className="text-[8px] font-black text-teal-400 uppercase tracking-wider block">Target Campaign Output:</span>
                      <div className="whitespace-pre-wrap font-mono text-[10px] text-slate-200">
                        {selectedBroadcastTemplate ? (
                          selectedBroadcastTemplate.text
                            .replace(/\{\{businessName\}\}/g, businessName)
                            .replace(/\{\{senderName\}\}/g, senderName)
                            .replace(/\{\{timings\}\}/g, aiKnowledgeBase.timings || '')
                            .replace(/\{\{treatments\}\}/g, aiKnowledgeBase.treatments || '')
                            .replace(/\{\{doctors\}\}/g, aiKnowledgeBase.doctors || '')
                            .replace(/\{\{reviews\}\}/g, aiKnowledgeBase.reviews || '')
                        ) : (
                          "Please select a template to generate a preview."
                        )}
                      </div>
                      <div className="flex justify-end mt-1 text-[8px] text-slate-400 font-bold">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dispatch Console Panel */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2.5">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Campaign readiness
                  </h3>

                  {/* Action buttons */}
                  <div className="space-y-3">
                    {!isBroadcasting && !broadcastComplete ? (
                      <button
                        type="button"
                        onClick={() => setShowBroadcastConfirmModal(true)}
                        disabled={!selectedBroadcastTemplate || selectedBroadcastContacts.length === 0}
                        className="w-full py-3 bg-teal-650 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-3xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Megaphone className="h-4 w-4" />
                        Review campaign readiness
                      </button>
                    ) : (
                      <div className="space-y-4">
                        {/* Progress indicator */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span className="flex items-center gap-1.5">
                              {isBroadcasting ? (
                                <>
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-teal-650" />
                                  Preparing campaign draft...
                                </>
                              ) : (
                                <span className="text-emerald-600 font-black">✓ Draft ready for review</span>
                              )}
                            </span>
                            <span>{broadcastProgress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div className="bg-teal-500 h-2 rounded-full transition-all duration-300" style={{ width: `${broadcastProgress}%` }} />
                          </div>
                        </div>

                        {/* Console logs output */}
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Campaign preflight notes</span>
                          <div className="bg-slate-900 text-slate-200 font-mono text-[9px] p-3 rounded-xl max-h-[140px] overflow-y-auto space-y-1 text-left leading-relaxed">
                            {broadcastLogs.map((l, index) => (
                              <div key={index} className={l.includes('[SUCCESS]') ? 'text-emerald-400' : l.includes('[ERROR]') ? 'text-rose-400 font-bold' : ''}>
                                {l}
                              </div>
                            ))}
                          </div>
                        </div>

                        {broadcastComplete && (
                          <div className="bg-emerald-50 border border-emerald-250 p-4 rounded-xl text-center space-y-1 animate-fade-in">
                            <div className="text-xl">🎉</div>
                            <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider">Campaign draft ready</h4>
                            <p className="text-[10px] text-slate-500 leading-normal font-semibold">
                              No messages were sent. The list and copy are ready for a later, compliant campaign send once approved Meta templates, consent records, and server-side queueing are enabled.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setBroadcastComplete(false);
                                setBroadcastProgress(0);
                                setBroadcastLogs([]);
                              }}
                              className="mt-2 text-[10px] font-extrabold text-teal-700 hover:text-teal-900 transition-colors underline block mx-auto cursor-pointer"
                            >
                              Prepare another draft
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Gorgeous Confirmation Modal for Bulk Broadcast Billing */}
          {showBroadcastConfirmModal && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-[150] animate-fade-in">
              <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100 p-6 space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="h-10 w-10 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center text-rose-500">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">Campaign preflight</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Review the audience and copy. This action creates a safe draft only.</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs text-slate-700">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-150">
                    <span className="font-bold">Campaign Template:</span>
                    <span className="font-mono text-slate-850 font-extrabold text-[11px]">{selectedBroadcastTemplate?.title || 'None Selected'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-150">
                    <span className="font-bold">Recipient Filter Stage:</span>
                    <span className="font-extrabold text-teal-700 uppercase bg-teal-50 px-2 py-0.5 rounded border border-teal-150 text-[10px]">{broadcastTargetCategory}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-150">
                    <span className="font-bold">Targeted Recipient Count:</span>
                    <span className="font-mono text-slate-850 font-extrabold text-sm">{selectedBroadcastContacts.length} active profiles</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-150">
                    <span className="font-bold">Planning estimate per contact:</span>
                    <span className="font-mono text-slate-500 font-semibold text-[10px]">~$0.008 USD (~₹0.67 INR)</span>
                  </div>
                  <div className="flex justify-between items-center py-2 bg-rose-50/50 border border-rose-100 px-3 rounded-lg">
                    <span className="font-extrabold text-rose-900">Illustrative total:</span>
                    <div className="text-right">
                      <span className="font-mono text-rose-750 font-extrabold text-base block">${totalCostEstimate.toFixed(3)} USD</span>
                      <span className="text-[9px] text-rose-500 font-bold block">~₹{(totalCostEstimate * 83).toFixed(2)} INR</span>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200/80 p-3.5 rounded-xl flex gap-2.5">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-850 leading-relaxed font-semibold">
                    <strong>Safe mode:</strong> This action will not contact anyone. It only records a campaign preflight in this browser so you can review the copy, audience, consent, and approved Meta template before a future server-backed dispatch.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBroadcastConfirmModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 hover:text-slate-900 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStartBroadcast}
                    className="px-5 py-2 bg-teal-650 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-3xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Megaphone className="h-3.5 w-3.5" />
                    Create campaign draft
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

        {/* ==================== SUB-TAB: CHATBOT BUILDER & AI STUDIO ==================== */}
        {activeSubTab === 'studio' && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4 animate-fade-in relative">
            
            {/* FLOATING TOAST NOTIFICATION */}
            {builderToast && (
              <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 animate-bounce text-xs font-bold">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>{builderToast}</span>
              </div>
            )}

            {/* SaaS Studio Sub-Header & Breadcrumb Toolbar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0 shadow-2xs">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Automation / Chatbot Builder</span>
                    <span className="text-slate-300">•</span>
                    <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full flex items-center gap-1 ${
                      botStatus === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${botStatus === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                      {botStatus}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">Last published {lastPublishedTime}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {isEditingBotTitle ? (
                      <input
                        type="text"
                        value={botTitle}
                        onChange={(e) => setBotTitle(e.target.value)}
                        onBlur={() => setIsEditingBotTitle(false)}
                        onKeyDown={(e) => e.key === 'Enter' && setIsEditingBotTitle(false)}
                        autoFocus
                        className="text-base font-extrabold text-slate-900 border-b-2 border-teal-600 focus:outline-none bg-teal-50/50 px-1.5 py-0.5 rounded"
                      />
                    ) : (
                      <h2 
                        onClick={() => setIsEditingBotTitle(true)}
                        className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5 hover:text-teal-700 cursor-pointer group"
                        title="Click to rename bot"
                      >
                        {botTitle}
                        <Pencil className="h-3.5 w-3.5 text-slate-400 group-hover:text-teal-600 transition-colors" />
                      </h2>
                    )}
                    <span className="text-[10px] font-semibold text-slate-400 hidden sm:inline">
                      (Meta Cloud ID: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">bot_sai_v4</code>)
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub-Navigation Tabs & Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Studio Inner Sub-Tabs */}
                <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 overflow-x-auto max-w-full">
                  {[
                    { id: 'builder', label: 'Builder', icon: Workflow },
                    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                  ].map((tab) => {
                    const TIcon = tab.icon;
                    const isActive = studioInnerTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setStudioInnerTab(tab.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                          isActive
                            ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                      >
                        <TIcon className={`h-3.5 w-3.5 ${isActive ? 'text-teal-600' : 'text-slate-500'}`} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div className="h-6 w-px bg-slate-200 hidden xl:block" />

                {/* Right Header Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setShowTestBotModal(true)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 text-teal-600 fill-teal-600" />
                    Test
                  </button>

                  <button
                    onClick={() => setShowPreviewModal(true)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5 text-slate-600" />
                    Preview
                  </button>

                  <button
                    onClick={() => {
                      setBotStatus('Active');
                      setLastPublishedTime('Just now');
                      setBuilderToast('🎉 Chatbot Flow published live to WhatsApp Business!');
                      setTimeout(() => setBuilderToast(null), 3500);
                    }}
                    className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-100" />
                    Publish ▾
                  </button>
                </div>
              </div>
            </div>

            {/* ================= STUDIO VIEW 1: VISUAL FLOW BUILDER (3-COLUMN WORKSPACE) ================= */}
            {studioInnerTab === 'builder' && (
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[620px]">
                
                {/* LEFT COLUMN: Add Nodes Palette (Col-span 2) */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-3.5 space-y-4 flex flex-col justify-between shadow-3xs overflow-y-auto max-h-[700px]">
                  <div className="space-y-3.5">
                    <div className="border-b border-slate-100 pb-2">
                      <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5 text-teal-600" />
                        Add Nodes
                      </h3>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">Click elements to build your chatbot flow.</p>
                    </div>

                    {/* Category 1: Messages */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Messages</span>
                      <div className="grid grid-cols-1 gap-1.5">
                        {[
                          { title: 'Send Message', icon: MessageSquare, bg: 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100', type: 'send_message' },
                          { title: 'Image / Media', icon: ImageIcon, bg: 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100', type: 'image' },
                          { title: 'Template Message', icon: FileText, bg: 'bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100', type: 'template' },
                          { title: 'Question', icon: HelpCircle, bg: 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100', type: 'question' },
                          { title: 'Button / Options', icon: LayoutGrid, bg: 'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100', type: 'action' },
                          { title: 'Quick Reply', icon: Zap, bg: 'bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100', type: 'quick_reply' },
                        ].map((nodeItem, idx) => {
                          const NIcon = nodeItem.icon;
                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                const newNodeId = `node-${Date.now()}`;
                                const newNode: ChatbotNode = {
                                  id: newNodeId,
                                  title: nodeItem.title,
                                  type: nodeItem.type as any,
                                  triggerKeyword: String(chatbotNodes.length + 1),
                                  botResponse: `Sample message text for ${nodeItem.title}. Edit in inspector on right.`,
                                  isRoot: false,
                                  parentNodeId: selectedNodeId || null,
                                  actionType: 'none',
                                  options: nodeItem.type === 'quick_reply' ? ['Option A', 'Option B', 'Option C'] : undefined,
                                };
                                setChatbotNodes([...chatbotNodes, newNode]);
                                setSelectedNodeId(newNodeId);
                                setBuilderToast(`Added "${nodeItem.title}" node!`);
                                setTimeout(() => setBuilderToast(null), 2000);
                              }}
                              className={`p-2 rounded-xl border ${nodeItem.bg} hover:shadow-xs transition-all text-left flex items-center gap-2 text-xs font-bold cursor-pointer group`}
                            >
                              <NIcon className="h-3.5 w-3.5 shrink-0 group-hover:scale-110 transition-transform" />
                              <span className="truncate">{nodeItem.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Category 2: Logic */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Logic & Branching</span>
                      <div className="grid grid-cols-1 gap-1.5">
                        {[
                          { title: 'Condition / If Else', icon: GitBranch, bg: 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100', type: 'condition' },
                          { title: 'Filter User', icon: SlidersHorizontal, bg: 'bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100', type: 'filter' },
                          { title: 'Delay / Wait', icon: Clock, bg: 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200', type: 'delay' },
                        ].map((nodeItem, idx) => {
                          const NIcon = nodeItem.icon;
                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                const newNodeId = `node-${Date.now()}`;
                                const newNode: ChatbotNode = {
                                  id: newNodeId,
                                  title: nodeItem.title,
                                  type: 'condition',
                                  triggerKeyword: String(chatbotNodes.length + 1),
                                  botResponse: `If condition passes, continue to Yes branch. Else go to No branch.`,
                                  isRoot: false,
                                  parentNodeId: selectedNodeId || null,
                                  actionType: 'none'
                                };
                                setChatbotNodes([...chatbotNodes, newNode]);
                                setSelectedNodeId(newNodeId);
                                setBuilderToast(`Added "${nodeItem.title}" logic node!`);
                                setTimeout(() => setBuilderToast(null), 2000);
                              }}
                              className={`p-2 rounded-xl border ${nodeItem.bg} hover:shadow-xs transition-all text-left flex items-center gap-2 text-xs font-bold cursor-pointer group`}
                            >
                              <NIcon className="h-3.5 w-3.5 shrink-0 group-hover:scale-110 transition-transform" />
                              <span className="truncate">{nodeItem.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Category 3: Actions */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Actions</span>
                      <div className="grid grid-cols-1 gap-1.5">
                        {[
                          { title: 'Book Appointment', icon: Calendar, bg: 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100', type: 'calendar' },
                          { title: 'Create Lead', icon: UserPlus, bg: 'bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100', type: 'create_lead' },
                          { title: 'Add Follow-up', icon: ListChecks, bg: 'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100', type: 'none' },
                          { title: 'Send to Human', icon: UserCheck, bg: 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100', type: 'alert_staff' },
                          { title: 'Webhook / API', icon: Code, bg: 'bg-cyan-50 border-cyan-200 text-cyan-800 hover:bg-cyan-100', type: 'webhook' },
                        ].map((nodeItem, idx) => {
                          const NIcon = nodeItem.icon;
                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                const newNodeId = `node-${Date.now()}`;
                                const newNode: ChatbotNode = {
                                  id: newNodeId,
                                  title: nodeItem.title,
                                  type: 'action',
                                  triggerKeyword: String(chatbotNodes.length + 1),
                                  botResponse: `Action node triggered. Executing ${nodeItem.title}...`,
                                  isRoot: false,
                                  parentNodeId: selectedNodeId || null,
                                  actionType: nodeItem.type as any
                                };
                                setChatbotNodes([...chatbotNodes, newNode]);
                                setSelectedNodeId(newNodeId);
                                setBuilderToast(`Added "${nodeItem.title}" action node!`);
                                setTimeout(() => setBuilderToast(null), 2000);
                              }}
                              className={`p-2 rounded-xl border ${nodeItem.bg} hover:shadow-xs transition-all text-left flex items-center gap-2 text-xs font-bold cursor-pointer group`}
                            >
                              <NIcon className="h-3.5 w-3.5 shrink-0 group-hover:scale-110 transition-transform" />
                              <span className="truncate">{nodeItem.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="bg-teal-50/80 border border-teal-200 rounded-xl p-2.5 text-[10px] text-teal-900 leading-snug font-medium">
                    💡 <strong>Quick Tip:</strong> Click any node on canvas to customize options, triggers, and automated actions in Node Inspector.
                  </div>
                </div>

                {/* CENTER COLUMN: Clean Plain Flowchart Canvas (Col-span 7) */}
                <div className="lg:col-span-7 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden min-h-[620px] shadow-3xs">
                  
                  {/* Canvas Header Bar */}
                  <div className="relative z-20 flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
                      <Workflow className="h-4 w-4 text-teal-600" />
                      <span>Flowchart Canvas ({chatbotNodes.length + 1} Nodes)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setBuilderToast("Flow draft saved successfully!");
                          setTimeout(() => setBuilderToast(null), 2500);
                        }}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Save className="h-3.5 w-3.5 text-teal-600" />
                        Save
                      </button>

                      <div className="relative">
                        <button
                          onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {showMenuDropdown && (
                          <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 space-y-1 text-xs">
                            <button
                              onClick={() => {
                                setShowMenuDropdown(false);
                                safeCopyToClipboard(JSON.stringify(chatbotNodes, null, 2));
                                setBuilderToast("Flow JSON exported to clipboard!");
                                setTimeout(() => setBuilderToast(null), 2500);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 font-medium text-slate-700 flex items-center gap-2 cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5 text-teal-600" /> Export JSON
                            </button>
                            <button
                              onClick={() => {
                                setShowMenuDropdown(false);
                                if (window.confirm("Reset canvas to default 12-node patient booking flow?")) {
                                  localStorage.removeItem(`nestam_chatbot_nodes_${selectedIndustry}`);
                                  window.location.reload();
                                }
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 font-medium text-slate-700 flex items-center gap-2 cursor-pointer"
                            >
                              <RefreshCw className="h-3.5 w-3.5 text-amber-600" /> Reset to Defaults
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Canvas Background Grid Matrix */}
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-40"
                    style={{
                      backgroundImage: 'radial-gradient(#cbd5e1 1.2px, transparent 1.2px)',
                      backgroundSize: '18px 18px'
                    }}
                  />

                  {/* Zoom Floating Controls Overlay */}
                  <div className="absolute top-16 right-6 z-20 bg-white/90 backdrop-blur border border-slate-200 rounded-xl p-1 shadow-md flex items-center gap-1 text-xs font-bold text-slate-700">
                    <button 
                      onClick={() => setCanvasZoom(Math.max(50, canvasZoom - 10))}
                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </button>
                    <span className="px-2 font-mono text-[10px] text-teal-700">{canvasZoom}%</span>
                    <button 
                      onClick={() => setCanvasZoom(Math.min(150, canvasZoom + 10))}
                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                    <div className="w-px h-3 bg-slate-200 my-auto" />
                    <button 
                      onClick={() => setCanvasZoom(100)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-[10px]"
                      title="Fit View"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Flowchart Node Canvas Area */}
                  <div 
                    className="relative z-10 flex-1 overflow-x-auto overflow-y-auto p-4 space-y-6 flex flex-col justify-center transition-all duration-200"
                    style={{ transform: `scale(${canvasZoom / 100})`, transformOrigin: 'top left' }}
                  >
                    
                    {/* SVG Bezier Connection Lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-teal-500 stroke-2 fill-none z-0 opacity-60">
                      <path d="M 190 100 C 270 100, 270 220, 350 220" />
                      <path d="M 530 220 C 610 220, 610 120, 690 120" />
                      <path d="M 530 220 C 610 220, 610 320, 690 320" />
                    </svg>

                    {/* Nodes Horizontal Flow Container */}
                    <div className="flex flex-nowrap items-start gap-6 min-w-[850px] pb-8 pt-4">
                      
                      {/* ROOT TRIGGER NODE (Green Card) */}
                      <div className="w-64 bg-white border-2 border-emerald-500 rounded-2xl shadow-sm overflow-hidden shrink-0">
                        <div className="bg-emerald-50 border-b border-emerald-200 px-3.5 py-2.5 flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Play className="h-3.5 w-3.5 text-emerald-600 fill-emerald-600" />
                            Start Trigger
                          </span>
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full uppercase">Root</span>
                        </div>
                        <div className="p-3.5 space-y-2.5">
                          <span className="text-xs font-bold text-slate-900 block">When user sends a message</span>
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[10px] text-slate-700 font-mono">
                            Keywords: HI, Hello, Booking, Price
                          </div>
                          <div className="text-[10px] text-teal-700 font-extrabold flex items-center justify-end gap-1 pt-1">
                            <span>Next Step</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </div>

                      {/* RENDER CHATBOT NODES CARDS FROM STATE */}
                      {chatbotNodes.map((node) => {
                        const isSelected = node.id === selectedNodeId;
                        const isQuickReply = node.type === 'quick_reply' || node.title.toLowerCase().includes('quick reply') || (node.options && node.options.length > 0);
                        const isQuestion = node.type === 'question' || node.title.toLowerCase().includes('question');
                        const isCondition = node.type === 'condition' || node.title.toLowerCase().includes('condition');
                        const isHuman = node.type === 'send_to_human' || node.title.toLowerCase().includes('human');
                        const isEnd = node.type === 'end' || node.title.toLowerCase().includes('end');

                        let headerBg = 'bg-emerald-50 text-emerald-900 border-emerald-200';
                        if (isQuickReply) headerBg = 'bg-purple-50 text-purple-900 border-purple-200';
                        else if (isQuestion) headerBg = 'bg-indigo-50 text-indigo-900 border-indigo-200';
                        else if (isCondition) headerBg = 'bg-amber-50 text-amber-900 border-amber-200';
                        else if (isHuman) headerBg = 'bg-rose-50 text-rose-900 border-rose-200';
                        else if (isEnd) headerBg = 'bg-slate-100 text-slate-800 border-slate-200';

                        return (
                          <div 
                            key={node.id}
                            onClick={() => setSelectedNodeId(node.id)}
                            className={`w-64 bg-white border-2 rounded-2xl shadow-xs overflow-hidden cursor-pointer transition-all shrink-0 hover:shadow-md ${
                              isSelected 
                                ? 'border-teal-600 ring-2 ring-teal-600/30 shadow-md' 
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {/* Card Header */}
                            <div className={`px-3.5 py-2.5 flex items-center justify-between border-b ${headerBg}`}>
                              <span className="text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 truncate">
                                <Bot className="h-3.5 w-3.5 shrink-0" />
                                {node.title}
                              </span>
                              <span className="text-[9px] bg-white/80 text-slate-800 border border-slate-200 font-mono px-1.5 py-0.5 rounded font-bold shrink-0">
                                #{node.triggerKeyword}
                              </span>
                            </div>

                            {/* Card Body */}
                            <div className="p-3.5 space-y-2.5">
                              <p className="text-xs font-semibold text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                                {resolveTemplateText(node.botResponse)}
                              </p>

                              {/* Interactive Option Buttons if present */}
                              {(node.options && node.options.length > 0) ? (
                                <div className="space-y-1.5 pt-1">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Interactive Options:</span>
                                  <div className="flex flex-col gap-1.5">
                                    {node.options.map((opt, oIdx) => (
                                      <div key={oIdx} className="bg-white border border-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl shadow-2xs flex items-center justify-between">
                                        <span>{opt}</span>
                                        <ChevronRight className="h-3 w-3 text-slate-400" />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Branch Choices:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {chatbotNodes
                                      .filter(c => c.parentNodeId === node.id)
                                      .map(c => (
                                        <span key={c.id} className="text-[9px] bg-slate-100 text-teal-800 border border-slate-200 px-2 py-0.5 rounded font-bold">
                                          [{c.triggerKeyword}] {c.title}
                                        </span>
                                      ))}
                                    {chatbotNodes.filter(c => c.parentNodeId === node.id).length === 0 && (
                                      <span className="text-[9px] text-slate-400 italic">No child branches attached yet.</span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Action Badges */}
                              {node.actionType && node.actionType !== 'none' && (
                                <div className="pt-1">
                                  <span className="text-[9px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                                    ⚡ Action: {node.actionType}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Card Footer Connector */}
                            <div className="bg-slate-50 border-t border-slate-100 px-3.5 py-1.5 text-[9px] font-bold text-slate-500 flex items-center justify-between">
                              <span className="text-teal-700 font-extrabold">{isSelected ? '✓ Active Node' : 'Click to Edit'}</span>
                              <span className="text-teal-600 font-extrabold flex items-center gap-0.5">
                                Next Step <ArrowRight className="h-2.5 w-2.5" />
                              </span>
                            </div>
                          </div>
                        );
                      })}

                    </div>
                  </div>

                  {/* BOTTOM CANVAS METRICS STATS BAR */}
                  <div className="relative z-20 bg-white border border-slate-200 rounded-xl px-4 py-2.5 grid grid-cols-2 sm:grid-cols-6 gap-3 text-center shadow-2xs">
                    <div className="border-r border-slate-100 last:border-0">
                      <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Nodes</span>
                      <span className="text-sm font-black text-slate-900">{chatbotNodes.length + 1}</span>
                    </div>
                    <div className="border-r border-slate-100 last:border-0">
                      <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">User Inputs</span>
                      <span className="text-sm font-black text-teal-700">4 Slots</span>
                    </div>
                    <div className="border-r border-slate-100 last:border-0">
                      <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Paths</span>
                      <span className="text-sm font-black text-indigo-700">5 Branches</span>
                    </div>
                    <div className="border-r border-slate-100 last:border-0">
                      <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Completion</span>
                      <span className="text-sm font-black text-emerald-700">68%</span>
                    </div>
                    <div className="border-r border-slate-100 last:border-0">
                      <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Active Users</span>
                      <span className="text-sm font-black text-amber-700">1,248</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Avg Response</span>
                      <span className="text-sm font-black text-cyan-700">1.2s</span>
                    </div>
                  </div>

                </div>

                {/* RIGHT COLUMN: Node Inspector / Configurator Panel (Col-span 3) */}
                <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-4 space-y-4 flex flex-col justify-between shadow-3xs overflow-y-auto max-h-[700px]">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Sliders className="h-4 w-4 text-teal-600" />
                        <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Node Inspector</h3>
                      </div>
                      {selectedNodeId && (
                        <button
                          onClick={() => {
                            if (chatbotNodes.length <= 1) {
                              alert("Cannot delete the root node.");
                              return;
                            }
                            const updated = chatbotNodes.filter(n => n.id !== selectedNodeId);
                            setChatbotNodes(updated);
                            if (updated.length > 0) setSelectedNodeId(updated[0].id);
                            setBuilderToast("Node deleted.");
                            setTimeout(() => setBuilderToast(null), 2000);
                          }}
                          className="text-[10px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      )}
                    </div>

                    {/* Node Configurator Inputs */}
                    <div className="space-y-3.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Branch Name</label>
                        <input
                          type="text"
                          value={editNodeTitle}
                          onChange={(e) => setEditNodeTitle(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-teal-600 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Trigger Choice Key</label>
                        <input
                          type="text"
                          value={editNodeKeyword}
                          onChange={(e) => setEditNodeKeyword(e.target.value)}
                          placeholder="e.g. 1, BOOK, Hi"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-teal-600 rounded-xl text-xs font-semibold text-teal-800 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Parent Branch Node</label>
                        <select
                          value={editNodeParentId || ''}
                          onChange={(e) => setEditNodeParentId(e.target.value || null)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-teal-600 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="">None (Welcome Root Node)</option>
                          {chatbotNodes
                            .filter(n => n.id !== selectedNodeId)
                            .map(n => (
                              <option key={n.id} value={n.id}>{n.title} (Reply "{n.triggerKeyword}")</option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Automated Action Trigger</label>
                        <select
                          value={editNodeAction}
                          onChange={(e) => setEditNodeAction(e.target.value as any)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-teal-600 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="none">No Action (Simple Text Response)</option>
                          <option value="show_prices">Load {term.treatmentLabel} Pricing List</option>
                          <option value="calendar">Trigger Calendar Appointment Follow-up Form</option>
                          <option value="alert_staff">Escalate and Alert Desk Staff</option>
                          <option value="webhook">Execute Webhook / External API</option>
                          <option value="create_lead">Create Lead Record in CRM</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Interactive Message Body</label>
                        <textarea
                          rows={3}
                          value={editNodeResponse}
                          onChange={(e) => setEditNodeResponse(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-teal-600 rounded-xl text-xs font-sans text-slate-800 focus:outline-none leading-relaxed"
                        />
                      </div>

                      {/* Options List for Quick Reply */}
                      <div className="space-y-2 pt-1 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Quick Reply Options</label>
                          <button
                            type="button"
                            onClick={() => setEditNodeOptions([...editNodeOptions, `Option ${editNodeOptions.length + 1}`])}
                            className="text-[9px] font-extrabold text-teal-600 hover:text-teal-800 flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" /> Add Option
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {editNodeOptions.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-1.5">
                              <GripVertical className="h-3.5 w-3.5 text-slate-400 shrink-0 cursor-grab" />
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const updated = [...editNodeOptions];
                                  updated[oIdx] = e.target.value;
                                  setEditNodeOptions(updated);
                                }}
                                className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-600"
                              />
                              <button
                                type="button"
                                onClick={() => setEditNodeOptions(editNodeOptions.filter((_, i) => i !== oIdx))}
                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* User Capture Switch & Variable Select */}
                      <div className="space-y-2 pt-1 border-t border-slate-100">
                        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-800">Save User Response</span>
                          <button
                            type="button"
                            onClick={() => setSaveUserResponse(!saveUserResponse)}
                            className={`w-9 h-5 rounded-full p-0.5 transition-all cursor-pointer ${
                              saveUserResponse ? 'bg-teal-600 flex justify-end' : 'bg-slate-300 flex justify-start'
                            }`}
                          >
                            <div className="w-4 h-4 bg-white rounded-full shadow-xs" />
                          </button>
                        </div>

                        {saveUserResponse && (
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Capture As</label>
                            <select
                              value={captureAsIntent}
                              onChange={(e) => setCaptureAsIntent(e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-teal-600 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                            >
                              <option value="Intent">Intent Choice</option>
                              <option value="Patient Name">Patient Name</option>
                              <option value="Appointment Date">Appointment Date</option>
                              <option value="Slot Choice">Slot Choice</option>
                              <option value="Phone Number">Phone Number</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Next Step Dropdown */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">On Option Click</label>
                        <select
                          value={nextStepOption}
                          onChange={(e) => setNextStepOption(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-teal-600 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="Continue to next step">Continue to next step</option>
                          <option value="Branch to specific node">Branch to specific node</option>
                          <option value="End conversation">End conversation</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <button
                      onClick={handleSaveChatbotNode}
                      className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Save className="h-4 w-4 text-teal-100" />
                      Save Node Changes
                    </button>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 text-left">
                      <span className="text-[10px] font-extrabold text-slate-800 block flex items-center gap-1">
                        <HelpCircle className="h-3.5 w-3.5 text-teal-600" />
                        Need Help?
                      </span>
                      <p className="text-[9px] text-slate-500 leading-normal">
                        Learn how to build effective chatbots for patient appointment bookings and WhatsApp automation.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ================= STUDIO VIEW 2: KEYWORDS & AI RULES (COMBINED SUB-SECTION) ================= */}
            {studioInnerTab === 'rules' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
                
                {/* PART A: Keyword Auto-Triggers (Col-span 6) */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-3xs">
                    <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Zap className="h-4 w-4 text-teal-600" />
                          Keyword Auto-Trigger Rules
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Configure deterministic keyword auto-replies.</p>
                      </div>
                      <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-extrabold rounded-md">
                        {automationRules.length} Active Rules
                      </span>
                    </div>

                    {/* Quick Add Rule Form */}
                    <form onSubmit={handleCreateRule} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">Add New Keyword Rule</span>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          value={ruleName}
                          onChange={(e) => setRuleName(e.target.value)}
                          placeholder="Rule Name (e.g. Price Query)"
                          className="px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
                        />
                        <input
                          type="text"
                          required
                          value={ruleKeywords}
                          onChange={(e) => setRuleKeywords(e.target.value)}
                          placeholder="Keywords (comma separated)"
                          className="px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-xl text-xs font-semibold text-indigo-700 focus:outline-none"
                        />
                      </div>
                      <textarea
                        required
                        rows={2}
                        value={ruleActionValue}
                        onChange={(e) => setRuleActionValue(e.target.value)}
                        placeholder="Instant automated reply message..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-xl text-xs font-sans text-slate-800 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Arm Keyword Rule
                      </button>
                    </form>

                    {/* Armed Rules List */}
                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                      {automationRules.map((rule) => (
                        <div key={rule.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition-all">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-slate-800">{rule.title}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleRule(rule.id)}
                                className={`px-2 py-0.5 rounded text-[9px] font-extrabold cursor-pointer ${
                                  rule.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {rule.active ? 'ACTIVE' : 'PAUSED'}
                              </button>
                              <button
                                onClick={() => handleDeleteRule(rule.id)}
                                className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {rule.keywords.map((kw, kIdx) => (
                              <span key={kIdx} className="px-2 py-0.5 bg-white border border-slate-200 text-indigo-700 text-[10px] font-mono font-bold rounded">
                                {kw}
                              </span>
                            ))}
                          </div>
                          <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-150 line-clamp-2 leading-relaxed">
                            {resolveTemplateText(rule.responseMessage)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* PART B: Gemini AI Auto-Responder Agent (Col-span 6) */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-3xs">
                    <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4 text-indigo-600" />
                          Gemini AI Auto-Responder Agent
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Generative AI assistant powered by Google Gemini.</p>
                      </div>
                      <button
                        onClick={() => setAiAgentActive(!aiAgentActive)}
                        className={`w-11 h-6 rounded-full p-1 transition-all cursor-pointer ${
                          aiAgentActive ? 'bg-indigo-600 flex justify-end' : 'bg-slate-200 flex justify-start'
                        }`}
                      >
                        <div className="w-4 h-4 bg-white rounded-full shadow-xs" />
                      </button>
                    </div>

                    {/* Model Core Selector */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">Selected AI Agent Model Core</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'gemini', name: 'Gemini 3.5 Core', tag: 'Standard', desc: 'Google Flash engine' },
                          { id: 'gemini-lite', name: 'Gemini 3.1 Flash-Lite', tag: 'Cheaper', desc: 'Fast retrieval' },
                          { id: 'chatgpt', name: 'ChatGPT-4o', tag: 'Premium', desc: 'Deep reasoning' },
                          { id: 'claude-haiku', name: 'Claude 3.5 Haiku', tag: 'Lightweight', desc: 'Empathetic tone' },
                        ].map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setAiAgentType(m.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              aiAgentType === m.id
                                ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-xs font-bold">{m.name}</span>
                              <span className="px-1.5 py-0.2 bg-teal-500 text-white text-[8px] font-black rounded uppercase">{m.tag}</span>
                            </div>
                            <span className={`text-[9px] mt-1 ${aiAgentType === m.id ? 'text-slate-300' : 'text-slate-400'}`}>{m.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Loaded AI Knowledge Base */}
                    <div className="bg-indigo-50/60 border border-indigo-150 rounded-xl p-3.5 space-y-2">
                      <span className="text-[10px] font-extrabold text-indigo-950 uppercase tracking-wider block flex items-center gap-1">
                        <Server className="h-3.5 w-3.5 text-indigo-600" />
                        Knowledge Base ({selectedIndustry.toUpperCase()})
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-700 font-medium">
                        <div className="bg-white p-2 rounded-lg border border-indigo-100">
                          <span className="font-bold text-slate-400 uppercase text-[8px] block">Timings:</span>
                          <span className="line-clamp-1">{aiKnowledgeBase.timings || '9 AM - 8 PM'}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-indigo-100">
                          <span className="font-bold text-slate-400 uppercase text-[8px] block">Doctors:</span>
                          <span className="line-clamp-1">{aiKnowledgeBase.doctors || 'Certified team'}</span>
                        </div>
                      </div>
                    </div>

                    {/* AI Sandbox Test */}
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">Test AI Auto-Response</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={aiAgentQuery}
                          onChange={(e) => setAiAgentQuery(e.target.value)}
                          placeholder="Type patient query (e.g. What are the appointment timings?)..."
                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={handleSimulateAiAgent}
                          disabled={aiAgentLoading}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                        >
                          {aiAgentLoading ? 'Thinking...' : 'Inquire'}
                        </button>
                      </div>
                      {aiAgentResponse && (
                        <div className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs leading-relaxed font-sans mt-2">
                          {aiAgentResponse}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ================= STUDIO VIEW 3: BOT PERFORMANCE ANALYTICS ================= */}
            {studioInnerTab === 'analytics' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 animate-fade-in shadow-3xs">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-amber-600" />
                    Chatbot Performance & Conversion Funnel
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Real-time statistics on automated conversation flows and appointment completions.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Sessions</span>
                    <span className="text-xl font-black text-slate-900">1,842</span>
                    <span className="text-[9px] text-emerald-600 font-bold block">↑ +14% this week</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Flow Completions</span>
                    <span className="text-xl font-black text-teal-700">1,250</span>
                    <span className="text-[9px] text-teal-600 font-bold block">68% completion rate</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Human Escalations</span>
                    <span className="text-xl font-black text-amber-700">142</span>
                    <span className="text-[9px] text-amber-600 font-bold block">7.7% drop-off rate</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Appointments Booked</span>
                    <span className="text-xl font-black text-emerald-700">328</span>
                    <span className="text-[9px] text-emerald-600 font-bold block">₹2,45,000 Pipeline</span>
                  </div>
                </div>

                {/* Conversion Funnel Bar Visual */}
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold text-slate-800 block">Conversation Funnel Step Breakdown</span>
                  <div className="space-y-2">
                    {[
                      { step: 'Greeting & Menu Delivered', count: '1,842', pct: '100%', bg: 'bg-teal-600' },
                      { step: 'Service / Booking Option Selected', count: '1,520', pct: '82%', bg: 'bg-teal-500' },
                      { step: 'Date & Slot Chosen', count: '1,310', pct: '71%', bg: 'bg-indigo-500' },
                      { step: 'Appointment Confirmed', count: '1,250', pct: '68%', bg: 'bg-emerald-500' },
                    ].map((f, fIdx) => (
                      <div key={fIdx} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                          <span>{f.step}</span>
                          <span className="font-mono">{f.count} ({f.pct})</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${f.bg} rounded-full transition-all duration-500`} style={{ width: f.pct }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* INTERACTIVE TEST BOT MODAL / DRAWER */}
            {showTestBotModal && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl space-y-0">
                  {/* Phone Top Bar */}
                  <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                        {businessName.charAt(0) || 'S'}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{businessName}</h4>
                        <span className="text-[9px] text-emerald-400 font-semibold block">● Official WhatsApp Business</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowTestBotModal(false)}
                      className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Chat Area */}
                  <div className="p-4 h-[320px] overflow-y-auto space-y-3 bg-slate-950/80">
                    {simulatorChat.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                          msg.sender === 'bot'
                            ? 'bg-slate-800 text-slate-100 self-start rounded-tl-none font-medium'
                            : 'bg-emerald-600 text-white self-end rounded-tr-none font-semibold ml-auto'
                        }`}
                      >
                        {msg.text.split('\n').map((line, lIdx) => (
                          <div key={lIdx}>{line}</div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Quick Choices */}
                  <div className="p-3 bg-slate-900 border-t border-slate-800 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Click Choice:</span>
                      {chatbotNodes
                        .filter(n => n.parentNodeId === simulatorCurrentNodeId)
                        .map(n => (
                          <button
                            key={n.id}
                            onClick={() => handleSendSimulatorMessage(n.triggerKeyword)}
                            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-300 px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            Choice "{n.triggerKeyword}" ({n.title})
                          </button>
                        ))}
                    </div>

                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendSimulatorMessage(simulatorInput);
                      }}
                      className="flex gap-2 pt-1"
                    >
                      <input
                        type="text"
                        value={simulatorInput}
                        onChange={(e) => setSimulatorInput(e.target.value)}
                        placeholder="Type reply option (e.g. 1, 2, Booking)..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Send
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ==================== SUB-TAB 4: PAIRING & META API CONFIGURATION (MIGRATED TO SETTINGS) ==================== */}







        {/* ==================== SUB-TAB: AI AUTO-RESPONDER AGENT ==================== */}
        {activeSubTab === 'ai_agent' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
            
            {/* Left Column: AI Mode Configuration (Col-span 5) */}
            <div className="lg:col-span-5 space-y-4">
              
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-5">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-indigo-600 animate-pulse" />
                    AI Auto-Responder Settings
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Toggle active AI models and configure automated co-pilot replies.</p>
                </div>

                {/* Main Toggle */}
                <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-150">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 block">Auto-Respond to All Incoming Messages</span>
                    <span className="text-[10px] text-slate-400 font-medium block">
                      {aiAgentActive ? 'Enabled - AI agent automatically answers all new incoming WhatsApp queries' : 'Disabled - Manual or chatbot-only response'}
                    </span>
                  </div>
                  <button
                    onClick={() => setAiAgentActive(!aiAgentActive)}
                    className={`w-12 h-6 rounded-full p-1 transition-all shrink-0 ${
                      aiAgentActive ? 'bg-indigo-600 flex justify-end' : 'bg-slate-200 flex justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                  </button>
                </div>

                 {/* AI Model Selection */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Selected AI Agent Core</label>
                  <div className="grid grid-cols-1 gap-2">
                    {/* Gemini 3.5 Core */}
                    <button
                      onClick={() => setAiAgentType('gemini')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-18 ${
                        aiAgentType === 'gemini'
                          ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-extrabold block">Gemini 3.5 Core (Flash)</span>
                        <span className="px-1.5 py-0.2 bg-teal-500 text-white text-[8px] font-black rounded uppercase">Standard</span>
                      </div>
                      <span className={`text-[9px] font-medium leading-tight ${aiAgentType === 'gemini' ? 'text-slate-300' : 'text-slate-400'}`}>
                        Google's professional AI engine with native Telugu-English support.
                      </span>
                    </button>

                    {/* Gemini 3.1 Flash-Lite */}
                    <button
                      onClick={() => setAiAgentType('gemini-lite')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-18 ${
                        aiAgentType === 'gemini-lite'
                          ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-extrabold block">Gemini 3.1 Flash-Lite</span>
                        <span className="px-1.5 py-0.2 bg-indigo-500 text-white text-[8px] font-black rounded uppercase">Cheaper</span>
                      </div>
                      <span className={`text-[9px] font-medium leading-tight ${aiAgentType === 'gemini-lite' ? 'text-slate-300' : 'text-slate-400'}`}>
                        High-speed retrieval optimizer. Perfect for high-frequency low-latency replies.
                      </span>
                    </button>

                    {/* ChatGPT 4o */}
                    <button
                      onClick={() => setAiAgentType('chatgpt')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-18 ${
                        aiAgentType === 'chatgpt'
                          ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-extrabold block">ChatGPT-4o Agent</span>
                        <span className="px-1.5 py-0.2 bg-slate-500 text-white text-[8px] font-black rounded uppercase">Premium</span>
                      </div>
                      <span className={`text-[9px] font-medium leading-tight ${aiAgentType === 'chatgpt' ? 'text-slate-300' : 'text-slate-400'}`}>
                        High-reasoning model optimized for complex listings & deep step-by-step guides.
                      </span>
                    </button>

                    {/* ChatGPT-4o-mini */}
                    <button
                      onClick={() => setAiAgentType('chatgpt-mini')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-18 ${
                        aiAgentType === 'chatgpt-mini'
                          ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-extrabold block">ChatGPT-4o-Mini</span>
                        <span className="px-1.5 py-0.2 bg-emerald-500 text-white text-[8px] font-black rounded uppercase">Ultra Cheap</span>
                      </div>
                      <span className={`text-[9px] font-medium leading-tight ${aiAgentType === 'chatgpt-mini' ? 'text-slate-300' : 'text-slate-400'}`}>
                        Extremely fast, cheap, and precise key-value lookup responder.
                      </span>
                    </button>

                    {/* Claude 3.5 Haiku */}
                    <button
                      onClick={() => setAiAgentType('claude-haiku')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-18 ${
                        aiAgentType === 'claude-haiku'
                          ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-extrabold block">Claude 3.5 Haiku</span>
                        <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[8px] font-black rounded uppercase">Lightweight</span>
                      </div>
                      <span className={`text-[9px] font-medium leading-tight ${aiAgentType === 'claude-haiku' ? 'text-slate-300' : 'text-slate-400'}`}>
                        Lightweight Claude agent, perfect for empathetic client-focused tone matching.
                      </span>
                    </button>
                  </div>
                </div>

                {/* Embedded Knowledge Base Summary */}
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4.5 space-y-3">
                  <h4 className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
                    <Server className="h-3.5 w-3.5 text-indigo-600" />
                    Loaded AI Knowledge Base ({selectedIndustry.toUpperCase()})
                  </h4>
                  <div className="space-y-2 text-[10px] font-medium text-slate-650">
                    <div>
                      <span className="font-bold text-slate-500 uppercase block text-[8px] tracking-wider">Timings:</span>
                      <p className="line-clamp-2 text-slate-800">{aiKnowledgeBase.timings || '9 AM - 8 PM'}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 uppercase block text-[8px] tracking-wider">Expertise & Team:</span>
                      <p className="line-clamp-2 text-slate-800">{aiKnowledgeBase.doctors || 'Our certified team associates'}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 uppercase block text-[8px] tracking-wider">Key Procedures & Costing:</span>
                      <p className="line-clamp-2 text-slate-800">{aiKnowledgeBase.treatments || 'General consultation & services planning'}</p>
                    </div>
                  </div>
                </div>

                {/* --- CUSTOM SYSTEM PROMPTING --- */}
                <div className="bg-white p-4.5 rounded-xl border border-slate-200 space-y-3.5">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Custom System Prompt</span>
                    <span className="text-[9px] text-slate-455 font-medium leading-relaxed block">
                      Tune the core persona and reply rules of the AI. Leave blank to use the highly optimized clinic default.
                    </span>
                  </div>
                  
                  <textarea
                    value={customSystemPrompt}
                    onChange={(e) => setCustomSystemPrompt(e.target.value)}
                    placeholder="e.g. You are a super friendly Telugu dental front desk helper. Keep answers short, add friendly Telugu words like 'Namaste' and 'Garu'..."
                    rows={4}
                    className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs focus:outline-none focus:bg-white transition-all font-medium text-slate-700"
                  />
                  
                  {customSystemPrompt && (
                    <button
                      onClick={() => {
                        if (window.confirm("Reset prompt instructions to the clinic default?")) {
                          setCustomSystemPrompt('');
                        }
                      }}
                      className="text-[9px] font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer transition-all"
                    >
                      🔄 Reset to Default Template
                    </button>
                  )}
                </div>

                {/* --- CUSTOM API KEYS & SECRETS --- */}
                <div className="bg-white p-4.5 rounded-xl border border-slate-200 space-y-3.5">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dedicated API Secrets</span>
                    <span className="text-[9px] text-slate-455 font-medium leading-relaxed block">
                      Input your Google/OpenAI key to use dedicated quotas. Secrets are secured in browser local vaults.
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">Model Core Secret Token</label>
                    <div className="relative">
                      <input
                        type="password"
                        value={customApiKey}
                        onChange={(e) => setCustomApiKey(e.target.value)}
                        placeholder="Enter custom API Key / Secret Token..."
                        className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs focus:outline-none focus:bg-white transition-all font-mono text-slate-700"
                      />
                      {customApiKey && (
                        <button
                          onClick={() => setCustomApiKey('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 hover:text-rose-500"
                          title="Clear API Key"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-[9px] font-bold text-teal-700 bg-teal-50 border border-teal-150 rounded-lg p-2.5 leading-relaxed">
                    ℹ️ Standard credentials active. Your custom key is optional and will override the system defaults instantly.
                  </div>
                </div>

              </div>

            </div>

            {/* Right Column: AI Response Test Sandbox (Col-span 7) */}
            <div className="lg:col-span-7 space-y-4">
              
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                    <Sparkles className="h-4.5 w-4.5 text-teal-600 animate-spin" style={{ animationDuration: '3s' }} />
                    Live AI Auto-Response Sandbox
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Send a test {term.patientLabel.toLowerCase()} query to test how the selected AI agent automatically processes information and drafts a personalized response.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">{term.patientLabel} Incoming Message</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={aiAgentQuery}
                        onChange={(e) => setAiAgentQuery(e.target.value)}
                        placeholder={
                          selectedIndustry === 'dental' 
                            ? "e.g. What is the cost of teeth whitening and when can I consult?"
                            : selectedIndustry === 'gym'
                            ? "e.g. What are the personal training membership fees and operating hours?"
                            : selectedIndustry === 'realestate'
                            ? "e.g. What is the pricing for 3 BHK apartments and when can I schedule a site tour?"
                            : selectedIndustry === 'cosmetic'
                            ? "e.g. What is the price of anti-aging laser therapy and when are you open?"
                            : "e.g. What are the pricing options and timings?"
                        }
                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs focus:outline-none focus:bg-white transition-all shadow-inner font-medium text-slate-700"
                      />
                      <button
                        onClick={handleSimulateAiAgent}
                        disabled={aiAgentLoading}
                        className="bg-slate-900 hover:bg-slate-850 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shrink-0 flex items-center gap-1.5"
                      >
                        {aiAgentLoading ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin text-teal-400" />
                            Thinking...
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5 text-teal-400" />
                            Inquire
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Log Console */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">AI Processing Terminal:</span>
                    <div className="bg-slate-950 text-emerald-400 font-mono text-[10px] p-4 rounded-xl border border-slate-800 max-h-[110px] overflow-y-auto space-y-1.5 leading-relaxed shadow-inner">
                      {aiAgentLogs.map((log, idx) => (
                        <div key={idx} className="flex gap-1.5">
                          <span className="text-slate-500 shrink-0">&gt;</span>
                          <span>{log}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Generated WhatsApp Draft Output */}
                  {aiAgentResponse && (
                    <div className="space-y-3 border-t border-slate-100 pt-4 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Draft Response (Auto-Generated):</span>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[8px] font-extrabold rounded-md uppercase tracking-wider animate-pulse">
                          Active Dispatch ready
                        </span>
                      </div>

                      <div className="bg-slate-900 text-slate-100 p-4.5 rounded-2xl border border-slate-800 shadow-md relative leading-relaxed text-xs">
                        {aiAgentResponse.split('\n').map((line, idx) => (
                          <div key={idx} className="min-h-[14px]">{line}</div>
                        ))}
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                          <button
                            onClick={() => {
                              safeCopyToClipboard(aiAgentResponse);
                              alert("Draft message copied to clipboard!");
                            }}
                            className="p-1.5 bg-slate-850 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all border border-slate-800"
                            title="Copy Response"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Structured Scheduling intent card if detected */}
                      {aiAgentScheduleSuggestion?.shouldSchedule && (
                        <div className="bg-emerald-50 border border-emerald-150 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4 text-emerald-600" />
                              <span className="text-xs font-extrabold text-emerald-950">AI Extraction: Booking Intent Detected</span>
                            </div>
                            <p className="text-[10px] text-emerald-800 leading-relaxed max-w-md font-medium">
                              Structured appointment info resolved: <strong className="text-slate-900">"{aiAgentScheduleSuggestion.summary}"</strong> for <strong className="text-slate-900">{aiAgentScheduleSuggestion.date}</strong> at <strong className="text-slate-900">{aiAgentScheduleSuggestion.time}</strong>.
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              alert(`Appointment request saved to calendar list successfully! Slot secured: ${aiAgentScheduleSuggestion.date} at ${aiAgentScheduleSuggestion.time}.`);
                            }}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-extrabold transition-all cursor-pointer whitespace-nowrap"
                          >
                            Lock Appointment Slot
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>

            </div>

          </div>
        )}

        {/* ==================== SUB-TAB 4: PAIRING & META API CONFIGURATION (MIGRATED TO SETTINGS) ==================== */}
        {false && (
          <div className="space-y-6 animate-fade-in">
            {spreadsheetId && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🗄️</span>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-emerald-950">Linked with CRM Spreadsheet Database</h4>
                    <p className="text-[11px] text-emerald-850 leading-relaxed max-w-xl font-medium">
                      Your WhatsApp Web Pairing and Meta Cloud API configurations are stored securely in your connected Google Sheet database (<strong>CRM_KnowledgeBase</strong> tab) for multi-device synchronization.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onSyncSettings}
                  disabled={isSyncing}
                  className="px-4.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer self-start sm:self-center shrink-0"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Save & Sync Settings Now
                    </>
                  )}
                </button>
              </div>
            )}
            {!spreadsheetId && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">💡</span>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-800">Local Cache Mode Active</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed max-w-xl font-medium">
                      Your WhatsApp Web pairing and API configurations are saved in your local browser storage. Link your Google Workspace account in the <strong>Settings</strong> tab to synchronize configuration data across devices using Google Sheets!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onSyncSettings}
                  className="px-4.5 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer self-start sm:self-center shrink-0"
                >
                  <Save className="h-3.5 w-3.5 text-teal-400" />
                  Save Settings Locally
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Box: QR Code WhatsApp Web pairing */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6">
              <div className="border-b border-slate-200 pb-3 flex items-center gap-2">
                <Smartphone className="h-4.5 w-4.5 text-teal-600 animate-bounce" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  WhatsApp Web Device Pairing
                </h3>
              </div>

              {connectionStatus === 'disconnected' && (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative">
                    <QrCode className="h-40 w-40 text-slate-800" />
                    <div className="absolute inset-0 bg-slate-100/10 backdrop-blur-3xs flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-1 rounded">PAIR PHONE</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">Pair via QR Code</h4>
                    <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                      Open WhatsApp on your phone, go to Linked Devices, and scan this QR code to establish a WebSocket bridge!
                    </p>
                  </div>
                  <button
                    onClick={handleSimulateConnection}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow"
                  >
                    Pair Device via QR Code
                  </button>
                </div>
              )}

              {connectionStatus === 'connecting' && (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                  <div className="relative flex items-center justify-center">
                    <RefreshCw className="h-10 w-10 text-teal-600 animate-spin" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">Authenticating Phone Connection...</h4>
                    <p className="text-[11px] font-mono text-slate-400 mt-1">Connecting WebSocket session [{simulatedProgress}%]</p>
                  </div>
                  <div className="w-48 bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-teal-500 h-full transition-all duration-300" style={{ width: `${simulatedProgress}%` }}></div>
                  </div>
                </div>
              )}

              {connectionStatus === 'connected' && deviceDetails && (
                <div className="space-y-4">
                  <div className="bg-white border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                        <Smartphone className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-emerald-950 text-xs">{deviceDetails.phoneName}</h4>
                        <p className="text-[10px] text-emerald-600 font-mono mt-0.5">{deviceDetails.phoneNumber}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[9px] font-extrabold rounded-md uppercase">
                      Connected
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-650">
                    <div className="bg-white p-3 rounded-xl border border-slate-150">
                      <span className="text-[9px] text-slate-400 font-bold block mb-1 uppercase">Battery Level:</span>
                      <span className="font-extrabold text-slate-800">{deviceDetails.battery}% charged</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-150">
                      <span className="text-[9px] text-slate-400 font-bold block mb-1 uppercase">Signal Strength:</span>
                      <span className="font-extrabold text-slate-800 capitalize">{deviceDetails.signal}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleSimulateConnection}
                    className="w-full py-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Unpair & Disconnect Phone Link
                  </button>
                </div>
              )}

              {/* Logs box */}
              <div className="space-y-1.5">
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Socket Terminal Logs:</span>
                <div className="bg-slate-950 text-emerald-400 font-mono text-[10px] p-4 rounded-xl border border-slate-800 max-h-[140px] overflow-y-auto space-y-1 leading-relaxed">
                  {connectionLogs.map((log, idx) => (
                    <div key={idx}>{log}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Box: Meta Cloud API settings panel */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6">
              <div className="border-b border-slate-200 pb-3 flex items-center gap-2">
                <Globe className="h-4.5 w-4.5 text-teal-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Meta WhatsApp Cloud API Settings
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">WhatsApp Phone Number ID</label>
                  <input
                    type="text"
                    value={metaPhoneNumberId}
                    onChange={(e) => setMetaPhoneNumberId(e.target.value)}
                    placeholder="e.g. 106555198032"
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-xl text-xs focus:outline-none font-mono text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Meta Permanent Access Token</label>
                  <input
                    type="password"
                    value={metaAccessToken}
                    onChange={(e) => setMetaAccessToken(e.target.value)}
                    placeholder="EAAW..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-xl text-xs focus:outline-none font-mono text-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">WABA ID</label>
                    <input
                      type="text"
                      value={metaWabaId}
                      onChange={(e) => setMetaWabaId(e.target.value)}
                      placeholder="e.g. 102444052671"
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-xl text-xs focus:outline-none font-mono text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Webhook Verify Token</label>
                    <input
                      type="text"
                      value={metaVerifyToken}
                      onChange={(e) => setMetaVerifyToken(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-xl text-xs focus:outline-none font-mono text-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* API Send Testing block */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Play className="h-3.5 w-3.5 text-teal-600" />
                  Live API Quick Send Test
                </h4>

                <form onSubmit={handleSendMetaTest} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Target Phone (with country code)</label>
                      <input
                        type="text"
                        required
                        value={metaTestPhone}
                        onChange={(e) => setMetaTestPhone(e.target.value)}
                        placeholder="e.g. +919440552671"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 focus:outline-none focus:border-teal-500 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Message Body Text</label>
                      <input
                        type="text"
                        required
                        value={metaTestMessage}
                        onChange={(e) => setMetaTestMessage(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 focus:outline-none focus:border-teal-500 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingTest}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isSendingTest ? "Dispatching API..." : "Dispatch Official API Message"}
                  </button>
                </form>

                {testResult && (
                  <div className={`p-3 rounded-lg text-xs border font-medium ${
                    testResult.success 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                      : 'bg-red-50 border-red-100 text-red-800 font-mono'
                  }`}>
                    {testResult.message}
                  </div>
                )}
              </div>
            </div>

            {/* Full-width Section: Webhook Setup Credentials & Payload Event Tester */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mt-8 space-y-6">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="h-4.5 w-4.5 text-teal-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Meta Cloud API Webhook Integration Hub
                  </h3>
                </div>
                <span className="flex items-center gap-1 text-[9px] font-bold bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full uppercase animate-pulse">
                  <span className="h-1.5 w-1.5 bg-teal-500 rounded-full" />
                  Live Webhook active
                </span>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                Webhooks allow Meta to instantly deliver incoming patient WhatsApp messages to this CRM in real-time. 
                Configure your Meta Developer Portal with the credentials below, or send a test webhook payload directly!
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Webhook Connection Details */}
                <div className="bg-white rounded-xl border border-slate-150 p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <Key className="h-3.5 w-3.5 text-teal-600" />
                    1. Meta Webhook Configuration Details
                  </h4>

                  <div className="space-y-3.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Callback URL</label>
                        <button
                          type="button"
                          onClick={() => {
                            safeCopyToClipboard(window.location.origin + '/api/whatsapp/webhook');
                            setWebhookCopied(true);
                            setTimeout(() => setWebhookCopied(false), 2000);
                          }}
                          className="text-[9px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-0.5 cursor-pointer"
                        >
                          {webhookCopied ? <Check className="h-2.5 w-2.5 animate-pulse" /> : <Copy className="h-2.5 w-2.5" />}
                          {webhookCopied ? 'Copied' : 'Copy URL'}
                        </button>
                      </div>
                      <div className="px-3 py-2 bg-slate-50 border border-slate-150 rounded-xl text-xs font-mono text-slate-700 select-all truncate">
                        {window.location.origin}/api/whatsapp/webhook
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Verify Token</label>
                        <button
                          type="button"
                          onClick={() => {
                            safeCopyToClipboard(metaVerifyToken || 'whats_crm_verify_token');
                            setTokenCopied(true);
                            setTimeout(() => setTokenCopied(false), 2000);
                          }}
                          className="text-[9px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-0.5 cursor-pointer"
                        >
                          {tokenCopied ? <Check className="h-2.5 w-2.5 animate-pulse" /> : <Copy className="h-2.5 w-2.5" />}
                          {tokenCopied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="px-3 py-2 bg-slate-50 border border-slate-150 rounded-xl text-xs font-mono text-slate-700 select-all truncate">
                        {metaVerifyToken || 'whats_crm_verify_token'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50/65 rounded-xl p-3.5 border border-amber-100 text-[10px] text-amber-850 leading-relaxed space-y-1.5 font-medium">
                    <p className="font-bold flex items-center gap-1 text-amber-900 uppercase tracking-wider text-[9px]">
                      <ShieldAlert className="h-3 w-3 shrink-0 text-amber-600" />
                      CRITICAL REQUIREMENT FOR REAL PHONES:
                    </p>
                    <p>
                      In your Meta App Dashboard &rarr; WhatsApp &rarr; Webhooks:
                    </p>
                    <ol className="list-decimal pl-4.5 space-y-1">
                      <li>Configure the <strong>Callback URL</strong> and <strong>Verify Token</strong> as shown above.</li>
                      <li>
                        Under Webhook Fields, you <strong>MUST</strong> click <strong>&quot;Subscribe&quot;</strong> next to the <strong>messages</strong> field.
                      </li>
                    </ol>
                    <p className="text-[9px] text-amber-700 italic">
                      If the messages field is not subscribed, Meta will completely ignore incoming WhatsApp messages and will not transmit them to your CRM!
                    </p>
                  </div>
                </div>

                {/* Webhook Form */}
                <div className="bg-white rounded-xl border border-slate-150 p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <Sparkles className="h-3.5 w-3.5 text-teal-600 animate-pulse" />
                    2. Inbound Webhook Message Event Tester
                  </h4>

                  <form onSubmit={handleSimulateWebhook} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Test Sender Name</label>
                        <input
                          type="text"
                          required
                          value={simulatedSenderName}
                          onChange={(e) => setSimulatedSenderName(e.target.value)}
                          placeholder="e.g. Ramanarao"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 focus:outline-none focus:border-teal-500 rounded-lg text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Test Phone Number</label>
                        <input
                          type="text"
                          required
                          value={simulatedSenderPhone}
                          onChange={(e) => setSimulatedSenderPhone(e.target.value)}
                          placeholder="e.g. +919440552671"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 focus:outline-none focus:border-teal-500 rounded-lg text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Test Message Body</label>
                      <textarea
                        rows={2}
                        required
                        value={simulatedSenderMessage}
                        onChange={(e) => setSimulatedSenderMessage(e.target.value)}
                        placeholder="Type any message..."
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 focus:outline-none focus:border-teal-500 rounded-lg text-xs"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSimulatingWebhook}
                      className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs transition-colors shadow flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSimulatingWebhook ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Dispatching...
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          Send Test WhatsApp Message
                        </>
                      )}
                    </button>
                  </form>

                  {simulationAlert && (
                    <div className={`p-3 rounded-lg text-[11px] border font-medium ${
                      simulationAlert.type === 'success' 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800 font-semibold' 
                        : 'bg-red-50 border-red-100 text-red-800'
                    }`}>
                      {simulationAlert.text}
                    </div>
                  )}
                </div>
              </div>

              {/* Webhook Activity feed logs */}
              <div className="bg-white border border-slate-150 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-teal-600 animate-pulse" />
                    Live Webhook Inbound Payload Receiver Logs (Last 10 messages)
                  </h4>
                  <button
                    type="button"
                    onClick={fetchWebhookFeed}
                    className="text-[10px] font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${isFeedLoading ? 'animate-spin' : ''}`} />
                    Force Refresh
                  </button>
                </div>

                {receivedWebhookFeed.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs font-medium">
                    Waiting for incoming webhook payloads... Message your Meta WhatsApp phone number or trigger a test webhook to see logs arrive!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                          <th className="py-2 px-3">Sender</th>
                          <th className="py-2 px-3">WhatsApp ID (Phone)</th>
                          <th className="py-2 px-3">Text Body / Action</th>
                          <th className="py-2 px-3">Received Time</th>
                          <th className="py-2 px-3 text-right">Raw Event</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {receivedWebhookFeed.slice(-10).reverse().map((msg: any) => (
                          <tr key={msg.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-slate-800 flex items-center gap-1">
                              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                              {msg.name}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">{msg.from}</td>
                            <td className="py-2.5 px-3 text-slate-700">{msg.text}</td>
                            <td className="py-2.5 px-3 text-slate-400">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold rounded font-mono">
                                JSON 200 OK
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 5: WHATSAPP AUTOMATION JOURNEYS BUILDER (CONSOLIDATED INTO TEMPLATES TAB) ==================== */}
      {false && (
        <div className="animate-fade-in">
          <WhatsAppJourneysBuilder
            industryId={selectedIndustry}
            templates={templates}
            businessName={businessName}
          />
        </div>
      )}

      {/* ==================== BULK PROMOTION BROADCAST MODAL ==================== */}
      {selectedBroadcastTemplate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-fade-in text-left">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-teal-500/10 rounded-lg flex items-center justify-center text-teal-400">
                  <Megaphone className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Bulk Promotion Broadcast</h3>
                  <p className="text-[10px] text-slate-400">Campaign: "{selectedBroadcastTemplate.title}"</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isBroadcasting}
                onClick={() => setSelectedBroadcastTemplate(null)}
                className="text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-slate-300">
              {/* Step 1: Filter target category */}
              {!isBroadcasting && !broadcastComplete && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Target Audience Category
                    </label>
                    <select
                      value={broadcastTargetCategory}
                      onChange={(e: any) => setBroadcastTargetCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl text-xs text-white focus:outline-none font-bold"
                    >
                      <option value="All">All Contacts ({contacts.length})</option>
                      <option value="Lead">Leads Only ({contacts.filter(c => c.category === 'Lead').length})</option>
                      <option value="Active">Active Customers Only ({contacts.filter(c => c.category === 'Active').length})</option>
                      <option value="Inactive">Inactive/Recall list ({contacts.filter(c => c.category === 'Inactive').length})</option>
                      <option value="Follow-up">Follow-up Only ({contacts.filter(c => c.category === 'Follow-up').length})</option>
                    </select>
                  </div>

                  <div className="bg-slate-850 rounded-xl p-3 border border-slate-800 text-[11px] leading-relaxed">
                    <span className="font-bold text-slate-400 uppercase text-[9px] block mb-1">Message Preview:</span>
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-slate-300 font-mono text-[10px] whitespace-pre-wrap">
                      {selectedBroadcastTemplate.text
                        .replace(/\{\{businessName\}\}/g, businessName)
                        .replace(/\{\{senderName\}\}/g, senderName)
                        .replace(/\{\{timings\}\}/g, aiKnowledgeBase.timings || '')
                        .replace(/\{\{treatments\}\}/g, aiKnowledgeBase.treatments || '')
                        .replace(/\{\{doctors\}\}/g, aiKnowledgeBase.doctors || '')
                        .replace(/\{\{reviews\}\}/g, aiKnowledgeBase.reviews || '')}
                    </div>
                  </div>

                  {/* Pricing / Meta Billing Estimator */}
                  <div className="bg-teal-950/20 border border-teal-900/60 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-teal-400">
                      <span>Meta Cloud API Billing Estimate:</span>
                      <span>${totalCostEstimate.toFixed(3)} USD</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal font-medium">
                      Estimated based on standard Meta conversation billing of <strong className="text-teal-400">$0.008</strong> per business-initiated message for target recipients.
                    </p>
                  </div>
                </div>
              )}

              {/* Progress & Logs (Shown during broadcast) */}
              {(isBroadcasting || broadcastComplete) && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>Dispatch Status</span>
                      <span>{broadcastProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-teal-500 h-2 rounded-full transition-all duration-300" style={{ width: `${broadcastProgress}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Live Broadcast Stream Console</label>
                    <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl font-mono text-[9px] text-slate-300 space-y-1 leading-relaxed max-h-[160px] overflow-y-auto text-left">
                      {broadcastLogs.map((log, idx) => (
                        <div key={idx} className={log.includes('[SUCCESS]') ? 'text-emerald-400' : log.includes('[ERROR]') ? 'text-red-400' : ''}>
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>

                  {broadcastComplete && (
                    <div className="bg-emerald-950/20 border border-emerald-900/60 p-4 rounded-xl text-center space-y-1 animate-fade-in">
                      <div className="text-2xl">🎉</div>
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Broadcast Successful!</h4>
                      <p className="text-[10px] text-slate-300 font-medium">
                        All personalized notifications were dispatched and successfully logged to patient interaction timelines.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3">
              <button
                type="button"
                disabled={isBroadcasting}
                onClick={() => setSelectedBroadcastTemplate(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-30"
              >
                {broadcastComplete ? 'Close Suite' : 'Cancel'}
              </button>

              {!broadcastComplete && (
                <button
                  type="button"
                  disabled={isBroadcasting}
                  onClick={handleStartBroadcast}
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isBroadcasting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Broadcasting...
                    </>
                  ) : (
                    <>
                      <Megaphone className="h-3.5 w-3.5" />
                      Dispatch Broadcast Campaign
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};
