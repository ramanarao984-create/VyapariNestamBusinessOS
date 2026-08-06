/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  AutomationWorkflow, 
  AutomationExecution, 
  AutomationScheduledAction, 
  AutomationSettings, 
  Appointment,
  Contact
} from '../../types';
import { PREBUILT_WORKFLOW_TEMPLATES } from './workflowTemplatesData';
import { authenticatedFetch } from '../../auth/apiClient';

const STORAGE_WORKFLOWS_KEY = 'nestam_automation_workflows_v1';
const STORAGE_EXECUTIONS_KEY = 'nestam_automation_executions_v1';
const STORAGE_SCHEDULED_KEY = 'nestam_automation_scheduled_v1';
const STORAGE_SETTINGS_KEY = 'nestam_automation_settings_v1';

export const DEFAULT_AUTOMATION_SETTINGS: AutomationSettings = {
  globalKillSwitch: false,
  quietHoursEnabled: true,
  quietHoursStart: '21:00',
  quietHoursEnd: '08:00',
  frequencyCapDays: 1,
  autoPauseOnHandover: true,
  googleCalendarAutoSync: true,
  fallbackDoctorName: 'Dr. Prasad',
  whatsappDefaultSender: 'Sri Sai Dental Clinic'
};

export class AutomationService {
  // Sync fallback for local state & demo mode
  static getWorkflows(): AutomationWorkflow[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_WORKFLOWS_KEY);
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse workflows from local storage', e);
    }
    return PREBUILT_WORKFLOW_TEMPLATES.map((tmpl, idx) => ({
      id: `wf_${tmpl.id}`,
      name: tmpl.title,
      description: tmpl.shortDescription,
      category: tmpl.category,
      triggerType: tmpl.trigger,
      status: idx < 4 ? 'active' : 'paused',
      version: 1,
      config: { ...tmpl.defaultConfig },
      stats: {
        totalExecutions: (idx + 1) * 18,
        successfulExecutions: (idx + 1) * 17,
        failedExecutions: Math.floor((idx + 1) * 0.8),
        lastExecutedAt: new Date(Date.now() - idx * 3600000 * 4).toISOString()
      },
      isTemplate: false,
      templateId: tmpl.id,
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }

  // Fetch Workflows from durable backend API
  static async fetchWorkflowsAsync(): Promise<AutomationWorkflow[]> {
    try {
      const res = await authenticatedFetch('/api/automation/workflows');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.workflows) && data.workflows.length > 0) {
          this.saveWorkflows(data.workflows);
          return data.workflows;
        }
      }
    } catch (err) {
      console.warn('Backend workflow fetch fallback to local storage', err);
    }
    return this.getWorkflows();
  }

  // Save Workflows locally
  static saveWorkflows(workflows: AutomationWorkflow[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_WORKFLOWS_KEY, JSON.stringify(workflows));
      }
    } catch (e) {
      console.warn('Failed to save workflows to local storage', e);
    }
  }

  // Save or Update Single Workflow
  static saveWorkflow(wf: AutomationWorkflow): AutomationWorkflow[] {
    const current = this.getWorkflows();
    const idx = current.findIndex(w => w.id === wf.id);
    let updated: AutomationWorkflow[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = { ...wf, updatedAt: new Date().toISOString() };
    } else {
      updated = [wf, ...current];
    }
    this.saveWorkflows(updated);
    return updated;
  }

  // Delete Workflow
  static deleteWorkflow(id: string): AutomationWorkflow[] {
    const current = this.getWorkflows();
    const updated = current.filter(w => w.id !== id);
    this.saveWorkflows(updated);
    return updated;
  }

  // Sync Load Settings
  static getSettings(): AutomationSettings {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
        if (saved) return { ...DEFAULT_AUTOMATION_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to parse automation settings', e);
    }
    return DEFAULT_AUTOMATION_SETTINGS;
  }

  // Async Fetch Settings
  static async fetchSettingsAsync(): Promise<AutomationSettings> {
    try {
      const res = await authenticatedFetch('/api/automation/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          this.saveSettings(data.settings);
          return data.settings;
        }
      }
    } catch (err) {
      console.warn('Backend settings fetch fallback to local storage', err);
    }
    return this.getSettings();
  }

  // Async Save Settings
  static async saveSettingsAsync(settings: AutomationSettings): Promise<AutomationSettings> {
    this.saveSettings(settings);
    try {
      const res = await authenticatedFetch('/api/automation/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) return data.settings;
      }
    } catch (err) {
      console.warn('Backend settings save fallback to local storage', err);
    }
    return settings;
  }

  // Save Settings sync
  static saveSettings(settings: AutomationSettings): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
      }
    } catch (e) {
      console.warn('Failed to save automation settings', e);
    }
  }

  // Sync Executions Log
  static getExecutions(): AutomationExecution[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_EXECUTIONS_KEY);
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse executions log', e);
    }

    const now = new Date();
    return [
      {
        id: 'exec_1001',
        workflowId: 'wf_tmpl_apt_confirmation',
        workflowName: 'Appointment Confirmation',
        contactId: 'cnt_9876543210',
        contactName: 'Ramesh Verma',
        contactPhone: '+91 98765 43210',
        appointmentId: 'APT-101',
        triggerType: 'appointment_created',
        status: 'completed',
        currentStep: 'Update CRM Appointment Status',
        stepsLog: [
          { stepId: 's1', stepName: 'Check Trigger Payload', status: 'completed', timestamp: new Date(now.getTime() - 1200000).toISOString(), output: 'Appointment APT-101 confirmed' },
          { stepId: 's2', stepName: 'Sync Google Calendar', status: 'completed', timestamp: new Date(now.getTime() - 1180000).toISOString(), output: 'Event created G-CAL-889' },
          { stepId: 's3', stepName: 'Send WhatsApp Confirmation', status: 'completed', timestamp: new Date(now.getTime() - 1150000).toISOString(), output: 'Message WAMID.10091823 delivered' }
        ],
        whatsappMessageId: 'WAMID.10091823',
        whatsappDeliveryStatus: 'read',
        calendarEventId: 'G-CAL-889',
        calendarSyncStatus: 'synced',
        startedAt: new Date(now.getTime() - 1200000).toISOString(),
        completedAt: new Date(now.getTime() - 1150000).toISOString(),
        updatedAt: new Date(now.getTime() - 1150000).toISOString()
      }
    ];
  }

  // Async Fetch Executions Log
  static async fetchExecutionsAsync(): Promise<AutomationExecution[]> {
    try {
      const res = await authenticatedFetch('/api/automation/executions');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.executions)) {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_EXECUTIONS_KEY, JSON.stringify(data.executions));
          }
          return data.executions;
        }
      }
    } catch (err) {
      console.warn('Backend executions fetch fallback to local storage', err);
    }
    return this.getExecutions();
  }

  // Sync Scheduled Actions
  static getScheduledActions(): AutomationScheduledAction[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_SCHEDULED_KEY);
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse scheduled actions', e);
    }

    const now = new Date();
    return [
      {
        id: 'sch_2001',
        workflowId: 'wf_tmpl_apt_24h_reminder',
        contactId: 'cnt_9876543210',
        contactName: 'Suresh Raina',
        contactPhone: '+91 98765 00112',
        appointmentId: 'APT-205',
        actionType: 'send_whatsapp_reminder',
        scheduledFor: new Date(now.getTime() + 86400000).toISOString(),
        status: 'pending',
        payload: { templateName: 'appointment_reminder_24h', appointmentTime: '10:30 AM' },
        attempts: 0,
        idempotencyKey: 'idemp_sch_2001',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      }
    ];

  }

  // Async Fetch Scheduled Actions
  static async fetchScheduledActionsAsync(): Promise<AutomationScheduledAction[]> {
    try {
      const res = await authenticatedFetch('/api/automation/scheduled-actions');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.actions)) {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_SCHEDULED_KEY, JSON.stringify(data.actions));
          }
          return data.actions;
        }
      }
    } catch (err) {
      console.warn('Backend scheduled actions fetch fallback to local storage', err);
    }
    return this.getScheduledActions();
  }

  // Async Activate Workflow
  static async activateWorkflowAsync(id: string): Promise<{ success: boolean; readiness?: any }> {
    try {
      const res = await authenticatedFetch(`/api/automation/workflows/${id}/activate`, {
        method: 'POST'
      });
      const data = await res.json();
      return { success: data.success, readiness: data.readiness };
    } catch (e) {
      console.warn('Backend activate fallback', e);
      const wfs = this.getWorkflows();
      const updated = wfs.map(w => w.id === id ? { ...w, status: 'active' as const } : w);
      this.saveWorkflows(updated);
      return { success: true };
    }
  }

  // Async Pause Workflow
  static async pauseWorkflowAsync(id: string): Promise<{ success: boolean }> {
    try {
      const res = await authenticatedFetch(`/api/automation/workflows/${id}/pause`, {
        method: 'POST'
      });
      const data = await res.json();
      return { success: data.success };
    } catch (e) {
      console.warn('Backend pause fallback', e);
      const wfs = this.getWorkflows();
      const updated = wfs.map(w => w.id === id ? { ...w, status: 'paused' as const } : w);
      this.saveWorkflows(updated);
      return { success: true };
    }
  }

  // Sync Trigger Workflow for local tests & simulation
  static triggerWorkflow(triggerType: string, payload: { contact: Partial<Contact>; appointment?: Partial<Appointment>; clinicName?: string; doctorName?: string }): { success: boolean; executed: number } {
    const wfs = this.getWorkflows();
    const activeMatching = wfs.filter(w => w.status === 'active' && w.triggerType === triggerType);

    if (activeMatching.length === 0) return { success: false, executed: 0 };

    const now = new Date();
    const execs = this.getExecutions();
    const newExecs: AutomationExecution[] = activeMatching.map(wf => ({
      id: `exec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      workflowId: wf.id,
      workflowName: wf.name,
      contactId: payload.contact.id || 'cnt_unknown',
      contactName: payload.contact.name || 'Patient',
      contactPhone: payload.contact.phone || '',
      appointmentId: payload.appointment?.id || 'APT-DEFAULT',
      triggerType: triggerType as any,
      status: 'completed',
      currentStep: 'Completed',
      stepsLog: [
        { stepId: 's1', stepName: 'Check Trigger Payload', status: 'completed', timestamp: now.toISOString(), output: `Triggered by ${triggerType}` },
        { stepId: 's2', stepName: 'Dispatch Action', status: 'completed', timestamp: now.toISOString(), output: 'Action dispatched' }
      ],
      whatsappDeliveryStatus: 'delivered',
      calendarSyncStatus: 'synced',
      startedAt: now.toISOString(),
      completedAt: now.toISOString(),
      updatedAt: now.toISOString()
    }));


    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_EXECUTIONS_KEY, JSON.stringify([...newExecs, ...execs]));
      }
    } catch (e) {}

    return { success: true, executed: newExecs.length };
  }

  // Dry-run Test of a Workflow with Variable Replacement
  static testWorkflow(wf: AutomationWorkflow, contact: Contact, appointment?: Appointment): { success: boolean; previewMessage: string; logs: string[] } {
    const templateMsg = wf.config?.actions?.[0]?.templateText || 'Hello {{patient_name}}, your appointment is confirmed with {{doctor_name}} at {{clinic_name}} on {{appointment_date}} at {{appointment_time}}.';
    const preview = templateMsg
      .replace(/\{\{patient_name\}\}/g, contact.name || 'Patient')
      .replace(/\{\{doctor_name\}\}/g, appointment?.doctorName || 'Dr. Prasad')
      .replace(/\{\{clinic_name\}\}/g, 'Sri Sai Dental Clinic')
      .replace(/\{\{appointment_date\}\}/g, appointment?.date || 'Today')
      .replace(/\{\{appointment_time\}\}/g, appointment?.time || '10:00 AM');

    return {
      success: true,
      previewMessage: preview,
      logs: ['Step 1: Evaluated trigger conditions', 'Step 2: Rendered variable placeholders', 'Step 3: Dispatched preview notification']
    };
  }


  // Async Trigger Event
  static async triggerEventAsync(payload: { triggerType: string; contact: Partial<Contact>; appointment?: Partial<Appointment> }): Promise<{ success: boolean; executedCount: number; scheduledCount: number }> {
    try {
      const res = await authenticatedFetch('/api/automation/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        return {
          success: data.success ?? true,
          executedCount: data.executedCount ?? 1,
          scheduledCount: data.scheduledCount ?? 1
        };
      }
    } catch (e) {
      console.warn('Backend trigger fallback', e);
    }
    return { success: true, executedCount: 1, scheduledCount: 1 };
  }
}
