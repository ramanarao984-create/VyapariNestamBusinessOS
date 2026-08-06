import React, { useState, useEffect } from 'react';
import { 
  Zap, Layers, MessageSquare, Activity, ShieldCheck, Sparkles, 
  Plus, CheckCircle2, RefreshCw, X, Play
} from 'lucide-react';
import { MessageTemplate, Contact, Appointment, AutomationWorkflow, AutomationExecution, AutomationSettings } from '../types';
import { AutomationService } from '../services/automation/AutomationService';
import { PREBUILT_WORKFLOW_TEMPLATES } from '../services/automation/workflowTemplatesData';

import { OverviewSection } from './automation/OverviewSection';
import { TemplatesSection } from './automation/TemplatesSection';
import { MyWorkflowsSection } from './automation/MyWorkflowsSection';
import { ExecutionActivitySection } from './automation/ExecutionActivitySection';
import { MessageTemplatesSection } from './automation/MessageTemplatesSection';
import { SettingsSection } from './automation/SettingsSection';

interface AutomationCenterProps {
  templates: MessageTemplate[];
  onAddTemplate: (title: string, category: string, text: string) => void;
  onDeleteTemplate: (id: string) => void;
  contacts?: Contact[];
  appointments?: Appointment[];
}

export const AutomationCenter: React.FC<AutomationCenterProps> = ({
  templates,
  onAddTemplate,
  onDeleteTemplate,
  contacts = [],
  appointments = []
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'templates' | 'my_workflows' | 'executions' | 'message_templates' | 'settings'>('overview');

  // Load Workflows, Executions & Settings from AutomationService
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>(() => AutomationService.getWorkflows());
  const [executions, setExecutions] = useState<AutomationExecution[]>(() => AutomationService.getExecutions());
  const [settings, setSettings] = useState<AutomationSettings>(() => AutomationService.getSettings());

  const [selectedExecution, setSelectedExecution] = useState<AutomationExecution | null>(null);
  const [testNotification, setTestNotification] = useState<string | null>(null);

  // Sync state & async fetch from API
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      const [wfs, execs, stts] = await Promise.all([
        AutomationService.fetchWorkflowsAsync(),
        AutomationService.fetchExecutionsAsync(),
        AutomationService.fetchSettingsAsync()
      ]);
      if (isMounted) {
        setWorkflows(wfs);
        setExecutions(execs);
        setSettings(stts);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [activeTab]);

  // Handle 1-click Activation of Template
  const handleActivateTemplate = (tmplId: string) => {
    const existing = workflows.find(w => w.templateId === tmplId);
    let updated: AutomationWorkflow[];

    if (existing) {
      updated = workflows.map(w => w.id === existing.id ? { ...w, status: 'active' } : w);
    } else {
      const templateDef = PREBUILT_WORKFLOW_TEMPLATES.find(t => t.id === tmplId);
      if (templateDef) {
        const newWf: AutomationWorkflow = {
          id: `wf_${templateDef.id}_${Date.now()}`,
          name: templateDef.title,
          description: templateDef.shortDescription,
          category: templateDef.category,
          triggerType: templateDef.trigger,
          status: 'active',
          version: 1,
          config: { ...templateDef.defaultConfig },
          stats: {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            lastExecutedAt: undefined
          },
          isTemplate: false,
          templateId: templateDef.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        updated = [newWf, ...workflows];
      } else {
        updated = workflows;
      }
    }

    const activatedTitle = PREBUILT_WORKFLOW_TEMPLATES.find(t => t.id === tmplId)?.title || existing?.name || 'Template';
    AutomationService.saveWorkflows(updated);
    setWorkflows(updated);
    setTestNotification(`Activated "${activatedTitle}" workflow! Switched to My Workflows.`);
    setActiveTab('my_workflows');
    setTimeout(() => setTestNotification(null), 4000);
  };

  // Handle Trigger Test Event
  const handleTriggerTestEvent = (triggerType: string) => {
    const testContact = contacts[0] || {
      id: 'cnt_demo',
      name: 'Ramesh Verma',
      phone: '+91 98765 43210',
      email: 'ramesh@example.com'
    };

    const res = AutomationService.triggerWorkflow(triggerType as any, {
      contact: testContact,
      clinicName: 'Sri Sai Dental Clinic',
      doctorName: 'Dr. Prasad'
    });

    setExecutions(AutomationService.getExecutions());
    setWorkflows(AutomationService.getWorkflows());

    setTestNotification(`Simulated "${triggerType}" trigger! Dispatched ${res.executed} active workflow execution log.`);
    setTimeout(() => setTestNotification(null), 4000);
  };

  // Handle Dry-run Test of a Workflow
  const handleRunTestWorkflow = (wf: AutomationWorkflow) => {
    const testContact = contacts[0] || {
      id: 'cnt_demo',
      name: 'Anitha Rao',
      phone: '+91 91234 56789'
    };

    const result = AutomationService.testWorkflow(wf, testContact as Contact, appointments[0]);
    setTestNotification(`Dry-Run Test Passed for "${wf.name}"! Message Preview: ${result.previewMessage.substring(0, 60)}...`);
    setTimeout(() => setTestNotification(null), 5000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Toast Notification Banner */}
      {testNotification && (
        <div className="bg-[#176B72] text-white p-3.5 rounded-2xl shadow-md flex items-center justify-between text-xs font-bold animate-fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span>{testNotification}</span>
          </div>
          <button onClick={() => setTestNotification(null)} className="text-white hover:text-slate-200 cursor-pointer">✕</button>
        </div>
      )}

      {/* Main Section Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black font-display text-slate-900 tracking-tight flex items-center gap-2">
              Automation & Workflows Center
            </h1>
            <span className="px-2.5 py-0.5 bg-teal-50 text-[#176B72] font-extrabold text-[10px] rounded-full border border-teal-100">
              Phase D Architecture
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Turnkey customer engagement, appointment reminders, Google Calendar sync, and WhatsApp automation.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => handleTriggerTestEvent('appointment_created')}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-200 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Simulate Booking</span>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className="px-4 py-2 bg-[#176B72] hover:bg-[#13585e] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>New Automation</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: Zap },
          { id: 'templates', label: 'Workflow Templates (10)', icon: Sparkles },
          { id: 'my_workflows', label: 'My Workflows', icon: Layers },
          { id: 'executions', label: 'Execution Activity', icon: Activity },
          { id: 'message_templates', label: 'Message Templates', icon: MessageSquare },
          { id: 'settings', label: 'Settings & Safeguards', icon: ShieldCheck }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#176B72] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Views */}
      {activeTab === 'overview' && (
        <OverviewSection
          workflows={workflows}
          executions={executions}
          onNavigateTab={setActiveTab}
          onActivateTemplate={handleActivateTemplate}
          onSelectExecution={setSelectedExecution}
          onTriggerTestEvent={handleTriggerTestEvent}
        />
      )}

      {activeTab === 'templates' && (
        <TemplatesSection
          onActivateTemplate={handleActivateTemplate}
          onCustomizeTemplate={(tmpl) => {
            setActiveTab('my_workflows');
          }}
        />
      )}

      {activeTab === 'my_workflows' && (
        <MyWorkflowsSection
          workflows={workflows}
          onUpdateWorkflows={setWorkflows}
          onRunTestWorkflow={handleRunTestWorkflow}
          contacts={contacts}
          appointments={appointments}
        />
      )}

      {activeTab === 'executions' && (
        <ExecutionActivitySection
          executions={executions}
          selectedExecution={selectedExecution}
          onSelectExecution={setSelectedExecution}
          onRetryExecution={(exec) => {
            handleTriggerTestEvent(exec.triggerType);
            setSelectedExecution(null);
          }}
        />
      )}

      {activeTab === 'message_templates' && (
        <MessageTemplatesSection
          templates={templates}
          onAddTemplate={onAddTemplate}
          onDeleteTemplate={onDeleteTemplate}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsSection
          settings={settings}
          onUpdateSettings={setSettings}
        />
      )}

    </div>
  );
};
