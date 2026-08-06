import { WorkflowTemplateDef } from '../../types';

export const PREBUILT_WORKFLOW_TEMPLATES: WorkflowTemplateDef[] = [
  {
    id: 'tmpl_apt_confirmation',
    title: 'Appointment Confirmation',
    shortDescription: 'Instantly send a WhatsApp confirmation with Google Calendar event, clinic location, and Confirm/Reschedule buttons upon booking.',
    trigger: 'appointment_created',
    triggerDisplay: 'When Appointment Created or Booked',
    category: 'appointment',
    channel: 'WhatsApp',
    estimatedSetupMinutes: 2,
    recommendedFor: 'Clinics, Salons, Consultants, All Appointment Businesses',
    defaultConfig: {
      templateName: 'appointment_confirmation_v1',
      templateLanguage: 'en_US',
      googleCalendarSync: true,
      stopOnHumanReply: false,
      messageBody: 'Hello {{patient_name}}, your appointment at {{clinic_name}} with {{doctor_name}} is confirmed for {{appointment_date}} at {{appointment_time}}.'
    },
    stepsOverview: [
      'Create / Update Google Calendar Event',
      'Send WhatsApp Confirmation Template',
      'Listen for WhatsApp Confirm / Reschedule / Cancel action',
      'Update CRM Appointment Status & Record Log'
    ]
  },
  {
    id: 'tmpl_apt_24h_reminder',
    title: '24-Hour Appointment Reminder',
    shortDescription: 'Send an automated reminder 24 hours prior to appointment with quick interactive options to reduce no-shows.',
    trigger: 'appointment_24h_before',
    triggerDisplay: '24 Hours Before Appointment Start',
    category: 'reminder',
    channel: 'WhatsApp',
    estimatedSetupMinutes: 2,
    recommendedFor: 'Dental Clinics, Medical Practices, High-value Consultations',
    defaultConfig: {
      delayMinutes: 1440, // 24h = 1440 mins
      quietHoursStart: '21:00',
      quietHoursEnd: '08:00',
      templateName: 'appointment_24h_reminder_v1',
      stopOnHumanReply: true,
      messageBody: 'Reminder: Hello {{patient_name}}, your visit to {{clinic_name}} is scheduled for tomorrow at {{appointment_time}}. Please reply CONFIRM or RESCHEDULE.'
    },
    stepsOverview: [
      'Evaluate 24h Trigger & Consent Status',
      'Verify 24h Meta Window & Quiet Hours',
      'Send WhatsApp Reminder Message',
      'Notify Staff if Reschedule Requested'
    ]
  },
  {
    id: 'tmpl_apt_1h_reminder',
    title: '1-Hour Appointment Reminder',
    shortDescription: 'Send a quick 1-hour arrival reminder with map directions link and "On my way" button.',
    trigger: 'appointment_1h_before',
    triggerDisplay: '60 Minutes Before Appointment Start',
    category: 'reminder',
    channel: 'WhatsApp',
    estimatedSetupMinutes: 1,
    recommendedFor: 'High-volume Walk-in and Scheduled Practices',
    defaultConfig: {
      delayMinutes: 60,
      templateName: 'appointment_1h_reminder_v1',
      messageBody: 'See you soon! Your appointment at {{clinic_name}} is in 1 hour ({{appointment_time}}). Location link: {{clinic_location_url}}'
    },
    stepsOverview: [
      'Check Active Appointment Status',
      'Send Arrival WhatsApp Message with Directions',
      'Log Delivery Status in Execution Audit Trail'
    ]
  },
  {
    id: 'tmpl_apt_noshow_followup',
    title: 'No-Show Follow-Up',
    shortDescription: 'Empathetically reach out 30 mins after a missed appointment to re-engage the patient and offer convenient rescheduling.',
    trigger: 'appointment_noshow',
    triggerDisplay: 'When Appointment Status is NO_SHOW',
    category: 'followup',
    channel: 'WhatsApp',
    estimatedSetupMinutes: 3,
    recommendedFor: 'Patient Retention & Practice Revenue Recovery',
    defaultConfig: {
      delayMinutes: 30,
      stopOnHumanReply: true,
      messageBody: 'We missed you today at {{clinic_name}}, {{patient_name}}! Would you like to reschedule for another convenient time?'
    },
    stepsOverview: [
      'Detect NO_SHOW Status Change',
      'Send Empathetic Re-engagement WhatsApp Message',
      'Fetch Real Open Slots via Availability Service',
      'Alert Receptionist on Positive Reply'
    ]
  },
  {
    id: 'tmpl_whatsapp_reschedule_assistant',
    title: 'WhatsApp Reschedule Assistant',
    shortDescription: 'Automated interactive assistant that presents open slots when a patient asks to reschedule and updates CRM & Google Calendar.',
    trigger: 'whatsapp_reschedule_requested',
    triggerDisplay: 'When Patient Clicks "Reschedule" or Replies with Intent',
    category: 'appointment',
    channel: 'WhatsApp',
    estimatedSetupMinutes: 3,
    recommendedFor: 'Automated Reception & Frontdesk Load Reduction',
    defaultConfig: {
      googleCalendarSync: true,
      stopOnHumanReply: true,
      messageBody: 'Here are the next available slots for {{doctor_name}}:\n1. Tomorrow at 10:00 AM\n2. Tomorrow at 03:30 PM\n3. Day after at 11:00 AM\nReply with your preferred slot number.'
    },
    stepsOverview: [
      'Query Genuine Open Slots from Appointment Engine',
      'Present Top 3 Available Slots on WhatsApp',
      'Re-verify Availability & Book Slot Concurrency-Safe',
      'Update Google Calendar & Reschedule Reminders'
    ]
  },
  {
    id: 'tmpl_post_visit_thankyou',
    title: 'Post-Visit Thank You',
    shortDescription: 'Send post-treatment care instructions and a warm thank-you message shortly after appointment completion.',
    trigger: 'appointment_completed',
    triggerDisplay: '30-60 Minutes After Appointment Completed',
    category: 'followup',
    channel: 'WhatsApp',
    estimatedSetupMinutes: 2,
    recommendedFor: 'Post-op Clinics, Dental Post-care, Service Follow-up',
    defaultConfig: {
      delayMinutes: 45,
      messageBody: 'Thank you for visiting {{clinic_name}} today, {{patient_name}}! Here are your post-visit recommendations: {{aftercare_notes}}. Let us know if you need any support.'
    },
    stepsOverview: [
      'Detect Completed Appointment Status',
      'Format Safe Post-visit Care Guidance',
      'Send Post-visit WhatsApp Message',
      'Schedule Review Request for Later'
    ]
  },
  {
    id: 'tmpl_google_review_request',
    title: 'Google Review Request',
    shortDescription: 'Send a neutral Google Business review invitation to happy clients after a completed visit (strictly non-gated).',
    trigger: 'appointment_completed',
    triggerDisplay: '4 Hours After Appointment Completed',
    category: 'review',
    channel: 'WhatsApp',
    estimatedSetupMinutes: 2,
    recommendedFor: 'Local SEO, Google Rating Growth & Trust Building',
    defaultConfig: {
      delayMinutes: 240, // 4 hours
      frequencyCapDays: 30,
      messageBody: 'Hope you had a great experience at {{clinic_name}}, {{patient_name}}! Please take 30 seconds to share your review on Google: {{google_review_link}}'
    },
    stepsOverview: [
      'Check Frequency Cap & Past Review Requests',
      'Validate Configured Google Business Profile URL',
      'Send Neutral Review Request Link on WhatsApp',
      'Track Click and Engagement Metrics'
    ]
  },
  {
    id: 'tmpl_treatment_followup',
    title: 'Treatment or Service Follow-Up',
    shortDescription: 'Follow up 24-48 hours post-procedure to check recovery status and route concerning replies to a doctor or receptionist.',
    trigger: 'treatment_followup',
    triggerDisplay: '24 Hours After Special Procedure',
    category: 'followup',
    channel: 'WhatsApp',
    estimatedSetupMinutes: 3,
    recommendedFor: 'Surgical Procedures, Root Canal, Cosmetic Treatments',
    defaultConfig: {
      delayMinutes: 1440,
      stopOnHumanReply: true,
      messageBody: 'Hi {{patient_name}}, this is {{clinic_name}} checking in on your recovery after {{treatment_name}}. How are you feeling today?'
    },
    stepsOverview: [
      'Send Post-procedure Check-in Question',
      'Monitor Patient Reply for Distress Keywords',
      'Escalate Urgently to Assigned Doctor/Staff if Needed',
      'Pause Automation on Human Handover'
    ]
  },
  {
    id: 'tmpl_new_lead_followup',
    title: 'New Lead Instant Response',
    shortDescription: 'Instantly welcome new inquiries from WhatsApp or Web, notify staff, and send a structured welcome packet.',
    trigger: 'lead_created',
    triggerDisplay: 'Immediately when New Lead Registered',
    category: 'lead',
    channel: 'WhatsApp',
    estimatedSetupMinutes: 2,
    recommendedFor: 'Lead Conversion, New Inquiries & Walk-in Leads',
    defaultConfig: {
      delayMinutes: 0,
      messageBody: 'Welcome to {{clinic_name}}, {{patient_name}}! Thank you for reaching out. How can we assist you with your health and smile today?'
    },
    stepsOverview: [
      'Trigger Instant WhatsApp Welcome Message',
      'Notify Duty Receptionist / Staff Member',
      'Track Initial Response Time & Lead Stage'
    ]
  },
  {
    id: 'tmpl_inactive_customer_recall',
    title: 'Inactive Customer Recall',
    shortDescription: 'Re-engage patients who haven\'t visited in 6+ months with a gentle check-up reminder and easy booking link.',
    trigger: 'inactive_customer',
    triggerDisplay: 'When Last Visit Exceeds 180 Days',
    category: 'recall',
    channel: 'WhatsApp',
    estimatedSetupMinutes: 3,
    recommendedFor: 'Patient Retention, Dental Hygiene Check-ups, Annual Recalls',
    defaultConfig: {
      frequencyCapDays: 90,
      messageBody: 'Hi {{patient_name}}, it has been over 6 months since your last dental check-up at {{clinic_name}}. Preventive care keeps your smile healthy! Book your visit: {{booking_link}}'
    },
    stepsOverview: [
      'Filter Patients Inactive for > 180 Days',
      'Exclude Opted-out & Recently Contacted Patients',
      'Send Friendly Recall WhatsApp Message',
      'Measure Re-booking & Recovered Revenue'
    ]
  }
];
