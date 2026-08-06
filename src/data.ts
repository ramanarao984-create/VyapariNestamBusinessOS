/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Contact, Interaction, MessageTemplate } from './types';

export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 't-1',
    title: 'Dental Appointment Confirmation',
    category: 'Scheduler',
    text: 'Namaste {{name}} garu! This is {{senderName}} from {{businessName}} in Vijayawada. Your dental consultation is scheduled for {{dateTime}}. Please let us know if you need to reschedule. Keep smiling! 🦷✨',
  },
  {
    id: 't-2',
    title: 'Root Canal / Extraction Care Care',
    category: 'Support',
    text: 'Dear {{name}} garu, we hope you are recovering well after your dental procedure at {{businessName}}. Remember to: 1. Avoid hot foods/drinks for 24 hours. 2. Take prescribed medicines on time. 3. Call us if pain persists. Get well soon! 🙏',
  },
  {
    id: 't-3',
    title: '6-Month Routine Cleaning Recall',
    category: 'Marketing',
    text: 'Hi {{name}} garu! It has been 6 months since your last dental cleaning. Regular scaling keeps your teeth strong and prevents cavities. Book your clean-up session this week with {{businessName}} and get a free dental hygiene kit! Call/WhatsApp us to select a time. 🦷',
  },
  {
    id: 't-4',
    title: 'Dental Implant Inquiry Reply',
    category: 'Sales',
    text: 'Namaste {{name}} garu, thank you for inquiring about Dental Implants at {{businessName}}. Our chief implantologist is available this Wednesday. Would you like to schedule a digital X-ray and diagnostic scan? Best regards, {{senderName}}.',
  },
  {
    id: 't-5',
    title: 'Orthodontic / Braces Adjustment',
    category: 'Scheduler',
    text: 'Hello {{name}} garu! Friendly reminder from {{businessName}} that your braces adjustment appointment is due on {{dateTime}}. Regular tuning ensures your smile alignment stays on track! See you soon. 🦷😁',
  },
  {
    id: 't-6',
    title: 'Patient Feedback & Review',
    category: 'Support',
    text: 'Dear {{name}} garu! Thank you for choosing {{businessName}} for your dental treatment. Your review helps other patients in Vijayawada find quality dental care. Please share your rating here: {{reviewLink}} Thank you! 🌟',
  }
];

export const MOCK_CONTACTS: Contact[] = [
  {
    id: 'c-1',
    name: 'Ravi Teja Varma',
    phone: '+919440552671',
    category: 'Active',
    notes: 'Undergoing Root Canal Treatment (RCT) for lower molar. Needs adjustment and final crown measurement follow-up.',
    lastContacted: '2026-07-12T14:30:00Z',
    createdAt: '2026-06-15T09:00:00Z',
    treatmentType: 'Root Canal Treatment (RCT)',
    treatmentValue: 4500,
    amountCollected: 3000,
    paymentMethod: 'UPI/PhonePe',
    pipelineStage: 'Treatment',
    source: 'Walk-in',
    isRepeat: true,
  },
  {
    id: 'c-2',
    name: 'Nishitha Rao',
    phone: '+919848012345',
    category: 'Lead',
    notes: 'Inquired about Smile Designing & teeth whitening costs via WhatsApp. Sent full dental treatment catalog.',
    lastContacted: '2026-07-10T11:15:00Z',
    createdAt: '2026-07-09T08:30:00Z',
    treatmentType: 'Laser Teeth Whitening',
    treatmentValue: 6000,
    amountCollected: 0,
    paymentMethod: undefined,
    pipelineStage: 'Inquiry',
    source: 'WhatsApp',
    isRepeat: false,
  },
  {
    id: 'c-3',
    name: 'Prasad Babu',
    phone: '+919959123456',
    category: 'Follow-up',
    notes: 'Pediatric dental consult for child (cavity filling). Scheduled pediatric scaling, pending slot verification.',
    lastContacted: '2026-07-08T16:00:00Z',
    createdAt: '2026-07-01T10:15:00Z',
    treatmentType: 'Pediatric Cavity Filling',
    treatmentValue: 1800,
    amountCollected: 1800,
    paymentMethod: 'Cash',
    pipelineStage: 'Scheduled',
    source: 'Phone',
    isRepeat: false,
  },
  {
    id: 'c-4',
    name: 'Srinivas Murthy',
    phone: '+918639559821',
    category: 'Inactive',
    notes: 'Braces treatment completed in April. Re-engagement required for retainers and follow-up orthodontic checkup.',
    lastContacted: '2026-04-12T09:45:00Z',
    createdAt: '2026-03-01T14:00:00Z',
    treatmentType: 'Orthodontic Braces',
    treatmentValue: 35000,
    amountCollected: 35000,
    paymentMethod: 'Card (Debit/Credit)',
    pipelineStage: 'Completed',
    source: 'Website',
    isRepeat: true,
  },
  {
    id: 'c-5',
    name: 'Harika Prasad Garu',
    phone: '+919100223344',
    category: 'Follow-up',
    notes: 'Visited clinic for Dental Implant evaluation. Dr. Prasad recommended a single molar implant. Needs budget plan follow-up.',
    lastContacted: '2026-07-13T10:15:00Z',
    createdAt: '2026-07-05T11:00:00Z',
    treatmentType: 'Dental Implant',
    treatmentValue: 30000,
    amountCollected: 10000,
    paymentMethod: 'UPI/PhonePe',
    pipelineStage: 'Visited',
    source: 'Walk-in',
    isRepeat: true,
  },
  {
    id: 'c-6',
    name: 'Kiran Kumar Reddy',
    phone: '+918008889999',
    category: 'Lead',
    notes: 'Inbound inquiry via WhatsApp regarding composite veneers for front teeth spacing.',
    lastContacted: '2026-07-13T09:30:00Z',
    createdAt: '2026-07-13T09:30:00Z',
    treatmentType: 'Composite Veneers',
    treatmentValue: 12000,
    amountCollected: 0,
    paymentMethod: undefined,
    pipelineStage: 'Inquiry',
    source: 'WhatsApp',
    isRepeat: false,
  }
];

export const MOCK_INTERACTIONS: Interaction[] = [
  {
    id: 'i-1',
    contactId: 'c-1',
    contactName: 'Ravi Teja Varma',
    type: 'WhatsApp Sent',
    notes: 'Sent dental appointment confirmation for dental X-ray and diagnostic scan.',
    outcome: 'Confirmed and arrived on time',
    timestamp: '2026-06-15T09:05:00Z'
  },
  {
    id: 'i-2',
    contactId: 'c-1',
    contactName: 'Ravi Teja Varma',
    type: 'Phone Call',
    notes: 'Call to review post-procedure tooth pain and check if antibiotics are being taken regular.',
    outcome: 'Pain subsided, next crown fit scheduled',
    timestamp: '2026-07-02T15:00:00Z'
  },
  {
    id: 'i-3',
    contactId: 'c-1',
    contactName: 'Ravi Teja Varma',
    type: 'WhatsApp Sent',
    notes: 'Sent post-op instructions card via click-to-chat.',
    outcome: 'Acknowledged and thanked clinic',
    timestamp: '2026-07-12T14:30:00Z'
  },
  {
    id: 'i-4',
    contactId: 'c-2',
    contactName: 'Nishitha Rao',
    type: 'Incoming Message',
    notes: 'Received initial WhatsApp query: "Hello, looking for cost details for orthodontic invisible aligners. Do you offer EMI?"',
    outcome: 'Lead categorized in active system',
    timestamp: '2026-07-09T08:30:00Z'
  },
  {
    id: 'i-5',
    contactId: 'c-2',
    contactName: 'Nishitha Rao',
    type: 'WhatsApp Sent',
    notes: 'Sent Dental aligner brochure with customizable interest-free monthly installment plan details.',
    outcome: 'Requested clinic slot for oral scan',
    timestamp: '2026-07-10T11:15:00Z'
  },
  {
    id: 'i-6',
    contactId: 'c-3',
    contactName: 'Prasad Babu',
    type: 'WhatsApp Sent',
    notes: 'Sent 6-Month routine checkup message for Pediatric cavity checkup.',
    outcome: 'Patient asked to book for upcoming weekend',
    timestamp: '2026-07-08T16:00:00Z'
  },
  {
    id: 'i-7',
    contactId: 'c-4',
    contactName: 'Srinivas Murthy',
    type: 'Phone Call',
    notes: 'Routine checkup reminder call for orthodontic retainer check.',
    outcome: 'Not active, said will call back when in Vijayawada next month',
    timestamp: '2026-04-12T09:45:00Z'
  }
];
