import React, { useState } from 'react';
import { 
  Layers, Plus, Play, Pause, Trash2, Edit2, Copy, Sparkles, Check, 
  Clock, ArrowRight, ArrowLeft, Zap, MessageSquare, Calendar, ShieldCheck, 
  Sliders, Bot, ChevronRight, CheckCircle2, AlertCircle
} from 'lucide-react';
import { AutomationWorkflow, WorkflowTriggerType, WorkflowNodeStep, Contact, Appointment } from '../../types';
import { AutomationService } from '../../services/automation/AutomationService';

interface MyWorkflowsSectionProps {
  workflows: AutomationWorkflow[];
  onUpdateWorkflows: (updated: AutomationWorkflow[]) => void;
  onRunTestWorkflow: (wf: AutomationWorkflow) => void;
  contacts: Contact[];
  appointments: Appointment[];
}

export const MyWorkflowsSection: React.FC<MyWorkflowsSectionProps> = ({
  workflows,
  onUpdateWorkflows,
  onRunTestWorkflow,
  contacts,
  appointments
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'guided_wizard' | 'visual_builder'>('list');
  const [selectedWorkflow, setSelectedWorkflow] = useState<AutomationWorkflow | null>(null);

  // Guided Wizard State
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [wizardData, setWizardData] = useState<{
    name: string;
    description: string;
    category: 'appointment' | 'reminder' | 'followup' | 'lead' | 'recall' | 'review';
    triggerType: WorkflowTriggerType;
    delayMinutes: number;
    quietHoursEnabled: boolean;
    templateName: string;
    messageBody: string;
    googleCalendarSync: boolean;
    stopOnHumanReply: boolean;
  }>({
    name: 'Custom Appointment Reminder',
    description: 'Send a personalized WhatsApp reminder with Google Calendar sync.',
    category: 'reminder',
    triggerType: 'appointment_24h_before',
    delayMinutes: 1440,
    quietHoursEnabled: true,
    templateName: 'appointment_24h_reminder_v1',
    messageBody: 'Hello {{patient_name}}, reminder for your visit at {{clinic_name}} on {{appointment_date}} at {{appointment_time}}.',
    googleCalendarSync: true,
    stopOnHumanReply: true
  });

  // Visual Builder Node Selection State
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node_trigger');
  const [builderNodes, setBuilderNodes] = useState<WorkflowNodeStep[]>([
    { id: 'node_trigger', type: 'trigger', title: 'Trigger: Appointment Created', config: { triggerType: 'appointment_created' } },
    { id: 'node_cal_sync', type: 'calendar_sync', title: 'Sync Google Calendar Event', config: { calendarId: 'primary' } },
    { id: 'node_wa_msg', type: 'whatsapp_message', title: 'Send WhatsApp Confirmation', config: { templateName: 'appointment_confirmation_v1' } },
    { id: 'node_end', type: 'end', title: 'Workflow Complete', config: {} }
  ]);

  // Toggle Workflow Active / Paused
  const handleToggleStatus = (wf: AutomationWorkflow) => {
    const updatedStatus = wf.status === 'active' ? 'paused' : 'active';
    const updated = workflows.map(w => w.id === wf.id ? { ...w, status: updatedStatus } : w);
    AutomationService.saveWorkflows(updated);
    onUpdateWorkflows(updated);
  };

  // Duplicate Workflow
  const handleDuplicate = (wf: AutomationWorkflow) => {
    const newWf: AutomationWorkflow = {
      ...wf,
      id: `wf_dup_${Date.now()}`,
      name: `${wf.name} (Copy)`,
      status: 'paused',
      stats: { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updated = [newWf, ...workflows];
    AutomationService.saveWorkflows(updated);
    onUpdateWorkflows(updated);
  };

  // Delete Workflow
  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      const updated = workflows.filter(w => w.id !== id);
      AutomationService.saveWorkflows(updated);
      onUpdateWorkflows(updated);
    }
  };

  // Complete Guided Wizard
  const handleCompleteWizard = () => {
    const newWf: AutomationWorkflow = {
      id: `wf_custom_${Date.now()}`,
      name: wizardData.name,
      description: wizardData.description,
      category: wizardData.category,
      triggerType: wizardData.triggerType,
      status: 'active',
      version: 1,
      config: {
        delayMinutes: wizardData.delayMinutes,
        templateName: wizardData.templateName,
        messageBody: wizardData.messageBody,
        googleCalendarSync: wizardData.googleCalendarSync,
        stopOnHumanReply: wizardData.stopOnHumanReply,
        quietHoursStart: wizardData.quietHoursEnabled ? '21:00' : undefined,
        quietHoursEnd: wizardData.quietHoursEnabled ? '08:00' : undefined
      },
      stats: { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [newWf, ...workflows];
    AutomationService.saveWorkflows(updated);
    onUpdateWorkflows(updated);
    setViewMode('list');
  };

  return (
    <div className="space-y-6">
      
      {/* Navigation & Mode Switcher Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              viewMode === 'list'
                ? 'bg-[#176B72] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>My Active Workflows ({workflows.length})</span>
          </button>

          <button
            onClick={() => { setViewMode('guided_wizard'); setWizardStep(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              viewMode === 'guided_wizard'
                ? 'bg-[#176B72] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Guided 5-Step Wizard</span>
          </button>

          <button
            onClick={() => setViewMode('visual_builder')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              viewMode === 'visual_builder'
                ? 'bg-[#176B72] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Visual Canvas Builder</span>
          </button>
        </div>

        {viewMode === 'list' && (
          <button
            onClick={() => { setViewMode('guided_wizard'); setWizardStep(1); }}
            className="w-full sm:w-auto px-4 py-2 bg-[#F28C1B] hover:bg-[#d97c16] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Create Custom Workflow</span>
          </button>
        )}
      </div>

      {/* ==================== MODE 1: LIST VIEW ==================== */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {workflows.map(wf => (
              <div 
                key={wf.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-teal-200 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      wf.status === 'active' 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {wf.status}
                    </span>
                    <span className="px-2 py-0.5 bg-teal-50 text-[#176B72] font-bold text-[10px] rounded-md border border-teal-100 uppercase">
                      {wf.category}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5 text-[#176B72]" />
                      Trigger: {wf.triggerType}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{wf.name}</h3>
                  <p className="text-xs text-slate-600">{wf.description}</p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium pt-1">
                    <span>Executions: <strong className="text-slate-800">{wf.stats.totalExecutions}</strong></span>
                    <span>Success: <strong className="text-emerald-700">{wf.stats.successfulExecutions}</strong></span>
                    {wf.stats.lastExecutedAt && (
                      <span>Last run: <span className="text-slate-700">{new Date(wf.stats.lastExecutedAt).toLocaleDateString()}</span></span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 w-full md:w-auto justify-end">
                  <button
                    onClick={() => onRunTestWorkflow(wf)}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-200 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Test Run</span>
                  </button>

                  <button
                    onClick={() => handleToggleStatus(wf)}
                    className={`px-3 py-1.5 font-bold text-xs rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
                      wf.status === 'active'
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                    }`}
                  >
                    {wf.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    <span>{wf.status === 'active' ? 'Pause' : 'Activate'}</span>
                  </button>

                  <button
                    onClick={() => handleDuplicate(wf)}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                    title="Duplicate Workflow"
                  >
                    <Copy className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(wf.id)}
                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                    title="Delete Workflow"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== MODE 2: GUIDED SETUP WIZARD (5 STEPS) ==================== */}
      {viewMode === 'guided_wizard' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
          
          {/* Progress Steps Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#176B72]" />
                <span>Guided Workflow Creator (Step {wizardStep} of 5)</span>
              </h3>
              <p className="text-xs text-slate-500">Easily build automated appointment and patient workflows without code.</p>
            </div>
            <span className="text-xs font-extrabold text-[#176B72] bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
              {wizardStep === 1 && '1. Choose Event'}
              {wizardStep === 2 && '2. Set Timing & Delays'}
              {wizardStep === 3 && '3. Draft WhatsApp Message'}
              {wizardStep === 4 && '4. Configure Calendar Sync'}
              {wizardStep === 5 && '5. Review & Activate'}
            </span>
          </div>

          {/* STEP 1: TRIGGER SELECTION */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700">Workflow Name & Category</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={wizardData.name}
                  onChange={(e) => setWizardData({ ...wizardData, name: e.target.value })}
                  placeholder="e.g., 24-Hour Surgery Reminder"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#176B72]"
                />
                <select
                  value={wizardData.category}
                  onChange={(e) => setWizardData({ ...wizardData, category: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#176B72]"
                >
                  <option value="appointment">Appointment Automation</option>
                  <option value="reminder">Reminder & Pre-visit</option>
                  <option value="followup">Post-visit Follow-up</option>
                  <option value="lead">New Lead Engagement</option>
                  <option value="recall">Inactive Recall</option>
                  <option value="review">Google Review Request</option>
                </select>
              </div>

              <label className="block text-xs font-bold text-slate-700 pt-2">Select Trigger Event</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { type: 'appointment_created', label: 'When Appointment Created or Booked', desc: 'Instantly when a patient registers or books' },
                  { type: 'appointment_24h_before', label: '24 Hours Before Appointment', desc: 'Remind patient 1 day in advance' },
                  { type: 'appointment_1h_before', label: '1 Hour Before Appointment', desc: 'Send location link right before arrival' },
                  { type: 'appointment_noshow', label: 'When Patient Misses Appointment (No-Show)', desc: 'Empathetic message offering reschedule' },
                  { type: 'appointment_completed', label: 'After Appointment Marked Completed', desc: 'Send thank you, care notes, review link' },
                  { type: 'lead_created', label: 'When New Lead Registered', desc: 'Instant greeting & receptionist notification' }
                ].map(item => (
                  <div 
                    key={item.type}
                    onClick={() => setWizardData({ ...wizardData, triggerType: item.type as any })}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      wizardData.triggerType === item.type
                        ? 'bg-teal-50/80 border-[#176B72] shadow-2xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">{item.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: TIMING & DELAYS */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700">Delay & Schedule Settings</label>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Execution Delay (Minutes)</span>
                  <input
                    type="number"
                    value={wizardData.delayMinutes}
                    onChange={(e) => setWizardData({ ...wizardData, delayMinutes: parseInt(e.target.value) || 0 })}
                    className="w-28 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 text-right"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Set to 0 for immediate execution, 60 for 1 hour, or 1440 for 24 hours.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">Enforce Quiet Hours (9:00 PM – 8:00 AM)</div>
                  <div className="text-[11px] text-slate-500">Hold messages generated overnight and release them automatically at 8:00 AM.</div>
                </div>
                <input
                  type="checkbox"
                  checked={wizardData.quietHoursEnabled}
                  onChange={(e) => setWizardData({ ...wizardData, quietHoursEnabled: e.target.checked })}
                  className="h-4 w-4 text-[#176B72] rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* STEP 3: MESSAGE TEMPLATE */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700">WhatsApp Message Content & Variables</label>
              <textarea
                rows={4}
                value={wizardData.messageBody}
                onChange={(e) => setWizardData({ ...wizardData, messageBody: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#176B72]"
              />

              <div className="text-xs font-bold text-slate-700">Available Variables (Click to Insert):</div>
              <div className="flex flex-wrap gap-2">
                {['{{patient_name}}', '{{clinic_name}}', '{{doctor_name}}', '{{appointment_date}}', '{{appointment_time}}', '{{clinic_location_url}}', '{{google_review_link}}'].map(v => (
                  <button
                    key={v}
                    onClick={() => setWizardData({ ...wizardData, messageBody: wizardData.messageBody + ' ' + v })}
                    className="px-2.5 py-1 bg-teal-50 text-[#176B72] font-mono text-[11px] font-bold rounded-lg border border-teal-100 hover:bg-teal-100 transition-all cursor-pointer"
                  >
                    + {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: GOOGLE CALENDAR & CRM ACTIONS */}
          {wizardStep === 4 && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">Sync with Google Calendar</div>
                  <div className="text-[11px] text-slate-500">Automatically create, update, or sync event on primary Google Calendar.</div>
                </div>
                <input
                  type="checkbox"
                  checked={wizardData.googleCalendarSync}
                  onChange={(e) => setWizardData({ ...wizardData, googleCalendarSync: e.target.checked })}
                  className="h-4 w-4 text-[#176B72] rounded cursor-pointer"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">Auto-Pause on Patient Reply (Human Handover)</div>
                  <div className="text-[11px] text-slate-500">Pause automated sequence immediately if patient asks a custom question.</div>
                </div>
                <input
                  type="checkbox"
                  checked={wizardData.stopOnHumanReply}
                  onChange={(e) => setWizardData({ ...wizardData, stopOnHumanReply: e.target.checked })}
                  className="h-4 w-4 text-[#176B72] rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & ACTIVATE */}
          {wizardStep === 5 && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs space-y-2">
                <div className="font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Workflow Strategy Ready to Launch</span>
                </div>
                <p>
                  <strong>{wizardData.name}</strong> will run automatically whenever <strong>{wizardData.triggerType}</strong> occurs.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div><strong>Category:</strong> {wizardData.category}</div>
                <div><strong>Delay:</strong> {wizardData.delayMinutes} minutes</div>
                <div><strong>Quiet Hours:</strong> {wizardData.quietHoursEnabled ? 'Enabled (9 PM - 8 AM)' : 'Disabled'}</div>
                <div><strong>Google Calendar:</strong> {wizardData.googleCalendarSync ? 'Enabled' : 'Disabled'}</div>
              </div>
            </div>
          )}

          {/* Wizard Navigation Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : setViewMode('list')}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{wizardStep === 1 ? 'Cancel' : 'Back'}</span>
            </button>

            {wizardStep < 5 ? (
              <button
                onClick={() => setWizardStep(wizardStep + 1)}
                className="px-5 py-2 bg-[#176B72] hover:bg-[#13585e] text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Next Step</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleCompleteWizard}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                <span>Save & Activate Workflow</span>
              </button>
            )}
          </div>

        </div>
      )}

      {/* ==================== MODE 3: VISUAL CANVAS BUILDER ==================== */}
      {viewMode === 'visual_builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[500px]">
          
          {/* Left Panel: Step Library */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Node Library</h4>
            <div className="space-y-2">
              {[
                { title: 'Trigger Event', icon: Zap, desc: 'Appointment or lead trigger' },
                { title: 'WhatsApp Template', icon: MessageSquare, desc: 'Send Meta approved message' },
                { title: 'Google Calendar Sync', icon: Calendar, desc: 'Create/update Google event' },
                { title: 'Wait / Delay', icon: Clock, desc: 'Pause workflow execution' },
                { title: 'Condition Split', icon: Sliders, desc: 'Branch on customer reply' },
                { title: 'Human Handover', icon: Bot, desc: 'Alert receptionist' }
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="p-2.5 bg-slate-50 hover:bg-teal-50/60 p-2.5 rounded-xl border border-slate-200 hover:border-teal-200 transition-all cursor-pointer">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <Icon className="h-3.5 w-3.5 text-[#176B72]" />
                      <span>{item.title}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Canvas: Interactive Flowchart */}
          <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-inner flex flex-col items-center justify-center space-y-4">
            <div className="text-xs font-bold text-teal-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
              Interactive Workflow Flowchart Canvas
            </div>

            <div className="w-full max-w-md space-y-3">
              {builderNodes.map((node, idx) => (
                <React.Fragment key={node.id}>
                  <div 
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      selectedNodeId === node.id 
                        ? 'bg-teal-950/80 border-teal-400 text-white shadow-lg' 
                        : 'bg-slate-800/90 border-slate-700 text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-xs font-bold">{node.title}</div>
                        <div className="text-[10px] text-slate-400">{node.type} node</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  </div>

                  {idx < builderNodes.length - 1 && (
                    <div className="flex justify-center">
                      <div className="w-0.5 h-6 bg-teal-500/50"></div>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Right Panel: Node Inspector */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Node Inspector</h4>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="font-bold text-slate-900">Selected: {selectedNodeId}</div>
              <p className="text-slate-600">Configure parameters for the selected step in the center canvas.</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Step Label</label>
                <input 
                  type="text" 
                  defaultValue="Send WhatsApp Confirmation" 
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold" 
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fallback Strategy</label>
                <select className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold">
                  <option>Retry automatically up to 3 times</option>
                  <option>Alert receptionist via staff notification</option>
                  <option>Skip and proceed to next step</option>
                </select>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
