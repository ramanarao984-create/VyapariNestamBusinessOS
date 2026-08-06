/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MessageTemplate } from '../types';
import { Plus, Trash2, Copy, Check, Info } from 'lucide-react';
import { safeCopyToClipboard } from '../utils';

interface TemplateListProps {
  templates: MessageTemplate[];
  onAddTemplate: (title: string, category: string, text: string) => void;
  onDeleteTemplate: (id: string) => void;
}

export const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  onAddTemplate,
  onDeleteTemplate,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Sales');
  const [newText, setNewText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newText.trim()) return;

    onAddTemplate(newTitle.trim(), newCategory, newText.trim());
    setNewTitle('');
    setNewCategory('Sales');
    setNewText('');
    setShowAddForm(false);
  };

  const handleCopy = (tpl: MessageTemplate) => {
    safeCopyToClipboard(tpl.text);
    setCopiedId(tpl.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6" id="templates-workspace">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight font-display text-slate-800">
            WhatsApp Message Templates
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Create high-converting messages with dynamic variables for quick customer click-to-chat.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Create Template
        </button>
      </div>

      {/* Info Card on Interpolations */}
      <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
        <Info className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-950">Dynamic Variables Supported:</p>
          <p className="mt-1 leading-relaxed">
            You can insert placeholders in your templates which will automatically interpolate details when messaging a contact:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {['{{name}}', '{{phone}}', '{{businessName}}', '{{senderName}}', '{{dueDate}}', '{{invoiceNo}}', '{{dateTime}}'].map(v => (
              <code key={v} className="bg-white px-2 py-0.5 rounded border border-amber-250 font-mono text-[10px] font-bold text-amber-900 shadow-2xs">
                {v}
              </code>
            ))}
          </div>
        </div>
      </div>

      {/* Add New Template Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Create Custom Template</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Template Title</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Booking Confirmation"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 focus:outline-none rounded-xl text-sm transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-slate-400 focus:outline-none rounded-xl text-sm font-bold text-slate-700 cursor-pointer"
              >
                <option value="Sales">Sales</option>
                <option value="Onboarding">Onboarding</option>
                <option value="Support">Support</option>
                <option value="Scheduler">Scheduler</option>
                <option value="Finance">Finance</option>
                <option value="Marketing">Marketing</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Message Content</label>
            <textarea
              rows={4}
              required
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Hi {{name}}! This is {{senderName}} from {{businessName}}. Confirming our scheduled call on {{dateTime}}..."
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 focus:outline-none rounded-xl text-sm resize-none transition-colors"
            />
          </div>

          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              Save Template
            </button>
          </div>
        </form>
      )}

      {/* Grid of Existing Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(tpl => {
          const isCopied = copiedId === tpl.id;
          
          return (
            <div key={tpl.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-850 text-sm tracking-tight">{tpl.title}</h4>
                  <span className="text-[10px] bg-slate-100 text-slate-650 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-slate-200/55">
                    {tpl.category}
                  </span>
                </div>
                
                <p className="text-xs text-slate-650 mt-4 font-sans leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-150">
                  {tpl.text}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 mt-5 pt-3.5 border-t border-slate-100">
                <button
                  onClick={() => handleCopy(tpl)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    isCopied
                      ? 'bg-green-50 text-green-700 border border-green-200 shadow-2xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-2xs'
                  }`}
                  title="Copy to clipboard"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy Draft
                    </>
                  )}
                </button>

                <button
                  onClick={() => onDeleteTemplate(tpl.id)}
                  title="Delete Template"
                  className="p-1.5 bg-red-55 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-all cursor-pointer shadow-2xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
