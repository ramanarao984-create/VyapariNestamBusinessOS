/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User } from 'firebase/auth';
import { authenticatedFetch } from './auth/apiClient';
import { AutomationService } from './services/automation/AutomationService';
import { AuthService } from './auth/AuthService';
import { useAuth } from './auth/AuthHooks';
import { useTenantContext } from './auth/useTenantContext';
import { GoogleWorkspaceResolver } from './google/GoogleWorkspaceResolver';
import {
  createCrmSpreadsheet,
  fetchContactsFromSheet,
  saveContactsToSheet,
  fetchInteractionsFromSheet,
  appendInteractionToSheet,
  saveInteractionsToSheet,
  createCalendarEvent,
  fetchCalendarFollowUps,
  verifyAndSetupSheets,
  fetchKnowledgeBaseFromSheet,
  saveKnowledgeBaseToSheet,
  fetchTemplatesFromSheet,
  saveTemplatesToSheet,
  fetchSeoLogsFromSheet,
  appendSeoLogToSheet,
  appendRevenueLogToSheet,
  SeoAuditLog,
} from './googleApi';
import { Contact, Interaction, MessageTemplate, UpcomingFollowUp, ContactCategory, AIKnowledgeBase, AIChatTurn, ScheduledReminder, Doctor, Appointment } from './types';
import { DEFAULT_TEMPLATES, MOCK_CONTACTS, MOCK_INTERACTIONS } from './data';
import { INDUSTRIES, IndustryType, APPROVED_MEDICAL_SECTOR_IDS, getSectorDefinition, isApprovedSectorId } from './industryConfig';

import { AuthBar } from './components/AuthBar';
import { DashboardStats } from './components/DashboardStats';
import { ContactCard } from './components/ContactCard';
import { InteractionList } from './components/InteractionList';
import { TemplateList } from './components/TemplateList';
import { CalendarTasks } from './components/CalendarTasks';
import { WhatsAppAutomationHub } from './components/WhatsAppAutomationHub';
import { MigrationCenter } from './components/MigrationCenter';
import { WorkspaceSettings } from './components/WorkspaceSettings';
import { OnboardingWizard } from './components/OnboardingWizard';
import { SEOAuditEngine } from './components/SEOAuditEngine';
import { ContactSlideOut } from './components/ContactSlideOut';
import { CommandPalette } from './components/CommandPalette';
import { AppointmentsWorkspace } from './components/AppointmentsWorkspace';
import { GrowthCenter } from './components/GrowthCenter';
import { AutomationCenter } from './components/AutomationCenter';
import { Patient360View } from './components/Patient360View';
import { ContactsEnterpriseWorkspace } from './components/ContactsEnterpriseWorkspace';
import {
  Plus,
  Search,
  Filter,
  Check,
  AlertTriangle,
  FolderOpen,
  Info,
  Calendar,
  X,
  FileSpreadsheet,
  RefreshCw,
  PhoneCall,
  UserCheck,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Activity,
  CheckCircle2,
  MessageSquare,
  Settings,
  Upload,
  Clipboard,
  Trash2,
  LayoutGrid,
  List,
  RotateCcw,
  Bot,
  CreditCard,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Auth state from AuthProvider
  const {
    user,
    accessToken,
    isLoggingIn,
    loginWithPopup,
    logout,
  } = useAuth();

  // Tenant resolution and workspace resolver
  const tenantContext = useTenantContext();
  const workspaceResolver = useMemo(() => new GoogleWorkspaceResolver(tenantContext), [tenantContext]);

  // Industry config state
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>(() => {
    return (localStorage.getItem('nestam_selected_industry') as IndustryType) || 'dental';
  });

  useEffect(() => {
    authenticatedFetch('/api/tenant/sector-config')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.config?.sectorId && APPROVED_MEDICAL_SECTOR_IDS.includes(data.config.sectorId)) {
          setSelectedIndustry(data.config.sectorId);
          localStorage.setItem('nestam_selected_industry', data.config.sectorId);
        }
      })
      .catch((err) => console.warn('Failed to sync tenant sector config', err));
  }, []);

  const currentIndustryConfig = getSectorDefinition(selectedIndustry);


  const getKnowledgeBaseLabels = () => {
    const secDef = getSectorDefinition(selectedIndustry);
    switch (selectedIndustry) {
      case 'gym':
        return {
          title: `AI ${secDef.name} Knowledge Hub`,
          desc: 'Equip your AI Co-pilot with class schedules, subscription tiers, and personal trainer backgrounds to draft fitness-ready responses instantly.',
          timings: 'Gym Opening Hours & Peak Times',
          treatments: 'Membership Plans & Subscription Fees',
          doctors: 'Personal Trainers & Fitness Experts',
          reviews: 'Member Testimonials & Google Ratings',
          workflow: 'Onboarding Assessment & Workout Plan Setup',
          terminology: 'membership plans, coach credentials, or schedule availability',
          placeholderTimings: 'e.g. Mon-Fri: 6 AM - 10 PM, Sat-Sun: 8 AM - 6 PM...',
          placeholderTreatments: 'e.g. Monthly Standard: ₹1500, Premium VIP with Trainer: ₹5000...',
          placeholderDoctors: 'e.g. Coach Manoj, Certified K-1 Fitness Trainer, over 8 years experience...',
          placeholderReviews: 'e.g. Best functional fitness space in the area! Highly recommended...',
          placeholderWorkflow: 'e.g. 1. Diagnostic body scan 2. Trainer assignment 3. Personalized diet plan...'
        };
      case 'realestate':
        return {
          title: `AI ${secDef.name} Knowledge Hub`,
          desc: 'Train your AI assistant on property listings, site visit schedules, and broker background details to handle inquiries efficiently.',
          timings: 'Brokerage Consultation Hours & Availability',
          treatments: 'Available Property Units, Renting & Booking Fees',
          doctors: 'Agent/Broker Profiles & Local Area Specialities',
          reviews: 'Client Testimonials & Transaction Ratings',
          workflow: 'Site Visit Scheduling & Document Verification',
          terminology: 'site inspection bookings, active property listings, or agent contact info',
          placeholderTimings: 'e.g. Mon-Sun: 9 AM - 7 PM for site visits...',
          placeholderTreatments: 'e.g. 2 BHK luxury apartments: ₹45 Lakhs - ₹60 Lakhs...',
          placeholderDoctors: 'e.g. Ramesh Babu, Real Estate Consultant, over 10 years experience in premium gated communities...',
          placeholderReviews: 'e.g. Secured our dream home hassle-free! Very professional advisory...',
          placeholderWorkflow: 'e.g. 1. Phone consultation 2. Live site tour 3. KYC and legal verification...'
        };
      case 'cosmetic':
        return {
          title: `AI ${secDef.name} Knowledge Hub`,
          desc: 'Provide your AI with skin studio hours, treatment packages, and dermatologist backgrounds to design custom replies.',
          timings: 'Studio Hours & Aesthetic Consultation Days',
          treatments: 'Cosmetic Procedures & Service Pricing',
          doctors: 'Specialist Profiles, Experience & Certifications',
          reviews: 'Client Reviews & Social Feedback',
          workflow: 'Session Intake & Personalized Assessment Process',
          terminology: 'cosmetic treatments, specialist profiles, or studio hours',
          placeholderTimings: 'e.g. Tue-Sun: 10 AM - 8 PM (Mondays Closed)...',
          placeholderTreatments: 'e.g. Laser Hair Removal: ₹4000, Microdermabrasion Facial: ₹2500...',
          placeholderDoctors: 'e.g. Dr. Haritha, MDS, Cosmetologist, specialist in anti-aging treatments...',
          placeholderReviews: 'e.g. Exceptionally clean clinic and modern equipment! My skin feels wonderful...',
          placeholderWorkflow: 'e.g. 1. Skin type analysis 2. Treatment custom patch test 3. Procedure...'
        };
      case 'multispecialty':
        return {
          title: `AI ${secDef.name} Knowledge Hub`,
          desc: 'Feed doctor OPD schedules, specialty departments, and patient guidelines to the AI to organize frontdesk communication.',
          timings: 'OPD Timings & Department Schedules',
          treatments: 'Specialty Procedures & OPD Consultation Costs',
          doctors: 'Consultant Physicians & Medical Qualifications',
          reviews: 'Patient Testimonials & Hospital Care Feedback',
          workflow: 'OPD Registration, Diagnostics & Consultation Flow',
          terminology: 'specialties, doctors lists, or clinic timings',
          placeholderTimings: 'e.g. OPD Timings: 8:00 AM to 9:00 PM Daily...',
          placeholderTreatments: 'e.g. Cardiology OPD: ₹500, Orthopedics Consultation: ₹400...',
          placeholderDoctors: 'e.g. Dr. K. Rao, MD, DNB (Cardiology), chief cardiologist with 15+ years experience...',
          placeholderReviews: 'e.g. Immediate emergency response, highly empathetic doctor panel...',
          placeholderWorkflow: 'e.g. 1. Token generation at reception 2. Triage & vital check 3. Consultation...'
        };
      case 'dental':
      default:
        return {
          title: `AI ${secDef.name} Knowledge Hub`,
          desc: 'Equip your AI Co-pilot with timings, procedures, and doctor expertise to draft perfect WhatsApp replies instantly.',
          timings: 'Clinic Timings & Working Days',
          treatments: 'Dental Treatments & Estimated Costs',
          doctors: 'Dentist Expertise & Professional Background',
          reviews: 'Patient Reviews & Google Feedback',
          workflow: 'Clinic Entry Process & Appointment Workflow',
          terminology: 'dental services, consulting dentists, or clinic timings',
          placeholderTimings: 'Monday - Saturday: 9:00 AM to 1:00 PM and 4:00 PM to 8:00 PM...',
          placeholderTreatments: 'Root Canal Treatment (RCT): ₹3,500 - ₹5,000.\nDental Implant (Single Tooth): ₹25,000 - ₹40,000...',
          placeholderDoctors: 'Dr. Prasad, B.D.S, M.D.S (Endodontist) - Painless root canals...',
          placeholderReviews: 'Rated 4.9/5 stars based on 450 local reviews on Google...',
          placeholderWorkflow: '1. Registration 2. Digital X-Ray 3. Consult 4. Booking follow-up...'
        };
    }
  };

  const kbLabels = getKnowledgeBaseLabels();

  const loadIndustryState = (industryId: IndustryType, forceReset: boolean = false) => {
    const config = getSectorDefinition(industryId);
    if (!config) return;

    setSelectedIndustry(industryId);
    localStorage.setItem('nestam_selected_industry', industryId);

    // Business Name
    const savedBiz = localStorage.getItem(`nestam_business_name_${industryId}`);
    const bizVal = forceReset ? config.defaultBusinessName : (savedBiz || config.defaultBusinessName);
    setBusinessName(bizVal);
    localStorage.setItem('nestam_business_name', bizVal);
    localStorage.setItem(`nestam_business_name_${industryId}`, bizVal);

    // Sender Name
    const savedSender = localStorage.getItem(`nestam_sender_name_${industryId}`);
    const senderVal = forceReset ? config.defaultSenderName : (savedSender || config.defaultSenderName);
    setSenderName(senderVal);
    localStorage.setItem('nestam_sender_name', senderVal);
    localStorage.setItem(`nestam_sender_name_${industryId}`, senderVal);

    // Review Link
    const savedReview = localStorage.getItem(`nestam_review_link_${industryId}`);
    const reviewVal = forceReset ? config.defaultReviewLink : (savedReview || config.defaultReviewLink);
    setReviewLink(reviewVal);
    localStorage.setItem('nestam_review_link', reviewVal);
    localStorage.setItem(`nestam_review_link_${industryId}`, reviewVal);

    // Contacts
    const savedContacts = localStorage.getItem(`nestam_contacts_${industryId}`);
    const contactsVal = forceReset ? config.mockContacts : (savedContacts ? JSON.parse(savedContacts) : config.mockContacts);
    setContacts(contactsVal);
    localStorage.setItem('crm_contacts', JSON.stringify(contactsVal));
    localStorage.setItem(`nestam_contacts_${industryId}`, JSON.stringify(contactsVal));

    // Templates
    const savedTemplates = localStorage.getItem(`nestam_templates_${industryId}`);
    const templatesVal = forceReset ? config.defaultTemplates : (savedTemplates ? JSON.parse(savedTemplates) : config.defaultTemplates);
    setTemplates(templatesVal);
    localStorage.setItem('crm_templates', JSON.stringify(templatesVal));
    localStorage.setItem(`nestam_templates_${industryId}`, JSON.stringify(templatesVal));

    // AI Knowledge Base
    const savedKb = localStorage.getItem(`nestam_ai_knowledge_base_${industryId}`);
    const kbVal = forceReset ? config.aiKnowledgeBase : (savedKb ? JSON.parse(savedKb) : config.aiKnowledgeBase);
    setAiKnowledgeBase(kbVal);
    localStorage.setItem('nestam_ai_knowledge_base', JSON.stringify(kbVal));
    localStorage.setItem(`nestam_ai_knowledge_base_${industryId}`, JSON.stringify(kbVal));

    // Reminders
    const savedReminders = localStorage.getItem(`nestam_scheduled_reminders_${industryId}`);
    const remindersVal = savedReminders ? JSON.parse(savedReminders) : [];
    setScheduledReminders(remindersVal);
    localStorage.setItem('crm_scheduled_reminders', JSON.stringify(remindersVal));
    localStorage.setItem(`nestam_scheduled_reminders_${industryId}`, JSON.stringify(remindersVal));

    // Clear active selection
    setSelectedContactId(null);
  };

  const handleSetIndustry = (industryId: IndustryType) => {
    loadIndustryState(industryId, false);
    setSyncSuccess(`Aesthetic & business terminology adapted to ${getSectorDefinition(industryId).name}!`);
  };

  const handleSwitchIndustryAndLoadPresets = (industryId: IndustryType) => {
    const config = getSectorDefinition(industryId);
    if (!config) return;
    
    showConfirm(
      'Switch Preset Industry',
      `Switching to ${config.name} will reset your local contacts list, message templates, and AI knowledge base to the ${config.name} presets. This will overwrite current changes. Do you want to proceed?`,
      () => {
        loadIndustryState(industryId, true);
        setSyncSuccess(`Successfully loaded all preset templates, contacts, and AI knowledge for ${config.name}!`);
      },
      true,
      "Switch & Overwrite",
      "Cancel"
    );
  };

  // CRM Databases state
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('crm_contacts');
    return saved ? JSON.parse(saved) : MOCK_CONTACTS;
  });

  const [interactions, setInteractions] = useState<Interaction[]>(() => {
    const saved = localStorage.getItem('crm_interactions');
    return saved ? JSON.parse(saved) : MOCK_INTERACTIONS;
  });

  const [templates, setTemplates] = useState<MessageTemplate[]>(() => {
    const saved = localStorage.getItem('crm_templates');
    return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
  });

  const [calendarFollowUps, setCalendarFollowUps] = useState<UpcomingFollowUp[]>([]);
  const [scheduledReminders, setScheduledReminders] = useState<ScheduledReminder[]>(() => {
    const saved = localStorage.getItem('crm_scheduled_reminders');
    return saved ? JSON.parse(saved) : [];
  });

  // Doctors Roster State
  const [doctors, setDoctors] = useState<Doctor[]>(() => {
    const saved = localStorage.getItem('nestam_doctors_list');
    return saved ? JSON.parse(saved) : [
      { id: 'doc-1', name: 'Dr. Sai Krishna', title: 'Senior Endodontist', avatar: 'SK', color: 'teal', totalAppts: 8, phone: '+91 9876543210' },
      { id: 'doc-2', name: 'Dr. Anitha Reddy', title: 'Orthodontist', avatar: 'AR', color: 'indigo', totalAppts: 6, phone: '+91 9876543211' },
      { id: 'doc-3', name: 'Dr. Praveen', title: 'Pediatric Dentist', avatar: 'DP', color: 'amber', totalAppts: 5, phone: '+91 9876543212' },
      { id: 'doc-4', name: 'Dr. Lakshmi', title: 'Prosthodontist', avatar: 'DL', color: 'emerald', totalAppts: 7, phone: '+91 9876543213' },
    ];
  });

  // Appointments Grid State
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('nestam_appointments_list');
    const today = new Date().toISOString().split('T')[0];
    return saved ? JSON.parse(saved) : [
      { id: 'apt-1', docId: 'doc-1', doctorName: 'Dr. Sai Krishna', patientName: 'Ravi Teja', treatment: 'Root Canal Treatment', time: '09:00 AM - 10:00 AM', date: today, status: 'In Treatment', type: 'confirmed' },
      { id: 'apt-2', docId: 'doc-2', doctorName: 'Dr. Anitha Reddy', patientName: 'Nishitha Rao', treatment: 'Teeth Braces Tuning', time: '09:30 AM - 10:15 AM', date: today, status: 'Completed', type: 'completed' },
      { id: 'apt-3', docId: 'doc-3', doctorName: 'Dr. Praveen', patientName: 'Anil Singh', treatment: 'Pediatric Scaling', time: '12:00 PM - 12:30 PM', date: today, status: 'Confirmed', type: 'confirmed' },
      { id: 'apt-4', docId: 'doc-1', doctorName: 'Dr. Sai Krishna', patientName: 'Karthik Raj', treatment: 'Dental Crown', time: '03:00 PM - 04:00 PM', date: today, status: 'Confirmed', type: 'confirmed' },
      { id: 'apt-5', docId: 'doc-4', doctorName: 'Dr. Lakshmi', patientName: 'Blocked Time', treatment: 'Clinic Maintenance', time: '04:00 PM - 05:00 PM', date: today, status: 'Blocked', type: 'blocked' },
    ];
  });

  const handleAddDoctor = (newDoc: Omit<Doctor, 'id'>) => {
    const doc: Doctor = {
      ...newDoc,
      id: `doc-${Date.now()}`,
      avatar: newDoc.avatar || newDoc.name.replace('Dr.', '').trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
      totalAppts: 0
    };
    const updated = [...doctors, doc];
    setDoctors(updated);
    localStorage.setItem('nestam_doctors_list', JSON.stringify(updated));
    setSyncSuccess(`Doctor ${doc.name} successfully registered in clinic roster!`);
  };

  const handleDeleteDoctor = (id: string) => {
    const docToDelete = doctors.find(d => d.id === id);
    if (!docToDelete) return;
    showConfirm(
      'Remove Doctor from Roster',
      `Are you sure you want to delete ${docToDelete.name}? Their schedule column will be removed from the interactive calendar.`,
      () => {
        const updated = doctors.filter(d => d.id !== id);
        setDoctors(updated);
        localStorage.setItem('nestam_doctors_list', JSON.stringify(updated));
        setSyncSuccess(`Doctor ${docToDelete.name} removed from roster.`);
      },
      true,
      'Remove Doctor',
      'Cancel'
    );
  };

  const handleAddAppointment = (newApt: Omit<Appointment, 'id'>) => {
    const apt: Appointment = {
      ...newApt,
      id: `apt-${Date.now()}`
    };
    const updated = [apt, ...appointments];
    setAppointments(updated);
    localStorage.setItem('nestam_appointments_list', JSON.stringify(updated));
    setSyncSuccess(`Appointment booked for ${apt.patientName} with ${apt.doctorName || 'Assigned Specialist'}!`);

    // Emit Durable Automation Event
    AutomationService.triggerEventAsync({
      triggerType: 'appointment_created',
      contact: { name: apt.patientName, phone: apt.patientPhone },
      appointment: apt
    }).catch(err => console.warn('Automation trigger error', err));
  };

  const handleUpdateAppointmentStatus = (id: string, status: Appointment['status'], type: Appointment['type']) => {
    const targetApt = appointments.find(a => a.id === id);
    const updated = appointments.map(a => a.id === id ? { ...a, status, type } : a);
    setAppointments(updated);
    localStorage.setItem('nestam_appointments_list', JSON.stringify(updated));

    if (targetApt) {
      let triggerType: string | null = null;
      if (status === 'Cancelled') triggerType = 'appointment_cancelled';
      else if (status === 'Completed') triggerType = 'appointment_completed';
      else if (status === 'No-Show') triggerType = 'appointment_noshow';
      else if (status === 'Confirmed') triggerType = 'appointment_created';

      if (triggerType) {
        AutomationService.triggerEventAsync({
          triggerType,
          contact: { name: targetApt.patientName, phone: targetApt.patientPhone },
          appointment: { ...targetApt, status }
        }).catch(err => console.warn('Automation trigger error', err));
      }
    }
  };


  const handleDeleteAppointment = (id: string) => {
    const updated = appointments.filter(a => a.id !== id);
    setAppointments(updated);
    localStorage.setItem('nestam_appointments_list', JSON.stringify(updated));
    setSyncSuccess('Appointment slot updated.');
  };

  // Selection states
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'contacts' | 'templates' | 'whatsapp_hub' | 'settings' | 'seo_audit'>('dashboard');

  // Onboarding & SEO states
  const [cityLandmark, setCityLandmark] = useState<string>(() => localStorage.getItem('nestam_city_landmark') || 'Vijayawada');
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    const completed = localStorage.getItem('nestam_onboarding_completed');
    return completed !== 'true';
  });

  // Slide-out panel states
  const [isSlideOutOpen, setIsSlideOutOpen] = useState(false);
  const [slideOutContact, setSlideOutContact] = useState<Contact | null>(null);

  // Command Palette state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Local/Fallback Google Spreadsheet state
  const [localSpreadsheetId, setLocalSpreadsheetId] = useState<string | null>(() => {
    return localStorage.getItem('crm_spreadsheet_id');
  });
  const [localSpreadsheetUrl, setLocalSpreadsheetUrl] = useState<string | null>(() => {
    return localStorage.getItem('crm_spreadsheet_url');
  });

  // Dynamically resolve spreadsheetId and spreadsheetUrl from TenantContext (Tenant database)
  const spreadsheetId = useMemo(() => {
    if (tenantContext.loaded && tenantContext.tenant && workspaceResolver.hasSpreadsheetId()) {
      try {
        return workspaceResolver.getSpreadsheetId();
      } catch (err) {
        console.warn('Failed to resolve spreadsheet ID from TenantContext:', err);
      }
    }
    return localSpreadsheetId;
  }, [tenantContext.loaded, tenantContext.tenant, workspaceResolver, localSpreadsheetId]);

  const spreadsheetUrl = useMemo(() => {
    if (spreadsheetId) {
      return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    }
    return localSpreadsheetUrl;
  }, [spreadsheetId, localSpreadsheetUrl]);

  // Backward-compatible state setters
  const setSpreadsheetId = (id: string | null) => {
    setLocalSpreadsheetId(id);
    if (id) {
      localStorage.setItem('crm_spreadsheet_id', id);
    } else {
      localStorage.removeItem('crm_spreadsheet_id');
    }
  };

  const setSpreadsheetUrl = (url: string | null) => {
    setLocalSpreadsheetUrl(url);
    if (url) {
      localStorage.setItem('crm_spreadsheet_url', url);
    } else {
      localStorage.removeItem('crm_spreadsheet_url');
    }
  };

  // Loading/Sync statuses
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  // Modals state
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [contactForCalendar, setContactForCalendar] = useState<Contact | null>(null);

  // Custom non-blocking dialogs replacing blocked window.confirm & alert in iframes
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const [alertDialog, setAlertDialog] = useState<{
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    linkUrl?: string;
    linkText?: string;
  } | null>(null);

  const showConfirm = (title: string, message: string, onConfirm: () => void, isDanger = false, confirmText = "Confirm", cancelText = "Cancel") => {
    setConfirmDialog({ title, message, onConfirm, isDanger, confirmText, cancelText });
  };

  const showAlert = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', linkUrl?: string, linkText?: string) => {
    setAlertDialog({ title, message, type, linkUrl, linkText });
  };

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactCategory, setContactCategory] = useState<ContactCategory>('Lead');
  const [contactNotes, setContactNotes] = useState('');
  const [contactTreatmentType, setContactTreatmentType] = useState('');
  const [contactTreatmentValue, setContactTreatmentValue] = useState<number>(0);
  const [contactAmountCollected, setContactAmountCollected] = useState<number>(0);
  const [contactPaymentMethod, setContactPaymentMethod] = useState<string>('UPI/PhonePe');
  const [contactPipelineStage, setContactPipelineStage] = useState<'Inquiry' | 'Scheduled' | 'Visited' | 'Treatment' | 'Completed'>('Inquiry');
  const [contactSource, setContactSource] = useState<'WhatsApp' | 'Phone' | 'Website' | 'Walk-in'>('WhatsApp');
  const [contactIsRepeat, setContactIsRepeat] = useState<boolean>(false);
  const [contactIsFamily, setContactIsFamily] = useState<boolean>(false);
  const [contactFamilyRelation, setContactFamilyRelation] = useState<string>('Spouse');
  const [contactPrimaryMember, setContactPrimaryMember] = useState<string>('');

  // Calendar event form state
  const [eventSummary, setEventSummary] = useState('');
  const [eventNotes, setEventNotes] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');

  // Sub-navigation inside Patients tab
  const [patientsSubView, setPatientsSubView] = useState<'directory' | 'grid'>('directory');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [stageFilter, setStageFilter] = useState<string>('All');
  const [treatmentTypeFilter, setTreatmentTypeFilter] = useState<string>('All');
  const [autopilotFilter, setAutopilotFilter] = useState<string>('All');
  const [paymentFilter, setPaymentFilter] = useState<string>('All');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('All');
  const [gridViewMode, setGridViewMode] = useState<'cards' | 'table'>('cards');

  // Profile settings customization state
  const [businessName, setBusinessName] = useState(() => localStorage.getItem('nestam_business_name') || 'Sri Sai Dental Clinic');
  const [senderName, setSenderName] = useState(() => localStorage.getItem('nestam_sender_name') || 'Dr. Prasad');
  const [reviewLink, setReviewLink] = useState(() => localStorage.getItem('nestam_review_link') || 'https://g.page/srisaidental-vijayawada/review');

  // AI Knowledge Base settings
  const [aiKnowledgeBase, setAiKnowledgeBase] = useState<AIKnowledgeBase>(() => {
    const saved = localStorage.getItem('nestam_ai_knowledge_base');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // use default below
      }
    }
    return {
      timings: 'Monday - Saturday: 9:00 AM to 1:00 PM and 4:00 PM to 8:00 PM. Sundays: Emergency cases only with prior booking.',
      treatments: 'Root Canal Treatment (RCT): ₹3,500 - ₹5,000.\nDental Implant (Single Tooth): ₹25,000 - ₹40,000.\nScaling & Polishing: ₹800 - ₹1,500.\nTeeth Whitening (Laser): ₹6,000.\nComposite Filling: ₹1,200 - ₹2,500.\nZirconia Crowns: ₹8,000 - ₹15,000.\nOrthodontic Braces: ₹30,500 - ₹75,000 with convenient EMI options.',
      doctors: 'Dr. Prasad, B.D.S, M.D.S (Endodontist & Chief Implantologist) - Over 12 years of experience specializing in painless root canals and complex dental implants.\nDr. Swetha, B.D.S (Pediatric Dentist & Orthodontist Associate) - Over 6 years of experience managing kids dental health and braces.',
      reviews: 'Google Rating: 4.9/5 stars based on over 450 local reviews in Vijayawada.\nPatient feedback: "Dr. Prasad is highly experienced and explains the treatment beautifully. Clean clinic and painless treatment." and "Best pediatric dental care in Vijayawada, my daughter felt extremely safe with Dr. Swetha."',
      workflow: '1. Patient registration and basic symptoms logs.\n2. Digital X-ray analysis (Charges: ₹200) for diagnostic accuracy.\n3. Doctor Consultation & complete treatment plan explanation.\n4. Appointment scheduling and follow-ups via Vyapari Nestam CRM.'
    };
  });

  // AI Assistant Chat History State
  const [aiChatHistory, setAiChatHistory] = useState<AIChatTurn[]>(() => {
    const saved = localStorage.getItem('nestam_ai_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // use default empty array
      }
    }
    return [];
  });

  // Lifted WhatsApp pairing and Meta API configurations
  const [whatsappMode, setWhatsappMode] = useState<'simulated' | 'meta'>(() => {
    return (localStorage.getItem('whatsapp_integration_mode') as 'simulated' | 'meta') || 'meta';
  });
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState('');
  const [metaAccessToken, setMetaAccessToken] = useState('');
  const [metaWabaId, setMetaWabaId] = useState('');
  const [metaVerifyToken, setMetaVerifyToken] = useState('');

  // Lifted AI Agent configurations
  const [aiAgentActive, setAiAgentActive] = useState<boolean>(() => {
    return localStorage.getItem('nestam_ai_agent_active') === 'true';
  });
  const [aiAgentType, setAiAgentType] = useState<string>(() => {
    return localStorage.getItem('nestam_ai_agent_type') || 'gemini';
  });
  const [customSystemPrompt, setCustomSystemPrompt] = useState<string>(() => {
    return localStorage.getItem('nestam_ai_custom_system_prompt') || '';
  });
  const [customApiKey, setCustomApiKey] = useState<string>('');

  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>(() => {
    return (localStorage.getItem('whatsapp_connection_status') as 'disconnected' | 'connecting' | 'connected') || 'disconnected';
  });
  const [deviceDetails, setDeviceDetails] = useState<any>(() => {
    const saved = localStorage.getItem('whatsapp_device_details');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Local persistence effects for lifted states
  useEffect(() => {
    localStorage.setItem('whatsapp_integration_mode', whatsappMode);
  }, [whatsappMode]);

  useEffect(() => {
    localStorage.setItem('whatsapp_connection_status', connectionStatus);
  }, [connectionStatus]);

  useEffect(() => {
    if (deviceDetails) {
      localStorage.setItem('whatsapp_device_details', JSON.stringify(deviceDetails));
    } else {
      localStorage.removeItem('whatsapp_device_details');
    }
  }, [deviceDetails]);

  useEffect(() => {
    localStorage.setItem('nestam_ai_chat_history', JSON.stringify(aiChatHistory));
  }, [aiChatHistory]);

  useEffect(() => {
    localStorage.setItem('nestam_ai_agent_active', String(aiAgentActive));
  }, [aiAgentActive]);

  useEffect(() => {
    localStorage.setItem('nestam_ai_agent_type', aiAgentType);
  }, [aiAgentType]);

  useEffect(() => {
    localStorage.setItem('nestam_ai_custom_system_prompt', customSystemPrompt);
  }, [customSystemPrompt]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isContactModalOpen) {
          handleCloseContactModal();
        } else if (isCalendarModalOpen) {
          setIsCalendarModalOpen(false);
          setContactForCalendar(null);
        } else if (selectedContactId) {
          setSelectedContactId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isContactModalOpen, isCalendarModalOpen, selectedContactId]);

  useEffect(() => {
    localStorage.setItem('nestam_business_name', businessName);
    if (selectedIndustry) {
      localStorage.setItem(`nestam_business_name_${selectedIndustry}`, businessName);
    }
  }, [businessName, selectedIndustry]);

  useEffect(() => {
    localStorage.setItem('nestam_sender_name', senderName);
    if (selectedIndustry) {
      localStorage.setItem(`nestam_sender_name_${selectedIndustry}`, senderName);
    }
  }, [senderName, selectedIndustry]);

  useEffect(() => {
    localStorage.setItem('nestam_review_link', reviewLink);
    if (selectedIndustry) {
      localStorage.setItem(`nestam_review_link_${selectedIndustry}`, reviewLink);
    }
  }, [reviewLink, selectedIndustry]);

  useEffect(() => {
    localStorage.setItem('nestam_ai_knowledge_base', JSON.stringify(aiKnowledgeBase));
    if (selectedIndustry) {
      localStorage.setItem(`nestam_ai_knowledge_base_${selectedIndustry}`, JSON.stringify(aiKnowledgeBase));
    }
  }, [aiKnowledgeBase, selectedIndustry]);

  // Load persistence local changes
  useEffect(() => {
    localStorage.setItem('crm_contacts', JSON.stringify(contacts));
    if (selectedIndustry) {
      localStorage.setItem(`nestam_contacts_${selectedIndustry}`, JSON.stringify(contacts));
    }
  }, [contacts, selectedIndustry]);

  useEffect(() => {
    localStorage.setItem('crm_interactions', JSON.stringify(interactions));
    if (selectedIndustry) {
      localStorage.setItem(`nestam_interactions_${selectedIndustry}`, JSON.stringify(interactions));
    }
  }, [interactions, selectedIndustry]);

  useEffect(() => {
    localStorage.setItem('crm_templates', JSON.stringify(templates));
    if (selectedIndustry) {
      localStorage.setItem(`nestam_templates_${selectedIndustry}`, JSON.stringify(templates));
    }
  }, [templates, selectedIndustry]);

  useEffect(() => {
    localStorage.setItem('crm_scheduled_reminders', JSON.stringify(scheduledReminders));
    if (selectedIndustry) {
      localStorage.setItem(`nestam_scheduled_reminders_${selectedIndustry}`, JSON.stringify(scheduledReminders));
    }
  }, [scheduledReminders, selectedIndustry]);

  // Auto-dismiss syncSuccess after 5 seconds
  useEffect(() => {
    if (syncSuccess) {
      const timer = setTimeout(() => {
        setSyncSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [syncSuccess]);

  // Auto-dismiss syncError after 8 seconds
  useEffect(() => {
    if (syncError) {
      const timer = setTimeout(() => {
        setSyncError(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [syncError]);

  // Background Auto-Reminder checking engine
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      let hasUpdates = false;
      const updatedReminders = scheduledReminders.map(rem => {
        if (rem.status !== 'Scheduled') return rem;

        try {
          const scheduledDate = new Date(rem.scheduledTime);
          const triggerTimeMs = scheduledDate.getTime() - (rem.triggerOffsetMinutes * 60 * 1000);
          
          if (now >= triggerTimeMs) {
            hasUpdates = true;
            const logNotes = `[⏰ Automated Reminder Triggered]\nPurpose: ${rem.title}\nMessage: "${rem.message}"`;
            let outcomeText = '';
            let typesToLog: ('WhatsApp Sent' | 'Email')[] = [];
            
            if (rem.reminderType === 'WhatsApp' || rem.reminderType === 'Both') {
              typesToLog.push('WhatsApp Sent');
              outcomeText += `Automated WhatsApp reminder sent to ${rem.contactPhone}. `;

              // REAL DISPATCH FOR META API MODE:
              if (whatsappMode === 'meta' && metaPhoneNumberId && metaAccessToken) {
                const cleanedPhone = rem.contactPhone.replace(/[^0-9]/g, '');
                fetch(`https://graph.facebook.com/v18.0/${metaPhoneNumberId}/messages`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${metaAccessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: cleanedPhone,
                    type: "text",
                    text: { body: rem.message },
                  }),
                })
                .then(async (res) => {
                  const data = await res.json();
                  if (res.ok) {
                    console.log(`[⏰ Auto-Reminder] Real Meta WhatsApp message dispatched to ${rem.contactName}. Msg ID: ${data.messages?.[0]?.id}`);
                  } else {
                    console.error(`[⏰ Auto-Reminder] Meta API Error:`, data.error?.message);
                  }
                })
                .catch(err => {
                  console.error(`[⏰ Auto-Reminder] Network error dispatching Meta message:`, err);
                });
              }
            }
            if (rem.reminderType === 'Email' || rem.reminderType === 'Both') {
              typesToLog.push('Email');
              outcomeText += `Automated Email reminder sent to ${rem.contactEmail || 'N/A'}. `;
            }

            typesToLog.forEach(t => {
              const newInter: Interaction = {
                id: `inter-auto-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                contactId: rem.contactId,
                contactName: rem.contactName,
                type: t,
                notes: rem.message,
                outcome: outcomeText.trim(),
                timestamp: new Date().toISOString()
              };
              setInteractions(prev => [newInter, ...prev]);
            });

            // Update contact last contacted status
            setContacts(prev => prev.map(c => 
              c.id === rem.contactId ? { ...c, lastContacted: new Date().toISOString() } : c
            ));

            setSyncSuccess(`⏰ [Auto-Reminder] Sent to ${rem.contactName} via ${rem.reminderType}!`);

            return { ...rem, status: 'Sent' as const };
          }
        } catch (e) {
          console.error('Error checking automated reminders:', e);
        }
        return rem;
      });

      if (hasUpdates) {
        setScheduledReminders(updatedReminders);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [scheduledReminders, contacts, whatsappMode, metaPhoneNumberId, metaAccessToken]);

  // Refs for tracking latest state values in webhook polling to prevent closure bugs
  const contactsRef = useRef(contacts);
  contactsRef.current = contacts;
  const interactionsRef = useRef(interactions);
  interactionsRef.current = interactions;
  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;
  const spreadsheetIdRef = useRef(spreadsheetId);
  spreadsheetIdRef.current = spreadsheetId;

  const aiAgentActiveRef = useRef(aiAgentActive);
  aiAgentActiveRef.current = aiAgentActive;
  const aiAgentTypeRef = useRef(aiAgentType);
  aiAgentTypeRef.current = aiAgentType;
  const customSystemPromptRef = useRef(customSystemPrompt);
  customSystemPromptRef.current = customSystemPrompt;
  const customApiKeyRef = useRef(customApiKey);
  customApiKeyRef.current = customApiKey;
  const selectedIndustryRef = useRef(selectedIndustry);
  selectedIndustryRef.current = selectedIndustry;
  const aiKnowledgeBaseRef = useRef(aiKnowledgeBase);
  aiKnowledgeBaseRef.current = aiKnowledgeBase;
  const whatsappModeRef = useRef(whatsappMode);
  whatsappModeRef.current = whatsappMode;
  const metaPhoneNumberIdRef = useRef(metaPhoneNumberId);
  metaPhoneNumberIdRef.current = metaPhoneNumberId;
  const metaAccessTokenRef = useRef(metaAccessToken);
  metaAccessTokenRef.current = metaAccessToken;
  const businessNameRef = useRef(businessName);
  businessNameRef.current = businessName;

  const triggerAiAutopilotReply = async (contact: Contact, incomingText: string) => {
    try {
      console.log(`[🤖 Autopilot] Triggering automated AI Co-pilot reply for ${contact.name}`);
      
      const chatHistory = interactionsRef.current
        .filter(i => i.contactId === contact.id)
        .slice(-4)
        .map(item => ({
          sender: item.type === 'WhatsApp Sent' ? 'Business' : item.type === 'Incoming Message' ? 'Patient' : 'Note',
          text: item.notes
        }));

      const kbText = aiKnowledgeBaseRef.current 
        ? `Timings: ${aiKnowledgeBaseRef.current.timings}\nTreatments: ${aiKnowledgeBaseRef.current.treatments}\nDoctors: ${aiKnowledgeBaseRef.current.doctors}\nReviews: ${aiKnowledgeBaseRef.current.reviews}\nWorkflow: ${aiKnowledgeBaseRef.current.workflow}`
        : 'Sri Sai Dental Clinic Vijayawada. Standard clinic timings: Mon-Sat 9:00 AM - 1:00 PM and 4:00 PM - 8:00 PM.';

      // Call `/api/ai/chat`
      const response = await authenticatedFetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: incomingText,
          knowledgeBase: kbText,
          conversationHistory: chatHistory,
          patientName: contact.name,
          aiAgentType: aiAgentTypeRef.current,
          selectedIndustry: selectedIndustryRef.current,
          customSystemPrompt: customSystemPromptRef.current,
        })
      });

      if (!response.ok) {
        throw new Error('AI Server responded with an error');
      }

      const data = await response.json();
      const aiReply = data.draftReply;

      if (!aiReply) {
        throw new Error('No draft reply returned by AI');
      }

      console.log(`[🤖 Autopilot] Generated AI reply for ${contact.name}: "${aiReply}"`);

      // Dispatch through the trusted server. The browser never receives a Meta credential.
      if (whatsappModeRef.current === 'meta') {
        const sendResponse = await authenticatedFetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: formatWhatsAppPhone(contact.phone),
            message: aiReply,
            messageType: 'text',
          }),
        });
        if (!sendResponse.ok) {
          const errorBody = await sendResponse.json().catch(() => ({}));
          throw new Error(errorBody.error || 'The secure WhatsApp delivery service could not send the AI reply.');
        }
      }

      // 2. Add an outgoing interaction log
      const outgoingInterId = `inter-outgoing-auto-${Date.now()}`;
      const newInteraction: Interaction = {
        id: outgoingInterId,
        contactId: contact.id,
        contactName: contact.name,
        type: 'WhatsApp Sent',
        notes: aiReply,
        outcome: whatsappModeRef.current === 'meta' ? 'Sent Automatically via Meta Cloud API' : 'Sent Automatically via Meta WhatsApp Network',
        timestamp: new Date().toISOString()
      };

      setInteractions(prev => [newInteraction, ...prev]);

      // If spreadsheet sync is active
      if (accessTokenRef.current && spreadsheetIdRef.current) {
        saveInteractionsToSheet(accessTokenRef.current, spreadsheetIdRef.current, [newInteraction, ...interactionsRef.current])
          .catch(err => console.error('Error syncing autopilot response interaction:', err));
      }

      // Handle automatic scheduling suggestion if present!
      if (data.schedulingSuggestion?.shouldSchedule) {
        const sugg = data.schedulingSuggestion;
        console.log(`[🤖 Autopilot] AI suggests booking an appointment:`, sugg);
        
        // Let's create the local task & auto reminder automatically!
        const startIso = `${sugg.date}T${sugg.time}:00`;
        const startDate = new Date(startIso);
        const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

        // Fallback local calendar task
        const localTask: UpcomingFollowUp = {
          id: `local-task-${Date.now()}`,
          contactId: contact.id,
          contactName: contact.name,
          contactPhone: contact.phone,
          summary: sugg.summary || `Appointment - ${contact.name}`,
          description: sugg.description || 'Dental checkup',
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        };
        setCalendarFollowUps(prev => [localTask, ...prev]);

        // Automatically register a ScheduledReminder for this appointment!
        const autoReminder: ScheduledReminder = {
          id: `rem-auto-${Date.now()}`,
          contactId: contact.id,
          contactName: contact.name,
          contactPhone: contact.phone,
          contactEmail: contact.email,
          title: sugg.summary || 'AI Auto-Booked Visit',
          scheduledTime: startIso,
          reminderType: contact.email ? 'Both' : 'WhatsApp',
          message: `Hi ${contact.name}, this is an automated reminder for your upcoming appointment "${sugg.summary || 'visit'}" scheduled on ${sugg.date} at ${sugg.time}. Looking forward to seeing you!`,
          status: 'Scheduled',
          triggerOffsetMinutes: 0,
          createdAt: new Date().toISOString(),
        };
        setScheduledReminders(prev => [autoReminder, ...prev]);

        // Log this auto-booking as an interaction!
        const schedInterId = `inter-sched-auto-${Date.now()}`;
        const schedInteraction: Interaction = {
          id: schedInterId,
          contactId: contact.id,
          contactName: contact.name,
          type: 'Calendar Follow-up',
          notes: `Automatically Scheduled appointment: "${sugg.summary || 'visit'}" for ${sugg.date} at ${sugg.time} by Autopilot AI Agent.`,
          outcome: 'Autopilot Scheduled',
          timestamp: new Date().toISOString()
        };
        setInteractions(prev => [schedInteraction, ...prev]);

        // Move contact to Scheduled pipelineStage & category Follow-up automatically
        setContacts(prev => prev.map(c => 
          c.id === contact.id ? { ...c, pipelineStage: 'Scheduled', category: 'Follow-up' } : c
        ));
      }

    } catch (err) {
      console.error('[🤖 Autopilot] Error generating/sending automated reply:', err);
    }
  };

  // Poll for incoming WhatsApp messages received via Webhook
  useEffect(() => {
    let isReady = false;
    let readinessChecking = false;

    const checkReadiness = async (): Promise<boolean> => {
      if (readinessChecking) return isReady;
      readinessChecking = true;
      try {
        const res = await authenticatedFetch('/api/whatsapp/readiness');
        if (res.ok) {
          const data = await res.json();
          isReady = !!data.ready;
        } else {
          isReady = false;
        }
      } catch {
        isReady = false;
      } finally {
        readinessChecking = false;
      }
      return isReady;
    };

    // Probe readiness initially
    checkReadiness();
    let lastReadinessCheck = Date.now();

    const pollInterval = setInterval(async () => {
      // Avoid querying received-messages if schema or persistence is not ready
      if (!isReady) {
        if (Date.now() - lastReadinessCheck > 30000) {
          lastReadinessCheck = Date.now();
          await checkReadiness();
        }
        if (!isReady) return;
      }

      try {
        const response = await authenticatedFetch('/api/whatsapp/received-messages').catch(() => null);
        if (!response) return;

        if (response.status === 503 || response.status === 530) {
          isReady = false;
          lastReadinessCheck = Date.now();
          return;
        }

        if (!response.ok) return;
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          return;
        }

        let newMsgs: any[] = [];
        try {
          newMsgs = await response.json();
        } catch (jsonErr) {
          console.warn('Silent fallback: API returned non-JSON/invalid response during server spinup.');
          return;
        }

        if (newMsgs && newMsgs.length > 0) {
          let updatedContacts = [...contactsRef.current];
          let updatedInteractions = [...interactionsRef.current];
          let changedContacts = false;
          let changedInteractions = false;

          newMsgs.forEach((msg: any) => {
            const interId = `inter-incoming-${msg.id}`;
            
            // Check if this message was already processed/logged
            const alreadyProcessed = updatedInteractions.some(i => i.id === interId);
            if (alreadyProcessed) return;

            const cleanFrom = msg.from.replace(/[^0-9]/g, '');
            
            // Find existing contact
            const matchedContact = updatedContacts.find(c => {
              const cleanContactPhone = c.phone.replace(/[^0-9]/g, '');
              return cleanContactPhone === cleanFrom || 
                     (cleanContactPhone.length >= 10 && cleanFrom.length >= 10 && 
                      cleanContactPhone.slice(-10) === cleanFrom.slice(-10));
            });

            if (matchedContact) {
              // Add interaction
              updatedInteractions = [{
                id: interId,
                contactId: matchedContact.id,
                contactName: matchedContact.name,
                type: 'Incoming Message',
                notes: msg.text,
                outcome: 'Received via WhatsApp Webhook',
                timestamp: msg.timestamp
              }, ...updatedInteractions];
              changedInteractions = true;

              // Update lastContacted
              updatedContacts = updatedContacts.map(c => {
                if (c.id === matchedContact.id) {
                  return {
                    ...c,
                    lastContacted: msg.timestamp
                  };
                }
                return c;
              });
              changedContacts = true;

              // Trigger AI Autopilot if active (globally OR on individual contact)
              const isAutopilotOn = aiAgentActiveRef.current || matchedContact.aiAutopilot;
              if (isAutopilotOn) {
                triggerAiAutopilotReply(matchedContact, msg.text);
              }
            } else {
              // Auto-capture new lead
              const phoneWithPlus = '+' + cleanFrom;
              const newContactId = phoneWithPlus; // Deterministic ID
              const newContact: Contact = {
                id: newContactId,
                name: msg.name || `Lead ${cleanFrom.slice(-4)}`,
                phone: phoneWithPlus,
                category: 'Lead',
                notes: `Captured automatically via incoming WhatsApp inquiry. Initial message: "${msg.text}"`,
                lastContacted: msg.timestamp,
                createdAt: msg.timestamp,
                pipelineStage: 'Inquiry'
              };

              // Prevent duplicates if already added in this batch
              if (!updatedContacts.some(c => c.id === newContactId)) {
                updatedContacts = [newContact, ...updatedContacts];
                changedContacts = true;
              }

              updatedInteractions = [
                {
                  id: interId,
                  contactId: newContactId,
                  contactName: newContact.name,
                  type: 'Incoming Message',
                  notes: msg.text,
                  outcome: 'Captured & Received via WhatsApp Webhook',
                  timestamp: msg.timestamp
                },
                ...updatedInteractions
              ];
              changedInteractions = true;

              // Trigger AI Autopilot if active globally
              if (aiAgentActiveRef.current) {
                triggerAiAutopilotReply(newContact, msg.text);
              }
            }
          });

          if (changedContacts) {
            setContacts(updatedContacts);
          }
          if (changedInteractions) {
            setInteractions(updatedInteractions);
          }

          // If there are new contacts/interactions to sync and sheet is connected
          if ((changedContacts || changedInteractions) && accessTokenRef.current && spreadsheetIdRef.current) {
            if (changedContacts) {
              saveContactsToSheet(accessTokenRef.current, spreadsheetIdRef.current, updatedContacts)
                .catch(err => console.error('Error syncing auto-captured leads batch:', err));
            }
            if (changedInteractions) {
              saveInteractionsToSheet(accessTokenRef.current, spreadsheetIdRef.current, updatedInteractions)
                .catch(err => console.error('Error syncing incoming interactions batch:', err));
            }
          }
        }
      } catch (err: any) {
        if (err?.message === 'Failed to fetch' || err?.toString().includes('Failed to fetch') || (err && typeof err === 'object' && 'message' in err && err.message === 'Failed to fetch')) {
          console.warn('Webhook polling network temporarily unavailable (offline). Retrying...');
        } else {
          console.error('Error polling received WhatsApp messages:', err);
        }
      }
    }, 4000);

    return () => clearInterval(pollInterval);
  }, []);

  // Sync when accessToken or spreadsheetId changes
  useEffect(() => {
    if (accessToken) {
      if (spreadsheetId) {
        syncWithGoogle(accessToken, spreadsheetId);
      }
    } else {
      // Google session is expired/missing but Firebase session is still valid
      if (spreadsheetId) {
        setSyncError('Your Google API session has expired. Click "Sign in with Google" to re-authorize and resume sync.');
      }
    }
  }, [accessToken, spreadsheetId]);

  // Sync calendar followups specifically
  useEffect(() => {
    if (user && accessToken) {
      loadCalendarTasks(accessToken);
    }
  }, [user, accessToken]);

  const loadCalendarTasks = async (token: string) => {
    if (!token || token.startsWith('demo-')) return;
    try {
      let resolvedCalendarId = 'primary';
      try {
        if (tenantContext.loaded && tenantContext.tenant && workspaceResolver.hasCalendarId()) {
          resolvedCalendarId = workspaceResolver.getCalendarId();
        }
      } catch (err) {
        console.warn('Could not resolve tenant calendarId, defaulting to primary.', err);
      }
      const items = await fetchCalendarFollowUps(token, resolvedCalendarId);
      setCalendarFollowUps(items);
    } catch (err: any) {
      console.warn('Google Calendar API unavailable:', err?.message || err);
    }
  };

  const handleLogin = async () => {
    setSyncError(null);
    try {
      await loginWithPopup();
      setSyncSuccess('Google Account linked successfully!');
      
      // Auto pull if sheet ID exists, else prompt to create
      if (spreadsheetId) {
        if (accessToken) {
          await syncWithGoogle(accessToken, spreadsheetId);
        }
      } else {
        setActiveTab('settings');
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request' || err?.message?.includes('popup-blocked')) {
        console.warn('Google Sign-in popup was blocked or closed:', err);
      } else {
        console.error('Google Sign-in failed:', err);
      }
      let friendlyMsg = err.message || '';
      if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup-closed-by-user') || err.message?.includes('popup_closed_by_user')) {
        friendlyMsg = 'The Google sign-in window was closed before completion. Please try again and complete the Google login form in the pop-up to sync your spreadsheets and calendar.';
      } else if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        friendlyMsg = 'This domain is not authorized in your Firebase Console. Please log in to your Firebase Console, navigate to Authentication > Settings > Authorized Domains, and add the current domain to the authorized list.';
      } else if (err.code === 'auth/popup-blocked' || err.message?.includes('popup-blocked') || err.message?.includes('popup_blocked')) {
        friendlyMsg = 'The Google sign-in pop-up was blocked by your browser. Because this application is running inside a secure preview iframe, browsers block pop-ups by default. To resolve this: click the "Open App in New Tab" button at the top-right of the preview bar, then sign in there. Google Sign-In will authorize instantly in a standalone window!';
      }
      setSyncError('Failed to sign in with Google: ' + friendlyMsg);
    }
  };

  const handleLogout = async () => {
    showConfirm(
      'Sign Out',
      'Are you sure you want to sign out of Google Workspace CRM database?',
      async () => {
        await logout();
        setCalendarFollowUps([]);
        setSyncSuccess('Signed out successfully.');
      },
      false,
      "Sign Out",
      "Cancel"
    );
  };

  // Create CRM Spreadsheet database
  const handleCreateDatabase = async () => {
    if (!accessToken) {
      alert('Please connect your Google Account first.');
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    try {
      const result = await createCrmSpreadsheet(accessToken);
      
      setSpreadsheetId(result.id);
      setSpreadsheetUrl(result.url);
      localStorage.setItem('crm_spreadsheet_id', result.id);
      localStorage.setItem('crm_spreadsheet_url', result.url);
      
      // Push local data into the newly created sheet immediately to keep things synced
      await saveContactsToSheet(accessToken, result.id, contacts);
      await saveInteractionsToSheet(accessToken, result.id, interactions);
      await saveKnowledgeBaseToSheet(accessToken, result.id, aiKnowledgeBase, selectedIndustry, {
        whatsappMode,
        connectionStatus,
        deviceDetails: deviceDetails ? JSON.stringify(deviceDetails) : '',
      });
      
      setSyncSuccess('Google Sheet "WhatsApp CRM Database" created and populated successfully!');
    } catch (err: any) {
      setSyncError('Failed to create database: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Link manual pasted Sheet ID
  const handleLinkExistingSheet = async (idOrUrl: string) => {
    if (!accessToken) {
      alert('Please connect your Google Account first.');
      return;
    }
    
    // Extract ID if URL is pasted
    let id = idOrUrl.trim();
    if (id.includes('/d/')) {
      const parts = id.split('/d/');
      if (parts[1]) {
        id = parts[1].split('/')[0];
      }
    }

    if (!id) {
      alert('Invalid Spreadsheet ID or URL.');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    try {
      const success = await verifyAndSetupSheets(accessToken, id);
      if (success) {
        setSpreadsheetId(id);
        const url = `https://docs.google.com/spreadsheets/d/${id}`;
        setSpreadsheetUrl(url);
        localStorage.setItem('crm_spreadsheet_id', id);
        localStorage.setItem('crm_spreadsheet_url', url);
        
        // Sync pulls from Sheets
        await syncWithGoogle(accessToken, id);
        setSyncSuccess('Spreadsheet linked successfully!');
      } else {
        throw new Error('Access denied or Spreadsheet ID not found.');
      }
    } catch (err: any) {
      setSyncError('Failed linking sheet: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Disconnect Sheet link
  const handleUnlinkSheet = () => {
    showConfirm(
      'Disconnect Google Sheets',
      'Are you sure you want to disconnect Google Sheets? Local data will remain saved in browser cache.',
      () => {
        setSpreadsheetId(null);
        setSpreadsheetUrl(null);
        localStorage.removeItem('crm_spreadsheet_id');
        localStorage.removeItem('crm_spreadsheet_url');
        setSyncSuccess('Database disconnected.');
      },
      true,
      "Disconnect",
      "Cancel"
    );
  };

  // Complete Sync Pull + Push
  const syncWithGoogle = async (token: string, sheetId: string) => {
    if (!token || token.startsWith('demo-') || !sheetId) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      // Diagnostic check to verify that the 'Revenue Tracker' sheet exists, and create it if missing
      console.log('[Diagnostic] Running Google Sheets health and connection diagnostic...');
      try {
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const metadata = await response.json();
          const sheetTitles = metadata.sheets?.map((s: any) => s.properties?.title) || [];
          const hasRevenueTracker = sheetTitles.includes('CRM_RevenueTracker');
          
          if (!hasRevenueTracker) {
            console.warn('[Diagnostic] "CRM_RevenueTracker" (Revenue Tracker) sheet is missing! Automatically creating it to ensure consistent revenue logging across sessions.');
            await verifyAndSetupSheets(token, sheetId);
            console.log('[Diagnostic] "CRM_RevenueTracker" sheet was successfully created.');
          } else {
            console.log('[Diagnostic] "CRM_RevenueTracker" (Revenue Tracker) sheet verified and ready.');
            // Ensure any other potentially missing sheets are also verified/set up
            await verifyAndSetupSheets(token, sheetId);
          }
        } else {
          await verifyAndSetupSheets(token, sheetId);
        }
      } catch (diagErr) {
        console.error('[Diagnostic] Error during sheets diagnostic, running standard setup fallback:', diagErr);
        await verifyAndSetupSheets(token, sheetId);
      }

      // 1. Fetch live updates
      const sheetContacts = await fetchContactsFromSheet(token, sheetId);
      const sheetInteractions = await fetchInteractionsFromSheet(token, sheetId);
      
      // Merge or overwrite strategy: Sheet holds master database, load to client
      if (sheetContacts.length > 0) {
        setContacts(sheetContacts);
      } else {
        // If sheet is empty but local has data, push local
        await saveContactsToSheet(token, sheetId, contacts);
      }

      if (sheetInteractions.length > 0) {
        setInteractions(sheetInteractions);
      } else {
        await saveInteractionsToSheet(token, sheetId, interactions);
      }

      // Sync AI Knowledge Base and Settings
      try {
        const sheetKb = await fetchKnowledgeBaseFromSheet(token, sheetId);
        if (sheetKb && (
          sheetKb.timings || sheetKb.treatments || sheetKb.doctors || sheetKb.reviews || sheetKb.workflow ||
          sheetKb.whatsappMode || sheetKb.connectionStatus || sheetKb.deviceDetails
        )) {
          const parsedKb = {
            timings: sheetKb.timings || aiKnowledgeBase.timings,
            treatments: sheetKb.treatments || aiKnowledgeBase.treatments,
            doctors: sheetKb.doctors || aiKnowledgeBase.doctors,
            reviews: sheetKb.reviews || aiKnowledgeBase.reviews,
            workflow: sheetKb.workflow || aiKnowledgeBase.workflow,
          };
          setAiKnowledgeBase(parsedKb);
          localStorage.setItem('nestam_ai_knowledge_base', JSON.stringify(parsedKb));
          
          // Pull settings from Google Sheet
          if (sheetKb.whatsappMode) {
            setWhatsappMode(sheetKb.whatsappMode as any);
            localStorage.setItem('whatsapp_integration_mode', sheetKb.whatsappMode);
          }
          if (sheetKb.connectionStatus) {
            setConnectionStatus(sheetKb.connectionStatus as any);
            localStorage.setItem('whatsapp_connection_status', sheetKb.connectionStatus);
          }
          if (sheetKb.deviceDetails) {
            try {
              setDeviceDetails(JSON.parse(sheetKb.deviceDetails));
              localStorage.setItem('whatsapp_device_details', sheetKb.deviceDetails);
            } catch (e) {
              setDeviceDetails(null);
            }
          }

          if (sheetKb.industry) {
            const matchedInd = sheetKb.industry.toLowerCase() as IndustryType;
            if (getSectorDefinition(matchedInd) && matchedInd !== selectedIndustry) {
              loadIndustryState(matchedInd, false);
            }
          }
        } else {
          // If sheet is empty, push local knowledge base and configuration settings
          await saveKnowledgeBaseToSheet(token, sheetId, aiKnowledgeBase, selectedIndustry, {
            whatsappMode,
            connectionStatus,
            deviceDetails: deviceDetails ? JSON.stringify(deviceDetails) : '',
          });
        }
      } catch (kbErr) {
        console.warn('AI Knowledge base & settings sync skipped or failed:', kbErr);
      }

      // Sync calendar tasks
      await loadCalendarTasks(token);

      // Sync Templates tab
      try {
        const sheetTemplates = await fetchTemplatesFromSheet(token, sheetId);
        if (sheetTemplates.length > 0) {
          setTemplates(sheetTemplates);
          localStorage.setItem('crm_templates', JSON.stringify(sheetTemplates));
        } else {
          await saveTemplatesToSheet(token, sheetId, templates);
        }
      } catch (tErr) {
        console.warn('Templates tab sync skipped or failed:', tErr);
      }
      
      setSyncSuccess('Database fully synced with Google Sheets & Calendar (including AI Knowledge Hub, Contacts, Interactions, and Templates)!');
    } catch (err: any) {
      console.error('Sync Error:', err);
      setSyncError('Sync failed: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualSync = () => {
    if (!accessToken || !spreadsheetId) {
      handleLogin();
      return;
    }
    syncWithGoogle(accessToken, spreadsheetId);
  };

  // Add or Edit Contact
  const handleOpenContactModal = (contact: Contact | null = null, presetType?: 'Patient' | 'Lead' | 'Family Member') => {
    if (contact) {
      setContactToEdit(contact);
      setContactName(contact.name);
      setContactPhone(contact.phone);
      setContactEmail(contact.email || '');
      setContactCategory(contact.category);
      setContactNotes(contact.notes);
      setContactTreatmentType(contact.treatmentType || '');
      setContactTreatmentValue(contact.treatmentValue || 0);
      setContactAmountCollected(contact.amountCollected || 0);
      setContactPaymentMethod(contact.paymentMethod || 'UPI/PhonePe');
      setContactPipelineStage(contact.pipelineStage || 'Inquiry');
      setContactSource(contact.source || 'WhatsApp');
      setContactIsRepeat(contact.isRepeat || false);
      setContactIsFamily(contact.isFamily || contact.notes?.toLowerCase().includes('family') || presetType === 'Family Member');
      setContactFamilyRelation(contact.familyRelation || 'Spouse');
      setContactPrimaryMember(contact.primaryFamilyMember || '');
    } else {
      setContactToEdit(null);
      setContactName('');
      setContactPhone('');
      setContactEmail('');
      setContactCategory(presetType === 'Lead' ? 'Lead' : 'Active');
      setContactNotes(presetType === 'Family Member' ? '[Family Member Record]' : '');
      setContactTreatmentType('');
      setContactTreatmentValue(0);
      setContactAmountCollected(0);
      setContactPaymentMethod('UPI/PhonePe');
      setContactPipelineStage(presetType === 'Lead' ? 'Inquiry' : 'Treatment');
      setContactSource('WhatsApp');
      setContactIsRepeat(false);
      setContactIsFamily(presetType === 'Family Member');
      setContactFamilyRelation('Spouse');
      setContactPrimaryMember('');
    }
    setIsContactModalOpen(true);
  };

  const handleCloseContactModal = () => {
    setIsContactModalOpen(false);
    setContactToEdit(null);
    setContactName('');
    setContactPhone('');
    setContactEmail('');
    setContactCategory('Lead');
    setContactNotes('');
    setContactTreatmentType('');
    setContactTreatmentValue(0);
    setContactAmountCollected(0);
    setContactPaymentMethod('UPI/PhonePe');
    setContactPipelineStage('Inquiry');
    setContactSource('WhatsApp');
    setContactIsRepeat(false);
    setContactIsFamily(false);
    setContactFamilyRelation('Spouse');
    setContactPrimaryMember('');
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) {
      alert('Please enter both Name and WhatsApp Phone Number.');
      return;
    }

    // Check formatting
    let formattedPhone = contactPhone.trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone.replace(/[^0-9]/g, '');
    }

    if (formattedPhone.length < 5) {
      alert('Please enter a valid phone number with country code (e.g. +91 9876543210).');
      return;
    }

    const paymentLogged = Number(contactAmountCollected) || 0;
    const oldPaymentLogged = contactToEdit ? (contactToEdit.amountCollected || 0) : 0;
    const hasNewPayment = paymentLogged > 0 && paymentLogged !== oldPaymentLogged;

    let updatedContactsList: Contact[] = [];

    // Append family info note if family member
    let finalNotes = contactNotes.trim();
    if (contactIsFamily && !finalNotes.toLowerCase().includes('family')) {
      finalNotes = `[Family Member - ${contactFamilyRelation}${contactPrimaryMember ? ' of ' + contactPrimaryMember : ''}] ${finalNotes}`;
    }

    if (contactToEdit) {
      // Edit mode
      updatedContactsList = contacts.map(c =>
        c.id === contactToEdit.id
          ? {
              ...c,
              name: contactName.trim(),
              phone: formattedPhone,
              email: contactEmail.trim() || undefined,
              category: contactCategory,
              notes: finalNotes,
              treatmentType: contactTreatmentType.trim(),
              treatmentValue: Number(contactTreatmentValue) || 0,
              amountCollected: paymentLogged,
              paymentMethod: paymentLogged > 0 ? contactPaymentMethod : undefined,
              pipelineStage: contactPipelineStage,
              source: contactSource,
              isRepeat: contactIsRepeat,
              isFamily: contactIsFamily,
              familyRelation: contactIsFamily ? contactFamilyRelation : undefined,
              primaryFamilyMember: contactIsFamily ? contactPrimaryMember : undefined,
            }
          : c
      );
      setContacts(updatedContactsList);
      
      // Update logs as well if phone changes
      if (contactToEdit.id !== formattedPhone) {
        const updatedLogs = interactions.map(i =>
          i.contactId === contactToEdit.id ? { ...i, contactId: formattedPhone, contactName: contactName.trim() } : i
        );
        setInteractions(updatedLogs);
        localStorage.setItem('crm_interactions', JSON.stringify(updatedLogs));
      }
      
      setSyncSuccess('Contact details updated successfully.');
    } else {
      // Add mode
      const newContact: Contact = {
        id: formattedPhone,
        name: contactName.trim(),
        phone: formattedPhone,
        email: contactEmail.trim() || undefined,
        category: contactCategory,
        notes: finalNotes,
        lastContacted: 'Never',
        createdAt: new Date().toISOString(),
        treatmentType: contactTreatmentType.trim(),
        treatmentValue: Number(contactTreatmentValue) || 0,
        amountCollected: paymentLogged,
        paymentMethod: paymentLogged > 0 ? contactPaymentMethod : undefined,
        pipelineStage: contactPipelineStage,
        source: contactSource,
        isRepeat: contactIsRepeat,
        isFamily: contactIsFamily,
        familyRelation: contactIsFamily ? contactFamilyRelation : undefined,
        primaryFamilyMember: contactIsFamily ? contactPrimaryMember : undefined,
      };

      // Check duplicate
      if (contacts.some(c => c.phone === formattedPhone)) {
        alert('A customer with this WhatsApp number already exists.');
        return;
      }

      updatedContactsList = [newContact, ...contacts];
      setContacts(updatedContactsList);
      setSyncSuccess('New contact added successfully!');
    }

    // Persist to local storage
    try {
      localStorage.setItem('crm_contacts', JSON.stringify(updatedContactsList));
      localStorage.setItem(`nestam_contacts_${selectedIndustry}`, JSON.stringify(updatedContactsList));
    } catch (err) {
      console.error('Error persisting contacts to localStorage', err);
    }

    setIsContactModalOpen(false);
    setContactToEdit(null);

    // If connected, sync to Sheets
    if (accessToken && spreadsheetId) {
      try {
        await saveContactsToSheet(accessToken, spreadsheetId, updatedContactsList);
        
        if (hasNewPayment) {
          const revenueLog = {
            id: 'REV-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
            contactId: formattedPhone,
            contactName: contactName.trim(),
            amountCollected: paymentLogged,
            treatmentType: contactTreatmentType.trim() || 'General Payment',
            timestamp: new Date().toISOString(),
            notes: contactNotes.trim() || 'Logged via Contact Modal',
          };
          await appendRevenueLogToSheet(accessToken, spreadsheetId, revenueLog);
          setSyncSuccess('Contact saved and payment logged to Google Sheets Revenue Tracker!');
        }
      } catch (err) {
        console.error('Failed pushing to sheets:', err);
      }
    }
  };

  const handleUpdateContact = (updatedContact: Contact) => {
    const updated = contacts.map(c => c.id === updatedContact.id ? updatedContact : c);
    setContacts(updated);
    try {
      localStorage.setItem('crm_contacts', JSON.stringify(updated));
      if (selectedIndustry) {
        localStorage.setItem(`nestam_contacts_${selectedIndustry}`, JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Error persisting updated contact', err);
    }
    if (accessToken && spreadsheetId) {
      saveContactsToSheet(accessToken, spreadsheetId, updated).catch(console.error);
    }
  };

  const handleQuickAddContact = async (newContact: Contact): Promise<boolean> => {
    if (contacts.some(c => c.phone === newContact.phone)) {
      alert('A customer with this WhatsApp number already exists.');
      return false;
    }
    const updatedContactsList = [newContact, ...contacts];
    setContacts(updatedContactsList);
    setSyncSuccess('Patient contact registered and added successfully!');

    localStorage.setItem('crm_contacts', JSON.stringify(updatedContactsList));
    localStorage.setItem(`nestam_contacts_${selectedIndustry}`, JSON.stringify(updatedContactsList));

    if (accessToken && spreadsheetId) {
      try {
        await saveContactsToSheet(accessToken, spreadsheetId, updatedContactsList);
      } catch (err) {
        console.error('Failed pushing to sheets:', err);
      }
    }
    return true;
  };

  const handleUpdateContactNotes = async (id: string, notes: string) => {
    const updated = contacts.map(c => c.id === id ? { ...c, notes } : c);
    setContacts(updated);
    localStorage.setItem('crm_contacts', JSON.stringify(updated));
    if (accessToken && spreadsheetId) {
      try {
        await saveContactsToSheet(accessToken, spreadsheetId, updated);
      } catch (err) {
        console.error('Failed pushing to sheets:', err);
      }
    }
  };

  const handleUpdateContactTreatment = async (id: string, type: string, value: number) => {
    const updated = contacts.map(c => c.id === id ? { ...c, treatmentType: type, treatmentValue: value } : c);
    setContacts(updated);
    localStorage.setItem('crm_contacts', JSON.stringify(updated));
    if (accessToken && spreadsheetId) {
      try {
        await saveContactsToSheet(accessToken, spreadsheetId, updated);
      } catch (err) {
        console.error('Failed pushing to sheets:', err);
      }
    }
  };

  const handleUpdateContactPhotos = async (id: string, photos: string[]) => {
    const updated = contacts.map(c => c.id === id ? { ...c, photos } : c);
    setContacts(updated);
    localStorage.setItem('crm_contacts', JSON.stringify(updated));
    if (accessToken && spreadsheetId) {
      try {
        await saveContactsToSheet(accessToken, spreadsheetId, updated);
      } catch (err) {
        console.error('Failed pushing photos to sheets:', err);
      }
    }
  };

  const handleAddInteraction = (contactId: string, type: any, notes: string) => {
    const contact = contacts.find(c => c.id === contactId);
    const newInteraction: Interaction = {
      id: 'i-' + Date.now(),
      contactId,
      contactName: contact?.name || 'Unknown',
      timestamp: new Date().toISOString(),
      type,
      notes,
      outcome: 'Success'
    };
    const updated = [newInteraction, ...interactions];
    setInteractions(updated);
    localStorage.setItem('crm_interactions', JSON.stringify(updated));
  };

  const handleUpdatePipelineStage = async (contactId: string, newStage: 'Inquiry' | 'Scheduled' | 'Visited' | 'Treatment' | 'Completed') => {
    let cat: ContactCategory = 'Lead';
    if (newStage === 'Inquiry') cat = 'Lead';
    else if (newStage === 'Scheduled') cat = 'Follow-up';
    else if (newStage === 'Visited') cat = 'Follow-up';
    else if (newStage === 'Treatment') cat = 'Active';
    else if (newStage === 'Completed') cat = 'Inactive';

    const updated = contacts.map(c =>
      c.id === contactId ? { ...c, pipelineStage: newStage, category: cat } : c
    );
    setContacts(updated);

    // Prompt scheduling of appointment if moved to Scheduled
    if (newStage === 'Scheduled') {
      const contactObj = contacts.find(c => c.id === contactId);
      if (contactObj) {
        setTimeout(() => {
          handleOpenCalendarModal(contactObj);
        }, 200);
      }
    }

    if (accessToken && spreadsheetId) {
      try {
        await saveContactsToSheet(accessToken, spreadsheetId, updated);
      } catch (err) {
        console.error('Failed syncing pipeline change:', err);
      }
    }
  };

  const handleToggleContactAiAutopilot = async (contactId: string) => {
    const updated = contacts.map(c =>
      c.id === contactId ? { ...c, aiAutopilot: !c.aiAutopilot } : c
    );
    setContacts(updated);
    
    // Save to Google Sheets if connected, or to local crm_contacts
    localStorage.setItem('crm_contacts', JSON.stringify(updated));
    
    // Also log an interaction note
    const contactObj = contacts.find(c => c.id === contactId);
    if (contactObj) {
      const mode = !contactObj.aiAutopilot ? 'ENABLED' : 'DISABLED';
      const newInteraction: Interaction = {
        id: `int-${Date.now()}`,
        contactId: contactId,
        contactName: contactObj.name,
        type: 'Note',
        notes: `AI Autopilot Mode ${mode} for this patient. AI will now ${mode === 'ENABLED' ? 'automatically respond to incoming inquiries' : 'be paused, requiring manual front-desk replies'}.`,
        timestamp: new Date().toISOString()
      };
      const updatedInteractions = [newInteraction, ...interactions];
      setInteractions(updatedInteractions);
      localStorage.setItem('crm_interactions', JSON.stringify(updatedInteractions));
    }

    if (accessToken && spreadsheetId) {
      try {
        await saveContactsToSheet(accessToken, spreadsheetId, updated);
      } catch (err) {
        console.error('Failed syncing AI autopilot toggle:', err);
      }
    }
  };

  const handleDeleteContact = async (id: string, name: string) => {
    showConfirm(
      'Delete Contact',
      `Are you sure you want to delete ${name}? This will remove them from the list. (This action modifies Sheet data)`,
      async () => {
        const filtered = contacts.filter(c => c.id !== id);
        setContacts(filtered);

        if (selectedContactId === id) {
          setSelectedContactId(null);
        }

        setIsContactModalOpen(false);

        if (accessToken && spreadsheetId) {
          try {
            await saveContactsToSheet(accessToken, spreadsheetId, filtered);
            setSyncSuccess('Contact deleted.');
          } catch (err: any) {
            showAlert('Sync Error', 'Failed syncing delete: ' + err.message, 'error');
          }
        }
      },
      true,
      "Delete Contact",
      "Cancel"
    );
  };

  const handleImportContacts = async (importedContacts: Contact[]) => {
    let updatedContactsList = [...contacts];
    
    importedContacts.forEach(newC => {
      const existingIdx = updatedContactsList.findIndex(c => c.id === newC.id);
      if (existingIdx !== -1) {
        updatedContactsList[existingIdx] = {
          ...updatedContactsList[existingIdx],
          ...newC,
          createdAt: updatedContactsList[existingIdx].createdAt,
        };
      } else {
        updatedContactsList.unshift(newC);
      }
    });

    setContacts(updatedContactsList);
    setSyncSuccess(`Successfully imported ${importedContacts.length} contacts!`);

    if (accessToken && spreadsheetId) {
      try {
        await saveContactsToSheet(accessToken, spreadsheetId, updatedContactsList);
        setSyncSuccess(`Successfully imported ${importedContacts.length} contacts and synchronized with Google Sheets!`);
      } catch (err: any) {
        showAlert('Import Sync Notice', 'Import completed locally, but failed updating Google Sheets: ' + err.message, 'warning');
      }
    }
  };

  // Interaction logs append
  const handleLogInteraction = async (type: string, notes: string, outcome: string) => {
    const activeContact = contacts.find(c => c.id === selectedContactId);
    if (!activeContact) return;

    const newInteraction: Interaction = {
      id: 'i-' + Math.floor(100000 + Math.random() * 900000),
      contactId: activeContact.id,
      contactName: activeContact.name,
      type: type as any,
      notes: notes,
      outcome: outcome,
      timestamp: new Date().toISOString(),
    };

    // Update contacts list lastContacted status
    const updatedContacts = contacts.map(c =>
      c.id === activeContact.id ? { ...c, lastContacted: newInteraction.timestamp } : c
    );
    
    const updatedInteractions = [...interactions, newInteraction];
    
    setContacts(updatedContacts);
    setInteractions(updatedInteractions);

    // If connected to sheets, append right away
    if (accessToken && spreadsheetId) {
      try {
        await appendInteractionToSheet(accessToken, spreadsheetId, newInteraction);
        // Save contacts update
        await saveContactsToSheet(accessToken, spreadsheetId, updatedContacts);
      } catch (err: any) {
        console.error('Append to sheet failed, performing batch backup:', err);
        // fallback to batch overwrite
        await saveInteractionsToSheet(accessToken, spreadsheetId, updatedInteractions);
      }
    }
  };

  // Automated/Shared Inbox Interaction logs append
  const handleLogAutomationInteraction = async (contactId: string, type: string, notes: string, outcome: string) => {
    const activeContact = contacts.find(c => c.id === contactId);
    if (!activeContact) return;

    const newInteraction: Interaction = {
      id: 'i-' + Math.floor(100000 + Math.random() * 900000),
      contactId: activeContact.id,
      contactName: activeContact.name,
      type: type as any,
      notes: notes,
      outcome: outcome,
      timestamp: new Date().toISOString(),
    };

    const updatedContacts = contacts.map(c =>
      c.id === activeContact.id ? { ...c, lastContacted: newInteraction.timestamp } : c
    );
    const updatedInteractions = [...interactions, newInteraction];
    
    setContacts(updatedContacts);
    setInteractions(updatedInteractions);

    if (accessToken && spreadsheetId) {
      try {
        await appendInteractionToSheet(accessToken, spreadsheetId, newInteraction);
        await saveContactsToSheet(accessToken, spreadsheetId, updatedContacts);
      } catch (err: any) {
        console.error('Append to sheet failed, performing batch backup:', err);
        await saveInteractionsToSheet(accessToken, spreadsheetId, updatedInteractions);
      }
    }
  };

  // Helper to format any input phone number to standard international format (defaulting to country code 91 if 10 digits)
  const formatWhatsAppPhone = (phone: string): string => {
    let digits = phone.replace(/[^0-9]/g, '');
    if (digits.startsWith('0') && digits.length === 11) {
      digits = digits.slice(1);
    }
    if (digits.length === 10) {
      return '91' + digits; // prepend Indian country code by default
    }
    return digits;
  };

  // WhatsApp click  // WhatsApp click-to-chat or secure server-side Meta Cloud API send.
  const handleSendWhatsApp = async (text: string) => {
    const activeContact = contacts.find(c => c.id === selectedContactId);
    if (!activeContact || !text.trim()) return;

    const cleanedPhone = formatWhatsAppPhone(activeContact.phone);
    const tryOpenUrl = (url: string) => {
      const win = window.open(url, '_blank');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        showAlert(
          'Redirection Blocked / Fallback available',
          `Your browser or the iframe sandbox blocked the automatic WhatsApp redirection. You can still open the chat from the action below.`,
          'warning',
          url,
          'Open WhatsApp Chat'
        );
      }
    };

    if (whatsappMode !== 'meta') {
      tryOpenUrl(`https://wa.me/${cleanedPhone}?text=${encodeURIComponent(text)}`);
      return;
    }

    try {
      const response = await authenticatedFetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: cleanedPhone,
          message: text.trim(),
          messageType: 'text',
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Secure WhatsApp delivery failed.');
      }

      await handleLogInteraction(
        'WhatsApp Sent',
        text.trim(),
        `Delivered through the secure Meta Cloud API gateway. Message ID: ${data.metaMessageId || 'pending'}`
      );
      setSyncSuccess(`WhatsApp message sent to ${activeContact.name}.`);
    } catch (err: any) {
      showAlert(
        'Message Not Sent',
        err.message || 'The secure WhatsApp delivery service could not send this message.',
        'error'
      );
    }
  }; chatbot interaction turn
  const handleAddAiChatTurn = (turn: {
    contactId: string;
    prompt: string;
    response: string;
    schedulingSuggestion?: {
      shouldSchedule: boolean;
      summary: string;
      date: string;
      time: string;
      description: string;
    };
  }) => {
    const newTurn: AIChatTurn = {
      ...turn,
      id: `ai-turn-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
    };
    setAiChatHistory(prev => [newTurn, ...prev]);
  };

  // Clear AI chat history for a specific contact
  const handleClearAiChatHistory = (contactId: string) => {
    setAiChatHistory(prev => prev.filter(t => t.contactId !== contactId));
  };

  // Open Calendar Booking modal
  const handleOpenCalendarModal = (
    contact: Contact,
    e?: React.MouseEvent,
    summary?: string,
    notes?: string,
    date?: string,
    time?: string
  ) => {
    if (e) e.stopPropagation(); // prevent card selection trigger
    setContactForCalendar(contact);
    setEventSummary(summary || `[CRM Follow-up] ${contact.name}`);
    setEventNotes(notes || `Callback with customer ${contact.name} (${contact.phone}).\nTopic: Follow-up from WhatsCRM thread.`);
    
    if (date) {
      setEventDate(date);
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setEventDate(tomorrow.toISOString().split('T')[0]);
    }

    if (time) {
      setEventTime(time);
    } else {
      setEventTime('10:00');
    }
    setIsCalendarModalOpen(true);
  };

  const handleBookCalendarEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForCalendar || !eventDate || !eventTime) return;

    const startIso = `${eventDate}T${eventTime}:00`;
    // default 30 min duration
    const startDate = new Date(startIso);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
    const endIso = endDate.toISOString();

    setIsSyncing(true);
    try {
      let eventLink = '';
      if (accessToken) {
        let resolvedCalendarId = 'primary';
        try {
          if (tenantContext.loaded && tenantContext.tenant) {
            resolvedCalendarId = workspaceResolver.getCalendarId();
          }
        } catch (err) {
          console.warn('Could not resolve tenant calendarId, defaulting to primary.', err);
        }

        eventLink = await createCalendarEvent(accessToken, resolvedCalendarId, {
          summary: eventSummary,
          description: `${eventNotes}\n\n--- Shared via WhatsCRM ---\nPhone: ${contactForCalendar.phone}\nContact ID: ${contactForCalendar.id}`,
          startIso: startDate.toISOString(),
          endIso: endDate.toISOString(),
        });
        
        // Refresh live events lists
        await loadCalendarTasks(accessToken);
      } else {
        // Fallback local calendar task
        const localTask: UpcomingFollowUp = {
          id: `local-task-${Date.now()}`,
          contactId: contactForCalendar.id,
          contactName: contactForCalendar.name,
          contactPhone: contactForCalendar.phone,
          summary: eventSummary,
          description: eventNotes,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        };
        setCalendarFollowUps(prev => [localTask, ...prev]);
      }

      // Add to interactive appointments grid
      const primaryDoc = doctors[0] || { id: 'doc-1', name: 'Dr. Sai Krishna' };
      const newGridApt: Appointment = {
        id: `apt-${Date.now()}`,
        docId: primaryDoc.id,
        doctorName: primaryDoc.name,
        patientName: contactForCalendar.name,
        patientPhone: contactForCalendar.phone,
        patientId: contactForCalendar.id,
        treatment: eventSummary || 'Clinical Consultation',
        time: `${eventTime} - ${eventTime}`,
        date: eventDate,
        status: 'Confirmed',
        type: 'confirmed',
        notes: eventNotes
      };
      setAppointments(prev => [newGridApt, ...prev]);

      // Automatically register a ScheduledReminder for this appointment!
      const autoReminder: ScheduledReminder = {
        id: `rem-auto-${Date.now()}`,
        contactId: contactForCalendar.id,
        contactName: contactForCalendar.name,
        contactPhone: contactForCalendar.phone,
        contactEmail: contactForCalendar.email,
        title: eventSummary,
        scheduledTime: startIso,
        reminderType: contactForCalendar.email ? 'Both' : 'WhatsApp',
        message: `Hi ${contactForCalendar.name}, this is an automated reminder for your upcoming appointment "${eventSummary}" scheduled on ${eventDate} at ${eventTime}. Looking forward to seeing you!`,
        status: 'Scheduled',
        triggerOffsetMinutes: 0, // Trigger at exact scheduled time
        createdAt: new Date().toISOString(),
      };
      setScheduledReminders(prev => [autoReminder, ...prev]);

      // Log this calendar task scheduling as an interaction!
      await handleLogInteraction(
        'Calendar Follow-up',
        `Scheduled callback appointment: "${eventSummary}" for ${eventDate} at ${eventTime}.`,
        accessToken ? `Created event on Google Calendar: ${eventLink}` : 'Saved to Local Schedule'
      );

      // Move contact to "Scheduled" stage automatically if not already there!
      setContacts(prev => prev.map(c =>
        c.id === contactForCalendar.id ? { ...c, pipelineStage: 'Scheduled', category: 'Follow-up' } : c
      ));

      setIsCalendarModalOpen(false);
      setSyncSuccess(`Appointment booked successfully! ${eventLink ? 'Synced to Google Calendar.' : 'Added to local scheduler.'} Automatic WhatsApp/Email reminder armed.`);
    } catch (err: any) {
      alert('Failed booking on Google Calendar: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Template adjustments
  const handleAddTemplate = async (title: string, category: string, text: string) => {
    const newTpl: MessageTemplate = {
      id: 't-' + Date.now(),
      title,
      category,
      text,
    };
    const updated = [newTpl, ...templates];
    setTemplates(updated);
    localStorage.setItem('crm_templates', JSON.stringify(updated));
    setSyncSuccess('Custom WhatsApp template saved.');
    if (accessToken && spreadsheetId) {
      try {
        await saveTemplatesToSheet(accessToken, spreadsheetId, updated);
      } catch (err) {
        console.error('Failed to sync templates to Google Sheets:', err);
      }
    }
  };

  const handleDeleteTemplate = (id: string) => {
    showConfirm(
      'Delete Template',
      'Are you sure you want to delete this template?',
      async () => {
        const updated = templates.filter(t => t.id !== id);
        setTemplates(updated);
        localStorage.setItem('crm_templates', JSON.stringify(updated));
        setSyncSuccess('Template removed.');
        if (accessToken && spreadsheetId) {
          try {
            await saveTemplatesToSheet(accessToken, spreadsheetId, updated);
          } catch (err) {
            console.error('Failed to sync templates to Google Sheets:', err);
          }
        }
      },
      true,
      "Delete Template",
      "Cancel"
    );
  };

  // Extract unique treatment types from current contacts list
  const availableTreatmentTypes = Array.from(
    new Set(contacts.map(c => c.treatmentType?.trim()).filter((t): t is string => Boolean(t)))
  );

  // Filter contacts list according to all interactive criteria
  const filteredContacts = contacts.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.notes && c.notes.toLowerCase().includes(q)) ||
      (c.treatmentType && c.treatmentType.toLowerCase().includes(q));

    const matchesCategory = categoryFilter === 'All' || c.category === categoryFilter;
    const matchesStage = stageFilter === 'All' || (c.pipelineStage || 'Inquiry') === stageFilter;

    let matchesTreatment = true;
    if (treatmentTypeFilter !== 'All') {
      if (treatmentTypeFilter === 'Has Treatment') {
        matchesTreatment = Boolean(c.treatmentType && c.treatmentType.trim());
      } else if (treatmentTypeFilter === 'No Treatment') {
        matchesTreatment = !c.treatmentType || !c.treatmentType.trim();
      } else {
        matchesTreatment = c.treatmentType === treatmentTypeFilter;
      }
    }

    let matchesAutopilot = true;
    if (autopilotFilter === 'ON') matchesAutopilot = Boolean(c.aiAutopilot);
    else if (autopilotFilter === 'OFF') matchesAutopilot = !c.aiAutopilot;

    let matchesPayment = true;
    const collected = c.amountCollected || 0;
    const val = c.treatmentValue || 0;
    if (paymentFilter === 'Paid') matchesPayment = collected > 0;
    else if (paymentFilter === 'Pending') matchesPayment = val > collected;
    else if (paymentFilter === 'Unpaid') matchesPayment = collected === 0;

    let matchesPaymentMethod = true;
    if (paymentMethodFilter !== 'All') {
      matchesPaymentMethod = c.paymentMethod === paymentMethodFilter;
    }

    return matchesSearch && matchesCategory && matchesStage && matchesTreatment && matchesAutopilot && matchesPayment && matchesPaymentMethod;
  });

  const activeFiltersCount =
    (searchQuery.trim() ? 1 : 0) +
    (categoryFilter !== 'All' ? 1 : 0) +
    (stageFilter !== 'All' ? 1 : 0) +
    (treatmentTypeFilter !== 'All' ? 1 : 0) +
    (autopilotFilter !== 'All' ? 1 : 0) +
    (paymentFilter !== 'All' ? 1 : 0) +
    (paymentMethodFilter !== 'All' ? 1 : 0);

  const resetAllFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All');
    setStageFilter('All');
    setTreatmentTypeFilter('All');
    setAutopilotFilter('All');
    setPaymentFilter('All');
    setPaymentMethodFilter('All');
  };

  const selectedContact = contacts.find(c => c.id === selectedContactId);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased" id="whatscrm-application">
      {/* Top Navigation banner and profile links */}
      <AuthBar
        user={user}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'contacts') {
            setSelectedContactId(null);
          }
        }}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
        spreadsheetId={spreadsheetId}
        patientsLabel={currentIndustryConfig.terminology.patientsLabel}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        businessName={businessName}
        senderName={senderName}
      />

      <div className="xl:pl-64 min-h-screen flex flex-col">
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-5 space-y-4">
        
        {/* Dynamic Alert Banner */}
        {!isApprovedSectorId(selectedIndustry) && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 flex items-center justify-between shadow-3xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <div>
                <strong className="font-semibold">Sector setup required:</strong> Workspace sector configuration is missing or invalid. Please select an approved sector in Settings to activate healthcare features.
              </div>
            </div>
            <button
              onClick={() => setActiveTab('settings')}
              className="px-3 py-1.5 bg-amber-600 text-white hover:bg-amber-700 font-medium text-xs rounded-lg transition-colors shrink-0"
            >
              Workspace Settings
            </button>
          </div>
        )}

        <AnimatePresence>
          {syncError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-50 border border-red-200 p-5 rounded-2xl text-xs text-slate-800 space-y-3.5 shadow-3xs"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-red-900 mb-0.5">Google Connection Interrupted</h4>
                    <p className="text-slate-600 leading-relaxed font-medium">{syncError}</p>
                  </div>
                </div>
                <button onClick={() => setSyncError(null)} className="text-slate-400 hover:text-slate-600 font-bold p-1">✕</button>
              </div>

              {/* Troubleshooting Tips specifically for Preview Iframe Constraints */}
              {(syncError.includes('closed') || syncError.includes('popup') || (typeof window !== 'undefined' && window.self !== window.top)) && (
                <div className="bg-white border border-red-100 rounded-xl p-4 space-y-2.5 text-[11px] text-slate-600 shadow-3xs">
                  <p className="font-bold text-slate-850 flex items-center gap-1.5">
                    <span className="p-1 bg-red-50 text-red-600 rounded-lg">💡</span>
                    Why does this happen in the preview?
                  </p>
                  <p className="leading-relaxed font-medium">
                    Modern browsers (Chrome, Safari, Brave) block third-party cookies and cross-site pop-up communication inside embedded frames. This halts the secure authentication handshake between Google and the preview iframe.
                  </p>
                  <div className="pt-1.5 space-y-1.5">
                    <p className="font-bold text-slate-700">How to solve this easily:</p>
                    <ul className="list-disc list-inside space-y-1.5 font-semibold pl-1 text-slate-600">
                      <li>
                        Click the <strong className="text-indigo-600">"Open in New Tab"</strong> button in the top-right corner of the AI Studio preview bar.
                      </li>
                      <li>
                        Once in the standalone window, tap <strong className="text-slate-800">"Sign in with Google"</strong> again. It will authorize and link immediately!
                      </li>
                      <li>
                        Ensure your browser isn't blocking popups for this site.
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {syncSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-teal-50 border border-teal-100 p-4 rounded-xl text-xs text-teal-800 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-teal-600 shrink-0" />
                <span>{syncSuccess}</span>
              </div>
              <button onClick={() => setSyncSuccess(null)} className="text-teal-600 hover:text-teal-800 font-bold ml-2">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ==================== 1. DASHBOARD VIEW ==================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            <DashboardStats
              contacts={contacts}
              interactions={interactions}
              upcomingCount={calendarFollowUps.length}
              isSyncing={isSyncing}
              onSync={handleManualSync}
              isAuthenticated={!!accessToken}
              spreadsheetUrl={spreadsheetUrl || undefined}
              industryId={selectedIndustry}
              businessName={businessName}
              senderName={senderName}
              cityLandmark={cityLandmark}
              onNavigateToTab={(tab) => {
                setActiveTab(tab);
                if (tab !== 'contacts') {
                  setSelectedContactId(null);
                }
              }}
              onSelectContactAndChat={(phone) => {
                const contact = contacts.find(c => c.phone.replace(/[^0-9]/g, '') === phone.replace(/[^0-9]/g, ''));
                if (contact) {
                  setSelectedContactId(contact.id);
                }
                setPatientsSubView('directory');
                setActiveTab('contacts');
              }}
              onSendWhatsAppConfirmation={handleSendWhatsApp}
              onAddContact={handleQuickAddContact}
            />
          </div>
        )}

        {/* ==================== 2. PATIENTS & CLINICAL WORKSPACE ==================== */}
        {activeTab === 'contacts' && (
          <ContactsEnterpriseWorkspace
            contacts={contacts}
            onOpenContactModal={(contact, presetType) => handleOpenContactModal(contact || null)}
            onDeleteContact={handleDeleteContact}
            onOpenCalendarModal={handleOpenCalendarModal}
            onOpenMigrationModal={() => setIsMigrationModalOpen(true)}
            onSelectChatLog={(c) => {
              setSelectedContactId(c.id);
              setPatientsSubView('directory');
              setSlideOutContact(c);
              setIsSlideOutOpen(true);
            }}
            onSendWhatsApp={handleSendWhatsApp}
            businessName={businessName}
            currentIndustryConfig={currentIndustryConfig}
            onUpdateContact={handleUpdateContact}
          />
        )}

        {/* ==================== 3. APPOINTMENTS & OPERATIONS ==================== */}
        {activeTab === 'appointments' && (
          <AppointmentsWorkspace
            contacts={contacts}
            doctors={doctors}
            appointments={appointments}
            onAddDoctor={handleAddDoctor}
            onDeleteDoctor={handleDeleteDoctor}
            onAddAppointment={handleAddAppointment}
            onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
            onDeleteAppointment={handleDeleteAppointment}
            onOpenBookingModal={(c) => handleOpenCalendarModal(c || contacts[0])}
            onSendWhatsApp={(text) => handleSendWhatsApp(text)}
            businessName={businessName}
          />
        )}

        {/* ==================== 4. WHATSAPP INBOX & COMMUNICATIONS ==================== */}
        {activeTab === 'whatsapp_hub' && (
          <div className="w-full space-y-4 animate-fade-in">
            <WhatsAppAutomationHub 
              contacts={contacts} 
              onLogInteraction={handleLogAutomationInteraction}
              businessName={businessName}
              senderName={senderName}
              reviewLink={reviewLink}
              aiKnowledgeBase={aiKnowledgeBase}
              templates={templates}
              onAddTemplate={handleAddTemplate}
              onDeleteTemplate={handleDeleteTemplate}
              selectedIndustry={selectedIndustry}
              whatsappMode={whatsappMode}
              onWhatsappModeChange={setWhatsappMode}
              metaPhoneNumberId={metaPhoneNumberId}
              onMetaPhoneNumberIdChange={setMetaPhoneNumberId}
              metaAccessToken={metaAccessToken}
              onMetaAccessTokenChange={setMetaAccessToken}
              metaWabaId={metaWabaId}
              onMetaWabaIdChange={setMetaWabaId}
              metaVerifyToken={metaVerifyToken}
              onMetaVerifyTokenChange={setMetaVerifyToken}
              connectionStatus={connectionStatus}
              onConnectionStatusChange={setConnectionStatus}
              deviceDetails={deviceDetails}
              onDeviceDetailsChange={setDeviceDetails}
              spreadsheetId={spreadsheetId}
              isSyncing={isSyncing}

              aiAgentActive={aiAgentActive}
              onAiAgentActiveChange={setAiAgentActive}
              aiAgentType={aiAgentType}
              onAiAgentTypeChange={setAiAgentType}
              customSystemPrompt={customSystemPrompt}
              onCustomSystemPromptChange={setCustomSystemPrompt}
              customApiKey={customApiKey}
              onCustomApiKeyChange={setCustomApiKey}

              onSyncSettings={async () => {
                if (accessToken && spreadsheetId) {
                  try {
                    setIsSyncing(true);
                    await saveKnowledgeBaseToSheet(accessToken, spreadsheetId, aiKnowledgeBase, selectedIndustry, {
                      whatsappMode,
                      metaPhoneNumberId,
                      metaAccessToken,
                      metaWabaId,
                      metaVerifyToken,
                      connectionStatus,
                      deviceDetails: deviceDetails ? JSON.stringify(deviceDetails) : '',
                    });
                    setSyncSuccess("Pairing & API Settings successfully saved & synced to Google Sheets!");
                  } catch (err: any) {
                    setSyncError("Failed to sync settings to Google Sheets: " + err.message);
                  } finally {
                    setIsSyncing(false);
                  }
                } else {
                  setSyncSuccess("Pairing & API Settings successfully saved locally!");
                }
              }}
            />
          </div>
        )}

        {/* ==================== 6. GROWTH CENTER ==================== */}
        {activeTab === 'seo_audit' && (
          <GrowthCenter
            businessName={businessName}
            cityLandmark={cityLandmark}
            industryId={selectedIndustry}
            reviewLink={reviewLink}
            accessToken={accessToken}
            spreadsheetId={spreadsheetId}
          />
        )}

        {/* ==================== 7. AUTOMATION CENTER ==================== */}
        {activeTab === 'automation' && (
          <AutomationCenter
            templates={templates}
            onAddTemplate={handleAddTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            contacts={contacts}
            appointments={appointments}
          />
        )}

        {/* ==================== 8. CLINIC & WORKSPACE SETTINGS ==================== */}
        {activeTab === 'settings' && (
          <WorkspaceSettings
            user={user}
            selectedIndustry={selectedIndustry}
            onSetIndustry={handleSetIndustry}
            currentIndustryConfig={currentIndustryConfig}
            kbLabels={kbLabels}
            businessName={businessName}
            onBusinessNameChange={setBusinessName}
            senderName={senderName}
            onSenderNameChange={setSenderName}
            reviewLink={reviewLink}
            onReviewLinkChange={setReviewLink}
            aiKnowledgeBase={aiKnowledgeBase}
            onAiKnowledgeBaseChange={setAiKnowledgeBase}
            whatsappMode={whatsappMode}
            onWhatsappModeChange={setWhatsappMode}
            metaPhoneNumberId={metaPhoneNumberId}
            onMetaPhoneNumberIdChange={setMetaPhoneNumberId}
            metaAccessToken={metaAccessToken}
            onMetaAccessTokenChange={setMetaAccessToken}
            metaWabaId={metaWabaId}
            onMetaWabaIdChange={setMetaWabaId}
            metaVerifyToken={metaVerifyToken}
            onMetaVerifyTokenChange={setMetaVerifyToken}
            connectionStatus={connectionStatus}
            onConnectionStatusChange={setConnectionStatus}
            deviceDetails={deviceDetails}
            onDeviceDetailsChange={setDeviceDetails}
            spreadsheetId={spreadsheetId}
            spreadsheetUrl={spreadsheetUrl || undefined}
            isSyncing={isSyncing}
            onSyncSettings={async () => {
              if (accessToken && spreadsheetId) {
                try {
                  setIsSyncing(true);
                  await saveKnowledgeBaseToSheet(accessToken, spreadsheetId, aiKnowledgeBase, selectedIndustry, {
                    whatsappMode,
                    metaPhoneNumberId,
                    metaAccessToken,
                    metaWabaId,
                    metaVerifyToken,
                    connectionStatus,
                    deviceDetails: deviceDetails ? JSON.stringify(deviceDetails) : '',
                  });
                  setSyncSuccess("Settings successfully saved & synced to Google Sheets!");
                } catch (err: any) {
                  setSyncError("Failed to sync settings to Google Sheets: " + err.message);
                } finally {
                  setIsSyncing(false);
                }
              } else {
                setSyncSuccess("Settings successfully saved locally!");
              }
            }}
            onManualSync={handleManualSync}
            onLogin={handleLogin}
            onLogout={handleLogout}
            isLoggingIn={isLoggingIn}
            onResetPresets={() => handleSwitchIndustryAndLoadPresets(selectedIndustry)}
            onTriggerOnboarding={() => setShowOnboarding(true)}
          />
        )}


      </main>
      </div>

      {/* ==================== MODAL: ADD/EDIT CONTACT ==================== */}
      {isContactModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseContactModal();
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-950 p-4 text-white flex items-center justify-between">
              <h3 className="font-semibold font-display text-sm">
                {contactToEdit ? `Edit ${currentIndustryConfig.terminology.patientLabel} Info` : `Add New ${currentIndustryConfig.terminology.patientLabel} Contact`}
              </h3>
              <button 
                type="button" 
                onClick={handleCloseContactModal} 
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Close Modal"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form noValidate onSubmit={handleSaveContact} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  {currentIndustryConfig.terminology.patientLabel} Name
                </label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Robert Miller"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 focus:border-teal-500 rounded-xl text-xs focus:outline-none text-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  WhatsApp Number (with country code)
                </label>
                <input
                  type="text"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. +14155550198"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 focus:border-teal-500 rounded-xl text-xs focus:outline-none font-mono text-slate-700"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Prefix with "+" and country code. No spaces or dashes.</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="e.g. robert.miller@example.com"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 focus:border-teal-500 rounded-xl text-xs focus:outline-none text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Pipeline Stage
                  </label>
                  <select
                    value={contactPipelineStage}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setContactPipelineStage(val);
                      // Mirror to category for backwards compatibility
                      if (val === 'Inquiry') setContactCategory('Lead');
                      else if (val === 'Scheduled') setContactCategory('Follow-up');
                      else if (val === 'Visited') setContactCategory('Follow-up');
                      else if (val === 'Treatment') setContactCategory('Active');
                      else if (val === 'Completed') setContactCategory('Inactive');
                    }}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 focus:border-teal-500 rounded-xl text-xs focus:outline-none font-semibold text-slate-700"
                  >
                    {currentIndustryConfig.stages.map(st => (
                      <option key={st.id} value={st.id}>{st.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Sales Lead Category
                  </label>
                  <select
                    value={contactCategory}
                    onChange={(e) => setContactCategory(e.target.value as any)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 focus:border-teal-500 rounded-xl text-xs focus:outline-none font-medium text-slate-700"
                  >
                    <option value="Lead">Lead (Prospect)</option>
                    <option value="Active">Active {currentIndustryConfig.terminology.patientLabel}</option>
                    <option value="Follow-up">Awaiting Follow-up</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    {currentIndustryConfig.terminology.treatmentTypeLabel}
                  </label>
                  <input
                    type="text"
                    value={contactTreatmentType}
                    onChange={(e) => setContactTreatmentType(e.target.value)}
                    placeholder={`e.g. ${currentIndustryConfig.terminology.treatmentLabel}`}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 focus:border-teal-500 rounded-xl text-xs focus:outline-none text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    {currentIndustryConfig.terminology.costLabel}
                  </label>
                  <input
                    type="number"
                    value={contactTreatmentValue || ''}
                    onChange={(e) => setContactTreatmentValue(Number(e.target.value))}
                    placeholder="e.g. 4500"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 focus:border-teal-500 rounded-xl text-xs focus:outline-none text-slate-700 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Traffic Source / Channel
                  </label>
                  <select
                    value={contactSource}
                    onChange={(e) => setContactSource(e.target.value as any)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 focus:border-teal-500 rounded-xl text-xs focus:outline-none font-semibold text-slate-700"
                  >
                    <option value="WhatsApp">🟢 WhatsApp Lead</option>
                    <option value="Phone">📞 Phone Call</option>
                    <option value="Website">🌐 Website Lead</option>
                    <option value="Walk-in">🚶 Direct Walk-in (New)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 text-emerald-600">
                    Amount Collected (₹)
                  </label>
                  <input
                    type="number"
                    value={contactAmountCollected || ''}
                    onChange={(e) => setContactAmountCollected(Number(e.target.value))}
                    placeholder="e.g. 1500"
                    className="w-full px-4 py-2 bg-emerald-50/50 border border-emerald-100 focus:border-emerald-500 rounded-xl text-xs font-bold focus:outline-none text-emerald-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 text-slate-600">
                    Payment Type / Mode
                  </label>
                  <select
                    value={contactPaymentMethod}
                    onChange={(e) => setContactPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 focus:border-teal-500 rounded-xl text-xs focus:outline-none font-semibold text-slate-700 cursor-pointer"
                  >
                    <option value="UPI/PhonePe">📱 Online - UPI / PhonePe</option>
                    <option value="Card (Debit/Credit)">💳 Card - Debit / Credit</option>
                    <option value="Cash">💵 Cash Payment</option>
                    <option value="Net Banking">🏛️ Net Banking / Transfer</option>
                    <option value="Insurance / EMI">🏥 Insurance / EMI</option>
                  </select>
                </div>
              </div>

              {/* Repeat Patient Checkbox */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <input
                    type="checkbox"
                    id="contactIsRepeatCheck"
                    checked={contactIsRepeat}
                    onChange={(e) => setContactIsRepeat(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="contactIsRepeatCheck" className="text-left cursor-pointer select-none">
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-tight">Repeat / Recall Patient</p>
                    <p className="text-[9px] text-slate-400 font-medium leading-none mt-0.5">Returning patient volume</p>
                  </label>
                </div>

                <div className="flex items-center gap-2.5 bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/80">
                  <input
                    type="checkbox"
                    id="contactIsFamilyCheck"
                    checked={contactIsFamily}
                    onChange={(e) => setContactIsFamily(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300 cursor-pointer"
                  />
                  <label htmlFor="contactIsFamilyCheck" className="text-left cursor-pointer select-none">
                    <p className="text-[10px] font-black text-amber-900 uppercase tracking-tight">Family Member Contact</p>
                    <p className="text-[9px] text-amber-700 font-medium leading-none mt-0.5">Link to existing family profile</p>
                  </label>
                </div>
              </div>

              {/* Family Details Sub-section if checked */}
              {contactIsFamily && (
                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 space-y-3 animate-fade-in">
                  <p className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                    👨‍👩‍👧‍👦 Family Connection Details
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                        Relation Type
                      </label>
                      <select
                        value={contactFamilyRelation}
                        onChange={(e) => setContactFamilyRelation(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-amber-200 focus:border-amber-500 rounded-lg text-xs font-semibold text-slate-800"
                      >
                        <option value="Spouse">Spouse (Husband / Wife)</option>
                        <option value="Child">Child (Son / Daughter)</option>
                        <option value="Parent">Parent (Father / Mother)</option>
                        <option value="Sibling">Sibling (Brother / Sister)</option>
                        <option value="Other Family">Other Family Relative</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                        Primary Patient / Head
                      </label>
                      <input
                        type="text"
                        value={contactPrimaryMember}
                        onChange={(e) => setContactPrimaryMember(e.target.value)}
                        placeholder="e.g. John Miller (Primary)"
                        className="w-full px-3 py-1.5 bg-white border border-amber-200 focus:border-amber-500 rounded-lg text-xs text-slate-800 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Internal Profile Notes
                </label>
                <textarea
                  rows={3}
                  value={contactNotes}
                  onChange={(e) => setContactNotes(e.target.value)}
                  placeholder="Inquired about product packages, requested quote on Friday. Prefers text follow-up."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 focus:border-teal-500 rounded-xl text-xs focus:outline-none text-slate-700"
                />
              </div>

              <div className="flex justify-between items-center pt-3.5 border-t border-slate-50">
                {contactToEdit ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteContact(contactToEdit.id, contactToEdit.name)}
                    className="text-red-500 hover:text-red-700 text-xs font-semibold"
                  >
                    Delete {currentIndustryConfig.terminology.patientLabel}
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCloseContactModal}
                    className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl text-xs transition-colors shadow-sm"
                  >
                    Save {currentIndustryConfig.terminology.patientLabel}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ==================== MODAL: SCHEDULE CALENDAR EVENT ==================== */}
      {isCalendarModalOpen && contactForCalendar && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-fade-in">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100"
          >
            <div className="bg-slate-950 p-4 text-white flex items-center justify-between">
              <h3 className="font-semibold font-display text-sm flex items-center gap-1.5">
                <Calendar className="h-4.5 w-4.5 text-amber-500" />
                Schedule Calendar Follow-up
              </h3>
              <button onClick={() => setIsCalendarModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleBookCalendarEvent} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  value={eventSummary}
                  onChange={(e) => setEventSummary(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 focus:border-teal-500 rounded-xl text-xs focus:outline-none text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 focus:border-teal-500 rounded-xl text-xs focus:outline-none text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Time
                  </label>
                  <input
                    type="time"
                    required
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 focus:border-teal-500 rounded-xl text-xs focus:outline-none text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Appointment Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 focus:border-teal-500 rounded-xl text-xs focus:outline-none text-slate-700"
                />
              </div>

              {!accessToken && (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-[10px] text-amber-800 leading-relaxed">
                  Notice: Calendar sync is operating in <span className="font-bold">Offline mode</span>. Logging this follow-up will add to the local thread log history. Link Google to sync on Google Calendar live!
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setIsCalendarModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm"
                >
                  Schedule Appointment
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ==================== CUSTOM DIALOG: CONFIRM ==================== */}
      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-[200]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-100"
            >
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${confirmDialog.isDanger ? 'bg-red-50 text-red-600' : 'bg-teal-50 text-teal-600'}`}>
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-display">
                      {confirmDialog.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
                      {confirmDialog.message}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-slate-50">
                  <button
                    onClick={() => setConfirmDialog(null)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                  >
                    {confirmDialog.cancelText || 'Cancel'}
                  </button>
                  <button
                    onClick={() => {
                      confirmDialog.onConfirm();
                      setConfirmDialog(null);
                    }}
                    className={`px-3.5 py-1.5 text-xs font-bold text-white rounded-xl transition-colors shadow-sm cursor-pointer ${
                      confirmDialog.isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'
                    }`}
                  >
                    {confirmDialog.confirmText || 'Confirm'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== CUSTOM DIALOG: ALERT ==================== */}
      <AnimatePresence>
        {alertDialog && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-[200]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-100"
            >
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${
                    alertDialog.type === 'error' ? 'bg-red-50 text-red-600' :
                    alertDialog.type === 'success' ? 'bg-teal-50 text-teal-600' :
                    alertDialog.type === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-display">
                      {alertDialog.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
                      {alertDialog.message}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-slate-50">
                  {alertDialog.linkUrl && (
                    <a
                      href={alertDialog.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setAlertDialog(null)}
                      className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer inline-flex items-center gap-1"
                    >
                      {alertDialog.linkText || 'Open Link'}
                    </a>
                  )}
                  <button
                    onClick={() => setAlertDialog(null)}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm cursor-pointer"
                  >
                    OK
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <MigrationCenter
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
        existingContacts={contacts}
        onImportContacts={handleImportContacts}
        currentIndustryConfig={currentIndustryConfig}
      />

      {/* ==================== ONBOARDING WIZARD OVERLAY ==================== */}
      {showOnboarding && (
        <OnboardingWizard
          currentIndustry={selectedIndustry}
          currentBusinessName={businessName}
          onClose={() => setShowOnboarding(false)}
          onComplete={async (data) => {
            setBusinessName(data.businessName);
            setCityLandmark(data.cityLandmark);
            handleSetIndustry(data.selectedIndustry);
            
            localStorage.setItem('crm_business_name', data.businessName);
            localStorage.setItem('nestam_city_landmark', data.cityLandmark);
            localStorage.setItem('crm_selected_industry', data.selectedIndustry);
            localStorage.setItem('nestam_onboarding_completed', 'true');
            
            if (data.services.length > 0) {
              const servicesText = data.services.map(s => `- ${s.name}: ₹${s.price} (${s.duration})`).join('\n');
              const updatedKb = {
                ...aiKnowledgeBase,
                treatments: servicesText + '\n\n' + aiKnowledgeBase.treatments
              };
              setAiKnowledgeBase(updatedKb);
              localStorage.setItem('nestam_ai_knowledge_base', JSON.stringify(updatedKb));
            }

            setShowOnboarding(false);
            setSyncSuccess('Onboarding setup completed successfully!');
          }}
        />
      )}

      {/* ==================== CONTACT SLIDE-OUT PANEL ==================== */}
      <ContactSlideOut
        contact={slideOutContact}
        isOpen={isSlideOutOpen}
        onClose={() => {
          setIsSlideOutOpen(false);
          setSlideOutContact(null);
        }}
        onUpdateStage={(id, stage) => {
          handleUpdatePipelineStage(id, stage);
          setSlideOutContact(prev => prev && prev.id === id ? { ...prev, pipelineStage: stage } : prev);
        }}
        onUpdateContactNotes={handleUpdateContactNotes}
        onUpdateContactTreatment={handleUpdateContactTreatment}
        onUpdateContactPhotos={(id, photos) => {
          handleUpdateContactPhotos(id, photos);
          setSlideOutContact(prev => prev && prev.id === id ? { ...prev, photos } : prev);
        }}
        interactions={interactions}
        onAddInteraction={handleAddInteraction}
        industryId={selectedIndustry}
      />

      {/* ==================== GLOBAL COMMAND PALETTE (Cmd+K) ==================== */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        contacts={contacts}
        currentIndustry={selectedIndustry}
        onNavigateTab={(tab) => {
          setActiveTab(tab as any);
          if (tab !== 'contacts') {
            setSelectedContactId(null);
          }
        }}
        onSelectContact={(contactId) => {
          setSelectedContactId(contactId);
          setPatientsSubView('directory');
        }}
        onOpenIntakeModal={() => handleOpenContactModal(null)}
        onOpenCalendarModal={() => {
          if (contacts.length > 0) {
            handleOpenCalendarModal(contacts[0]);
          }
        }}
        onOpenMigrationModal={() => setIsMigrationModalOpen(true)}
        onSwitchIndustry={(ind) => handleSetIndustry(ind)}
      />

    </div>
  );
}
