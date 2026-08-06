/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient, isSupabaseConfigured } from '../../supabase/client';
import { 
  AutomationWorkflow, 
  AutomationExecution, 
  AutomationScheduledAction, 
  AutomationSettings, 
  Appointment, 
  Contact 
} from '../../types';
import { PREBUILT_WORKFLOW_TEMPLATES } from './workflowTemplatesData';
import { OutboundService } from '../whatsapp/OutboundService';
import { WhatsAppConnectionService } from '../whatsapp/WhatsAppConnectionService';
import { ConsentService } from '../whatsapp/ConsentService';
import { logger } from '../metadata/logger';

export interface TriggerEventPayload {
  triggerType: string;
  contact: Partial<Contact>;
  appointment?: Partial<Appointment>;
  metadata?: Record<string, any>;
}

export interface ReadinessCheckResult {
  ready: boolean;
  status: 'READY' | 'WARNING' | 'BLOCKING';
  errors: string[];
  warnings: string[];
}

export class DurableAutomationEngine {
  /**
   * Fetch or seed tenant automation settings
   */
  public static async getSettings(tenantId: string): Promise<AutomationSettings> {
    const defaultSettings: AutomationSettings = {
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

    if (!isSupabaseConfigured()) return defaultSettings;

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('automation_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        logger.warn('DurableAutomationEngine', `Failed to fetch settings for ${tenantId}`, error);
        return defaultSettings;
      }

      if (!data) {
        // Seed default
        await supabase.from('automation_settings').insert({
          tenant_id: tenantId,
          global_kill_switch: defaultSettings.globalKillSwitch,
          quiet_hours_enabled: defaultSettings.quietHoursEnabled,
          quiet_hours_start: defaultSettings.quietHoursStart,
          quiet_hours_end: defaultSettings.quietHoursEnd,
          frequency_cap_days: defaultSettings.frequencyCapDays,
          auto_pause_on_handover: defaultSettings.autoPauseOnHandover,
          google_calendar_auto_sync: defaultSettings.googleCalendarAutoSync,
          fallback_doctor_name: defaultSettings.fallbackDoctorName,
          whatsapp_default_sender: defaultSettings.whatsappDefaultSender,
        });
        return defaultSettings;
      }

      return {
        globalKillSwitch: data.global_kill_switch ?? false,
        quietHoursEnabled: data.quiet_hours_enabled ?? true,
        quietHoursStart: data.quiet_hours_start ?? '21:00',
        quietHoursEnd: data.quiet_hours_end ?? '08:00',
        frequencyCapDays: data.frequency_cap_days ?? 1,
        autoPauseOnHandover: data.auto_pause_on_handover ?? true,
        googleCalendarAutoSync: data.google_calendar_auto_sync ?? true,
        fallbackDoctorName: data.fallback_doctor_name ?? 'Dr. Prasad',
        whatsappDefaultSender: data.whatsapp_default_sender ?? 'Sri Sai Dental Clinic'
      };
    } catch (e) {
      logger.error('DurableAutomationEngine', `Error in getSettings for ${tenantId}`, e);
      return defaultSettings;
    }
  }

  /**
   * Update tenant automation settings
   */
  public static async updateSettings(tenantId: string, updates: Partial<AutomationSettings>): Promise<AutomationSettings> {
    const current = await this.getSettings(tenantId);
    const updated = { ...current, ...updates };

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('automation_settings').upsert({
          tenant_id: tenantId,
          global_kill_switch: updated.globalKillSwitch,
          quiet_hours_enabled: updated.quietHoursEnabled,
          quiet_hours_start: updated.quietHoursStart,
          quiet_hours_end: updated.quietHoursEnd,
          frequency_cap_days: updated.frequencyCapDays,
          auto_pause_on_handover: updated.autoPauseOnHandover,
          google_calendar_auto_sync: updated.googleCalendarAutoSync,
          fallback_doctor_name: updated.fallbackDoctorName,
          whatsapp_default_sender: updated.whatsappDefaultSender,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id' });
      } catch (e) {
        logger.error('DurableAutomationEngine', `Failed to update settings for ${tenantId}`, e);
      }
    }

    return updated;
  }

  /**
   * Fetch all workflows for tenant from Supabase, or seed initial prebuilts if none exist
   */
  public static async getWorkflows(tenantId: string): Promise<AutomationWorkflow[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('automation_workflows')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('DurableAutomationEngine', `Failed to load workflows for tenant ${tenantId}`, error);
        return [];
      }

      if (!data || data.length === 0) {
        // Seed default template workflows into Supabase
        const seeded: AutomationWorkflow[] = [];
        const nowIso = new Date().toISOString();

        for (let idx = 0; idx < PREBUILT_WORKFLOW_TEMPLATES.length; idx++) {
          const tmpl = PREBUILT_WORKFLOW_TEMPLATES[idx];
          const wf: AutomationWorkflow = {
            id: `wf_${tenantId}_${tmpl.id}`,
            name: tmpl.title,
            description: tmpl.shortDescription,
            category: tmpl.category,
            triggerType: tmpl.trigger,
            status: idx < 4 ? 'active' : 'paused',
            version: 1,
            config: { ...tmpl.defaultConfig },
            stats: {
              totalExecutions: 0,
              successfulExecutions: 0,
              failedExecutions: 0,
              lastExecutedAt: undefined
            },
            isTemplate: false,
            templateId: tmpl.id,
            createdAt: nowIso,
            updatedAt: nowIso
          };

          await supabase.from('automation_workflows').insert({
            id: wf.id,
            tenant_id: tenantId,
            name: wf.name,
            description: wf.description,
            category: wf.category,
            trigger_type: wf.triggerType,
            status: wf.status,
            version: wf.version,
            config: wf.config,
            stats: wf.stats,
            is_template: wf.isTemplate,
            template_id: wf.templateId,
            created_at: wf.createdAt,
            updated_at: wf.updatedAt
          });

          seeded.push(wf);
        }
        return seeded;
      }

      return data.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        triggerType: row.trigger_type,
        status: row.status,
        version: row.version,
        config: row.config || {},
        stats: row.stats || { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0 },
        isTemplate: row.is_template,
        templateId: row.template_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (e) {
      logger.error('DurableAutomationEngine', `Error in getWorkflows for ${tenantId}`, e);
      return [];
    }
  }

  /**
   * Get single workflow by ID
   */
  public static async getWorkflowById(tenantId: string, workflowId: string): Promise<AutomationWorkflow | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('automation_workflows')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('id', workflowId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        category: data.category,
        triggerType: data.trigger_type,
        status: data.status,
        version: data.version,
        config: data.config || {},
        stats: data.stats || { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0 },
        isTemplate: data.is_template,
        templateId: data.template_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Validate activation readiness for a workflow
   */
  public static async validateActivationReadiness(tenantId: string, workflow: AutomationWorkflow): Promise<ReadinessCheckResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check WhatsApp connection
    try {
      const conn = await WhatsAppConnectionService.getConnectionForTenant(tenantId);
      if (!conn || conn.connection_status !== 'connected') {
        errors.push('WhatsApp connection is missing or disconnected.');
      }
    } catch (e) {
      warnings.push('Could not verify WhatsApp connection status.');
    }


    // Check actions exist
    const actions = workflow.config?.actions || [];
    if (actions.length === 0) {
      errors.push('Workflow must contain at least one action.');
    }

    // Check trigger type
    if (!workflow.triggerType) {
      errors.push('Workflow trigger type is invalid or missing.');
    }

    const isReady = errors.length === 0;
    return {
      ready: isReady,
      status: !isReady ? 'BLOCKING' : warnings.length > 0 ? 'WARNING' : 'READY',
      errors,
      warnings
    };
  }

  /**
   * Activate workflow
   */
  public static async activateWorkflow(tenantId: string, actorUid: string, workflowId: string): Promise<{ success: boolean; workflow?: AutomationWorkflow; readiness?: ReadinessCheckResult }> {
    const wf = await this.getWorkflowById(tenantId, workflowId);
    if (!wf) return { success: false };

    const readiness = await this.validateActivationReadiness(tenantId, wf);
    if (!readiness.ready) {
      return { success: false, readiness };
    }

    const nowIso = new Date().toISOString();
    const updatedVersion = wf.version + 1;

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      await supabase
        .from('automation_workflows')
        .update({
          status: 'active',
          version: updatedVersion,
          updated_at: nowIso
        })
        .eq('tenant_id', tenantId)
        .eq('id', workflowId);
    }

    wf.status = 'active';
    wf.version = updatedVersion;
    wf.updatedAt = nowIso;

    return { success: true, workflow: wf, readiness };
  }

  /**
   * Pause workflow
   */
  public static async pauseWorkflow(tenantId: string, workflowId: string): Promise<{ success: boolean }> {
    const nowIso = new Date().toISOString();

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      await supabase
        .from('automation_workflows')
        .update({
          status: 'paused',
          updated_at: nowIso
        })
        .eq('tenant_id', tenantId)
        .eq('id', workflowId);
    }

    return { success: true };
  }

  /**
   * Get audit log execution records
   */
  public static async getExecutions(tenantId: string, limit: number = 50): Promise<AutomationExecution[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('automation_executions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error || !data) return [];

      return data.map(row => ({
        id: row.id,
        workflowId: row.workflow_id,
        workflowName: row.workflow_name,
        contactId: row.contact_id || '',
        contactName: row.contact_name || 'Patient',
        contactPhone: row.contact_phone || '',
        appointmentId: row.appointment_id,
        triggerType: row.trigger_type,
        status: row.status,
        currentStep: row.current_step,
        stepsLog: row.steps_log || [],
        whatsappMessageId: row.whatsapp_message_id,
        whatsappDeliveryStatus: row.whatsapp_delivery_status,
        calendarEventId: row.calendar_event_id,
        calendarSyncStatus: row.calendar_sync_status,
        errorCode: row.error_code,
        errorMessage: row.error_message,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        updatedAt: row.updated_at || row.started_at
      }));

    } catch (e) {
      return [];
    }
  }

  /**
   * Get upcoming durable scheduled actions
   */
  public static async getScheduledActions(tenantId: string, limit: number = 50): Promise<AutomationScheduledAction[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('automation_scheduled_actions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('scheduled_for', { ascending: true })
        .limit(limit);

      if (error || !data) return [];

      return data.map(row => ({
        id: row.id,
        workflowId: row.workflow_id,
        contactId: row.contact_id,
        contactName: row.contact_name || '',
        contactPhone: row.contact_phone,
        appointmentId: row.appointment_id,
        actionType: row.action_type,
        scheduledFor: row.scheduled_for,
        status: row.status,
        payload: row.payload || {},
        attempts: row.attempts,
        lastError: row.last_error,
        idempotencyKey: row.idempotency_key,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (e) {
      return [];
    }
  }

  /**
   * Trigger automation event (appointment_created, appointment_24h_before, appointment_1h_before, appointment_rescheduled, appointment_cancelled, appointment_completed, appointment_noshow)
   */
  /**
   * Record appointment mutation in durable outbox and trigger automation
   */
  public static async recordOutboxEvent(tenantId: string, payload: TriggerEventPayload): Promise<{ success: boolean; outboxId: string; executedCount: number; scheduledCount: number }> {
    const { triggerType, appointment } = payload;
    const apptId = appointment?.id || `appt_${Date.now()}`;
    const idempotencyKey = `outbox_${tenantId}_${apptId}_${triggerType}`;
    const outboxId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('appointment_outbox_events').upsert({
          id: outboxId,
          tenant_id: tenantId,
          appointment_id: apptId,
          trigger_type: triggerType,
          payload,
          status: 'PENDING',
          idempotency_key: idempotencyKey,
          created_at: new Date().toISOString()
        });
      } catch (err: any) {
        logger.warn('DurableAutomationEngine', `Outbox table record warning for tenant ${tenantId}`, err);
      }
    }

    const autoRes = await this.triggerEvent(tenantId, payload);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('appointment_outbox_events').update({
          status: 'PROCESSED',
          processed_at: new Date().toISOString()
        }).eq('idempotency_key', idempotencyKey);
      } catch (err: any) {
        logger.warn('DurableAutomationEngine', `Outbox update warning`, err);
      }
    }

    return {
      success: autoRes.success,
      outboxId,
      executedCount: autoRes.executedCount,
      scheduledCount: autoRes.scheduledCount
    };
  }

  /**
   * Recover unfulfilled outbox events (asynchronous crash recovery pass)
   */
  public static async processUnprocessedOutboxEvents(tenantId?: string): Promise<{ recoveredCount: number }> {
    if (!isSupabaseConfigured()) return { recoveredCount: 0 };
    let recoveredCount = 0;
    try {
      const supabase = getSupabaseClient();
      let query = supabase.from('appointment_outbox_events').select('*').eq('status', 'PENDING');
      if (tenantId) query = query.eq('tenant_id', tenantId);

      const { data, error } = await query.limit(20);
      if (error || !data || data.length === 0) return { recoveredCount: 0 };

      for (const row of data) {
        await this.triggerEvent(row.tenant_id, row.payload);
        await supabase.from('appointment_outbox_events').update({
          status: 'PROCESSED',
          processed_at: new Date().toISOString()
        }).eq('id', row.id);
        recoveredCount++;
      }
    } catch (e) {
      logger.error('DurableAutomationEngine', 'Error recovering outbox events', e);
    }
    return { recoveredCount };
  }

  public static async triggerEvent(tenantId: string, payload: TriggerEventPayload): Promise<{ success: boolean; executedCount: number; scheduledCount: number; errors?: string[] }> {
    const { triggerType, contact, appointment } = payload;
    if (!triggerType || !contact?.phone) {
      return { success: false, executedCount: 0, scheduledCount: 0, errors: ['Invalid trigger payload'] };
    }

    const settings = await this.getSettings(tenantId);
    if (settings.globalKillSwitch) {
      logger.info('DurableAutomationEngine', `Trigger skipped due to global kill switch for tenant ${tenantId}`);
      return { success: true, executedCount: 0, scheduledCount: 0 };
    }

    const workflows = await this.getWorkflows(tenantId);
    const activeMatching = workflows.filter(w => w.status === 'active' && w.triggerType === triggerType);

    if (activeMatching.length === 0) {
      return { success: true, executedCount: 0, scheduledCount: 0 };
    }

    const cleanPhone = contact.phone.replace(/[^0-9]/g, '');
    let executedCount = 0;
    let scheduledCount = 0;

    const supabase = isSupabaseConfigured() ? getSupabaseClient() : null;

    for (const wf of activeMatching) {
      const now = new Date();
      const executionId = `exec_${tenantId}_${wf.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const apptId = appointment?.id || `appt_${Date.now()}`;

      // Calculate scheduled time based on workflow config offset or appointment time
      let scheduledForTime = new Date();

      if (triggerType === 'appointment_24h_before' && appointment?.date) {
        const apptDateStr = `${appointment.date} ${appointment.time || '09:00 AM'}`;
        const apptDate = new Date(apptDateStr);
        if (!isNaN(apptDate.getTime())) {
          scheduledForTime = new Date(apptDate.getTime() - 24 * 60 * 60 * 1000);
        }
      } else if (triggerType === 'appointment_1h_before' && appointment?.date) {
        const apptDateStr = `${appointment.date} ${appointment.time || '09:00 AM'}`;
        const apptDate = new Date(apptDateStr);
        if (!isNaN(apptDate.getTime())) {
          scheduledForTime = new Date(apptDate.getTime() - 60 * 60 * 1000);
        }
      } else {
        // Immediate trigger
        scheduledForTime = now;
      }

      // If scheduled time is in the past by > 1 hour for reminder triggers, mark as skipped
      const isPast = scheduledForTime.getTime() < (now.getTime() - 60 * 60 * 1000);
      const executionStatus = isPast ? 'skipped' : 'scheduled';

      const executionRecord: AutomationExecution = {
        id: executionId,
        workflowId: wf.id,
        workflowName: wf.name,
        contactId: contact.id || cleanPhone,
        contactName: contact.name || 'Patient',
        contactPhone: cleanPhone,
        appointmentId: apptId,
        triggerType: triggerType as any,
        status: executionStatus as any,
        currentStep: 'Triggered',
        stepsLog: [{
          stepId: 'step_trigger',
          stepName: 'Event Triggered',
          status: 'completed',
          timestamp: now.toISOString(),
          output: `Triggered by ${triggerType}`
        }],
        startedAt: now.toISOString(),
        updatedAt: now.toISOString()
      };


      if (supabase) {
        await supabase.from('automation_executions').insert({
          id: executionRecord.id,
          tenant_id: tenantId,
          workflow_id: wf.id,
          workflow_name: wf.name,
          contact_id: executionRecord.contactId,
          contact_name: executionRecord.contactName,
          contact_phone: cleanPhone,
          appointment_id: apptId,
          trigger_type: triggerType,
          status: executionStatus,
          current_step: 'Triggered',
          steps_log: executionRecord.stepsLog,
          started_at: executionRecord.startedAt
        });

        if (!isPast) {
          const actionId = `act_${tenantId}_${executionId}`;
          const idempotencyKey = `idempotent_${tenantId}_${wf.id}_${apptId}_${triggerType}`;

          await supabase.from('automation_scheduled_actions').insert({
            id: actionId,
            tenant_id: tenantId,
            workflow_id: wf.id,
            execution_id: executionId,
            contact_id: executionRecord.contactId,
            contact_name: executionRecord.contactName,
            contact_phone: cleanPhone,
            appointment_id: apptId,
            action_type: wf.config?.actions?.[0]?.type || 'send_whatsapp_reminder',
            scheduled_for: scheduledForTime.toISOString(),
            status: 'pending',
            payload: {
              templateName: wf.config?.actions?.[0]?.templateName || 'appointment_reminder',
              patientName: contact.name || 'Patient',
              appointmentDate: appointment?.date || 'Today',
              appointmentTime: appointment?.time || '09:00 AM',
              doctorName: appointment?.doctorName || settings.fallbackDoctorName
            },
            idempotency_key: idempotencyKey,
            created_at: now.toISOString(),
            updated_at: now.toISOString()
          });

          scheduledCount++;
        }
      }

      executedCount++;
    }

    return { success: true, executedCount, scheduledCount };
  }

  /**
   * Handle Appointment Rescheduled event - cancels obsolete scheduled actions for appointment and re-schedules
   */
  public static async handleAppointmentRescheduled(tenantId: string, appointmentId: string, newDate: string, newTime: string, contact: Partial<Contact>): Promise<void> {
    if (!isSupabaseConfigured()) return;

    try {
      const supabase = getSupabaseClient();
      
      // Cancel obsolete pending actions
      await supabase
        .from('automation_scheduled_actions')
        .update({
          status: 'cancelled',
          last_error: 'Obsoleted by appointment rescheduling',
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', tenantId)
        .eq('appointment_id', appointmentId)
        .eq('status', 'pending');

      // Trigger rescheduled event
      await this.triggerEvent(tenantId, {
        triggerType: 'appointment_rescheduled',
        contact,
        appointment: {
          id: appointmentId,
          date: newDate,
          time: newTime
        }
      });
    } catch (e) {
      logger.error('DurableAutomationEngine', `Failed handleAppointmentRescheduled for ${appointmentId}`, e);
    }
  }

  /**
   * Handle Appointment Cancelled event - cancels future reminders
   */
  public static async handleAppointmentCancelled(tenantId: string, appointmentId: string, contact: Partial<Contact>): Promise<void> {
    if (!isSupabaseConfigured()) return;

    try {
      const supabase = getSupabaseClient();

      // Cancel future pending actions
      await supabase
        .from('automation_scheduled_actions')
        .update({
          status: 'cancelled',
          last_error: 'Cancelled due to appointment cancellation',
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', tenantId)
        .eq('appointment_id', appointmentId)
        .eq('status', 'pending');

      // Trigger cancelled event log
      await this.triggerEvent(tenantId, {
        triggerType: 'appointment_cancelled',
        contact,
        appointment: { id: appointmentId }
      });
    } catch (e) {
      logger.error('DurableAutomationEngine', `Failed handleAppointmentCancelled for ${appointmentId}`, e);
    }
  }

  /**
   * Process due scheduled actions atomically (Vercel Cron / Worker)
   */
  public static async processDueActions(workerId: string = 'cron_worker', batchSize: number = 20): Promise<{ processed: number; succeeded: number; failed: number; skipped: number }> {
    if (!isSupabaseConfigured()) {
      return { processed: 0, succeeded: 0, failed: 0, skipped: 0 };
    }

    const supabase = getSupabaseClient();
    let claimedRows: any[] = [];

    try {
      // 1. Try atomic claim via RPC function
      const { data, error } = await supabase.rpc('claim_due_automation_actions', {
        p_worker_id: workerId,
        p_batch_size: batchSize,
        p_lease_seconds: 60
      });

      if (!error && data) {
        claimedRows = data;
      } else {
        // Fallback query if RPC not present in staging yet
        const nowIso = new Date().toISOString();
        const { data: fallbackData } = await supabase
          .from('automation_scheduled_actions')
          .select('*')
          .or(`status.eq.pending,status.eq.SCHEDULED,and(status.eq.processing,lease_expires_at.lt.${nowIso})`)
          .lte('scheduled_for', nowIso)
          .lt('attempts', 5)
          .order('scheduled_for', { ascending: true })
          .limit(batchSize);

        if (fallbackData && fallbackData.length > 0) {
          const idsToClaim = fallbackData.map(r => r.id);
          const leaseExp = new Date(Date.now() + 60000).toISOString();
          
          await supabase
            .from('automation_scheduled_actions')
            .update({
              status: 'processing',
              claimed_by: workerId,
              claimed_at: nowIso,
              lease_expires_at: leaseExp,
              updated_at: nowIso
            })
            .in('id', idsToClaim);

          claimedRows = fallbackData;
        }
      }
    } catch (claimErr) {
      logger.error('DurableAutomationEngine', 'Error during atomic claim step', claimErr);
      return { processed: 0, succeeded: 0, failed: 0, skipped: 0 };
    }

    if (claimedRows.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0, skipped: 0 };
    }

    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    for (const action of claimedRows) {
      const tenantId = action.tenant_id;
      const settings = await this.getSettings(tenantId);

      // Check kill switch
      if (settings.globalKillSwitch) {
        await supabase.from('automation_scheduled_actions').update({
          status: 'skipped',
          last_error: 'Global kill switch enabled',
          updated_at: new Date().toISOString()
        }).eq('id', action.id);
        skipped++;
        continue;
      }

      // Check quiet hours
      if (settings.quietHoursEnabled) {
        const now = new Date();
        const currentHours = now.getHours();
        const [startH] = settings.quietHoursStart.split(':').map(Number);
        const [endH] = settings.quietHoursEnd.split(':').map(Number);

        const inQuietHours = startH > endH 
          ? (currentHours >= startH || currentHours < endH)
          : (currentHours >= startH && currentHours < endH);

        if (inQuietHours) {
          // Reschedule action after quiet hours end
          const nextValid = new Date();
          nextValid.setHours(endH, 5, 0, 0);
          if (nextValid <= now) nextValid.setDate(nextValid.getDate() + 1);

          await supabase.from('automation_scheduled_actions').update({
            status: 'pending',
            scheduled_for: nextValid.toISOString(),
            last_error: 'Postponed due to tenant quiet hours',
            updated_at: new Date().toISOString()
          }).eq('id', action.id);
          skipped++;
          continue;
        }
      }

      // Check Consent
      const consentStatus = await ConsentService.getConsentStatus(tenantId, action.contact_phone);
      if (consentStatus === 'opted_out') {
        await supabase.from('automation_scheduled_actions').update({
          status: 'skipped',
          last_error: 'Consent blocked: Patient opted out',
          updated_at: new Date().toISOString()
        }).eq('id', action.id);

        if (action.execution_id) {
          await supabase.from('automation_executions').update({
            status: 'skipped',
            error_code: 'CONSENT_BLOCKED',
            error_message: 'Patient opted out',
            completed_at: new Date().toISOString()
          }).eq('id', action.execution_id);
        }

        skipped++;
        continue;
      }


      // Dispatch WhatsApp message via OutboundService
      const payload = action.payload || {};
      const templateName = payload.templateName || 'appointment_reminder';
      const patientName = payload.patientName || action.contact_name || 'Patient';
      const appointmentTime = payload.appointmentTime || '09:00 AM';

      try {
        const enqueueRes = await OutboundService.enqueueOutboundJob(
          tenantId,
          `auto_job_${action.id}`,
          action.contact_phone,
          {
            tenantId,
            recipientPhone: action.contact_phone,
            messageType: 'template',
            templateName,
            templateLanguage: 'en_US',
            source: 'automation',
            templateComponents: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: patientName },
                  { type: 'text', text: appointmentTime }
                ]
              }
            ]
          }
        );

        // Update action & execution status
        await supabase.from('automation_scheduled_actions').update({
          status: 'completed',
          whatsapp_outbound_job_id: enqueueRes.jobId,
          updated_at: new Date().toISOString()
        }).eq('id', action.id);

        if (action.execution_id) {
          await supabase.from('automation_executions').update({
            status: 'completed',
            whatsapp_delivery_status: 'sent',
            completed_at: new Date().toISOString()
          }).eq('id', action.execution_id);
        }

        succeeded++;
      } catch (err: any) {
        logger.error('DurableAutomationEngine', `Failed processing action ${action.id}`, err);
        const attempts = (action.attempts || 0) + 1;
        const newStatus = attempts >= (action.max_attempts || 5) ? 'failed' : 'pending';

        await supabase.from('automation_scheduled_actions').update({
          status: newStatus,
          attempts,
          last_error: err.message || 'Execution error',
          updated_at: new Date().toISOString()
        }).eq('id', action.id);

        if (action.execution_id && newStatus === 'failed') {
          await supabase.from('automation_executions').update({
            status: 'failed',
            error_code: 'OUTBOUND_DISPATCH_FAILED',
            error_message: err.message || 'Failed outbound dispatch',
            completed_at: new Date().toISOString()
          }).eq('id', action.execution_id);
        }

        failed++;
      }
    }

    return { processed: claimedRows.length, succeeded, failed, skipped };
  }
}
