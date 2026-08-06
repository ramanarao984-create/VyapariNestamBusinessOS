import { Contact, MessageTemplate, AIKnowledgeBase, AutomationRule, ChatbotNode } from './types';

export type IndustryType = 
  | 'dental'
  | 'general_medical'
  | 'pediatric'
  | 'gynecology'
  | 'orthopedic'
  | 'dermatology'
  | 'physiotherapy'
  | 'diagnostics'
  | 'eye_ent'
  | 'multispecialty'
  | 'solo_practitioner'
  | 'wellness';

export interface IndustryTerminology {
  patientLabel: string;
  patientsLabel: string;
  treatmentLabel: string;
  treatmentTypeLabel: string;
  doctorLabel: string;
  doctorsLabel: string;
  costLabel: string;
  intakeLabel: string;
  detailsLabel: string;
  patient?: string;
  appointment?: string;
  enquiry?: string;
  consultation?: string;
  doctor?: string;
  procedure?: string;
}

export interface IndustryStage {
  id: 'Inquiry' | 'Scheduled' | 'Visited' | 'Treatment' | 'Completed';
  label: string;
  iconName: string;
}

export interface ServiceCatalogItem {
  id: string;
  name: string;
  category: string;
  durationMinutes: number;
  costInINR: number;
  description: string;
}

export interface IndustryDefinition {
  id: IndustryType;
  name: string;
  icon: string;
  description?: string;
  colorTheme: string; // Tailwind bg color class for header
  accentColor: string; // Tailwind text color class

  terminology: IndustryTerminology;
  stages: IndustryStage[];
  defaultTemplates: MessageTemplate[];
  mockContacts: Contact[];
  aiKnowledgeBase: AIKnowledgeBase;
  defaultBusinessName: string;
  defaultSenderName: string;
  defaultReviewLink: string;
  defaultServices: ServiceCatalogItem[];
  defaultAutomationRules: AutomationRule[];
  defaultChatbotNodes: ChatbotNode[];
}

export const APPROVED_MEDICAL_SECTOR_IDS: IndustryType[] = [
  'dental',
  'general_medical',
  'pediatric',
  'gynecology',
  'orthopedic',
  'dermatology',
  'physiotherapy',
  'diagnostics',
  'eye_ent',
  'multispecialty',
  'solo_practitioner',
  'wellness',
];

const RAW_INDUSTRIES: Record<IndustryType, IndustryDefinition> = {
  dental: {
    id: 'dental',
    name: 'Dental Clinic',
    icon: '🦷',
    colorTheme: 'bg-emerald-600',
    accentColor: 'text-emerald-700',
    defaultBusinessName: 'Sri Sai Dental Clinic',
    defaultSenderName: 'Dr. Prasad',
    defaultReviewLink: 'https://g.page/srisaidental-vijayawada/review',
    terminology: {
      patientLabel: 'Patient',
      patientsLabel: 'Patients',
      treatmentLabel: 'Dental Treatment',
      treatmentTypeLabel: 'Treatment Type',
      doctorLabel: 'Dentist',
      doctorsLabel: 'Dentists',
      costLabel: 'Treatment Cost (₹)',
      intakeLabel: 'New Patient Intake',
      detailsLabel: 'Clinical details'
    },
    stages: [
      { id: 'Inquiry', label: 'Inquiry (Lead)', iconName: 'MessageSquare' },
      { id: 'Scheduled', label: 'Scheduled (Booked)', iconName: 'Calendar' },
      { id: 'Visited', label: 'Visited (Consulted)', iconName: 'UserCheck' },
      { id: 'Treatment', label: 'Treatment Underway', iconName: 'Activity' },
      { id: 'Completed', label: 'Completed (Done)', iconName: 'CheckCircle2' }
    ],
    defaultServices: [
      { id: 's-den-1', name: 'Scaling & Polishing', category: 'Preventive', durationMinutes: 30, costInINR: 1000, description: 'Routine ultrasonic dental cleaning and plaque removal.' },
      { id: 's-den-2', name: 'Root Canal Treatment (RCT)', category: 'Endodontics', durationMinutes: 60, costInINR: 4500, description: 'Single/multi-visit painless RCT with apex locator.' },
      { id: 's-den-3', name: 'Single Tooth Dental Implant', category: 'Implantology', durationMinutes: 60, costInINR: 30000, description: 'Titanium implant placement with CAD/CAM crown.' },
      { id: 's-den-4', name: 'Laser Teeth Whitening', category: 'Cosmetic', durationMinutes: 45, costInINR: 6000, description: 'In-office instant teeth whitening session.' }
    ],
    defaultTemplates: [
      {
        id: 't-den-1',
        title: 'Dental Appointment Confirmation',
        category: 'Scheduler',
        text: 'Namaste {{name}} garu! This is {{senderName}} from {{businessName}}. Your dental consultation is scheduled for {{dateTime}}. Please let us know if you need to reschedule. Keep smiling! 🦷✨',
      },
      {
        id: 't-den-2',
        title: 'Post-op Recovery Support',
        category: 'Support',
        text: 'Dear {{name}} garu, we hope you are recovering well after your dental procedure at {{businessName}}. Remember to: 1. Avoid hot foods/drinks for 24 hours. 2. Take prescribed medicines on time. Get well soon! 🙏',
      },
      {
        id: 't-den-3',
        title: '6-Month Routine Recall',
        category: 'Marketing',
        text: 'Hi {{name}} garu! It has been 6 months since your last dental cleaning. Regular scaling keeps your teeth strong. Book your clean-up session this week with {{businessName}}! 🦷',
      }
    ],
    mockContacts: [
      {
        id: 'c-den-1',
        name: 'Ravi Teja Varma',
        phone: '+919440552671',
        category: 'Active',
        notes: 'Undergoing Root Canal Treatment (RCT) for lower molar.',
        lastContacted: '2026-07-12T14:30:00Z',
        createdAt: '2026-06-15T09:00:00Z',
        treatmentType: 'Root Canal Treatment (RCT)',
        treatmentValue: 4500,
        pipelineStage: 'Treatment',
      }
    ],
    aiKnowledgeBase: {
      timings: 'Monday - Saturday: 9:00 AM to 1:00 PM and 4:00 PM to 8:00 PM. Sundays: Emergency cases only.',
      treatments: 'Root Canal Treatment (RCT): ₹3,500 - ₹5,000.\nDental Implant: ₹25,000 - ₹40,000.\nScaling & Polishing: ₹800 - ₹1,500.',
      doctors: 'Dr. Prasad, B.D.S, M.D.S (Endodontist & Chief Implantologist) - 12 years experience.\nDr. Swetha, B.D.S (Pediatric Dentist).',
      reviews: 'Google Rating: 4.9/5 stars based on over 450 local reviews.',
      workflow: '1. Patient registration.\n2. Digital X-ray analysis (₹200).\n3. Consultation & treatment explanation.\n4. Appointment scheduling.'
    },
    defaultAutomationRules: [
      { id: 'ar-den-1', triggerKeyword: 'dental appointment', actionType: 'send_template', templateId: 't-den-1', isActive: true },
      { id: 'ar-den-2', triggerKeyword: 'rct price', actionType: 'send_text', templateId: '', isActive: true }
    ],
    defaultChatbotNodes: [
      {
        id: 'node-den-root',
        title: 'Dental Main Menu',
        triggerKeyword: 'hi',
        botResponse: 'Namaste! Welcome to {{businessName}}. How can we assist you today?\n1. Timings & Location\n2. Treatments & Costs\n3. Dentists Profile\n4. Book Appointment',
        isRoot: true,
        actionType: 'none'
      }
    ]
  },

  general_medical: {
    id: 'general_medical',
    name: 'General Medical Clinic',
    icon: '🩺',
    colorTheme: 'bg-teal-600',
    accentColor: 'text-teal-700',
    defaultBusinessName: 'Aarogya Family Clinic',
    defaultSenderName: 'Dr. Ramesh Kumar',
    defaultReviewLink: 'https://g.page/aarogyafamilyclinic/review',
    terminology: {
      patientLabel: 'Patient',
      patientsLabel: 'Patients',
      treatmentLabel: 'Consultation',
      treatmentTypeLabel: 'Specialty / Consultation Type',
      doctorLabel: 'General Physician',
      doctorsLabel: 'Doctors',
      costLabel: 'Consultation Fee (₹)',
      intakeLabel: 'Patient Registration',
      detailsLabel: 'Clinical complaints'
    },
    stages: [
      { id: 'Inquiry', label: 'Enquiry Received', iconName: 'MessageSquare' },
      { id: 'Scheduled', label: 'Token Issued / Booked', iconName: 'Calendar' },
      { id: 'Visited', label: 'Consultation Done', iconName: 'UserCheck' },
      { id: 'Treatment', label: 'Follow-up Scheduled', iconName: 'Activity' },
      { id: 'Completed', label: 'Resolved / Discharged', iconName: 'CheckCircle2' }
    ],
    defaultServices: [
      { id: 's-gen-1', name: 'General Physician Consultation', category: 'General', durationMinutes: 15, costInINR: 400, description: 'Comprehensive physical examination and symptom evaluation.' },
      { id: 's-gen-2', name: 'Health Checkup Package', category: 'Preventive', durationMinutes: 30, costInINR: 1500, description: 'Basic blood pressure, blood glucose, ECG and physician advice.' },
      { id: 's-gen-3', name: 'Diabetes & BP Follow-up', category: 'Chronic Care', durationMinutes: 15, costInINR: 300, description: 'Regular monitoring of blood sugar and hypertension.' }
    ],
    defaultTemplates: [
      {
        id: 't-gen-1',
        title: 'Consultation Appointment Token',
        category: 'Scheduler',
        text: 'Namaste {{name}} garu! Your consultation token at {{businessName}} with {{senderName}} is confirmed for {{dateTime}}. Please arrive 10 minutes early.',
      },
      {
        id: 't-gen-2',
        title: 'Prescription & Medication Follow-up',
        category: 'Support',
        text: 'Dear {{name}} garu, please remember to take your prescribed medications regularly. If symptoms persist after 3 days, visit {{businessName}} for follow-up.',
      }
    ],
    mockContacts: [
      {
        id: 'c-gen-1',
        name: 'Suresh Babu',
        phone: '+919876543210',
        category: 'Active',
        notes: 'Hypertension & Diabetes monthly review.',
        lastContacted: '2026-07-15T10:00:00Z',
        createdAt: '2026-06-01T08:00:00Z',
        treatmentType: 'Diabetes & BP Follow-up',
        treatmentValue: 300,
        pipelineStage: 'Visited',
      }
    ],
    aiKnowledgeBase: {
      timings: 'Monday - Saturday: 8:00 AM to 12:00 PM and 5:00 PM to 9:00 PM.',
      treatments: 'General Consultation: ₹400.\nFollow-up within 7 days: Free.\nHealth Checkup Package: ₹1,500.',
      doctors: 'Dr. Ramesh Kumar, M.B.B.S, M.D (General Medicine) - 15 years experience.',
      reviews: 'Google Rating: 4.8/5 stars.',
      workflow: '1. Registration at front desk.\n2. Vitals check (BP & Sugar).\n3. Physician Consultation.\n4. Prescription issuance.'
    },
    defaultAutomationRules: [
      { id: 'ar-gen-1', triggerKeyword: 'doctor timing', actionType: 'send_text', templateId: '', isActive: true }
    ],
    defaultChatbotNodes: [
      {
        id: 'node-gen-root',
        title: 'General Clinic Main Menu',
        triggerKeyword: 'hi',
        botResponse: 'Namaste! Welcome to {{businessName}}.\n1. Clinic Timings & Location\n2. Consultation Fee\n3. Book Doctor Token',
        isRoot: true,
        actionType: 'none'
      }
    ]
  },

  pediatric: {
    id: 'pediatric',
    name: 'Pediatric Clinic',
    icon: '👶',
    colorTheme: 'bg-sky-600',
    accentColor: 'text-sky-700',
    defaultBusinessName: 'Little Angels Childrens Clinic',
    defaultSenderName: 'Dr. Ananya Reddy',
    defaultReviewLink: 'https://g.page/littleangelspediatric/review',
    terminology: {
      patientLabel: 'Child Patient',
      patientsLabel: 'Child Patients',
      treatmentLabel: 'Pediatric Consultation',
      treatmentTypeLabel: 'Vaccination / Pediatric Visit',
      doctorLabel: 'Pediatrician',
      doctorsLabel: 'Pediatricians',
      costLabel: 'Consultation / Vaccine Fee (₹)',
      intakeLabel: 'Parent & Child Registration',
      detailsLabel: 'Growth & Immunization Record'
    },
    stages: [
      { id: 'Inquiry', label: 'Parent Enquiry', iconName: 'MessageSquare' },
      { id: 'Scheduled', label: 'Slot Scheduled', iconName: 'Calendar' },
      { id: 'Visited', label: 'Examined / Vaccinated', iconName: 'UserCheck' },
      { id: 'Treatment', label: 'Vaccination Due', iconName: 'Activity' },
      { id: 'Completed', label: 'Fully Immunized', iconName: 'CheckCircle2' }
    ],
    defaultServices: [
      { id: 's-ped-1', name: 'Pediatric General Consultation', category: 'General', durationMinutes: 20, costInINR: 500, description: 'Child development and fever/illness evaluation.' },
      { id: 's-ped-2', name: 'Routine Infant Vaccination', category: 'Immunization', durationMinutes: 15, costInINR: 1200, description: 'WHO scheduled childhood immunizations.' },
      { id: 's-ped-3', name: 'Growth & Nutrition Assessment', category: 'Development', durationMinutes: 25, costInINR: 800, description: 'Percentile tracking, weight, height and milestone counseling.' }
    ],
    defaultTemplates: [
      {
        id: 't-ped-1',
        title: 'Vaccination Due Reminder for Parent',
        category: 'Scheduler',
        text: 'Namaste {{name}} garu! Friendly reminder from {{businessName}} that {{patientLabel}}\'s scheduled vaccination is due on {{dateTime}}. Please bring the vaccination card.',
      }
    ],
    mockContacts: [
      {
        id: 'c-ped-1',
        name: 'Kavitha (Parent of Master Reyansh)',
        phone: '+919123456789',
        category: 'Active',
        notes: '6-month vaccination due (Pentavalent & Rotavirus).',
        lastContacted: '2026-07-10T09:00:00Z',
        createdAt: '2026-05-10T08:00:00Z',
        treatmentType: 'Routine Infant Vaccination',
        treatmentValue: 1200,
        pipelineStage: 'Scheduled',
      }
    ],
    aiKnowledgeBase: {
      timings: 'Monday - Saturday: 9:00 AM to 1:00 PM and 5:00 PM to 8:30 PM.',
      treatments: 'Pediatric Consultation: ₹500.\nInfant Immunization: As per WHO vaccine brand.',
      doctors: 'Dr. Ananya Reddy, M.D (Pediatrics), D.C.H - 10 years experience.',
      reviews: 'Google Rating: 4.9/5 stars.',
      workflow: '1. Parent registration.\n2. Child weight & height measurement.\n3. Pediatrician exam & vaccination.'
    },
    defaultAutomationRules: [
      { id: 'ar-ped-1', triggerKeyword: 'vaccine schedule', actionType: 'send_text', templateId: '', isActive: true }
    ],
    defaultChatbotNodes: [
      {
        id: 'node-ped-root',
        title: 'Pediatric Clinic Main Menu',
        triggerKeyword: 'hi',
        botResponse: 'Namaste! Welcome to {{businessName}}.\n1. Clinic Hours\n2. Vaccination Schedule Info\n3. Book Pediatrician Slot',
        isRoot: true,
        actionType: 'none'
      }
    ]
  },

  gynecology: {
    id: 'gynecology',
    name: 'Gynecology Clinic',
    icon: '🌸',
    colorTheme: 'bg-rose-600',
    accentColor: 'text-rose-700',
    defaultBusinessName: 'Matrutva Women Health Center',
    defaultSenderName: 'Dr. Sunitha Devi',
    defaultReviewLink: 'https://g.page/matrutvawomenhealth/review',
    terminology: {
      patientLabel: 'Patient',
      patientsLabel: 'Patients',
      treatmentLabel: 'Gynec / Antenatal Visit',
      treatmentTypeLabel: 'Consultation / Ultrasound',
      doctorLabel: 'Gynecologist',
      doctorsLabel: 'Gynecologists',
      costLabel: 'Consultation Fee (₹)',
      intakeLabel: 'Women Health Intake',
      detailsLabel: 'Antenatal & Clinical history'
    },
    stages: [
      { id: 'Inquiry', label: 'Enquiry Received', iconName: 'MessageSquare' },
      { id: 'Scheduled', label: 'Appointment Confirmed', iconName: 'Calendar' },
      { id: 'Visited', label: 'Consulted / Scanned', iconName: 'UserCheck' },
      { id: 'Treatment', label: 'Antenatal Care Plan', iconName: 'Activity' },
      { id: 'Completed', label: 'Post-natal / Discharged', iconName: 'CheckCircle2' }
    ],
    defaultServices: [
      { id: 's-gyn-1', name: 'Gynecology Consultation', category: 'General', durationMinutes: 20, costInINR: 600, description: 'Comprehensive women health evaluation.' },
      { id: 's-gyn-2', name: 'Antenatal Routine Checkup', category: 'Maternity', durationMinutes: 25, costInINR: 700, description: 'Maternal health monitoring and fetal wellbeing check.' },
      { id: 's-gyn-3', name: 'Pelvic Ultrasound Scanning', category: 'Diagnostics', durationMinutes: 20, costInINR: 1200, description: 'High-resolution obstetric & pelvic ultrasound scan.' }
    ],
    defaultTemplates: [
      {
        id: 't-gyn-1',
        title: 'Antenatal Checkup Reminder',
        category: 'Scheduler',
        text: 'Namaste {{name}} garu! Your routine antenatal checkup with {{senderName}} at {{businessName}} is scheduled for {{dateTime}}. Stay healthy!',
      }
    ],
    mockContacts: [
      {
        id: 'c-gyn-1',
        name: 'Pooja Sharma',
        phone: '+919988776655',
        category: 'Active',
        notes: '2nd trimester antenatal scan and routine supplement prescription.',
        lastContacted: '2026-07-14T11:00:00Z',
        createdAt: '2026-04-10T09:00:00Z',
        treatmentType: 'Antenatal Routine Checkup',
        treatmentValue: 700,
        pipelineStage: 'Treatment',
      }
    ],
    aiKnowledgeBase: {
      timings: 'Monday - Saturday: 10:00 AM to 2:00 PM and 5:00 PM to 8:00 PM.',
      treatments: 'Gynecology Consultation: ₹600.\nObstetric Scan: ₹1,200.',
      doctors: 'Dr. Sunitha Devi, M.B.B.S, M.S (Obstetrics & Gynecology) - 14 years experience.',
      reviews: 'Google Rating: 4.9/5 stars.',
      workflow: '1. Patient registration.\n2. Blood pressure & weight log.\n3. Doctor Consultation & scan.'
    },
    defaultAutomationRules: [
      { id: 'ar-gyn-1', triggerKeyword: 'scan cost', actionType: 'send_text', templateId: '', isActive: true }
    ],
    defaultChatbotNodes: [
      {
        id: 'node-gyn-root',
        title: 'Gynecology Main Menu',
        triggerKeyword: 'hi',
        botResponse: 'Namaste! Welcome to {{businessName}}.\n1. Doctor Timings\n2. Consultation & Scan Charges\n3. Book Appointment',
        isRoot: true,
        actionType: 'none'
      }
    ]
  },

  orthopedic: {
    id: 'orthopedic',
    name: 'Orthopedic Clinic',
    icon: '🦴',
    colorTheme: 'bg-indigo-600',
    accentColor: 'text-indigo-700',
    defaultBusinessName: 'Sanjeevani Bone & Joint Clinic',
    defaultSenderName: 'Dr. Vikram Raju',
    defaultReviewLink: 'https://g.page/sanjeevaniortho/review',
    terminology: {
      patientLabel: 'Patient',
      patientsLabel: 'Patients',
      treatmentLabel: 'Ortho Procedure / Consultation',
      treatmentTypeLabel: 'Joint / Bone Specialty',
      doctorLabel: 'Orthopedic Surgeon',
      doctorsLabel: 'Orthopedic Doctors',
      costLabel: 'Procedure Fee (₹)',
      intakeLabel: 'Ortho Intake',
      detailsLabel: 'Radiology & Joint History'
    },
    stages: [
      { id: 'Inquiry', label: 'Enquiry Received', iconName: 'MessageSquare' },
      { id: 'Scheduled', label: 'Appointment Scheduled', iconName: 'Calendar' },
      { id: 'Visited', label: 'X-Ray & Examined', iconName: 'UserCheck' },
      { id: 'Treatment', label: 'Physio / Rehab Active', iconName: 'Activity' },
      { id: 'Completed', label: 'Fully Recovered', iconName: 'CheckCircle2' }
    ],
    defaultServices: [
      { id: 's-ort-1', name: 'Orthopedic Consultation', category: 'General', durationMinutes: 20, costInINR: 600, description: 'Bone, joint, and spine physical evaluation.' },
      { id: 's-ort-2', name: 'Digital X-Ray & Joint Diagnosis', category: 'Diagnostics', durationMinutes: 15, costInINR: 500, description: 'High precision digital radiography for fractures and arthritis.' },
      { id: 's-ort-3', name: 'Intra-articular Injection', category: 'Procedure', durationMinutes: 20, costInINR: 2500, description: 'Targeted joint lubrication and pain relief injection.' }
    ],
    defaultTemplates: [
      {
        id: 't-ort-1',
        title: 'Ortho Appointment Confirmation',
        category: 'Scheduler',
        text: 'Namaste {{name}} garu! Your orthopedic consultation with {{senderName}} at {{businessName}} is confirmed for {{dateTime}}.',
      }
    ],
    mockContacts: [
      {
        id: 'c-ort-1',
        name: 'Koteswara Rao',
        phone: '+919876123456',
        category: 'Active',
        notes: 'Knee osteoarthritis conservative care & physical therapy follow-up.',
        lastContacted: '2026-07-11T10:30:00Z',
        createdAt: '2026-06-20T09:00:00Z',
        treatmentType: 'Orthopedic Consultation',
        treatmentValue: 600,
        pipelineStage: 'Visited',
      }
    ],
    aiKnowledgeBase: {
      timings: 'Monday - Saturday: 9:00 AM to 1:00 PM and 5:00 PM to 8:30 PM.',
      treatments: 'Orthopedic Consultation: ₹600.\nDigital X-Ray: ₹500.\nJoint Pain Injection: ₹2,500.',
      doctors: 'Dr. Vikram Raju, M.S (Ortho), M.Ch (Joint Replacement) - 16 years experience.',
      reviews: 'Google Rating: 4.8/5 stars.',
      workflow: '1. Patient registration.\n2. X-ray if required.\n3. Specialist Consultation.'
    },
    defaultAutomationRules: [
      { id: 'ar-ort-1', triggerKeyword: 'xray cost', actionType: 'send_text', templateId: '', isActive: true }
    ],
    defaultChatbotNodes: [
      {
        id: 'node-ort-root',
        title: 'Orthopedic Main Menu',
        triggerKeyword: 'hi',
        botResponse: 'Namaste! Welcome to {{businessName}}.\n1. Clinic Hours\n2. Joint Consultation Fees\n3. Book Appointment',
        isRoot: true,
        actionType: 'none'
      }
    ]
  },

  dermatology: {
    id: 'dermatology',
    name: 'Dermatology Clinic',
    icon: '✨',
    colorTheme: 'bg-fuchsia-600',
    accentColor: 'text-fuchsia-700',
    defaultBusinessName: 'DermaGlow Skin & Laser Clinic',
    defaultSenderName: 'Dr. Swathi Reddy',
    defaultReviewLink: 'https://g.page/dermaglowskinclinic/review',
    terminology: {
      patientLabel: 'Patient',
      patientsLabel: 'Patients',
      treatmentLabel: 'Dermatology Procedure',
      treatmentTypeLabel: 'Skin / Hair Treatment',
      doctorLabel: 'Dermatologist',
      doctorsLabel: 'Dermatologists',
      costLabel: 'Procedure Fee (₹)',
      intakeLabel: 'Skin Intake',
      detailsLabel: 'Dermatological history'
    },
    stages: [
      { id: 'Inquiry', label: 'Enquiry Received', iconName: 'MessageSquare' },
      { id: 'Scheduled', label: 'Consultation Booked', iconName: 'Calendar' },
      { id: 'Visited', label: 'Skin Examined', iconName: 'UserCheck' },
      { id: 'Treatment', label: 'Session Active', iconName: 'Activity' },
      { id: 'Completed', label: 'Treatment Complete', iconName: 'CheckCircle2' }
    ],
    defaultServices: [
      { id: 's-der-1', name: 'Dermatology Consultation', category: 'General', durationMinutes: 20, costInINR: 600, description: 'Acne, eczema, psoriasis, and hair loss evaluation.' },
      { id: 's-der-2', name: 'Chemical Peel Session', category: 'Aesthetic', durationMinutes: 30, costInINR: 2500, description: 'Medical grade skin resurfacing and hyperpigmentation reduction.' },
      { id: 's-der-3', name: 'PRP Hair Restoration Session', category: 'Hair Care', durationMinutes: 45, costInINR: 5000, description: 'Platelet-rich plasma therapy for hair growth.' }
    ],
    defaultTemplates: [
      {
        id: 't-der-1',
        title: 'Skin Consultation Confirmation',
        category: 'Scheduler',
        text: 'Namaste {{name}} garu! Your dermatology consultation with {{senderName}} at {{businessName}} is confirmed for {{dateTime}}.',
      }
    ],
    mockContacts: [
      {
        id: 'c-der-1',
        name: 'Divya Sree',
        phone: '+919812345678',
        category: 'Active',
        notes: 'Session 2 of 4 Chemical Peel for acne scarring.',
        lastContacted: '2026-07-13T15:00:00Z',
        createdAt: '2026-06-10T10:00:00Z',
        treatmentType: 'Chemical Peel Session',
        treatmentValue: 2500,
        pipelineStage: 'Treatment',
      }
    ],
    aiKnowledgeBase: {
      timings: 'Monday - Saturday: 10:00 AM to 2:00 PM and 4:30 PM to 8:30 PM.',
      treatments: 'Dermatology Consultation: ₹600.\nChemical Peel: ₹2,500.\nPRP Hair Session: ₹5,000.',
      doctors: 'Dr. Swathi Reddy, M.D (Dermatology, Venereology & Leprosy) - 11 years experience.',
      reviews: 'Google Rating: 4.9/5 stars.',
      workflow: '1. Patient registration.\n2. Dermatoscope exam.\n3. Treatment session.'
    },
    defaultAutomationRules: [
      { id: 'ar-der-1', triggerKeyword: 'acne treatment', actionType: 'send_text', templateId: '', isActive: true }
    ],
    defaultChatbotNodes: [
      {
        id: 'node-der-root',
        title: 'Dermatology Main Menu',
        triggerKeyword: 'hi',
        botResponse: 'Namaste! Welcome to {{businessName}}.\n1. Clinic Timings\n2. Skin & Hair Treatments\n3. Book Appointment',
        isRoot: true,
        actionType: 'none'
      }
    ]
  },

  physiotherapy: {
    id: 'physiotherapy',
    name: 'Physiotherapy Centre',
    icon: '🏃',
    colorTheme: 'bg-amber-600',
    accentColor: 'text-amber-700',
    defaultBusinessName: 'Revive Motion Physiotherapy',
    defaultSenderName: 'Dr. Murali Mohan (PT)',
    defaultReviewLink: 'https://g.page/revivemotionphysio/review',
    terminology: {
      patientLabel: 'Patient',
      patientsLabel: 'Patients',
      treatmentLabel: 'Physio Session',
      treatmentTypeLabel: 'Rehab / Therapy Type',
      doctorLabel: 'Physiotherapist',
      doctorsLabel: 'Physiotherapists',
      costLabel: 'Session Fee (₹)',
      intakeLabel: 'Mobility Intake',
      detailsLabel: 'Biomechanics & Pain Assessment'
    },
    stages: [
      { id: 'Inquiry', label: 'Enquiry Received', iconName: 'MessageSquare' },
      { id: 'Scheduled', label: 'Session Booked', iconName: 'Calendar' },
      { id: 'Visited', label: 'Assessed', iconName: 'UserCheck' },
      { id: 'Treatment', label: 'Rehab Package Active', iconName: 'Activity' },
      { id: 'Completed', label: 'Fully Mobilized', iconName: 'CheckCircle2' }
    ],
    defaultServices: [
      { id: 's-phy-1', name: 'Initial Physio Assessment', category: 'General', durationMinutes: 45, costInINR: 600, description: 'Postural, range-of-motion, and pain root-cause evaluation.' },
      { id: 's-phy-2', name: 'Single Therapy Session (IFT/UST)', category: 'Therapy', durationMinutes: 30, costInINR: 400, description: 'Interferential therapy, ultrasound, and manual release.' },
      { id: 's-phy-3', name: '10-Session Rehab Package', category: 'Package', durationMinutes: 30, costInINR: 3500, description: 'Comprehensive package for stroke, post-op, or spine rehab.' }
    ],
    defaultTemplates: [
      {
        id: 't-phy-1',
        title: 'Physio Session Reminder',
        category: 'Scheduler',
        text: 'Namaste {{name}} garu! Reminder for your physiotherapy rehab session at {{businessName}} on {{dateTime}}. Please wear comfortable clothes.',
      }
    ],
    mockContacts: [
      {
        id: 'c-phy-1',
        name: 'Venkatesh Rao',
        phone: '+919490123456',
        category: 'Active',
        notes: 'Post stroke gait rehabilitation — session 6 of 10.',
        lastContacted: '2026-07-14T16:00:00Z',
        createdAt: '2026-07-01T08:30:00Z',
        treatmentType: '10-Session Rehab Package',
        treatmentValue: 3500,
        pipelineStage: 'Treatment',
      }
    ],
    aiKnowledgeBase: {
      timings: 'Monday - Saturday: 7:00 AM to 12:00 PM and 4:00 PM to 8:00 PM.',
      treatments: 'Initial Assessment: ₹600.\nSingle Physio Session: ₹400.\n10-Session Package: ₹3,500.',
      doctors: 'Dr. Murali Mohan, B.P.T, M.P.T (Neuro & Ortho Rehab) - 12 years experience.',
      reviews: 'Google Rating: 4.9/5 stars.',
      workflow: '1. Patient registration.\n2. Biomechanical assessment.\n3. Daily rehab session.'
    },
    defaultAutomationRules: [
      { id: 'ar-phy-1', triggerKeyword: 'rehab package', actionType: 'send_text', templateId: '', isActive: true }
    ],
    defaultChatbotNodes: [
      {
        id: 'node-phy-root',
        title: 'Physiotherapy Main Menu',
        triggerKeyword: 'hi',
        botResponse: 'Namaste! Welcome to {{businessName}}.\n1. Working Hours\n2. Session Charges & Packages\n3. Book Physio Session',
        isRoot: true,
        actionType: 'none'
      }
    ]
  },

  diagnostics: {
    id: 'diagnostics',
    name: 'Diagnostic Centre',
    icon: '🔬',
    colorTheme: 'bg-purple-600',
    accentColor: 'text-purple-700',
    defaultBusinessName: 'Apex Diagnostic & Imaging Center',
    defaultSenderName: 'Manager Diagnostics',
    defaultReviewLink: 'https://g.page/apexdiagnostics/review',
    terminology: {
      patientLabel: 'Patient',
      patientsLabel: 'Patients',
      treatmentLabel: 'Diagnostic Investigation',
      treatmentTypeLabel: 'Test / Scan Type',
      doctorLabel: 'Pathologist / Radiologist',
      doctorsLabel: 'Specialist Doctors',
      costLabel: 'Test Fee (₹)',
      intakeLabel: 'Sample & Test Booking',
      detailsLabel: 'Lab Report & Test Status'
    },
    stages: [
      { id: 'Inquiry', label: 'Test Enquiry', iconName: 'MessageSquare' },
      { id: 'Scheduled', label: 'Sample / Scan Scheduled', iconName: 'Calendar' },
      { id: 'Visited', label: 'Sample Collected', iconName: 'UserCheck' },
      { id: 'Treatment', label: 'Processing in Lab', iconName: 'Activity' },
      { id: 'Completed', label: 'Report Delivered', iconName: 'CheckCircle2' }
    ],
    defaultServices: [
      { id: 's-dia-1', name: 'Complete Blood Count (CBC)', category: 'Pathology', durationMinutes: 10, costInINR: 350, description: 'Automated 24-parameter blood count.' },
      { id: 's-dia-2', name: 'Master Health Checkup Lab Suite', category: 'Packages', durationMinutes: 20, costInINR: 1800, description: 'Lipid, Kidney, Liver, Thyroid & HbA1c tests.' },
      { id: 's-dia-3', name: 'Digital Chest X-Ray', category: 'Radiology', durationMinutes: 10, costInINR: 400, description: 'High resolution digital X-Ray imaging with report.' }
    ],
    defaultTemplates: [
      {
        id: 't-dia-1',
        title: 'Diagnostic Report Ready Notification',
        category: 'Support',
        text: 'Namaste {{name}} garu! Your diagnostic test report from {{businessName}} is ready. You can download your secure PDF report or collect hardcopy at front desk.',
      }
    ],
    mockContacts: [
      {
        id: 'c-dia-1',
        name: 'Nageswara Rao',
        phone: '+919849012345',
        category: 'Active',
        notes: 'Master Health Package sample collected — report generating.',
        lastContacted: '2026-07-15T08:00:00Z',
        createdAt: '2026-07-15T07:00:00Z',
        treatmentType: 'Master Health Checkup Lab Suite',
        treatmentValue: 1800,
        pipelineStage: 'Treatment',
      }
    ],
    aiKnowledgeBase: {
      timings: 'Monday - Saturday: 6:30 AM to 8:30 PM. Sundays: 7:00 AM to 1:00 PM.',
      treatments: 'CBC: ₹350.\nMaster Health Package: ₹1,800.\nDigital X-Ray: ₹400.',
      doctors: 'Dr. S. K. Gupta, M.D (Pathology) - Chief Pathologist.',
      reviews: 'Google Rating: 4.8/5 stars.',
      workflow: '1. Patient registration & billing.\n2. Phlebotomy sample collection.\n3. Lab testing.\n4. Report dispatch.'
    },
    defaultAutomationRules: [
      { id: 'ar-dia-1', triggerKeyword: 'report status', actionType: 'send_text', templateId: '', isActive: true }
    ],
    defaultChatbotNodes: [
      {
        id: 'node-dia-root',
        title: 'Diagnostics Main Menu',
        triggerKeyword: 'hi',
        botResponse: 'Namaste! Welcome to {{businessName}}.\n1. Lab Timings & Fasting Guidelines\n2. Test Price List\n3. Schedule Home Sample Collection',
        isRoot: true,
        actionType: 'none'
      }
    ]
  },

  eye_ent: {
    id: 'eye_ent',
    name: 'Eye Care / ENT Clinic',
    icon: '👁️',
    colorTheme: 'bg-cyan-600',
    accentColor: 'text-cyan-700',
    defaultBusinessName: 'Nethra Vision & ENT Care',
    defaultSenderName: 'Dr. Srinivas Rao',
    defaultReviewLink: 'https://g.page/nethravisionent/review',
    terminology: {
      patientLabel: 'Patient',
      patientsLabel: 'Patients',
      treatmentLabel: 'Eye / ENT Consultation',
      treatmentTypeLabel: 'Refraction / Specialty',
      doctorLabel: 'Ophthalmologist / ENT Doctor',
      doctorsLabel: 'Specialists',
      costLabel: 'Consultation Fee (₹)',
      intakeLabel: 'Vision & Hearing Registration',
      detailsLabel: 'Refraction & Clinical record'
    },
    stages: [
      { id: 'Inquiry', label: 'Enquiry Received', iconName: 'MessageSquare' },
      { id: 'Scheduled', label: 'Slot Confirmed', iconName: 'Calendar' },
      { id: 'Visited', label: 'Refraction / Exam Done', iconName: 'UserCheck' },
      { id: 'Treatment', label: 'Spectacles / Drops Prescribed', iconName: 'Activity' },
      { id: 'Completed', label: 'Vision Stabilized', iconName: 'CheckCircle2' }
    ],
    defaultServices: [
      { id: 's-eye-1', name: 'Comprehensive Eye Examination', category: 'General', durationMinutes: 20, costInINR: 500, description: 'Computerized refraction, IOP pressure test and dilated fundus exam.' },
      { id: 's-eye-2', name: 'ENT Specialist Consultation', category: 'General', durationMinutes: 20, costInINR: 500, description: 'Ear, nose, throat endo-evaluation.' },
      { id: 's-eye-3', name: 'Cataract Screening & Biometry', category: 'Specialty', durationMinutes: 30, costInINR: 1000, description: 'IOL power calculation and cataract diagnostic evaluation.' }
    ],
    defaultTemplates: [
      {
        id: 't-eye-1',
        title: 'Eye Exam Appointment Confirmation',
        category: 'Scheduler',
        text: 'Namaste {{name}} garu! Your comprehensive eye examination with {{senderName}} at {{businessName}} is confirmed for {{dateTime}}.',
      }
    ],
    mockContacts: [
      {
        id: 'c-eye-1',
        name: 'Srinivas Varma',
        phone: '+919700123456',
        category: 'Active',
        notes: 'Refraction done: -2.5D Spherical bilateral. Prescription issued.',
        lastContacted: '2026-07-12T11:00:00Z',
        createdAt: '2026-07-12T10:00:00Z',
        treatmentType: 'Comprehensive Eye Examination',
        treatmentValue: 500,
        pipelineStage: 'Visited',
      }
    ],
    aiKnowledgeBase: {
      timings: 'Monday - Saturday: 9:30 AM to 1:30 PM and 5:00 PM to 8:30 PM.',
      treatments: 'Comprehensive Eye Exam: ₹500.\nENT Consultation: ₹500.',
      doctors: 'Dr. Srinivas Rao, M.S (Ophthalmology) - 15 years experience.\nDr. K. Madhavi, M.S (ENT).',
      reviews: 'Google Rating: 4.8/5 stars.',
      workflow: '1. Patient registration.\n2. Computerized vision check.\n3. Specialist consultation.'
    },
    defaultAutomationRules: [
      { id: 'ar-eye-1', triggerKeyword: 'cataract screening', actionType: 'send_text', templateId: '', isActive: true }
    ],
    defaultChatbotNodes: [
      {
        id: 'node-eye-root',
        title: 'Eye Care & ENT Main Menu',
        triggerKeyword: 'hi',
        botResponse: 'Namaste! Welcome to {{businessName}}.\n1. Clinic Timings\n2. Eye & ENT Services\n3. Book Examination Slot',
        isRoot: true,
        actionType: 'none'
      }
    ]
  },

  multispecialty: {
    id: 'multispecialty',
    name: 'Multi-specialty Clinic',
    icon: '🏥',
    colorTheme: 'bg-blue-600',
    accentColor: 'text-blue-700',
    defaultBusinessName: 'City Multi-Specialty Health Center',
    defaultSenderName: 'Clinical Director',
    defaultReviewLink: 'https://g.page/citymultispecialtyclinic/review',
    terminology: {
      patientLabel: 'Patient',
      patientsLabel: 'Patients',
      treatmentLabel: 'Specialty Consultation',
      treatmentTypeLabel: 'Department / Specialty',
      doctorLabel: 'Specialist Physician',
      doctorsLabel: 'Specialist Doctors',
      costLabel: 'Consultation Fee (₹)',
      intakeLabel: 'Multi-Department Registration',
      detailsLabel: 'Cross-Department Records'
    },
    stages: [
      { id: 'Inquiry', label: 'General Enquiry', iconName: 'MessageSquare' },
      { id: 'Scheduled', label: 'Specialist Booked', iconName: 'Calendar' },
      { id: 'Visited', label: 'Consultation Completed', iconName: 'UserCheck' },
      { id: 'Treatment', label: 'Treatment Plan Active', iconName: 'Activity' },
      { id: 'Completed', label: 'Care Completed', iconName: 'CheckCircle2' }
    ],
    defaultServices: [
      { id: 's-mul-1', name: 'General Medicine Consultation', category: 'General Medicine', durationMinutes: 15, costInINR: 500, description: 'Primary health evaluation.' },
      { id: 's-mul-2', name: 'Cardiology Specialist Consultation', category: 'Cardiology', durationMinutes: 20, costInINR: 800, description: 'Heart health evaluation and ECG review.' },
      { id: 's-mul-3', name: 'Orthopedic Consultation', category: 'Orthopedics', durationMinutes: 20, costInINR: 600, description: 'Bone and joint specialist consult.' }
    ],
    defaultTemplates: [
      {
        id: 't-mul-1',
        title: 'Multi-specialty Appointment Token',
        category: 'Scheduler',
        text: 'Namaste {{name}} garu! Your appointment at {{businessName}} is confirmed for {{dateTime}}.',
      }
    ],
    mockContacts: [
      {
        id: 'c-mul-1',
        name: 'Ramanathan K',
        phone: '+919900112233',
        category: 'Active',
        notes: 'Cardiology consultation & Echo scan recommended.',
        lastContacted: '2026-07-10T10:00:00Z',
        createdAt: '2026-07-08T09:00:00Z',
        treatmentType: 'Cardiology Specialist Consultation',
        treatmentValue: 800,
        pipelineStage: 'Visited',
      }
    ],
    aiKnowledgeBase: {
      timings: 'Monday - Saturday: 8:00 AM to 9:00 PM. Sundays: Emergency care 24/7.',
      treatments: 'General Consultation: ₹500.\nCardiology Consultation: ₹800.\nOrthopedics: ₹600.',
      doctors: 'Team of 12 Senior Specialist Consultants across 8 Medical Departments.',
      reviews: 'Google Rating: 4.8/5 stars.',
      workflow: '1. Central registration.\n2. Department triage.\n3. Specialist Consultation.'
    },
    defaultAutomationRules: [
      { id: 'ar-mul-1', triggerKeyword: 'department list', actionType: 'send_text', templateId: '', isActive: true }
    ],
    defaultChatbotNodes: [
      {
        id: 'node-mul-root',
        title: 'Multi-Specialty Main Menu',
        triggerKeyword: 'hi',
        botResponse: 'Namaste! Welcome to {{businessName}}.\n1. Medical Departments\n2. Doctor Schedules\n3. Book Specialist Slot',
        isRoot: true,
        actionType: 'none'
      }
    ]
  },

  solo_practitioner: {
    id: 'solo_practitioner',
    name: 'Solo Practitioner',
    icon: '👨‍⚕️',
    colorTheme: 'bg-emerald-700',
    accentColor: 'text-emerald-800',
    defaultBusinessName: 'Dr. Varma Family Practice',
    defaultSenderName: 'Dr. Varma',
    defaultReviewLink: 'https://g.page/drvarmafamilypractice/review',
    terminology: {
      patientLabel: 'Patient',
      patientsLabel: 'Patients',
      treatmentLabel: 'Consultation',
      treatmentTypeLabel: 'Visit Type',
      doctorLabel: 'Practitioner',
      doctorsLabel: 'Practitioner',
      costLabel: 'Visit Fee (₹)',
      intakeLabel: 'Patient Registration',
      detailsLabel: 'Patient History'
    },
    stages: [
      { id: 'Inquiry', label: 'Message Received', iconName: 'MessageSquare' },
      { id: 'Scheduled', label: 'Slot Scheduled', iconName: 'Calendar' },
      { id: 'Visited', label: 'Consulted', iconName: 'UserCheck' },
      { id: 'Treatment', label: 'Follow-up Due', iconName: 'Activity' },
      { id: 'Completed', label: 'Visit Complete', iconName: 'CheckCircle2' }
    ],
    defaultServices: [
      { id: 's-sol-1', name: 'Personal Consultation', category: 'General', durationMinutes: 20, costInINR: 400, description: 'Direct 1-on-1 practitioner consultation.' },
      { id: 's-sol-2', name: 'Follow-up Review', category: 'Follow-up', durationMinutes: 15, costInINR: 200, description: 'Progress evaluation and prescription renewal.' }
    ],
    defaultTemplates: [
      {
        id: 't-sol-1',
        title: 'Practitioner Consultation Confirmation',
        category: 'Scheduler',
        text: 'Namaste {{name}} garu! Your appointment with {{senderName}} at {{businessName}} is confirmed for {{dateTime}}.',
      }
    ],
    mockContacts: [
      {
        id: 'c-sol-1',
        name: 'Bhavani Prasad',
        phone: '+919848098765',
        category: 'Active',
        notes: 'Hypertension monthly review.',
        lastContacted: '2026-07-14T09:00:00Z',
        createdAt: '2026-06-01T09:00:00Z',
        treatmentType: 'Personal Consultation',
        treatmentValue: 400,
        pipelineStage: 'Visited',
      }
    ],
    aiKnowledgeBase: {
      timings: 'Monday - Saturday: 9:00 AM to 1:00 PM and 5:00 PM to 8:00 PM.',
      treatments: 'Consultation: ₹400.\nFollow-up: ₹200.',
      doctors: 'Dr. Varma, M.B.B.S - 18 years solo practice experience.',
      reviews: 'Google Rating: 4.9/5 stars.',
      workflow: '1. Direct messaging / phone call.\n2. Slot confirmation.\n3. In-person visit.'
    },
    defaultAutomationRules: [
      { id: 'ar-sol-1', triggerKeyword: 'timings', actionType: 'send_text', templateId: '', isActive: true }
    ],
    defaultChatbotNodes: [
      {
        id: 'node-sol-root',
        title: 'Solo Practice Main Menu',
        triggerKeyword: 'hi',
        botResponse: 'Namaste! Welcome to {{businessName}}.\n1. Practice Timings\n2. Consultation Fee\n3. Request Appointment Slot',
        isRoot: true,
        actionType: 'none'
      }
    ]
  },

  wellness: {
    id: 'wellness',
    name: 'Wellness Clinic',
    icon: '🌿',
    colorTheme: 'bg-lime-600',
    accentColor: 'text-lime-700',
    defaultBusinessName: 'AyurVida Wellness & Holistic Center',
    defaultSenderName: 'Dr. Gayatri Sharma',
    defaultReviewLink: 'https://g.page/ayurvidawellness/review',
    terminology: {
      patientLabel: 'Client / Patient',
      patientsLabel: 'Clients / Patients',
      treatmentLabel: 'Wellness Session / Therapy',
      treatmentTypeLabel: 'Holistic Therapy Type',
      doctorLabel: 'Wellness Practitioner',
      doctorsLabel: 'Practitioners',
      costLabel: 'Session Fee (₹)',
      intakeLabel: 'Wellness Intake',
      detailsLabel: 'Holistic & Lifestyle Record'
    },
    stages: [
      { id: 'Inquiry', label: 'Enquiry Received', iconName: 'MessageSquare' },
      { id: 'Scheduled', label: 'Session Booked', iconName: 'Calendar' },
      { id: 'Visited', label: 'Consulted / Treated', iconName: 'UserCheck' },
      { id: 'Treatment', label: 'Therapy Program Active', iconName: 'Activity' },
      { id: 'Completed', label: 'Program Completed', iconName: 'CheckCircle2' }
    ],
    defaultServices: [
      { id: 's-wel-1', name: 'Ayurvedic Wellness Consultation', category: 'Consultation', durationMinutes: 30, costInINR: 600, description: 'Dosha evaluation and lifestyle guidance.' },
      { id: 's-wel-2', name: 'Full Body Abhyanga Massage', category: 'Therapy', durationMinutes: 60, costInINR: 2000, description: 'Traditional herbal oil therapy for rejuvenation.' },
      { id: 's-wel-3', name: '7-Day Detox & Rejuvenation Program', category: 'Package', durationMinutes: 60, costInINR: 12000, description: 'Comprehensive holistic detox program.' }
    ],
    defaultTemplates: [
      {
        id: 't-wel-1',
        title: 'Wellness Session Confirmation',
        category: 'Scheduler',
        text: 'Namaste {{name}} garu! Your holistic wellness session with {{senderName}} at {{businessName}} is confirmed for {{dateTime}}.',
      }
    ],
    mockContacts: [
      {
        id: 'c-wel-1',
        name: 'Madhuri Devi',
        phone: '+919955443322',
        category: 'Active',
        notes: 'Day 3 of 7-day Abhyanga detox therapy.',
        lastContacted: '2026-07-14T08:00:00Z',
        createdAt: '2026-07-10T10:00:00Z',
        treatmentType: '7-Day Detox & Rejuvenation Program',
        treatmentValue: 12000,
        pipelineStage: 'Treatment',
      }
    ],
    aiKnowledgeBase: {
      timings: 'Monday - Saturday: 8:00 AM to 7:00 PM.',
      treatments: 'Wellness Consultation: ₹600.\nAbhyanga Session: ₹2,000.\n7-Day Detox Program: ₹12,000.',
      doctors: 'Dr. Gayatri Sharma, B.A.M.S (Ayurvedic Physician & Naturopath) - 13 years experience.',
      reviews: 'Google Rating: 4.9/5 stars.',
      workflow: '1. Wellness registration.\n2. Prakriti consultation.\n3. Holistic session.'
    },
    defaultAutomationRules: [
      { id: 'ar-wel-1', triggerKeyword: 'detox package', actionType: 'send_text', templateId: '', isActive: true }
    ],
    defaultChatbotNodes: [
      {
        id: 'node-wel-root',
        title: 'Wellness Main Menu',
        triggerKeyword: 'hi',
        botResponse: 'Namaste! Welcome to {{businessName}}.\n1. Center Hours\n2. Therapies & Packages\n3. Book Wellness Session',
        isRoot: true,
        actionType: 'none'
      }
    ]
  }
};

export const LEGACY_SECTOR_MIGRATION_MAP: Record<string, IndustryType> = {
  cosmetic: 'dermatology',
  gym: 'wellness',
  realestate: 'general_medical',
};

export const INDUSTRIES: Record<IndustryType, IndustryDefinition> = RAW_INDUSTRIES;

export const UNCONFIGURED_SECTOR: IndustryDefinition = {
  id: 'unconfigured' as any,
  name: 'Sector not configured',
  icon: '⚙️',
  description: 'Workspace sector configuration is required before activating healthcare workflows.',
  colorTheme: 'bg-slate-700',
  accentColor: 'text-slate-700',
  defaultBusinessName: 'Business',
  defaultSenderName: 'Workspace Admin',
  defaultReviewLink: '',
  terminology: {
    patientLabel: 'Customer',
    patientsLabel: 'Customers',
    treatmentLabel: 'Service',
    treatmentTypeLabel: 'Service Type',
    doctorLabel: 'Staff',
    doctorsLabel: 'Staff',
    costLabel: 'Amount',
    intakeLabel: 'Details',
    detailsLabel: 'Details',
    patient: 'Customer',
    appointment: 'Booking',
    enquiry: 'Inquiry',
    consultation: 'Meeting',
    doctor: 'Staff',
    procedure: 'Service',
  },
  stages: [
    { id: 'Inquiry', label: 'Inquiry', iconName: 'HelpCircle' },
    { id: 'Scheduled', label: 'Scheduled', iconName: 'Calendar' },
    { id: 'Visited', label: 'Visited', iconName: 'UserCheck' },
    { id: 'Treatment', label: 'In Progress', iconName: 'Activity' },
    { id: 'Completed', label: 'Completed', iconName: 'CheckCircle' },
  ],
  defaultTemplates: [],
  mockContacts: [],
  aiKnowledgeBase: {
    timings: 'Sector configuration required',
    treatments: 'Sector configuration required',
    doctors: 'Sector configuration required',
    reviews: '',
    workflow: 'Sector configuration required.'
  },
  defaultServices: [],
  defaultAutomationRules: [],
  defaultChatbotNodes: []
};

export function logInvalidSectorWarning(
  tenantId: string = 'unknown',
  reason: string = 'INVALID_SECTOR',
  rawSectorId?: any,
  correlationId?: string
): void {
  const sanitizedReason = String(reason).replace(/[\r\n]/g, '').substring(0, 100);
  const sanitizedSector = String(rawSectorId ?? '').substring(0, 50).replace(/[^\w\s-]/g, '');
  const cid = correlationId || `corr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  console.warn(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      service: 'SectorConfigService',
      message: 'Invalid or unmapped sector ID encountered.',
      tenantId: String(tenantId).substring(0, 100),
      reason: sanitizedReason,
      rawSectorId: sanitizedSector,
      correlationId: cid,
    })
  );
}

export function isApprovedSectorId(sectorId: any): sectorId is IndustryType {
  if (!sectorId || typeof sectorId !== 'string') return false;
  return (APPROVED_MEDICAL_SECTOR_IDS as string[]).includes(sectorId);
}

export function getSectorDefinition(sectorId?: string, tenantId?: string, correlationId?: string): IndustryDefinition {
  if (!sectorId || typeof sectorId !== 'string') {
    if (tenantId || correlationId) {
      logInvalidSectorWarning(tenantId || 'unknown', 'EMPTY_OR_MISSING_SECTOR_ID', sectorId, correlationId);
    }
    return UNCONFIGURED_SECTOR;
  }
  
  if ((APPROVED_MEDICAL_SECTOR_IDS as string[]).includes(sectorId)) {
    return INDUSTRIES[sectorId as IndustryType];
  }
  
  if (sectorId in LEGACY_SECTOR_MIGRATION_MAP) {
    const mappedId = LEGACY_SECTOR_MIGRATION_MAP[sectorId];
    if (mappedId && (APPROVED_MEDICAL_SECTOR_IDS as string[]).includes(mappedId)) {
      return INDUSTRIES[mappedId];
    }
  }
  
  logInvalidSectorWarning(tenantId || 'unknown', 'UNSUPPORTED_OR_MALFORMED_SECTOR_ID', sectorId, correlationId);
  return UNCONFIGURED_SECTOR;
}

