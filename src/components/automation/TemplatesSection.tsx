import React, { useState } from 'react';
import { 
  Sparkles, Clock, CheckCircle2, Play, Search, Filter, MessageSquare, 
  ChevronRight, Calendar, Users, ShieldCheck, Zap
} from 'lucide-react';
import { WorkflowTemplateDef } from '../../types';
import { PREBUILT_WORKFLOW_TEMPLATES } from '../../services/automation/workflowTemplatesData';

interface TemplatesSectionProps {
  onActivateTemplate: (tmplId: string) => void;
  onCustomizeTemplate: (tmpl: WorkflowTemplateDef) => void;
}

export const TemplatesSection: React.FC<TemplatesSectionProps> = ({
  onActivateTemplate,
  onCustomizeTemplate
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = ['All', 'appointment', 'reminder', 'followup', 'lead', 'recall', 'review'];

  const filteredTemplates = PREBUILT_WORKFLOW_TEMPLATES.filter(tmpl => {
    const matchesCat = selectedCategory === 'All' || tmpl.category === selectedCategory;
    const matchesSearch = tmpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tmpl.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tmpl.recommendedFor.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-display text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#176B72]" />
            <span>10 Essential Prebuilt Workflow Templates</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Turnkey customer engagement & appointment automations ready to activate in under 2 minutes.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#176B72]"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer capitalize whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-[#176B72] text-white border-[#176B72] shadow-2xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat === 'All' ? 'All 10 Templates' : `${cat}s`}
          </button>
        ))}
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTemplates.map((tmpl) => (
          <div 
            key={tmpl.id}
            className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-teal-300 transition-all p-5 flex flex-col justify-between group space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 bg-teal-50 text-[#176B72] font-extrabold text-[10px] rounded-md border border-teal-100 uppercase tracking-wider">
                  {tmpl.category}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  ~{tmpl.estimatedSetupMinutes} mins setup
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-[#176B72] transition-colors">
                  {tmpl.title}
                </h3>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                  {tmpl.shortDescription}
                </p>
              </div>

              {/* Trigger Badge */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Trigger Event</div>
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-[#176B72]" />
                  <span>{tmpl.triggerDisplay}</span>
                </div>
              </div>

              {/* Steps Overview */}
              <div className="space-y-1 pt-1">
                <div className="text-[11px] font-bold text-slate-500">Execution Steps:</div>
                <ul className="space-y-1">
                  {tmpl.stepsOverview.map((step, idx) => (
                    <li key={idx} className="text-[11px] text-slate-600 flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => onCustomizeTemplate(tmpl)}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Customize
              </button>
              <button
                onClick={() => onActivateTemplate(tmpl.id)}
                className="px-4 py-2 bg-[#176B72] hover:bg-[#13585e] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Activate Template</span>
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
