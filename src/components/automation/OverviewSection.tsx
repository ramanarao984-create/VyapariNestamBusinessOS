import React from 'react';
import { 
  Zap, MessageSquare, Clock, CheckCircle2, TrendingUp, AlertTriangle, 
  ArrowRight, Calendar, ShieldCheck, Play, Sparkles, RefreshCw, ChevronRight, Activity, Users, Star
} from 'lucide-react';
import { AutomationWorkflow, AutomationExecution } from '../../types';
import { PREBUILT_WORKFLOW_TEMPLATES } from '../../services/automation/workflowTemplatesData';

interface OverviewSectionProps {
  workflows: AutomationWorkflow[];
  executions: AutomationExecution[];
  onNavigateTab: (tab: 'overview' | 'templates' | 'my_workflows' | 'executions' | 'message_templates' | 'settings') => void;
  onActivateTemplate: (tmplId: string) => void;
  onSelectExecution: (exec: AutomationExecution) => void;
  onTriggerTestEvent: (triggerType: string) => void;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  workflows,
  executions,
  onNavigateTab,
  onActivateTemplate,
  onSelectExecution,
  onTriggerTestEvent
}) => {
  const activeWorkflowsCount = workflows.filter(w => w.status === 'active').length;
  const totalExecutionsCount = workflows.reduce((acc, w) => acc + (w.stats.totalExecutions || 0), 0);
  const successRate = totalExecutionsCount > 0 
    ? Math.round((workflows.reduce((acc, w) => acc + (w.stats.successfulExecutions || 0), 0) / totalExecutionsCount) * 100) 
    : 98;

  // Recommended templates that aren't active yet
  const activeTemplateIds = new Set(workflows.map(w => w.templateId));
  const recommendedTemplates = PREBUILT_WORKFLOW_TEMPLATES.filter(t => !activeTemplateIds.has(t.id)).slice(0, 3);

  return (
    <div className="space-y-6">
      
      {/* Real-time System Status Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/30 shrink-0">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white">Vyapari Automation Center</h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Engine Healthy & Operational
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Automated patient reminders, Google Calendar sync, and WhatsApp engagement running continuously in real time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          <button 
            onClick={() => onTriggerTestEvent('appointment_created')}
            className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Simulate Booking Trigger</span>
          </button>
          <button 
            onClick={() => onNavigateTab('templates')}
            className="flex-1 sm:flex-initial px-4 py-2 bg-[#176B72] hover:bg-[#13585e] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Explore 10 Templates</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Center</span>
            <Zap className="h-4 w-4 text-[#176B72]" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-display">{activeWorkflowsCount}</div>
          <p className="text-[11px] font-medium text-emerald-600 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {workflows.length} configured
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Messages Sent</span>
            <MessageSquare className="h-4 w-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-display">{totalExecutionsCount.toLocaleString()}</div>
          <p className="text-[11px] font-medium text-slate-500 mt-1">Last 30 days</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Upcoming Actions</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-display">14</div>
          <p className="text-[11px] font-medium text-amber-600 mt-1">Scheduled next 24h</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Success Rate</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-display">{successRate}%</div>
          <p className="text-[11px] font-medium text-emerald-600 mt-1">Zero dropouts</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Recovered Appts</span>
            <TrendingUp className="h-4 w-4 text-[#F28C1B]" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-display">38</div>
          <p className="text-[11px] font-medium text-emerald-600 mt-1">₹45,600 saved revenue</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Review Requests</span>
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-display">89</div>
          <p className="text-[11px] font-medium text-amber-600 mt-1">4.9 Star Avg Rating</p>
        </div>

      </div>

      {/* Recommended Automations Grid */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#F28C1B]" />
              <span>Recommended Automations for High Customer Retention</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Turnkey workflow templates tailored for frontdesk, appointment management, and patient care.
            </p>
          </div>
          <button 
            onClick={() => onNavigateTab('templates')}
            className="text-xs font-bold text-[#176B72] hover:text-[#13585e] flex items-center gap-1 cursor-pointer"
          >
            <span>View All 10 Templates</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(recommendedTemplates.length > 0 ? recommendedTemplates : PREBUILT_WORKFLOW_TEMPLATES.slice(0, 3)).map(tmpl => (
            <div 
              key={tmpl.id}
              className="bg-slate-50 hover:bg-teal-50/40 p-4 rounded-xl border border-slate-200 hover:border-teal-200 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 bg-teal-100 text-[#176B72] font-extrabold text-[10px] rounded-md uppercase tracking-wider">
                    {tmpl.category}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3 text-slate-400" />
                    {tmpl.estimatedSetupMinutes} mins setup
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#176B72] transition-colors">
                  {tmpl.title}
                </h4>
                <p className="text-xs text-slate-600 line-clamp-2">
                  {tmpl.shortDescription}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500">
                  {tmpl.channel} Channel
                </span>
                <button
                  onClick={() => onActivateTemplate(tmpl.id)}
                  className="px-3.5 py-1.5 bg-[#176B72] hover:bg-[#13585e] active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#176B72]/30 group/btn"
                >
                  <span>Set Up Now</span>
                  <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Upcoming Actions & Recent Executions Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upcoming Actions Panel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span>Upcoming Automated Queue</span>
            </h3>
            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold text-[10px] rounded-md border border-amber-200">
              Durable Worker Active
            </span>
          </div>

          <div className="space-y-3">
            {[
              { name: 'Dr. Ramesh Appointment Reminder', contact: 'Kiran Kumar (+91 98765 11223)', time: 'In 24 mins', trigger: '24-Hour Reminder' },
              { name: 'Post-Visit Thank You & Care Notes', contact: 'Anitha Rao (+91 91234 56789)', time: 'In 1 hour 15 mins', trigger: 'Completed Visit' },
              { name: 'Google Review Request Link', contact: 'Suresh Babu (+91 99887 76655)', time: 'In 3 hours 40 mins', trigger: 'Review Request' },
              { name: 'Inactive Patient Recall Reminder', contact: 'Meena Kumari (+91 97001 22334)', time: 'Tomorrow 09:00 AM', trigger: 'Inactive Recall' }
            ].map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-slate-900">{item.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{item.contact}</div>
                  <div className="text-[10px] font-semibold text-[#176B72] mt-1 bg-teal-50 px-2 py-0.5 rounded-md inline-block border border-teal-100">
                    {item.trigger}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-1 rounded-md shrink-0">
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Execution Activity Feed */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#176B72]" />
                <span>Recent Execution Activity</span>
              </h3>
              <p className="text-xs text-slate-500">Live execution logs across WhatsApp and Google Calendar</p>
            </div>
            <button 
              onClick={() => onNavigateTab('executions')}
              className="text-xs font-bold text-[#176B72] hover:text-[#13585e] cursor-pointer"
            >
              View Full Logs →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {executions.slice(0, 5).map(exec => (
              <div 
                key={exec.id} 
                onClick={() => onSelectExecution(exec)}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/80 p-2 rounded-xl transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-teal-50 text-[#176B72] rounded-xl shrink-0 mt-0.5">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">{exec.workflowName}</span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold text-[10px] rounded-md">
                        {exec.triggerType}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      Recipient: <span className="font-semibold text-slate-800">{exec.contactName}</span> ({exec.contactPhone})
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                    exec.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : exec.status === 'failed'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    <CheckCircle2 className="h-3 w-3" />
                    {exec.status.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    {new Date(exec.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
