import React, { useState } from 'react';
import { 
  MessageSquare, Plus, Search, Filter, CheckCircle2, Clock, 
  Trash2, Copy, Sparkles, ShieldCheck
} from 'lucide-react';
import { MessageTemplate } from '../../types';

interface MessageTemplatesSectionProps {
  templates: MessageTemplate[];
  onAddTemplate: (title: string, category: string, text: string) => void;
  onDeleteTemplate: (id: string) => void;
}

export const MessageTemplatesSection: React.FC<MessageTemplatesSectionProps> = ({
  templates,
  onAddTemplate,
  onDeleteTemplate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Appointment');
  const [newText, setNewText] = useState('');

  const sampleTemplates = templates.length > 0 ? templates : [
    {
      id: 'tmpl_101',
      title: 'Appointment Confirmation',
      category: 'Appointment',
      text: 'Hello {{patient_name}}, your appointment with {{doctor_name}} at {{clinic_name}} is confirmed for {{appointment_date}} at {{appointment_time}}.'
    },
    {
      id: 'tmpl_102',
      title: '24-Hour Reminder',
      category: 'Reminder',
      text: 'Reminder: Hello {{patient_name}}, your visit to {{clinic_name}} is scheduled for tomorrow at {{appointment_time}}. Reply CONFIRM or RESCHEDULE.'
    },
    {
      id: 'tmpl_103',
      title: 'No-Show Follow-Up',
      category: 'Follow-up',
      text: 'We missed you today at {{clinic_name}}, {{patient_name}}! Would you like to reschedule for another convenient time?'
    },
    {
      id: 'tmpl_104',
      title: 'Google Review Request',
      category: 'Review',
      text: 'Hope you had a great experience at {{clinic_name}}, {{patient_name}}! Please share your feedback on Google: {{google_review_link}}'
    }
  ];

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newText.trim()) return;
    onAddTemplate(newTitle, newCategory, newText);
    setNewTitle('');
    setNewText('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header & New Template Button */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-display text-slate-900 tracking-tight flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#176B72]" />
            <span>WhatsApp Message Templates Binder</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Meta approved message templates & variable placeholders for automated campaigns and reminders.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-[#176B72] hover:bg-[#13585e] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>New Message Template</span>
        </button>
      </div>

      {/* Variables Legend */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-2">
        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>Meta Template Variable Chips</span>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-mono">
          {['{{patient_name}}', '{{clinic_name}}', '{{doctor_name}}', '{{appointment_date}}', '{{appointment_time}}', '{{clinic_location_url}}', '{{google_review_link}}'].map(v => (
            <span key={v} className="px-2.5 py-1 bg-white text-[#176B72] font-bold rounded-lg border border-teal-200 shadow-3xs">
              {v}
            </span>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sampleTemplates.map(tmpl => (
          <div key={tmpl.id} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 bg-teal-50 text-[#176B72] font-extrabold text-[10px] rounded-md border border-teal-100 uppercase">
                  {tmpl.category}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  <CheckCircle2 className="h-3 w-3" />
                  APPROVED
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">{tmpl.title}</h3>
              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 font-sans leading-relaxed">
                {tmpl.text}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Channel: <strong>WhatsApp</strong></span>
              <button
                onClick={() => onDeleteTemplate(tmpl.id)}
                className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* New Template Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Create New WhatsApp Template</h3>
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Template Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tooth Extraction Care Notes"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="Appointment">Appointment</option>
                  <option value="Reminder">Reminder</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Review">Review</option>
                  <option value="Marketing">Marketing</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Message Body (Use {"{{patient_name}}, {{appointment_time}}"})</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Hello {{patient_name}}, your appointment is at {{appointment_time}}."
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#176B72] hover:bg-[#13585e] text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Save & Submit Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
