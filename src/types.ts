/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ContactCategory = 'Lead' | 'Active' | 'Inactive' | 'Follow-up';

export interface Contact {
  id: string; // Phone number or unique ID
  name: string;
  phone: string; // formatted WhatsApp number, e.g. +1234567890
  email?: string; // Contact's email address
  category: ContactCategory;
  notes: string;
  lastContacted: string; // ISO date string or "Never"
  createdAt: string; // ISO date string
  treatmentType?: string;
  treatmentValue?: number;
  amountCollected?: number;
  paymentMethod?: 'UPI/PhonePe' | 'Card (Debit/Credit)' | 'Cash' | 'Net Banking' | 'Insurance / EMI' | string;
  pipelineStage?: 'Inquiry' | 'Scheduled' | 'Visited' | 'Treatment' | 'Completed';
  photos?: string[];
  aiAutopilot?: boolean;
  source?: 'WhatsApp' | 'Phone' | 'Website' | 'Walk-in';
  isRepeat?: boolean;
  isFamily?: boolean;
  familyRelation?: 'Spouse' | 'Child' | 'Parent' | 'Sibling' | 'Other Family' | string;
  primaryFamilyMember?: string;
}

export type InteractionType = 'WhatsApp Sent' | 'Incoming Message' | 'Phone Call' | 'In-Person' | 'Email' | 'Calendar Follow-up' | 'Note';

export interface Interaction {
  id: string;
  contactId: string;
  contactName: string;
  type: InteractionType;
  notes: string;
  outcome?: string;
  timestamp: string; // ISO date string
}

export interface MessageTemplate {
  id: string;
  title: string;
  category: string;
  text: string;
}

export interface AIKnowledgeBase {
  timings: string;
  treatments: string;
  doctors: string;
  reviews: string;
  workflow: string;
}

export interface AIChatTurn {
  id: string;
  contactId: string;
  prompt: string;
  response: string;
  timestamp: string;
  schedulingSuggestion?: {
    shouldSchedule: boolean;
    summary: string;
    date: string;
    time: string;
    description: string;
  };
}

export interface UpcomingFollowUp {
  id: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  summary: string;
  description: string;
  start: string; // ISO date string
  end: string; // ISO date string
}

export interface AutomationRule {
  id: string;
  name?: string;
  trigger?: 'keyword' | 'first_message' | 'outside_hours' | 'appointment_booked' | string;
  triggerKeyword?: string;
  conditionValue?: string;
  action?: 'send_reply' | 'assign_agent' | 'schedule_followup' | 'alert_staff' | string;
  actionType?: string;
  actionValue?: string;
  templateId?: string;
  isActive: boolean;
  category?: 'clinical' | 'marketing' | 'scheduler' | 'support' | string;
}

export type WorkflowTriggerType = 
  | 'appointment_created'
  | 'appointment_24h_before'
  | 'appointment_1h_before'
  | 'appointment_noshow'
  | 'appointment_completed'
  | 'lead_created'
  | 'inactive_customer'
  | 'whatsapp_reschedule_requested'
  | 'treatment_followup'
  | 'manual';

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'error' | 'archived';

export interface WorkflowNodeStep {
  id: string;
  type: 'trigger' | 'whatsapp_template' | 'whatsapp_message' | 'wait_delay' | 'calendar_sync' | 'condition' | 'assign_staff' | 'human_handover' | 'update_status' | 'end';
  title: string;
  config: Record<string, any>;
  nextStepId?: string;
  errorStepId?: string;
  position?: { x: number; y: number };
}

export interface AutomationWorkflow {
  id: string;
  tenantId?: string;
  name: string;
  description: string;
  category: 'appointment' | 'reminder' | 'followup' | 'lead' | 'recall' | 'review';
  triggerType: WorkflowTriggerType;
  status: WorkflowStatus;
  version: number;
  config: {
    delayMinutes?: number;
    quietHoursStart?: string; // e.g. "21:00"
    quietHoursEnd?: string;   // e.g. "08:00"
    templateName?: string;
    templateLanguage?: string;
    messageBody?: string;
    googleCalendarSync?: boolean;
    stopOnHumanReply?: boolean;
    frequencyCapDays?: number;
    steps?: WorkflowNodeStep[];
    [key: string]: any;
  };
  stats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    lastExecutedAt?: string;
  };
  isTemplate?: boolean;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface ExecutionStepLog {
  stepId: string;
  stepName: string;
  status: 'completed' | 'failed' | 'skipped' | 'waiting';
  timestamp: string;
  output?: string;
  error?: string;
}

export interface AutomationExecution {
  id: string;
  tenantId?: string;
  workflowId: string;
  workflowName: string;
  contactId?: string;
  contactName?: string;
  contactPhone?: string;
  appointmentId?: string;
  triggerType: WorkflowTriggerType;
  status: 'scheduled' | 'running' | 'waiting' | 'completed' | 'partially_completed' | 'failed' | 'cancelled' | 'needs_attention' | 'skipped';

  currentStep?: string;
  stepsLog: ExecutionStepLog[];
  whatsappMessageId?: string;
  whatsappDeliveryStatus?: 'sent' | 'delivered' | 'read' | 'replied' | 'failed' | 'skipped';
  calendarEventId?: string;
  calendarSyncStatus?: 'synced' | 'failed' | 'skipped' | 'not_applicable';
  errorCode?: string;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  updatedAt: string;
}

export interface AutomationScheduledAction {
  id: string;
  tenantId?: string;
  workflowId: string;
  contactId: string;
  contactName?: string;
  contactPhone: string;
  appointmentId?: string;
  actionType: string;
  scheduledFor: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'failed';
  payload: Record<string, any>;
  attempts: number;
  lastError?: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowTemplateDef {
  id: string;
  title: string;
  shortDescription: string;
  trigger: WorkflowTriggerType;
  triggerDisplay: string;
  category: 'appointment' | 'reminder' | 'followup' | 'lead' | 'recall' | 'review';
  channel: 'WhatsApp';
  estimatedSetupMinutes: number;
  recommendedFor: string;
  defaultConfig: Partial<AutomationWorkflow['config']>;
  stepsOverview: string[];
}

export interface AutomationSettings {
  globalKillSwitch: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "21:00"
  quietHoursEnd: string;   // "08:00"
  frequencyCapDays: number; // 1
  autoPauseOnHandover: boolean;
  googleCalendarAutoSync: boolean;
  fallbackDoctorName: string;
  whatsappDefaultSender: string;
}





export interface ChatbotNode {
  id: string;
  title: string;
  type?: 'start' | 'send_message' | 'quick_reply' | 'question' | 'condition' | 'send_to_human' | 'end' | 'image' | 'template' | 'action';
  triggerKeyword: string;
  botResponse: string;
  isRoot: boolean;
  parentNodeId?: string | null;
  actionType?: 'calendar' | 'none' | 'alert_staff' | 'show_prices' | 'webhook' | 'create_lead';
  options?: string[];
  saveUserResponse?: boolean;
  captureAs?: string;
  nextStep?: string;
}

export interface ScheduledReminder {
  id: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  title: string;
  scheduledTime: string; // ISO or local datetime string
  reminderType: 'WhatsApp' | 'Email' | 'Both';
  message: string;
  status: 'Scheduled' | 'Sent' | 'Failed';
  triggerOffsetMinutes: number; // minutes before scheduledTime to send reminder
  createdAt: string;
}

export interface Doctor {
  id: string;
  name: string;
  title: string;
  avatar: string;
  color?: string;
  phone?: string;
  email?: string;
  specialty?: string;
  totalAppts?: number;
  availableDays?: string[];
}

export interface Appointment {
  id: string;
  docId: string;
  doctorName?: string;
  patientName: string;
  patientPhone?: string;
  patientId?: string;
  treatment: string;
  time: string; // e.g. "09:00 AM - 10:00 AM" or ISO
  date?: string; // e.g. "2026-07-17"
  status: 'Confirmed' | 'In Treatment' | 'Completed' | 'Walk-in Slot' | 'Lunch/Break' | 'Blocked' | 'Cancelled' | 'No-Show';
  type: 'confirmed' | 'completed' | 'walkin' | 'break' | 'blocked' | 'cancelled' | 'noshow';

  notes?: string;
}

export interface RevenueLog {
  id: string;
  contactId: string;
  contactName: string;
  amountCollected: number;
  treatmentType: string;
  timestamp: string;
  notes: string;
}



