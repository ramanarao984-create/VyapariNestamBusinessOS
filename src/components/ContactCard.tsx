/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { authenticatedFetch } from '../auth/apiClient';
import { Contact, MessageTemplate } from '../types';
import { INDUSTRIES, IndustryType, getSectorDefinition } from '../industryConfig';
import { MessageCircle, Calendar, Edit3, Clock, QrCode, X, ExternalLink, Copy, Check, Smartphone, Globe, Trash2 } from 'lucide-react';
import { safeCopyToClipboard } from '../utils';

interface ContactCardProps {
  contact: Contact;
  isSelected: boolean;
  onSelect: (contact: Contact) => void;
  onEdit: (contact: Contact, e: React.MouseEvent) => void;
  onSchedule: (contact: Contact, e: React.MouseEvent) => void;
  onDelete?: (contact: Contact, e: React.MouseEvent) => void;
  templates?: MessageTemplate[];
  businessName?: string;
  senderName?: string;
  reviewLink?: string;
  industryId?: IndustryType;
  whatsappMode?: 'simulated' | 'meta';
  metaPhoneNumberId?: string;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  isSelected,
  onSelect,
  onEdit,
  onSchedule,
  onDelete,
  templates = [],
  businessName = 'Sri Sai Dental Clinic',
  senderName = 'Dr. Prasad',
  reviewLink = 'https://g.page/srisaidental-vijayawada/review',
  industryId = 'dental',
  whatsappMode = 'simulated',
  metaPhoneNumberId = ''
}) => {
  const config = getSectorDefinition(industryId);
  const term = config.terminology;
  
  // Local QR modal states
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const activeTemplates = templates.length > 0 ? templates : config.defaultTemplates;
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    return activeTemplates[0]?.id || '';
  });
  const [copiedLink, setCopiedLink] = useState(false);

  // Format last contacted date
  const formatLastContacted = (dateStr: string) => {
    if (dateStr === 'Never') return 'Never contacted';
    try {
      const date = new Date(dateStr);
      const today = new Date();
      if (date.toDateString() === today.toDateString()) {
        return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Pre-filled template interpolation logic
  const getInterpolatedText = (tplText: string) => {
    let interpolatedText = tplText;
    interpolatedText = interpolatedText.replace(/{{name}}/g, contact.name);
    interpolatedText = interpolatedText.replace(/{{phone}}/g, contact.phone);
    interpolatedText = interpolatedText.replace(/{{businessName}}/g, businessName);
    interpolatedText = interpolatedText.replace(/{{senderName}}/g, senderName);
    interpolatedText = interpolatedText.replace(/{{dueDate}}/g, new Date(Date.now() + 7 * 24 * 3600 * 1000).toLocaleDateString());
    interpolatedText = interpolatedText.replace(/{{invoiceNo}}/g, 'INV-' + Math.floor(1000 + Math.random() * 9000));
    interpolatedText = interpolatedText.replace(/{{paymentLink}}/g, 'pay.lnk/test');
    interpolatedText = interpolatedText.replace(/{{reviewLink}}/g, reviewLink);
    interpolatedText = interpolatedText.replace(/{{dateTime}}/g, 'Tomorrow at 11:30 AM');
    interpolatedText = interpolatedText.replace(/{{productName}}/g, term.treatmentLabel);
    interpolatedText = interpolatedText.replace(/{{link}}/g, 'nesta.lnk/booking');
    return interpolatedText;
  };

  const formatWhatsAppPhone = (phone: string): string => {
    let digits = phone.replace(/[^0-9]/g, '');
    if (digits.startsWith('0') && digits.length === 11) {
      digits = digits.slice(1);
    }
    if (digits.length === 10) {
      return '91' + digits; // default to India country code
    }
    return digits;
  };

  const currentTemplate = activeTemplates.find(t => t.id === selectedTemplateId) || activeTemplates[0];
  const interpolatedMessage = currentTemplate ? getInterpolatedText(currentTemplate.text) : '';
  const rawPhone = formatWhatsAppPhone(contact.phone);
  const waUrl = `https://wa.me/${rawPhone}?text=${encodeURIComponent(interpolatedMessage)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(waUrl)}`;

  const [isSendingMeta, setIsSendingMeta] = useState(false);
  const [metaSendStatus, setMetaSendStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    safeCopyToClipboard(waUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendViaMetaAPI = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSendingMeta(true);
    setMetaSendStatus('idle');

    try {
      const response = await authenticatedFetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: 'tenant_default',
          recipient: rawPhone,
          message: interpolatedMessage,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setMetaSendStatus('success');
        alert(`Message sent successfully to ${contact.name} via Meta Cloud API! Message ID: ${data.metaMessageId || data.messageId || 'sent'}`);
      } else {
        setMetaSendStatus('error');
        alert(`API Error: ${data.error || response.statusText}`);
      }
    } catch (err: any) {
      setMetaSendStatus('error');
      alert(`Network Error: ${err.message}`);
    } finally {
      setIsSendingMeta(false);
    }
  };

  const stageConfig = config.stages.find(s => s.id === contact.pipelineStage);
  const stageLabel = stageConfig ? stageConfig.label : contact.category;

  return (
    <>
      <div
        onClick={() => onSelect(contact)}
        className={`p-5 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between h-44 ${
          isSelected
            ? 'bg-teal-50/50 border-teal-300 shadow-sm shadow-teal-50'
            : 'bg-white hover:bg-slate-50/50 border-slate-200 shadow-xs'
        }`}
        id={`contact-${contact.id}`}
      >
        <div>
          {/* Contact Info Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-bold text-slate-850 tracking-tight truncate group-hover:text-teal-700 transition-colors text-sm">
                {contact.name}
              </h4>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="text-[10px] font-mono text-slate-400 truncate">{contact.phone}</span>
                {whatsappMode === 'meta' ? (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-250 px-1.5 py-0.2 rounded-full shadow-3xs" title="Synced with Meta Cloud API">
                    <span className="h-1 w-1 bg-teal-500 rounded-full animate-ping" />
                    Meta API
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-slate-50 text-slate-500 border border-slate-200 px-1.5 py-0.2 rounded-full" title="Linked to WhatsApp Web">
                    WA Web
                  </span>
                )}
                
                {contact.source && (
                  <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                    contact.source === 'WhatsApp' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    contact.source === 'Phone' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                    contact.source === 'Website' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`} title="Traffic source channel">
                    {contact.source === 'WhatsApp' ? '🟢 WhatsApp' :
                     contact.source === 'Phone' ? '📞 Phone' :
                     contact.source === 'Website' ? '🌐 Website' : '🚶 Walk-in'}
                  </span>
                )}

                {contact.isRepeat && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-teal-50 text-teal-800 border border-teal-250 px-1.5 py-0.2 rounded-full shadow-3xs" title="Returning patient">
                    🔄 Repeat
                  </span>
                )}
              </div>
            </div>
            
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
              contact.pipelineStage === 'Completed' ? 'bg-blue-50 border border-blue-100 text-blue-700' :
              contact.pipelineStage === 'Treatment' ? 'bg-cyan-50 border border-cyan-100 text-cyan-700' :
              contact.pipelineStage === 'Visited' ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' :
              contact.pipelineStage === 'Scheduled' ? 'bg-amber-50 border border-amber-100 text-amber-700' :
              'bg-indigo-50 border border-indigo-100 text-indigo-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                contact.pipelineStage === 'Completed' ? 'bg-blue-500' :
                contact.pipelineStage === 'Treatment' ? 'bg-cyan-500' :
                contact.pipelineStage === 'Visited' ? 'bg-emerald-500' :
                contact.pipelineStage === 'Scheduled' ? 'bg-amber-500' :
                'bg-indigo-500'
              }`} />
              {stageLabel}
            </span>
          </div>

          {/* Treatment & Cost details badge */}
          {(contact.treatmentType || (contact.amountCollected && contact.amountCollected > 0)) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              {contact.treatmentType && (
                <div className="flex items-center gap-1.5 text-[10px] bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 w-max font-bold text-slate-600">
                  <span>{config.icon} {contact.treatmentType}</span>
                  {contact.treatmentValue !== undefined && (
                    <>
                      <span className="text-slate-350">•</span>
                      <span className="text-teal-700">₹{contact.treatmentValue.toLocaleString('en-IN')}</span>
                    </>
                  )}
                </div>
              )}
              {contact.amountCollected !== undefined && contact.amountCollected > 0 && (
                <div className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg px-2 py-0.5 w-max font-black uppercase tracking-tight">
                  <span>₹{contact.amountCollected.toLocaleString('en-IN')} Paid</span>
                  {contact.paymentMethod && (
                    <span className="text-emerald-800 font-extrabold border-l border-emerald-200 pl-1 text-[9px]">
                      via {contact.paymentMethod}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Note Preview */}
          <p className="text-xs text-slate-500 mt-2.5 line-clamp-2 h-8 leading-relaxed">
            {contact.notes || 'No description notes.'}
          </p>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-2">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <Clock className="h-3.5 w-3.5 text-slate-300" />
            <span className="truncate max-w-[100px]">{formatLastContacted(contact.lastContacted)}</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Unique WhatsApp QR Generator */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsQrModalOpen(true);
              }}
              title={`Generate ${term.patientLabel} WhatsApp QR Link`}
              className="p-1.5 hover:bg-slate-100 hover:text-teal-650 text-slate-400 rounded-lg transition-colors cursor-pointer"
            >
              <QrCode className="h-3.5 w-3.5" />
            </button>

            {/* Quick Schedule */}
            <button
              onClick={(e) => onSchedule(contact, e)}
              title="Schedule Follow-up"
              className="p-1.5 hover:bg-slate-100 hover:text-slate-800 text-slate-400 rounded-lg transition-colors cursor-pointer"
            >
              <Calendar className="h-3.5 w-3.5" />
            </button>
            
            {/* Quick Edit */}
            <button
              onClick={(e) => onEdit(contact, e)}
              title="Edit Details"
              className="p-1.5 hover:bg-slate-100 hover:text-slate-800 text-slate-400 rounded-lg transition-colors cursor-pointer"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>

            {/* Quick Delete */}
            {onDelete && (
              <button
                onClick={(e) => onDelete(contact, e)}
                title="Delete Contact"
                className="p-1.5 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            
            {/* Chat */}
            <button
              onClick={() => onSelect(contact)}
              title="Open Chat Stream"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white hover:bg-slate-850'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ==================== QR DEEP-LINK GENERATOR MODAL ==================== */}
      {isQrModalOpen && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            setIsQrModalOpen(false);
          }}
          className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col"
          >
            {/* Modal Header */}
            <div className="bg-slate-950 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="h-4.5 w-4.5 text-teal-400" />
                <h3 className="font-semibold font-display text-sm">
                  {term.patientLabel} WhatsApp QR Link
                </h3>
              </div>
              <button 
                onClick={() => setIsQrModalOpen(false)} 
                className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Patient Header Details */}
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-150">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{term.patientLabel} Name</div>
                  <div className="text-sm font-bold text-slate-800">{contact.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp Number</div>
                  <div className="text-xs font-mono text-teal-750 font-bold">{contact.phone}</div>
                </div>
              </div>

              {/* Template Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Pre-filled Message Template
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl text-xs focus:outline-none font-medium text-slate-700 cursor-pointer"
                >
                  {activeTemplates.map(tpl => (
                    <option key={tpl.id} value={tpl.id}>
                      [{tpl.category}] {tpl.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-slate-150 p-5">
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
                  <img 
                    src={qrCodeUrl} 
                    alt={`WhatsApp QR Code for ${contact.name}`} 
                    className="w-40 h-40 object-contain rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-2.5 font-medium text-center">
                  Scan to start a pre-filled WhatsApp conversation on a phone
                </span>
              </div>

              {/* Live Preview of Interpolated Text */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Live Pre-filled Message Preview
                </label>
                <div className="w-full p-3.5 bg-slate-50 border border-slate-150 rounded-xl text-xs text-slate-650 h-24 overflow-y-auto leading-relaxed select-all whitespace-pre-wrap font-sans">
                  {interpolatedMessage}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-3.5 border-t border-slate-100">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleCopyLink}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border shadow-2xs cursor-pointer ${
                      copiedLink
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Link Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy Deep-Link
                      </>
                    )}
                  </button>

                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-200 text-center"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                    WA Web Fallback
                  </a>
                </div>

                {whatsappMode === 'meta' && (
                  <button
                    type="button"
                    onClick={handleSendViaMetaAPI}
                    disabled={isSendingMeta}
                    className="w-full flex items-center justify-center gap-1.5 bg-teal-650 hover:bg-teal-700 text-white px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-teal-100 border border-teal-600 disabled:opacity-50"
                  >
                    {isSendingMeta ? (
                      <>
                        <span className="animate-spin border-2 border-white border-t-transparent rounded-full h-3.5 w-3.5 mr-1" />
                        Sending via Meta Cloud API...
                      </>
                    ) : (
                      <>
                        <Smartphone className="h-3.5 w-3.5" />
                        Send Now via Meta WhatsApp Cloud API
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
