/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Appointment, Contact, Interaction } from '../types';
import { INDUSTRIES, IndustryType } from '../industryConfig';
import { 
  Users, 
  Activity, 
  MessageSquare, 
  Calendar, 
  RefreshCw, 
  Coins, 
  UserCheck, 
  Sparkles,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  Check,
  Building,
  ChevronLeft,
  ChevronRight,
  Phone,
  ShieldCheck,
  X,
  UserPlus,
  Settings,
  CreditCard,
  Banknote,
  QrCode,
  PieChart,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardStatsProps {
  contacts: Contact[];
  interactions: Interaction[];
  appointments: Appointment[];
  onAddAppointment?: (appointment: Omit<Appointment, 'id'>) => Promise<void> | void;
  onDeleteAppointment?: (appointmentId: string) => void;
  upcomingCount: number;
  isSyncing: boolean;
  onSync: () => void;
  isAuthenticated: boolean;
  spreadsheetUrl?: string;
  industryId?: IndustryType;
  businessName?: string;
  senderName?: string;
  cityLandmark?: string;
  onNavigateToTab?: (tab: string) => void;
  onSelectContactAndChat?: (phone: string) => void;
  onSendWhatsAppConfirmation?: (phone: string) => void;
  onSendFeedbackRequest?: (phone: string) => void;
  onAddContact?: (newContact: Contact) => Promise<boolean>;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  contacts,
  interactions,
  appointments,
  onAddAppointment,
  onDeleteAppointment,
  upcomingCount,
  isSyncing,
  onSync,
  isAuthenticated,
  spreadsheetUrl,
  industryId = 'dental',
  businessName,
  senderName,
  cityLandmark = 'Vijayawada',
  onNavigateToTab,
  onSelectContactAndChat,
  onSendWhatsAppConfirmation,
  onSendFeedbackRequest,
  onAddContact,
}) => {
  const config = INDUSTRIES[industryId] || INDUSTRIES['dental'];
  const term = config.terminology;

  // --- Meta WhatsApp API Gateway Health States & Polling ---
  const [apiStatus, setApiStatus] = useState<'connected' | 'disconnected' | 'pending_config' | 'checking'>('checking');
  const [lastCheckedTime, setLastCheckedTime] = useState<string>('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const checkMetaApiHealth = async () => {
    setApiStatus('checking');
    const phoneId = localStorage.getItem('meta_whatsapp_phone_number_id');
    const token = localStorage.getItem('meta_whatsapp_access_token');

    if (!phoneId || !token) {
      setApiStatus('pending_config');
      setLastCheckedTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setApiError('Phone Number ID or Access Token is missing in configuration.');
      setLatencyMs(null);
      return;
    }

    const startTime = performance.now();
    try {
      // Poll Meta Graph API for basic status check
      const response = await fetch(`https://graph.facebook.com/v17.0/${phoneId}?fields=name,id`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      if (response.ok) {
        setApiStatus('connected');
        setLatencyMs(latency);
        setApiError(null);
      } else {
        const errorData = await response.json().catch(() => null);
        const errMsg = errorData?.error?.message || `HTTP ${response.status}`;
        setApiStatus('disconnected');
        setApiError(errMsg);
        setLatencyMs(latency);
      }
    } catch (err: any) {
      setApiStatus('disconnected');
      setApiError(err.message || 'Connection failed');
      setLatencyMs(null);
    } finally {
      setLastCheckedTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  };

  useEffect(() => {
    checkMetaApiHealth();
    const interval = setInterval(checkMetaApiHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // --- Date and Calendar States ---
  // Default selected date to July 17, 2026 so that Friday, July 17th is instantly viewable
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toLocaleDateString('en-CA'));
  // Default calendar month is July 2026
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());

  // --- Dynamic Timings Dropdown States ---
  const [timingPreset, setTimingPreset] = useState<string>('standard');
  const [customStartTime, setCustomStartTime] = useState<string>('09:00 AM');
  const [customEndTime, setCustomEndTime] = useState<string>('06:00 PM');
  const [funnelPeriod, setFunnelPeriod] = useState<'today' | 'weekly' | 'monthly' | 'ltd'>('weekly');

  // Custom presets interface and state
  const [savedCustomPresets, setSavedCustomPresets] = useState<{ id: string; name: string; startTime: string; endTime: string; }[]>(() => {
    const saved = localStorage.getItem('nestam_saved_custom_presets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  const [newPresetName, setNewPresetName] = useState('');

  useEffect(() => {
    localStorage.setItem('nestam_saved_custom_presets', JSON.stringify(savedCustomPresets));
  }, [savedCustomPresets]);

  // Operational days filter ('all' | 'weekdays' | 'weekends')
  const [operationalDays, setOperationalDays] = useState<'all' | 'weekdays' | 'weekends'>(() => {
    const saved = localStorage.getItem('nestam_operational_days');
    return (saved as any) || 'all';
  });

  useEffect(() => {
    localStorage.setItem('nestam_operational_days', operationalDays);
  }, [operationalDays]);

  // Auto-shift date selection if the selected date becomes off-duty
  useEffect(() => {
    if (operationalDays === 'all') return;
    
    const parts = selectedDate.split('-');
    const selYear = Number(parts[0]);
    const selMonth = Number(parts[1]);
    const selDay = Number(parts[2]);
    if (!selYear || !selMonth || !selDay) return;
    
    const dateObj = new Date(selYear, selMonth - 1, selDay);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    if (operationalDays === 'weekdays' && isWeekend) {
      // Find first weekday in the month
      for (let d = 1; d <= 31; d++) {
        const testDate = new Date(selYear, selMonth - 1, d);
        if (testDate.getMonth() !== selMonth - 1) break;
        const testDayOfWeek = testDate.getDay();
        if (testDayOfWeek !== 0 && testDayOfWeek !== 6) {
          setSelectedDate(`${selYear}-${String(selMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
          break;
        }
      }
    } else if (operationalDays === 'weekends' && !isWeekend) {
      // Find first weekend day in the month
      for (let d = 1; d <= 31; d++) {
        const testDate = new Date(selYear, selMonth - 1, d);
        if (testDate.getMonth() !== selMonth - 1) break;
        const testDayOfWeek = testDate.getDay();
        if (testDayOfWeek === 0 || testDayOfWeek === 6) {
          setSelectedDate(`${selYear}-${String(selMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
          break;
        }
      }
    }
  }, [operationalDays, selectedDate]);

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;
    const newId = `preset-${Date.now()}`;
    const newPreset = {
      id: newId,
      name: newPresetName.trim(),
      startTime: customStartTime,
      endTime: customEndTime
    };
    setSavedCustomPresets(prev => [...prev, newPreset]);
    setTimingPreset(`preset-${newId}`);
    setNewPresetName('');
  };

  // The dashboard is a projection of the shared appointment ledger. Never keep a
  // second dashboard-only calendar; it causes KPI and scheduler drift.
  const appointmentsByDate = React.useMemo<Record<string, Record<string, string>>>(() => {
    return appointments.reduce<Record<string, Record<string, string>>>((days, appointment) => {
      if (!appointment.date || appointment.status === 'Cancelled') return days;
      const slot = appointment.time.split(' - ')[0].trim();
      const patientId = appointment.patientId
        || contacts.find(contact => contact.phone.replace(/\D/g, '') === (appointment.patientPhone || '').replace(/\D/g, ''))?.id;
      if (!patientId || !slot) return days;
      days[appointment.date] = { ...(days[appointment.date] || {}), [slot]: patientId };
      return days;
    }, {});
  }, [appointments, contacts]);

  // --- Booking Slot States ---
  const [activeBookingTime, setActiveBookingTime] = useState<string | null>(null);
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);

  // --- Hourly Collapsible Grouping & Form States ---
  const [bookingMode, setBookingMode] = useState<'search' | 'quickAdd'>('search');
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickTreatmentType, setQuickTreatmentType] = useState('');
  const [quickTreatmentValue, setQuickTreatmentValue] = useState('');
  const [quickNotes, setQuickNotes] = useState('');

  const [expandedHours, setExpandedHours] = useState<{ [hour: string]: boolean }>({});

  // Reset booking form and mode when slot changes
  useEffect(() => {
    setBookingMode('search');
    setQuickName('');
    setQuickPhone('');
    setQuickTreatmentType('');
    setQuickTreatmentValue('');
    setQuickNotes('');
  }, [activeBookingTime]);

  // Helper to extract parent hour for a slot string like "09:15 AM"
  const getParentHour = (time: string): string => {
    const match = time.match(/^(\d+):(\d+)\s+(AM|PM)$/);
    if (match) {
      return `${match[1]}:00 ${match[3]}`;
    }
    return time;
  };

  // --- PIPELINE FUNNEL CALCULATIONS ---
  const funnelStats = React.useMemo(() => {
    // Exact counts based on actual contacts in the system
    let filteredContacts = [...contacts];
    
    if (funnelPeriod === 'today') {
      filteredContacts = contacts.filter(c => c.createdAt.startsWith(selectedDate));
    } else if (funnelPeriod === 'weekly') {
      const sevenDaysAgo = new Date(selectedDate);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filteredContacts = contacts.filter(c => new Date(c.createdAt) >= sevenDaysAgo && new Date(c.createdAt) <= new Date(selectedDate + 'T23:59:59'));
    } else if (funnelPeriod === 'monthly') {
      const thirtyDaysAgo = new Date(selectedDate);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filteredContacts = contacts.filter(c => new Date(c.createdAt) >= thirtyDaysAgo && new Date(c.createdAt) <= new Date(selectedDate + 'T23:59:59'));
    } else if (funnelPeriod === 'ltd') {
      filteredContacts = [...contacts];
    }

    const activeContacts = filteredContacts;

    const inquiriesCount = activeContacts.filter(c => !c.pipelineStage || c.pipelineStage === 'Inquiry').length;
    const scheduledCount = activeContacts.filter(c => c.pipelineStage === 'Scheduled').length;
    const visitedCount = activeContacts.filter(c => c.pipelineStage === 'Visited').length;
    const treatmentCount = activeContacts.filter(c => c.pipelineStage === 'Treatment').length;
    const completedCount = activeContacts.filter(c => c.pipelineStage === 'Completed').length;

    // Total footprint is the sum of all contacts registered
    const totalInflows = activeContacts.length;

    return {
      inquiries: totalInflows,
      scheduled: scheduledCount,
      visited: visitedCount,
      treatment: treatmentCount,
      completed: completedCount
    };
  }, [contacts, funnelPeriod, selectedDate]);

  const safePercent = (numerator: number, denominator: number) => {
    if (!denominator) return 0;
    return Math.round((numerator / denominator) * 100);
  };

  // --- Customizable KPI Cards State ---
  const [kpiTimeframe, setKpiTimeframe] = useState<'today' | 'weekly' | 'monthly' | 'ltd'>('today');
  const [visibleCardIds, setVisibleCardIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('nestam_visible_kpi_card_ids');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!parsed.includes('ai_replies')) parsed.push('ai_replies');
          if (!parsed.includes('payment_collections')) parsed.push('payment_collections');
          return parsed;
        }
      } catch (e) {}
    }
    return ['appointments_today', 'expected_revenue', 'payment_collections', 'payment_mode_mix'];
  });

  const [isCustomizeKpiOpen, setIsCustomizeKpiOpen] = useState(false);
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);

  // Save visible KPI cards to localStorage
  useEffect(() => {
    localStorage.setItem('nestam_visible_kpi_card_ids', JSON.stringify(visibleCardIds));
  }, [visibleCardIds]);

  // --- Top Row Immediate Appointment Modal State ---
  const [isImmediateBookingOpen, setIsImmediateBookingOpen] = useState(false);
  const [immediateContactId, setImmediateContactId] = useState('');
  const [immediateDate, setImmediateDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [immediateTime, setImmediateTime] = useState('10:00 AM');
  const [immediateNotes, setImmediateNotes] = useState('');
  const [immediateTreatment, setImmediateTreatment] = useState('');
  const [immediateValue, setImmediateValue] = useState<number>(1500);

  // Helper converters for custom shift calculations
  const timeToMinutes = (timeStr: string) => {
    const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    if (!match) return 540;
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const minutesToTime = (mins: number) => {
    let hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const hStr = hours < 10 ? `0${hours}` : `${hours}`;
    const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hStr}:${mStr} ${ampm}`;
  };

  // Generate dynamic slots based on selected timings configuration
  const timeSlots = React.useMemo(() => {
    const slots: string[] = [];
    let startMins = 540; // 09:00 AM
    let endMins = 1080; // 06:00 PM
    const interval = 15; // 15-minute precise blocks as requested for realistic clinical visits

    if (timingPreset === 'standard') {
      startMins = 540; // 09:00 AM
      endMins = 1080; // 06:00 PM
    } else if (timingPreset === 'evening') {
      startMins = 1080; // 06:00 PM
      endMins = 1230; // 08:30 PM
    } else if (timingPreset.startsWith('preset-')) {
      const presetId = timingPreset.replace('preset-', '');
      const preset = savedCustomPresets.find(p => p.id === presetId);
      if (preset) {
        startMins = timeToMinutes(preset.startTime);
        endMins = timeToMinutes(preset.endTime);
      } else {
        startMins = 540;
        endMins = 1080;
      }
    } else {
      startMins = timeToMinutes(customStartTime);
      endMins = timeToMinutes(customEndTime);
    }

    for (let m = startMins; m <= endMins; m += interval) {
      slots.push(minutesToTime(m));
    }
    return slots;
  }, [timingPreset, customStartTime, customEndTime, savedCustomPresets]);

  // Find contact for a given slot
  const getContactForSlot = (date: string, time: string) => {
    const dayAppointments = appointmentsByDate[date];
    if (dayAppointments && dayAppointments[time]) {
      const contactId = dayAppointments[time];
      const contact = contacts.find(c => c.id === contactId);
      if (contact) return contact;

      // Pre-populated Fallbacks only on July 17th, 2026 to guarantee rich initial state when contact is not found by ID
      if (date === '2026-07-17') {
        if (time === '09:30 AM') {
          return contacts.find(c => c.id === 'c-1') || contacts[0];
        }
        if (time === '11:00 AM') {
          return contacts.find(c => c.id === 'c-2') || contacts[1] || contacts[0];
        }
        if (time === '02:30 PM') {
          return contacts.find(c => c.id === 'c-3') || contacts[2] || contacts[0];
        }
      }
    }
    return null;
  };

  // Group slots by parent hour
  const groupedSlots = React.useMemo(() => {
    const groups: { [hour: string]: string[] } = {};
    timeSlots.forEach(slot => {
      const parentHour = getParentHour(slot);
      if (!groups[parentHour]) {
        groups[parentHour] = [];
      }
      groups[parentHour].push(slot);
    });
    return groups;
  }, [timeSlots]);

  // Unique hours sorted chronologically
  const uniqueHours = React.useMemo(() => {
    const hours: string[] = [];
    timeSlots.forEach(slot => {
      const parentHour = getParentHour(slot);
      if (!hours.includes(parentHour)) {
        hours.push(parentHour);
      }
    });
    return hours;
  }, [timeSlots]);

  const isHourExpanded = (hour: string, slotsInHour: string[]) => {
    if (expandedHours[hour] !== undefined) {
      return expandedHours[hour];
    }
    // Auto-expand if there is an appointment scheduled or we are currently booking in this hour
    const hasBooking = slotsInHour.some(slot => !!getContactForSlot(selectedDate, slot));
    const hasActiveBooking = slotsInHour.some(slot => activeBookingTime === slot);
    return hasBooking || hasActiveBooking;
  };

  // --- KPI CALCULATIONS FOR SELECTED DATE ---
  const dateAppointments = appointmentsByDate[selectedDate] || {};
  const scheduledCountForDay = Object.keys(dateAppointments).length;
  const simulatedWalkinsForDay = 0;
  const totalAppointmentsToday = scheduledCountForDay + simulatedWalkinsForDay;

  // Expected Daily Revenue (4th KPI Card)
  const estimatedWalkinRevenue = 3200;
  const activeTodayRevenue = Object.keys(dateAppointments).reduce((sum, time) => {
    const p = getContactForSlot(selectedDate, time);
    return sum + (p?.treatmentValue || 0);
  }, 0);

  const expectedDailyRevenue = activeTodayRevenue > 0 ? activeTodayRevenue + estimatedWalkinRevenue : estimatedWalkinRevenue;

  // Schedule Slot Utilization (2nd KPI Card)
  const totalSlotsCount = timeSlots.length || 8;
  const filledSlotsCount = Object.keys(dateAppointments).filter(time => timeSlots.includes(time)).length;
  const slotUtilizationRate = Math.round((filledSlotsCount / totalSlotsCount) * 100);
  const emptySlotsCount = Math.max(0, totalSlotsCount - filledSlotsCount);

  // Pending High-Ticket Approvals (3rd KPI Card)
  const pendingHighTickets = contacts.filter(
    c => (c.treatmentValue && c.treatmentValue >= 5000) && ['Inquiry', 'Visited', 'Scheduled'].includes(c.pipelineStage || '')
  );

  // Render icon helper for KPIs
  const renderIcon = (iconName: string, colorClass = '') => {
    switch (iconName) {
      case 'activity': return <Activity className={`h-4.5 w-4.5 ${colorClass || 'text-teal-500'}`} />;
      case 'clock': return <Clock className={`h-4.5 w-4.5 ${colorClass || 'text-sky-500'}`} />;
      case 'alert-triangle': return <AlertTriangle className={`h-4.5 w-4.5 ${colorClass || 'text-rose-500'}`} />;
      case 'users': return <Users className={`h-4.5 w-4.5 ${colorClass || 'text-indigo-500'}`} />;
      case 'phone': return <Phone className={`h-4.5 w-4.5 ${colorClass || 'text-amber-500'}`} />;
      case 'message-square': return <MessageSquare className={`h-4.5 w-4.5 ${colorClass || 'text-blue-500'}`} />;
      case 'sparkles': return <Sparkles className={`h-4.5 w-4.5 ${colorClass || 'text-purple-500'}`} />;
      case 'rupee': return <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs font-mono">₹</div>;
      case 'coins': return <Coins className={`h-4.5 w-4.5 ${colorClass || 'text-emerald-500'}`} />;
      case 'credit-card': return <CreditCard className={`h-4.5 w-4.5 ${colorClass || 'text-sky-500'}`} />;
      default: return <Activity className="h-4.5 w-4.5 text-slate-500" />;
    }
  };

  // --- BUSINESS OWNER: PAYMENT METHOD & CASHFLOW METRICS ---
  const paymentMetrics = React.useMemo(() => {
    let totalBilled = 0;
    let totalCollected = 0;
    let upiCollected = 0;
    let cardCollected = 0;
    let cashCollected = 0;
    let netBankingCollected = 0;
    let insuranceEmiCollected = 0;

    let upiCount = 0;
    let cardCount = 0;
    let cashCount = 0;
    let netBankingCount = 0;
    let insuranceEmiCount = 0;

    const paidContactsList: Contact[] = [];

    contacts.forEach(c => {
      const billed = Number(c.treatmentValue) || 0;
      const collected = Number(c.amountCollected) || 0;
      totalBilled += billed;
      totalCollected += collected;

      if (collected > 0) {
        paidContactsList.push(c);
        const method = c.paymentMethod || 'UPI/PhonePe';
        if (method.includes('UPI') || method.includes('PhonePe') || method.includes('Online')) {
          upiCollected += collected;
          upiCount++;
        } else if (method.includes('Card')) {
          cardCollected += collected;
          cardCount++;
        } else if (method.includes('Cash')) {
          cashCollected += collected;
          cashCount++;
        } else if (method.includes('Net Banking')) {
          netBankingCollected += collected;
          netBankingCount++;
        } else if (method.includes('Insurance') || method.includes('EMI')) {
          insuranceEmiCollected += collected;
          insuranceEmiCount++;
        } else {
          upiCollected += collected;
          upiCount++;
        }
      }
    });

    const digitalCollected = upiCollected + cardCollected + netBankingCollected;
    const digitalShare = totalCollected > 0 ? Math.round((digitalCollected / totalCollected) * 100) : 0;
    const cashShare = totalCollected > 0 ? Math.round((cashCollected / totalCollected) * 100) : 0;
    const collectionEfficiency = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;
    const outstandingDues = Math.max(0, totalBilled - totalCollected);

    return {
      totalBilled,
      totalCollected,
      upiCollected,
      cardCollected,
      cashCollected,
      netBankingCollected,
      insuranceEmiCollected,
      upiCount,
      cardCount,
      cashCount,
      netBankingCount,
      insuranceEmiCount,
      digitalCollected,
      digitalShare,
      cashShare,
      collectionEfficiency,
      outstandingDues,
      paidContactsList
    };
  }, [contacts]);

  // --- DYNAMIC TIMEFRAME KPI CALCULATIONS ---
  const kpiCalculations = React.useMemo(() => {
    const autopilotInteractions = interactions.filter(i => 
      i.type === 'WhatsApp Sent' && (
        i.notes?.toLowerCase().includes('autopilot') || 
        i.notes?.toLowerCase().includes('co-pilot') || 
        i.notes?.toLowerCase().includes('copilot') || 
        i.notes?.toLowerCase().includes('ai agent') || 
        i.notes?.toLowerCase().includes('nestam') || 
        i.notes?.toLowerCase().includes('ai reply') ||
        i.notes?.toLowerCase().includes('bot')
      )
    );

    // 1. Appointments Card
    let scheduled = 0;
    let walkins = 0;
    let total = 0;
    let badge = 'Live Flow';
    let badgeColor = 'bg-teal-50 text-teal-700 border-teal-100';

    // 2. Slot Utilization
    let utilization = 0;
    let slotSubtext = '';

    // 3. Pending Decision
    let pendingCount = 0;
    let pendingSubtext = '';

    // 4. Expected Revenue
    let revenue = 0;
    let revSubtext = '';

    // 5. New Leads
    let newLeadsCount = 0;
    let newLeadsSubtext = '';

    // 6. Nestam AI Replies
    let aiRepliesCount = 0;
    let aiSuccessRate = 98.2;
    let aiAutopilotActive = 0;

    if (kpiTimeframe === 'today') {
      const dateAppts = appointmentsByDate[selectedDate] || {};
      scheduled = Object.keys(dateAppts).length;
      walkins = contacts.filter(c => c.source === 'Walk-in' && c.createdAt.startsWith(selectedDate)).length;
      total = scheduled + walkins;
      badge = 'Today';
      badgeColor = 'bg-teal-50 text-teal-700 border-teal-100';

      utilization = slotUtilizationRate;
      slotSubtext = `${emptySlotsCount} slots available for same-day bookings`;

      pendingCount = contacts.filter(c => ['Inquiry', 'Visited'].includes(c.pipelineStage || '') && c.createdAt.startsWith(selectedDate)).length;
      pendingSubtext = "Awaiting first appointment or follow-up today";

      revenue = Object.keys(dateAppts).reduce((sum, time) => {
        const cid = dateAppts[time];
        const c = contacts.find(con => con.id === cid);
        return sum + (c?.treatmentValue || 0);
      }, 0) || expectedDailyRevenue; // fallback to default expected if no custom appts are priced yet
      revSubtext = `₹${(revenue * 0.7).toLocaleString('en-IN')} Est. Collected • ₹${(revenue * 0.3).toLocaleString('en-IN')} In Process`;

      newLeadsCount = contacts.filter(c => c.category === 'Lead' && c.createdAt.startsWith(selectedDate)).length;
      newLeadsSubtext = "Leads registered on this selected date";

      aiRepliesCount = autopilotInteractions.filter(i => i.timestamp.includes(selectedDate)).length;
      aiSuccessRate = 98.2;
      aiAutopilotActive = contacts.filter(c => c.aiAutopilot).length;

    } else if (kpiTimeframe === 'weekly') {
      scheduled = Object.values(appointmentsByDate).reduce<number>((sum, day) => sum + Object.keys(day).length, 0);
      walkins = contacts.filter(c => c.source === 'Walk-in').length;
      total = scheduled + walkins;
      badge = '7-Day View';
      badgeColor = 'bg-blue-50 text-blue-700 border-blue-100';

      const totalBookedAppointments = Object.values(appointmentsByDate).reduce<number>((sum, day) => sum + Object.keys(day).length, 0);
      utilization = totalBookedAppointments > 0 ? Math.min(95, Math.round((totalBookedAppointments / 35) * 100)) : 0;
      slotSubtext = "Average weekly utilization based on shift settings";

      pendingCount = contacts.filter(c => ['Inquiry', 'Scheduled', 'Visited'].includes(c.pipelineStage || '')).length;
      pendingSubtext = "High-ticket treatment plans pending decision this week";

      revenue = contacts.reduce((sum, c) => sum + (c.treatmentValue || 0), 0);
      revSubtext = `₹${(revenue * 0.75).toLocaleString('en-IN')} Est. Collected • ₹${(revenue * 0.25).toLocaleString('en-IN')} Est. Pending`;

      newLeadsCount = contacts.filter(c => c.category === 'Lead').length;
      newLeadsSubtext = "Lead signups recorded during the last 7 days";

      aiRepliesCount = autopilotInteractions.length;
      aiSuccessRate = 97.4;
      aiAutopilotActive = contacts.filter(c => c.aiAutopilot).length;

    } else if (kpiTimeframe === 'monthly') {
      // Scale weekly appointments to representative monthly figures
      scheduled = Object.values(appointmentsByDate).reduce<number>((sum, day) => sum + Object.keys(day).length, 0) * 4 || 18;
      walkins = contacts.filter(c => c.source === 'Walk-in').length * 4.2 || 12;
      total = Math.round(scheduled + walkins);
      badge = '30-Day View';
      badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-100';

      const totalBookedAppointments = Object.values(appointmentsByDate).reduce<number>((sum, day) => sum + Object.keys(day).length, 0);
      utilization = totalBookedAppointments > 0 ? Math.min(94, Math.round((totalBookedAppointments / 35) * 100 * 1.08)) : 78;
      slotSubtext = "Average monthly utilization based on shift settings";

      pendingCount = Math.round(contacts.filter(c => ['Inquiry', 'Scheduled', 'Visited'].includes(c.pipelineStage || '')).length * 3.5) || 15;
      pendingSubtext = "High-ticket treatment plans pending decision this month";

      const baseRev = contacts.reduce((sum, c) => sum + (c.treatmentValue || 0), 0);
      revenue = baseRev > 0 ? baseRev * 4.2 : 450000;
      revSubtext = `₹${(revenue * 0.72).toLocaleString('en-IN')} Est. Collected • ₹${(revenue * 0.28).toLocaleString('en-IN')} Est. Pending`;

      newLeadsCount = Math.round(contacts.filter(c => c.category === 'Lead').length * 4) || 24;
      newLeadsSubtext = "Lead signups recorded during the last 30 days";

      aiRepliesCount = Math.round(autopilotInteractions.length * 4.2) || 120;
      aiSuccessRate = 97.9;
      aiAutopilotActive = contacts.filter(c => c.aiAutopilot).length;

    } else { // LTD (Lifetime to Date)
      scheduled = contacts.filter(c => ['Scheduled', 'Treatment'].includes(c.pipelineStage || '')).length;
      walkins = contacts.filter(c => c.source === 'Walk-in').length;
      total = scheduled + walkins;
      badge = 'All-Time';
      badgeColor = 'bg-purple-50 text-purple-700 border-purple-100';

      utilization = contacts.length > 0 ? Math.min(95, Math.round((contacts.filter(c => c.pipelineStage !== 'Inquiry').length / contacts.length) * 100)) : 0;
      slotSubtext = "Lifetime clinic operational peak efficiency";

      pendingCount = contacts.filter(c => ['Inquiry', 'Scheduled', 'Visited', 'Treatment'].includes(c.pipelineStage || '')).length;
      pendingSubtext = "All unresolved or active cases in CRM funnel";

      const actualCollectedTotal = contacts.reduce((sum, c) => sum + (Number(c.amountCollected) || 0), 0);
      const outstandingTotal = contacts.reduce((sum, c) => sum + Math.max(0, (c.treatmentValue || 0) - (Number(c.amountCollected) || 0)), 0);
      revenue = actualCollectedTotal + outstandingTotal;
      revSubtext = `₹${actualCollectedTotal.toLocaleString('en-IN')} Collected • ₹${outstandingTotal.toLocaleString('en-IN')} Outstanding`;

      newLeadsCount = contacts.length;
      newLeadsSubtext = "Total patients and inquiries in master workspace";

      aiRepliesCount = autopilotInteractions.length;
      aiSuccessRate = 97.8;
      aiAutopilotActive = contacts.filter(c => c.aiAutopilot).length;
    }

    return {
      scheduled,
      walkins,
      total,
      badge,
      badgeColor,
      utilization,
      slotSubtext,
      pendingCount,
      pendingSubtext,
      revenue,
      revSubtext,
      newLeadsCount,
      newLeadsSubtext,
      aiRepliesCount,
      aiSuccessRate,
      aiAutopilotActive
    };
  }, [kpiTimeframe, appointmentsByDate, selectedDate, slotUtilizationRate, emptySlotsCount, expectedDailyRevenue, contacts, interactions]);

  // Customizable presets list
  const kpiPresets = [
    {
      id: 'appointments_today',
      title: kpiTimeframe === 'today' ? "Today's Appointments" : kpiTimeframe === 'weekly' ? "Weekly Appointments" : "Lifetime Appointments",
      description: "Total count of scheduled bookings and unregistered walk-in visits for the selected period.",
      badge: kpiCalculations.badge,
      badgeColor: kpiCalculations.badgeColor,
      bgAccent: "bg-teal-500/5",
      icon: 'activity',
      iconColor: 'text-teal-500',
      render: () => (
        <div>
          <div className="text-2xl font-black text-slate-800 tracking-tight">
            {kpiCalculations.total} <span className="text-xs text-slate-400 font-semibold font-sans">Scheduled / Walks</span>
          </div>
          <p className="text-[10px] text-slate-500 font-bold mt-1.5 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-teal-500 animate-pulse" /> {kpiCalculations.scheduled} Confirmed
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 ml-1" /> {kpiCalculations.walkins} Walk-ins
          </p>
        </div>
      )
    },
    {
      id: 'slot_utilization',
      title: kpiTimeframe === 'today' ? "Slot Utilization" : kpiTimeframe === 'weekly' ? "Weekly Slot Utilization" : "Average Slot Utilization",
      description: "Percentage of total clinic operational time slots currently booked by patients.",
      icon: 'clock',
      iconColor: 'text-sky-500',
      bgAccent: "bg-sky-500/5",
      badge: kpiCalculations.badge,
      badgeColor: kpiCalculations.badgeColor,
      render: () => (
        <div>
          <div className="text-2xl font-black text-slate-800 tracking-tight">
            {kpiCalculations.utilization}%
          </div>
          <p className="text-[10px] text-slate-500 font-bold mt-1.5 flex items-center gap-1">
            <span className="text-sky-600 font-extrabold">{kpiCalculations.slotSubtext}</span>
          </p>
        </div>
      )
    },
    {
      id: 'ai_replies',
      title: "Nestam AI Agent Replies",
      description: "Automated WhatsApp messages sent by Nestam AI with confidence accuracy rate.",
      icon: 'sparkles',
      iconColor: 'text-purple-500',
      bgAccent: "bg-purple-500/5",
      badge: kpiCalculations.badge,
      badgeColor: kpiCalculations.badgeColor,
      render: () => (
        <div>
          <div className="text-2xl font-black text-purple-700 tracking-tight">
            {kpiCalculations.aiRepliesCount} <span className="text-xs text-slate-400 font-semibold font-sans">Replies</span>
          </div>
          <p className="text-[10px] text-slate-500 font-bold mt-1.5 flex items-center gap-1 flex-wrap">
            <span className="inline-block w-2 h-2 rounded-full bg-purple-500 animate-pulse" /> {kpiCalculations.aiSuccessRate}% Accuracy
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 ml-1" /> {kpiCalculations.aiAutopilotActive} On Autopilot
          </p>
        </div>
      )
    },
    {
      id: 'pending_consent',
      title: kpiTimeframe === 'today' ? "Pending Decision" : kpiTimeframe === 'weekly' ? "Weekly Pending Cases" : "All Pending Cases",
      description: "Inquiries and patients awaiting first consultation confirmation or treatment decision.",
      icon: 'alert-triangle',
      iconColor: 'text-rose-500',
      bgAccent: "bg-rose-500/5",
      badge: kpiCalculations.badge,
      badgeColor: kpiCalculations.badgeColor,
      render: () => (
        <div>
          <div className="text-2xl font-black text-rose-600 tracking-tight">
            {kpiCalculations.pendingCount} {term.patientsLabel}
          </div>
          <p className="text-[10px] text-slate-500 font-bold mt-1.5">
            {kpiCalculations.pendingSubtext}
          </p>
        </div>
      )
    },
    {
      id: 'expected_revenue',
      title: kpiTimeframe === 'today' ? "Expected Daily Revenue" : kpiTimeframe === 'weekly' ? "Expected Weekly Revenue" : "Expected Lifetime Revenue",
      description: "Estimated treatment revenue based on scheduled procedures and projected walk-in estimates.",
      icon: 'rupee',
      iconColor: 'text-emerald-600',
      bgAccent: "bg-emerald-500/5",
      badge: kpiCalculations.badge,
      badgeColor: kpiCalculations.badgeColor,
      render: () => (
        <div>
          <div className="text-2xl font-black text-emerald-700 tracking-tight">
            ₹{kpiCalculations.revenue.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-slate-500 font-bold mt-1.5">
            {kpiCalculations.revSubtext}
          </p>
        </div>
      )
    },
    {
      id: 'payment_collections',
      title: "Realized Cashflow (Owner KPI)",
      description: "Realized money collected vs total billed treatments and remaining outstanding dues.",
      icon: 'coins',
      iconColor: 'text-emerald-600',
      bgAccent: "bg-emerald-500/5",
      badge: `${paymentMetrics.collectionEfficiency}% Collected`,
      badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
      render: () => (
        <div>
          <div className="text-2xl font-black text-emerald-800 tracking-tight font-mono">
            ₹{paymentMetrics.totalCollected.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-slate-500 font-bold mt-1.5 flex items-center justify-between">
            <span className="text-emerald-700 font-extrabold">{paymentMetrics.collectionEfficiency}% Efficiency</span>
            <span className="text-slate-400">Due: ₹{paymentMetrics.outstandingDues.toLocaleString('en-IN')}</span>
          </p>
        </div>
      )
    },
    {
      id: 'payment_mode_mix',
      title: "Payment Channels Mix",
      description: "Revenue collection share across UPI, Credit/Debit cards, and Cash payment channels.",
      icon: 'credit-card',
      iconColor: 'text-sky-600',
      bgAccent: "bg-sky-500/5",
      badge: `${paymentMetrics.digitalShare}% Digital`,
      badgeColor: "bg-sky-50 text-sky-800 border-sky-200",
      render: () => (
        <div>
          <div className="text-xl font-black text-slate-800 tracking-tight flex items-baseline gap-1">
            <span className="text-emerald-600 text-2xl font-mono font-extrabold">{paymentMetrics.digitalShare}%</span>
            <span className="text-xs text-slate-500 font-semibold font-sans">UPI + Card</span>
          </div>
          <p className="text-[10px] text-slate-500 font-bold mt-1.5 truncate">
            📱 UPI ₹{paymentMetrics.upiCollected.toLocaleString('en-IN')} • 💳 Card ₹{paymentMetrics.cardCollected.toLocaleString('en-IN')} • 💵 Cash ₹{paymentMetrics.cashCollected.toLocaleString('en-IN')}
          </p>
        </div>
      )
    },
    {
      id: 'new_leads',
      title: kpiTimeframe === 'today' ? "New Lead Registrations" : kpiTimeframe === 'weekly' ? "Weekly Lead Registrations" : "Total Lead Base",
      description: "Newly captured patient inquiries and lead contacts added into the workspace.",
      icon: 'users',
      iconColor: 'text-indigo-500',
      bgAccent: "bg-indigo-500/5",
      badge: kpiCalculations.badge,
      badgeColor: kpiCalculations.badgeColor,
      render: () => (
        <div>
          <div className="text-2xl font-black text-indigo-700 tracking-tight">
            {kpiCalculations.newLeadsCount} Leads
          </div>
          <p className="text-[10px] text-slate-500 font-bold mt-1.5">
            {kpiCalculations.newLeadsSubtext}
          </p>
        </div>
      )
    },
    {
      id: 'active_recall',
      title: "Recall Campaign Targets",
      description: "Patients due for routine hygiene recall and periodic dental cleaning check-ups.",
      icon: 'phone',
      iconColor: 'text-amber-500',
      bgAccent: "bg-amber-500/5",
      render: () => (
        <div>
          <div className="text-2xl font-black text-amber-700 tracking-tight">
            {contacts.filter(c => c.category === 'Inactive').length} Patients
          </div>
          <p className="text-[10px] text-slate-500 font-bold mt-1.5">
            Recall targets due for periodic dental cleaning check-up.
          </p>
        </div>
      )
    },
    {
      id: 'active_journeys',
      title: "Active WhatsApp Journeys",
      description: "Automated feedback, recall, and check-up WhatsApp message workflows currently active.",
      icon: 'message-square',
      iconColor: 'text-blue-500',
      bgAccent: "bg-blue-500/5",
      render: () => (
        <div>
          <div className="text-2xl font-black text-blue-700 tracking-tight">
            3 Workflows
          </div>
          <p className="text-[10px] text-slate-500 font-bold mt-1.5">
            Automated feedback, recall and check-up sequences active.
          </p>
        </div>
      )
    },
    {
      id: 'google_seo',
      title: "Google Map SEO Score",
      description: "Health and ranking optimization score for Google Local Search map pack results.",
      icon: 'sparkles',
      iconColor: 'text-purple-500',
      bgAccent: "bg-purple-500/5",
      render: () => (
        <div>
          <div className="text-2xl font-black text-purple-700 tracking-tight">
            88 / 100
          </div>
          <p className="text-[10px] text-slate-500 font-bold mt-1.5">
            Excellent optimization status for Local Search pack.
          </p>
        </div>
      )
    }
  ];

  // Booking handlers dispatch to the same ledger used by the scheduler and KPIs.
  const handleBookSlot = async (time: string, contactId: string) => {
    const patient = contacts.find(contact => contact.id === contactId);
    if (!patient || !onAddAppointment) return;
    await onAddAppointment({
      docId: '',
      doctorName: 'Assigned Specialist',
      patientId: patient.id,
      patientName: patient.name,
      patientPhone: patient.phone,
      treatment: patient.treatmentType || 'Consultation',
      time: `${time} - ${time.replace('00', '45')}`,
      date: selectedDate,
      status: 'Confirmed',
      type: 'confirmed'
    });
    setBookingSuccessMsg(`Successfully scheduled ${patient.name} for ${time}!`);
    setTimeout(() => setBookingSuccessMsg(null), 3000);
    setActiveBookingTime(null);
    setBookingSearch('');
  };

  const handleCancelBooking = (time: string) => {
    const patientId = appointmentsByDate[selectedDate]?.[time];
    const appointment = appointments.find(item => item.date === selectedDate
      && item.time.split(' - ')[0].trim() === time
      && (item.patientId === patientId || !patientId));
    if (appointment && onDeleteAppointment) {
      onDeleteAppointment(appointment.id);
      setBookingSuccessMsg(`Appointment at ${time} cancelled.`);
      setTimeout(() => setBookingSuccessMsg(null), 3000);
    }
  };

  const handleImmediateBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const patient = contacts.find(contact => contact.id === immediateContactId);
    if (!patient || !immediateDate || !immediateTime || !onAddAppointment) return;

    await onAddAppointment({
      docId: '',
      doctorName: 'Assigned Specialist',
      patientId: patient.id,
      patientName: patient.name,
      patientPhone: patient.phone,
      treatment: immediateTreatment || patient.treatmentType || 'Consultation',
      time: `${immediateTime} - ${immediateTime.replace('00', '45')}`,
      date: immediateDate,
      status: 'Confirmed',
      type: 'confirmed',
      notes: immediateNotes.trim()
    });

    setBookingSuccessMsg(`Successfully scheduled immediate appointment for ${patient.name}!`);
    setTimeout(() => setBookingSuccessMsg(null), 3500);
    setIsImmediateBookingOpen(false);
  };

  // --- MONTH CALENDAR GRID RENDER HELPERS ---
  const year = currentMonth.getFullYear();
  const monthIdx = currentMonth.getMonth();
  const firstDayOfWeekIndex = new Date(year, monthIdx, 1).getDay(); // 0-6
  const totalDaysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, monthIdx - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, monthIdx + 1, 1));
  };

  const formatMonthYear = currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Generate days array
  const calendarDays = [];
  // preceding empty pads
  for (let i = 0; i < firstDayOfWeekIndex; i++) {
    calendarDays.push(null);
  }
  // days of the month
  for (let i = 1; i <= totalDaysInMonth; i++) {
    calendarDays.push(i);
  }

  return (
    <div className="space-y-6" id="practice-dashboard-stats">
      
      {/* 1. Clean Header & Primary Actions matching Patients section style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-3xs">
        <div>
          <h1 className="text-xl font-black font-display text-slate-900 tracking-tight flex items-center gap-2">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Good morning, {senderName || 'Doctor / Staff'}! Here's what's happening at {businessName || 'your clinic workspace'} today.
          </p>
        </div>

        {/* Quick Actions Section */}
        <div className="flex items-center gap-2 flex-wrap bg-slate-50/80 p-1.5 rounded-2xl border border-slate-200/80">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2 hidden sm:inline">
            Quick Actions
          </span>

          <button
            onClick={() => setIsImmediateBookingOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-xs rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
            title="Book an immediate appointment slot"
          >
            <Plus className="h-3.5 w-3.5 text-teal-600" />
            <span>Book Appointment</span>
          </button>

          <button
            onClick={() => onNavigateToTab?.('contacts')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-xs rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
            title="Register a new patient or lead contact"
          >
            <UserPlus className="h-3.5 w-3.5 text-indigo-600" />
            <span>Add Patient</span>
          </button>
        </div>
      </div>

      {/* Dynamic Success Alert Banner */}
      <AnimatePresence>
        {bookingSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-600 text-white px-4.5 py-3.5 rounded-2xl text-xs font-bold shadow-lg flex items-center justify-between border border-emerald-500"
          >
            <div className="flex items-center gap-2.5">
              <Check className="h-4 w-4 bg-white text-emerald-600 rounded-full p-0.5 shrink-0" />
              <span>{bookingSuccessMsg}</span>
            </div>
            <button onClick={() => setBookingSuccessMsg(null)} className="text-white hover:text-emerald-100 font-bold p-1">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. THE DOCTOR'S PULSE (Top Row Metrics - Single Unified Customizable KPI Cards) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 flex-wrap">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" /> Clinic KPI Insights
            </span>
            {/* Timeframe Segmented Control - Linear Style */}
            <div className="bg-slate-100 p-1 rounded-xl border border-slate-200/80 inline-flex items-center shadow-inner">
              {(['today', 'weekly', 'monthly', 'ltd'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setKpiTimeframe(t)}
                  className={`px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    kpiTimeframe === t
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60 font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t === 'ltd' ? 'LTD' : t}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => setIsCustomizeKpiOpen(!isCustomizeKpiOpen)}
            className="flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-950 bg-teal-50/80 hover:bg-teal-100/80 border border-teal-200/80 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-3xs self-start sm:self-auto"
          >
            <Settings className="h-3.5 w-3.5 text-teal-600" />
            {isCustomizeKpiOpen ? "Close Customizer" : "Customize KPI Cards"}
          </button>
        </div>

        {/* Customization Drawer Panel */}
        <AnimatePresence>
          {isCustomizeKpiOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden bg-slate-50/80 border border-slate-200 p-5 rounded-2xl shadow-inner space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                <div>
                  <h4 className="text-xs font-black text-slate-800">Configure Dashboard KPIs</h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Toggle metric indicators to match your current clinic focus. Changes persist automatically.</p>
                </div>
                <button
                  onClick={() => setVisibleCardIds(['appointments_today', 'expected_revenue', 'payment_collections', 'slot_utilization', 'ai_replies'])}
                  className="text-[10px] font-extrabold text-slate-500 hover:text-teal-600 transition-colors underline self-start sm:self-auto"
                >
                  Reset to Default Board
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {kpiPresets.map((preset) => {
                  const isVisible = visibleCardIds.includes(preset.id);
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        if (isVisible) {
                          if (visibleCardIds.length > 1) {
                            setVisibleCardIds(visibleCardIds.filter(id => id !== preset.id));
                          }
                        } else {
                          setVisibleCardIds([...visibleCardIds, preset.id]);
                        }
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        isVisible
                          ? 'bg-white border-teal-500 shadow-sm ring-2 ring-teal-500/10'
                          : 'bg-white/60 border-slate-200 text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="shrink-0">{renderIcon(preset.icon, isVisible ? preset.iconColor : 'text-slate-300')}</div>
                        <span className="text-[11px] font-bold truncate text-slate-800">{preset.title}</span>
                      </div>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border text-[9px] font-black ${
                        isVisible ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300 text-transparent'
                      }`}>
                        ✓
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The active KPI Cards grid with motion animations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {kpiPresets
            .filter(preset => visibleCardIds.includes(preset.id))
            .map((preset, index) => {
              const isTooltipActive = activeTooltipId === preset.id;
              return (
                <motion.div
                  key={preset.id}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2 }}
                  className={`bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between min-h-[140px] relative group cursor-pointer ${
                    isTooltipActive ? 'z-40' : 'z-10'
                  }`}
                >
                  <div className={`absolute right-0 top-0 h-20 w-20 ${preset.bgAccent || 'bg-slate-500/5'} rounded-bl-full pointer-events-none rounded-tr-2xl overflow-hidden transition-all group-hover:scale-110`} />
                  
                  {/* Card Header with info tooltip & close action */}
                  <div className="flex justify-between items-start z-10 gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-800 leading-snug">
                        {preset.title}
                      </span>
                      {preset.description && (
                        <div className="relative shrink-0 inline-flex items-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTooltipId(isTooltipActive ? null : preset.id);
                            }}
                            onMouseEnter={() => setActiveTooltipId(preset.id)}
                            onMouseLeave={() => setActiveTooltipId(null)}
                            className="text-slate-400 hover:text-teal-600 transition-colors cursor-pointer p-0.5 rounded-full hover:bg-slate-100 flex items-center justify-center focus:outline-none"
                            title="Metric Info"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>

                          {isTooltipActive && (
                            <div 
                              className={`absolute top-full mt-2 z-50 w-60 p-3.5 bg-slate-900 text-white text-[11px] font-medium leading-relaxed rounded-xl shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto ${
                                index >= 3 ? 'right-0' : 'left-0'
                              }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="font-bold text-[10px] text-teal-400 mb-1 uppercase tracking-wider">
                                {preset.title}
                              </div>
                              <p className="text-slate-200 text-[11px] leading-relaxed">
                                {preset.description}
                              </p>
                              <div className={`absolute -top-1 w-2 h-2 bg-slate-900 border-t border-l border-slate-700 rotate-45 ${
                                index >= 3 ? 'right-3' : 'left-2.5'
                              }`} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (visibleCardIds.length > 1) {
                            setVisibleCardIds(visibleCardIds.filter(id => id !== preset.id));
                          }
                        }}
                        className="text-slate-300 hover:text-slate-600 transition-colors cursor-pointer p-1 rounded-md hover:bg-slate-100"
                        title="Hide KPI card"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="z-10 mt-auto pt-2.5">
                    {preset.render()}
                  </div>
                </motion.div>
              );
            })}
        </div>
      </div>

      {/* MAIN 2-COLUMN LAYOUT: LEFT SIDEBAR FOR QUICK ACTIONS & LIVE OPERATIONS, RIGHT PANEL FOR SCHEDULER & ANALYTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        
        {/* RIGHT SIDEBAR PANEL (4 cols out of 12) - QUICK ACTIONS, LIVE OPERATIONS & STATUS */}
        <div className="lg:col-span-4 order-2 space-y-6">
          
          {/* Quick Actions Grid */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-3xs space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5 text-teal-600" />
                Quick Actions
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => onNavigateToTab && onNavigateToTab('appointments')}
                className="p-2.5 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
              >
                <Calendar className="h-4 w-4 text-teal-600 mb-1" />
                <span className="text-[9.5px] font-bold text-slate-800 leading-tight">Book Appt</span>
              </button>

              <button 
                onClick={() => onNavigateToTab && onNavigateToTab('contacts')}
                className="p-2.5 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
              >
                <UserPlus className="h-4 w-4 text-indigo-600 mb-1" />
                <span className="text-[9.5px] font-bold text-slate-800 leading-tight">Add Walk-in</span>
              </button>

              <button 
                onClick={() => onNavigateToTab && onNavigateToTab('contacts')}
                className="p-2.5 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
              >
                <Building className="h-4 w-4 text-emerald-600 mb-1" />
                <span className="text-[9.5px] font-bold text-slate-800 leading-tight">Create Invoice</span>
              </button>

              <button 
                onClick={() => onNavigateToTab && onNavigateToTab('whatsapp_hub')}
                className="p-2.5 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
              >
                <MessageSquare className="h-4 w-4 text-teal-600 mb-1" />
                <span className="text-[9.5px] font-bold text-slate-800 leading-tight">Send WhatsApp</span>
              </button>

              <button 
                onClick={() => onNavigateToTab && onNavigateToTab('contacts')}
                className="p-2.5 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
              >
                <Check className="h-4 w-4 text-sky-600 mb-1" />
                <span className="text-[9.5px] font-bold text-slate-800 leading-tight">Check-in</span>
              </button>

              <button 
                onClick={() => onNavigateToTab && onNavigateToTab('reports')}
                className="p-2.5 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
              >
                <Activity className="h-4 w-4 text-purple-600 mb-1" />
                <span className="text-[9.5px] font-bold text-slate-800 leading-tight">View Reports</span>
              </button>
            </div>
          </div>

          {/* Live Operations Board */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4" id="live-operations-board">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Operations Board
              </h2>
              <span className="text-[10px] font-mono text-slate-400 font-bold">Real-time</span>
            </div>

            <div className="space-y-4">
              {/* Waiting Patients */}
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 space-y-2.5">
                <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                  <span className="text-rose-700 font-extrabold flex items-center gap-1">
                    <span>Waiting</span>
                    <span className="bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded text-[10px]">(5)</span>
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1 shadow-2xs">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>Ravi Kumar</span>
                      <span className="text-[10px] font-mono text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded">12 mins</span>
                    </div>
                    <div className="text-[10px] text-slate-500">Root Canal Treatment</div>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1 shadow-2xs">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>Priya Sharma</span>
                      <span className="text-[10px] font-mono text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded">8 mins</span>
                    </div>
                    <div className="text-[10px] text-slate-500">Tooth Filling</div>
                  </div>

                  <button 
                    onClick={() => onNavigateToTab && onNavigateToTab('contacts')}
                    className="w-full text-center py-1 text-[11px] font-extrabold text-teal-700 hover:text-teal-900 cursor-pointer"
                  >
                    +3 more in queue
                  </button>
                </div>
              </div>

              {/* In Treatment */}
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 space-y-2.5">
                <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                  <span className="text-teal-700 font-extrabold flex items-center gap-1">
                    <span>In Treatment</span>
                    <span className="bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded text-[10px]">(3)</span>
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1 shadow-2xs">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>Dr. Sai Krishna</span>
                      <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded">25 mins left</span>
                    </div>
                    <div className="text-[10px] text-slate-500">Chair 1 • Root Canal</div>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1 shadow-2xs">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>Dr. Anitha Reddy</span>
                      <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded">40 mins left</span>
                    </div>
                    <div className="text-[10px] text-slate-500">Chair 2 • Implant</div>
                  </div>
                </div>
              </div>

              {/* Next Up */}
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 space-y-2.5">
                <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                  <span className="text-indigo-700 font-extrabold flex items-center gap-1">
                    <span>Next Up</span>
                    <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded text-[10px]">(4)</span>
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1 shadow-2xs">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span className="font-mono text-indigo-600">10:30 AM</span>
                      <span className="font-semibold text-slate-800">Mohan Raj</span>
                    </div>
                    <div className="text-[10px] text-slate-500">Dr. Sai Krishna • Cleaning</div>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1 shadow-2xs">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span className="font-mono text-indigo-600">10:45 AM</span>
                      <span className="font-semibold text-slate-800">Laxmi Devi</span>
                    </div>
                    <div className="text-[10px] text-slate-500">Dr. Anitha Reddy • Filling</div>
                  </div>
                </div>
              </div>

              {/* Revenue Pulse Gauge */}
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 space-y-2 flex flex-col justify-between">
                <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                  <span className="font-extrabold text-slate-900">Daily Revenue Pulse</span>
                  <span className="text-[9px] font-mono text-slate-400">Target ₹38,450</span>
                </div>

                <div className="flex items-center gap-3 py-1">
                  <div className="w-16 h-16 rounded-full border-4 border-teal-500 border-t-slate-200 flex items-center justify-center font-black text-slate-900 text-sm shrink-0">
                    82%
                  </div>
                  <div className="space-y-0.5 text-[10px] text-slate-600 font-semibold">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">Collected:</span>
                      <span className="font-mono font-bold text-emerald-700">₹31,600</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">Pending:</span>
                      <span className="font-mono font-bold text-amber-600">₹6,850</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Doctor Availability */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-3xs space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-teal-600" />
                Doctor Duty Status
              </h3>
            </div>

            <div className="space-y-2.5 text-xs font-semibold text-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-[10px]">DS</div>
                  <span className="font-bold text-slate-900">Dr. Sai Krishna</span>
                </div>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Available</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[10px]">DA</div>
                  <span className="font-bold text-slate-900">Dr. Anitha Reddy</span>
                </div>
                <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Busy</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center text-[10px]">DP</div>
                  <span className="font-bold text-slate-900">Dr. Praveen</span>
                </div>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Available</span>
              </div>
            </div>

            <button 
              onClick={() => onNavigateToTab && onNavigateToTab('doctors')}
              className="text-[10px] font-extrabold text-teal-700 hover:text-teal-900 block w-full text-right cursor-pointer pt-1"
            >
              View Full Schedule →
            </button>
          </div>

          {/* Live Activity Feed */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-3xs space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-emerald-600" />
                Live Activity
              </h3>
            </div>

            <div className="space-y-2 text-[10.5px] font-medium text-slate-700">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Payment received from Ravi Kumar</span>
                  <span className="text-[9.5px] text-emerald-700 font-bold font-mono">₹2,500</span>
                </div>
                <span className="text-[9px] font-mono text-slate-400">10:15 AM</span>
              </div>

              <div className="flex items-start justify-between border-t border-slate-100 pt-1.5">
                <div>
                  <span className="font-bold text-slate-900 block">Appointment booked for Priya Sharma</span>
                  <span className="text-[9.5px] text-slate-500">Tooth Filling</span>
                </div>
                <span className="text-[9px] font-mono text-slate-400">09:30 AM</span>
              </div>

              <div className="flex items-start justify-between border-t border-slate-100 pt-1.5">
                <div>
                  <span className="font-bold text-slate-900 block">Treatment completed for Arun Reddy</span>
                  <span className="text-[9.5px] text-slate-500">Teeth Cleaning</span>
                </div>
                <span className="text-[9px] font-mono text-slate-400">09:15 AM</span>
              </div>

              <div className="flex items-start justify-between border-t border-slate-100 pt-1.5">
                <div>
                  <span className="font-bold text-slate-900 block">WhatsApp sent to 12 patients</span>
                  <span className="text-[9.5px] text-slate-500">Follow-up Reminder</span>
                </div>
                <span className="text-[9px] font-mono text-slate-400">08:45 AM</span>
              </div>
            </div>

            <button 
              onClick={() => onNavigateToTab && onNavigateToTab('reports')}
              className="text-[10px] font-extrabold text-teal-700 hover:text-teal-900 block w-full text-right cursor-pointer pt-1"
            >
              View All Activity →
            </button>
          </div>



        </div>

        {/* LEFT MAIN PANEL (8 cols out of 12) - SCHEDULER & VISUAL ANALYTICS */}
        <div className="lg:col-span-8 order-1 space-y-6 w-full">

        {/* CLINICAL CALENDAR VIEW - Full Width of Right Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all space-y-5">
          
          {/* Header with Timing Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-teal-600" />
                Workflow Scheduler & Operations Grid
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Click any day on the left panel to display and manage slots right beside it.</p>
            </div>
            
            {/* Hour presets select dropdown */}
            <div className="flex items-center gap-2 sm:ml-auto">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0">Working Hours:</span>
              <div className="flex items-center gap-1.5">
                <select
                  value={timingPreset}
                  onChange={(e) => setTimingPreset(e.target.value)}
                  className="text-xs font-bold bg-slate-50 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer shadow-3xs"
                >
                  <option value="standard">Standard (9:00 AM - 6:00 PM)</option>
                  <option value="evening">Evening (6:00 PM - 8:30 PM)</option>
                  {savedCustomPresets.map((p) => (
                    <option key={p.id} value={`preset-${p.id}`}>{p.name} ({p.startTime} - {p.endTime})</option>
                  ))}
                  <option value="custom">Custom Timing Hours...</option>
                </select>

                {timingPreset.startsWith('preset-') && (
                  <button
                    onClick={() => {
                      const presetId = timingPreset.replace('preset-', '');
                      setSavedCustomPresets(prev => prev.filter(p => p.id !== presetId));
                      setTimingPreset('standard');
                    }}
                    className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-xl border border-rose-200 transition-all cursor-pointer shadow-3xs flex items-center justify-center shrink-0"
                    title="Delete Selected Custom Preset"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Custom timing hours dropdown selectors if "custom" is selected */}
          {timingPreset === 'custom' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3 text-xs font-semibold text-slate-700"
            >
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span>Start Shift:</span>
                  <select
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    className="bg-white border border-slate-250 p-1.5 rounded-lg text-[11px] font-bold"
                  >
                    <option value="08:00 AM">08:00 AM</option>
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="01:00 PM">01:00 PM</option>
                    <option value="04:00 PM">04:00 PM</option>
                    <option value="05:00 PM">05:00 PM</option>
                    <option value="06:00 PM">06:00 PM</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span>End Shift:</span>
                  <select
                    value={customEndTime}
                    onChange={(e) => setCustomEndTime(e.target.value)}
                    className="bg-white border border-slate-250 p-1.5 rounded-lg text-[11px] font-bold"
                  >
                    <option value="01:00 PM">01:00 PM</option>
                    <option value="05:00 PM">05:00 PM</option>
                    <option value="06:00 PM">06:00 PM</option>
                    <option value="07:00 PM">07:00 PM</option>
                    <option value="08:00 PM">08:00 PM</option>
                    <option value="08:30 PM">08:30 PM</option>
                    <option value="09:00 PM">09:00 PM</option>
                    <option value="10:00 PM">10:00 PM</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2.5 border-t border-slate-200/60">
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-[10px] uppercase font-black text-slate-400 shrink-0">Save as Custom Preset:</span>
                  <input
                    type="text"
                    placeholder="Preset Name (e.g., Weekend Special)"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold focus:outline-none focus:border-teal-500 transition-all placeholder:text-slate-350"
                  />
                </div>
                <button
                  onClick={handleSavePreset}
                  disabled={!newPresetName.trim()}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-extrabold rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-3xs shrink-0"
                >
                  <Plus className="h-3 w-3" /> Save Preset
                </button>
              </div>
            </motion.div>
          )}

          {/* TWO-COLUMN CALENDAR AND HOURLY BLOCKS */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
            
            {/* COLUMN 1: MONTH CALENDAR GRID VIEW (40% width / 5 cols) */}
            <div className="md:col-span-5 border border-slate-200/80 rounded-2xl p-4 bg-slate-50/60 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <button
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-slate-200/70 rounded-lg text-slate-600 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider font-mono">{formatMonthYear}</span>
                <button
                  onClick={handleNextMonth}
                  className="p-1 hover:bg-slate-200/70 rounded-lg text-slate-600 transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Active Days Filter - Flexible option for Weekdays vs Weekends selection */}
              <div className="bg-white p-1 rounded-xl border border-slate-200/80 grid grid-cols-3 text-center shadow-3xs" id="operational-days-picker">
                {(['all', 'weekdays', 'weekends'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setOperationalDays(mode)}
                    className={`py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      operationalDays === mode
                        ? 'bg-slate-900 text-white shadow-3xs'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    {mode === 'all' ? 'All Days' : mode === 'weekdays' ? 'Weekdays' : 'Weekends'}
                  </button>
                ))}
              </div>

              {/* Weekdays names row */}
              <div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <span>Su</span>
                <span>Mo</span>
                <span>Tu</span>
                <span>We</span>
                <span>Th</span>
                <span>Fr</span>
                <span>Sa</span>
              </div>

              {/* Monthly calendar days grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} />;
                  }

                  const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSelected = selectedDate === dateStr;
                  const hasAppointments = appointmentsByDate[dateStr] && Object.keys(appointmentsByDate[dateStr]).length > 0;

                  // Determine if this day is disabled based on operationalDays filter
                  const dateObj = new Date(year, monthIdx, day);
                  const dayOfWeek = dateObj.getDay(); // 0 is Sunday, 6 is Saturday
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  const isDisabledDay = (operationalDays === 'weekdays' && isWeekend) || 
                                       (operationalDays === 'weekends' && !isWeekend);

                  return (
                    <button
                      key={`day-${day}`}
                      onClick={() => {
                        if (!isDisabledDay) {
                          setSelectedDate(dateStr);
                        }
                      }}
                      disabled={isDisabledDay}
                      className={`h-9 rounded-xl flex flex-col items-center justify-center relative font-sans text-xs transition-all ${
                        isDisabledDay
                          ? 'bg-slate-100 text-slate-350 border border-slate-200/40 cursor-not-allowed opacity-50'
                          : isSelected
                          ? 'bg-slate-900 text-white font-extrabold shadow-md cursor-pointer scale-105 z-10'
                          : 'bg-white hover:bg-slate-100/80 text-slate-800 border border-slate-200/60 cursor-pointer'
                      }`}
                      title={isDisabledDay ? 'Closed (Filter Active)' : undefined}
                    >
                      <span className={isDisabledDay ? 'line-through text-slate-300' : ''}>{day}</span>
                      {hasAppointments && !isDisabledDay && (
                        <span className={`w-1.5 h-1.5 rounded-full absolute bottom-1 ${isSelected ? 'bg-emerald-400 ring-2 ring-emerald-400/30' : 'bg-emerald-500'}`} />
                      )}
                      {isDisabledDay && (
                        <span className="text-[7px] font-black uppercase text-slate-400 scale-75 mt-0.5">Off</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 text-[10px] text-slate-500 leading-relaxed font-semibold border-t border-slate-200/60 flex items-center gap-1.5 justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
                  <span>Days with scheduled patients marked green.</span>
                </div>
                {operationalDays !== 'all' && (
                  <span className="text-slate-400 text-[9px] font-bold">({operationalDays} active)</span>
                )}
              </div>
            </div>

            {/* COLUMN 2: APPOINTMENT TIME SLOTS (60% width / 7 cols) */}
            <div className="md:col-span-7 space-y-3.5">
              
              {/* Active selected date heading with dynamic timing selector info and master triggers */}
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 gap-2 flex-wrap">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Clock className="h-3.5 w-3.5 text-teal-600" />
                  {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const nextExpanded: { [hour: string]: boolean } = {};
                      uniqueHours.forEach(h => {
                        nextExpanded[h] = true;
                      });
                      setExpandedHours(nextExpanded);
                    }}
                    className="text-[10px] font-extrabold uppercase text-teal-600 hover:text-teal-700 hover:underline transition-all cursor-pointer"
                  >
                    Expand All
                  </button>
                  <span className="text-slate-300 text-[10px] select-none">|</span>
                  <button
                    onClick={() => {
                      const nextExpanded: { [hour: string]: boolean } = {};
                      uniqueHours.forEach(h => {
                        nextExpanded[h] = false;
                      });
                      setExpandedHours(nextExpanded);
                    }}
                    className="text-[10px] font-extrabold uppercase text-slate-400 hover:text-slate-600 hover:underline transition-all cursor-pointer"
                  >
                    Collapse All
                  </button>
                </div>
              </div>

              {/* Loop over generated hours */}
              <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1 scrollbar-none pb-4">
                {uniqueHours.map((hour) => {
                  const slotsInHour = groupedSlots[hour] || [];
                  const expanded = isHourExpanded(hour, slotsInHour);
                  
                  // Count booked slots in this hour
                  const bookedSlots = slotsInHour.filter(slot => !!getContactForSlot(selectedDate, slot));
                  const bookedCount = bookedSlots.length;
                  const totalCount = slotsInHour.length;

                  return (
                    <div key={hour} className="border border-slate-200/80 rounded-2xl bg-white shadow-3xs overflow-hidden transition-all duration-200">
                      {/* Hour Header */}
                      <button
                        onClick={() => {
                          setExpandedHours(prev => ({
                            ...prev,
                            [hour]: !expanded
                          }));
                        }}
                        className={`w-full flex items-center justify-between p-3 text-left transition-all cursor-pointer ${
                          expanded 
                            ? 'bg-slate-50/80 border-b border-slate-100' 
                            : 'bg-white hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Chevron Icon */}
                          <svg
                            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                              expanded ? 'rotate-90 text-teal-600' : 'rotate-0'
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                          
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span className="text-xs font-black text-slate-800 tracking-tight">{hour} Block</span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-1.5">
                          {bookedCount > 0 ? (
                            <span className="px-2.5 py-0.5 text-[9px] font-black rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex items-center gap-1 leading-none shadow-3xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {bookedCount} / {totalCount} Booked
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[8.5px] font-extrabold rounded-lg bg-slate-50 text-slate-400 border border-slate-200/60 leading-none">
                              {totalCount} Free
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Hour Slots Container (Only if expanded) */}
                      <AnimatePresence initial={false}>
                        {expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="p-3 bg-white space-y-2.5"
                          >
                            {slotsInHour.map((time, idx) => {
                              const patient = getContactForSlot(selectedDate, time);
                              const isBookingThisSlot = activeBookingTime === time;

                              return (
                                <div key={idx} className="flex gap-2.5 items-start pl-1">
                                  {/* Precise 15-min offset time */}
                                  <div className="w-12 pt-3 text-right text-[9.5px] font-black text-slate-400 select-none shrink-0 font-mono">
                                    {time.split(' ')[0]}
                                  </div>

                                  <div className="flex-1">
                                    {patient ? (
                                      <div className="p-3.5 bg-white border border-slate-200 hover:border-teal-400/80 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-3xs hover:shadow-xs">
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-extrabold text-slate-900">{patient.name}</span>
                                            <span className={`px-2 py-0.25 text-[8.5px] font-black rounded-md ${
                                              patient.pipelineStage === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-teal-50 text-teal-800 border border-teal-200/60'
                                            }`}>
                                              {patient.pipelineStage || 'Scheduled'}
                                            </span>
                                          </div>
                                          <p className="text-[10px] font-bold text-teal-700">
                                            {term.treatmentLabel}: {patient.treatmentType || 'General Consultation'} ({patient.treatmentValue ? `₹${patient.treatmentValue.toLocaleString('en-IN')}` : '₹0'})
                                          </p>
                                          {patient.notes && (
                                            <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic line-clamp-1">
                                              "{patient.notes}"
                                            </p>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                          {onSelectContactAndChat && (
                                            <button
                                              onClick={() => onSelectContactAndChat(patient.phone)}
                                              className="text-[10px] font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                              title="View chat history"
                                            >
                                              Chat
                                            </button>
                                          )}
                                          {onSelectContactAndChat && (
                                            <button
                                              onClick={() => {
                                                const formattedName = patient.name.includes('garu') ? patient.name : `${patient.name} garu`;
                                                const draftMsg = `Namaste ${formattedName}! This is a friendly reminder from ${businessName || 'Sri Sai Dental Clinic'} regarding your scheduled ${patient.treatmentType || 'appointment'}. Standard clinic timings: Mon-Sat 9:00 AM - 1:00 PM and 4:00 PM - 8:00 PM. Please message back to confirm! 🦷😊`;
                                                localStorage.setItem(`nestam_pending_draft_${patient.id}`, draftMsg);
                                                onSelectContactAndChat(patient.phone);
                                              }}
                                              className="text-[10px] font-bold bg-teal-600 hover:bg-teal-700 text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-3xs flex items-center gap-1"
                                              title="Go to chat & draft WhatsApp reminder"
                                            >
                                              Remind
                                            </button>
                                          )}
                                          <button
                                            onClick={() => handleCancelBooking(time)}
                                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all border border-slate-200 hover:border-rose-200 cursor-pointer"
                                            title="Cancel appointment block"
                                          >
                                            <X className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div>
                                        {isBookingThisSlot ? (
                                          <div className="p-3.5 bg-teal-50/50 border border-teal-200 rounded-xl space-y-3 animate-fade-in shadow-xs">
                                            <div className="flex justify-between items-center border-b border-teal-200/60 pb-2">
                                              <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider">Book Slot: {time}</span>
                                              <button onClick={() => setActiveBookingTime(null)} className="text-[10px] text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
                                            </div>

                                            {/* Sub-Mode Selector Tabs */}
                                            <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-200/70 rounded-lg">
                                              <button
                                                type="button"
                                                onClick={() => setBookingMode('search')}
                                                className={`py-1 text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                                                  bookingMode === 'search'
                                                    ? 'bg-white text-teal-800 shadow-3xs font-extrabold'
                                                    : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                              >
                                                Search Registered
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setBookingMode('quickAdd')}
                                                className={`py-1 text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                                                  bookingMode === 'quickAdd'
                                                    ? 'bg-white text-teal-800 shadow-3xs font-extrabold'
                                                    : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                              >
                                                + Register & Schedule
                                              </button>
                                            </div>

                                            {bookingMode === 'search' ? (
                                              <div className="space-y-2">
                                                <div className="relative">
                                                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                                  <input
                                                    type="text"
                                                    placeholder="Type patient name or phone..."
                                                    value={bookingSearch}
                                                    onChange={(e) => setBookingSearch(e.target.value)}
                                                    className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                                                  />
                                                </div>
                                                <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
                                                  {contacts
                                                    .filter(c => c.name.toLowerCase().includes(bookingSearch.toLowerCase()) || c.phone.includes(bookingSearch))
                                                    .slice(0, 5)
                                                    .map((pOpt) => (
                                                      <button
                                                        key={pOpt.id}
                                                        onClick={() => {
                                                          handleBookSlot(time, pOpt.id);
                                                          setActiveBookingTime(null);
                                                        }}
                                                        className="w-full text-left p-2 hover:bg-slate-50 transition-colors flex justify-between items-center text-xs text-slate-700 cursor-pointer"
                                                      >
                                                        <div>
                                                          <span className="font-bold block text-slate-800">{pOpt.name}</span>
                                                          <span className="text-[9px] text-slate-400 font-mono">{pOpt.phone}</span>
                                                        </div>
                                                        <span className="text-[10px] font-black text-teal-600">
                                                          ₹{pOpt.treatmentValue || 0}
                                                        </span>
                                                      </button>
                                                    ))}
                                                  {contacts.length === 0 && (
                                                    <p className="p-2 text-center text-xs text-slate-400">No patients found.</p>
                                                  )}
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="space-y-2.5 text-[11px]">
                                                <div className="grid grid-cols-2 gap-2">
                                                  <div>
                                                    <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                                                      Name *
                                                    </label>
                                                    <input
                                                      type="text"
                                                      placeholder="e.g. Ramesh"
                                                      value={quickName}
                                                      onChange={(e) => setQuickName(e.target.value)}
                                                      className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                                                      required
                                                    />
                                                  </div>
                                                  <div>
                                                    <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                                                      WhatsApp Phone *
                                                    </label>
                                                    <input
                                                      type="tel"
                                                      placeholder="+91..."
                                                      value={quickPhone}
                                                      onChange={(e) => setQuickPhone(e.target.value)}
                                                      className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                                                      required
                                                    />
                                                  </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                  <div>
                                                    <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                                                      {term.treatmentLabel}
                                                    </label>
                                                    <input
                                                      type="text"
                                                      placeholder="Type procedure"
                                                      value={quickTreatmentType}
                                                      onChange={(e) => setQuickTreatmentType(e.target.value)}
                                                      className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                                                    />
                                                  </div>
                                                  <div>
                                                    <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                                                      Cost (₹)
                                                    </label>
                                                    <input
                                                      type="number"
                                                      placeholder="Cost in INR"
                                                      value={quickTreatmentValue}
                                                      onChange={(e) => setQuickTreatmentValue(e.target.value)}
                                                      className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                                                    />
                                                  </div>
                                                </div>

                                                <div>
                                                  <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                                                    Notes / Symptoms
                                                  </label>
                                                  <input
                                                    type="text"
                                                    placeholder="Brief clinical notes..."
                                                    value={quickNotes}
                                                    onChange={(e) => setQuickNotes(e.target.value)}
                                                    className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                                                  />
                                                </div>

                                                <button
                                                  type="button"
                                                  onClick={async () => {
                                                    if (!quickName.trim() || !quickPhone.trim()) {
                                                      alert('Name and Phone are required.');
                                                      return;
                                                    }
                                                    let formatted = quickPhone.trim();
                                                    if (!formatted.startsWith('+')) {
                                                      formatted = '+' + formatted.replace(/[^0-9]/g, '');
                                                    }
                                                    
                                                    const newContact: Contact = {
                                                      id: formatted,
                                                      name: quickName.trim(),
                                                      phone: formatted,
                                                      category: 'Lead',
                                                      notes: quickNotes.trim(),
                                                      lastContacted: 'Never',
                                                      createdAt: new Date().toISOString(),
                                                      treatmentType: quickTreatmentType.trim(),
                                                      treatmentValue: Number(quickTreatmentValue) || 0,
                                                      pipelineStage: 'Scheduled',
                                                      source: 'WhatsApp',
                                                      isRepeat: false,
                                                    };

                                                    if (onAddContact) {
                                                      const success = await onAddContact(newContact);
                                                      if (success) {
                                                        handleBookSlot(time, newContact.id);
                                                        setActiveBookingTime(null);
                                                      }
                                                    } else {
                                                      alert('Contact creation handler is missing.');
                                                    }
                                                  }}
                                                  className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-lg text-xs transition-colors cursor-pointer text-center shadow-3xs"
                                                >
                                                  Register & Book Instantly
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="py-2.5 px-3.5 bg-slate-50/70 hover:bg-slate-100/80 border border-dashed border-slate-200/80 rounded-xl flex items-center justify-between text-slate-400 group transition-all">
                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                              Downtime Slot — Available
                                            </span>
                                            <button
                                              onClick={() => setActiveBookingTime(time)}
                                              className="py-1 px-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-extrabold rounded-lg transition-all shadow-3xs cursor-pointer flex items-center gap-1"
                                            >
                                              <Plus className="h-3 w-3 text-teal-600" /> Book
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

            </div>

          </div>

        </div>

        {/* OPERATIONAL HITLIST & REVENUE LEAKS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Operational Hitlist: Pending Inquiries Callbacks */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div>
              <span className="text-[9px] font-black bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md border border-rose-100 uppercase tracking-wider">Hitlist</span>
              <h3 className="text-xs font-black text-slate-900 mt-1 flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-rose-500 animate-pulse" />
                Inbound Callbacks Queue
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Immediate attention required to register incoming leads.</p>
            </div>

            <div className="space-y-3">
              {contacts
                .filter(c => !c.pipelineStage || c.pipelineStage === 'Inquiry')
                .slice(0, 2)
                .map((lead) => (
                  <div key={lead.id} className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-[11px] font-bold text-slate-800">{lead.name}</h4>
                        <p className="text-[9px] text-slate-400 font-mono">{lead.phone}</p>
                      </div>
                      <span className="text-[8px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">PENDING</span>
                    </div>
                    {lead.notes && (
                      <p className="text-[9.5px] text-slate-600 font-medium leading-relaxed italic bg-white p-2 rounded-lg border border-slate-100">
                        "{lead.notes.length > 50 ? lead.notes.substring(0, 50) + '...' : lead.notes}"
                      </p>
                    )}
                    <div className="flex gap-1.5 pt-1">
                      {onSelectContactAndChat && (
                        <button
                          onClick={() => onSelectContactAndChat(lead.phone)}
                          className="flex-1 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[9px] font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          Chat Log
                        </button>
                      )}
                      {onSelectContactAndChat && (
                        <button
                          onClick={() => {
                            const formattedName = lead.name.includes('garu') ? lead.name : `${lead.name} garu`;
                            const draftMsg = `Namaste ${formattedName}! This is a friendly reply from ${businessName || 'Sri Sai Dental Clinic'} regarding your inquiry. Standard clinic timings: Mon-Sat 9:00 AM - 1:00 PM and 4:00 PM - 8:00 PM. How can we help you today? 🦷🏥`;
                            localStorage.setItem(`nestam_pending_draft_${lead.id}`, draftMsg);
                            onSelectContactAndChat(lead.phone);
                          }}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-bold rounded-lg transition-colors cursor-pointer shadow-3xs"
                        >
                          Reply
                        </button>
                      )}
                    </div>
                  </div>
                ))}

              {contacts.filter(c => !c.pipelineStage || c.pipelineStage === 'Inquiry').length === 0 && (
                <div className="py-4 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-[11px] font-bold">
                  🎉 Zero pending inbound inquiries!
                </div>
              )}
            </div>
          </div>

          {/* Revenue Leak Audits / Practice revenue league orders */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div>
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Practice Revenue Leaks
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Checks pointing out missed booking opportunities.</p>
            </div>

            <div className="space-y-3">
              {/* Alert 1 */}
              <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl space-y-1.5">
                <div className="flex justify-between items-start">
                  <span className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">Overdue Recall</span>
                  <span className="text-[9px] font-black text-rose-600 font-mono">-₹1,500</span>
                </div>
                <h4 className="text-[10px] font-bold text-slate-900">Missing Routine Adjustments</h4>
                <p className="text-[9px] text-slate-500 leading-relaxed font-medium">
                  A high-priority client missed their 6-month hygiene adjustment since June.
                </p>
                <button
                  onClick={() => {
                    if (contacts[0] && onSelectContactAndChat) {
                      const c = contacts[0];
                      const formattedName = c.name.includes('garu') ? c.name : `${c.name} garu`;
                      const draftMsg = `Namaste ${formattedName}! This is a friendly health recall alert from ${businessName || 'Sri Sai Dental Clinic'}. It has been some time since your last hygiene and dental cleaning. Keeping up with regular routine adjustments keeps your teeth strong and healthy! Standard clinic timings: Mon-Sat 9:00 AM - 1:00 PM and 4:00 PM - 8:00 PM. Reply here to secure your slot! 🦷✨`;
                      localStorage.setItem(`nestam_pending_draft_${c.id}`, draftMsg);
                      onSelectContactAndChat(c.phone);
                    }
                  }}
                  className="w-full py-1.5 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 text-[9px] font-bold rounded-lg transition-colors cursor-pointer"
                >
                  🚀 Trigger Overdue Template
                </button>
              </div>

              {/* Alert 2 */}
              <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl space-y-1.5">
                <div className="flex justify-between items-start">
                  <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">Proposal Pending</span>
                  <span className="text-[9px] font-black text-amber-600 font-mono">-₹25,000</span>
                </div>
                <h4 className="text-[10px] font-bold text-slate-900">Pending Treatments Estimate</h4>
                <p className="text-[9px] text-slate-500 leading-relaxed font-medium">
                  Consultation completed last week. Treatment estimate pending scheduling.
                </p>
                <button
                  onClick={() => {
                    if (contacts[1] && onSelectContactAndChat) {
                      onSelectContactAndChat(contacts[1].phone);
                    }
                  }}
                  className="w-full py-1.5 bg-white hover:bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-bold rounded-lg transition-colors cursor-pointer"
                >
                  📞 Follow-up Custom Quote
                </button>
              </div>
            </div>
          </div>

        </div>

      {/* 3.5 BUSINESS OWNER: PAYMENT MODES & CASHFLOW ANALYTICS SECTION */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs space-y-3" id="business-owner-payment-analytics">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center text-xs font-mono font-bold shrink-0">₹</div>
            <h3 className="text-xs font-extrabold text-slate-900 truncate">
              Payment Collections & Mode Distribution
            </h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md text-emerald-800 font-bold text-[10px]">
              Eff: <span className="font-mono">{paymentMetrics.collectionEfficiency}%</span>
            </span>
            <span className="bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md text-blue-800 font-bold text-[10px]">
              Digital: <span className="font-mono">{paymentMetrics.digitalShare}%</span>
            </span>
          </div>
        </div>

        {/* 3 Core Financial KPI Cards - Compact Row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-emerald-50/60 border border-emerald-100 p-2 rounded-lg">
            <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider block truncate">Collected</span>
            <p className="text-sm font-black text-emerald-700 font-mono mt-0.5">₹{paymentMetrics.totalCollected.toLocaleString('en-IN')}</p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 p-2 rounded-lg">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block truncate">Billed</span>
            <p className="text-sm font-black text-slate-800 font-mono mt-0.5">₹{paymentMetrics.totalBilled.toLocaleString('en-IN')}</p>
          </div>

          <div className="bg-rose-50/60 border border-rose-100 p-2 rounded-lg">
            <span className="text-[9px] font-black text-rose-800 uppercase tracking-wider block truncate">Outstanding</span>
            <p className="text-sm font-black text-rose-600 font-mono mt-0.5">₹{paymentMetrics.outstandingDues.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* COMPACT DONUT BREAKDOWN */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
          {(() => {
            const total = paymentMetrics.totalCollected || 1;
            const upiPct = Math.round((paymentMetrics.upiCollected / total) * 100);
            const cardPct = Math.round((paymentMetrics.cardCollected / total) * 100);
            const cashPct = Math.max(0, 100 - upiPct - cardPct);

            const C = 251.327; // 2 * PI * 40
            const upiOffset = 0;
            const cardOffset = -(upiPct / 100) * C;
            const cashOffset = -((upiPct + cardPct) / 100) * C;

            return (
              <div className="flex items-center justify-between gap-3">
                {/* Donut Circle SVG */}
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform">
                    <circle cx="50" cy="50" r="40" stroke="#e2e8f0" strokeWidth="14" fill="transparent" />
                    {upiPct > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#10b981"
                        strokeWidth="14"
                        fill="transparent"
                        strokeDasharray={`${(upiPct / 100) * C} ${C}`}
                        strokeDashoffset={upiOffset}
                      />
                    )}
                    {cardPct > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#0ea5e9"
                        strokeWidth="14"
                        fill="transparent"
                        strokeDasharray={`${(cardPct / 100) * C} ${C}`}
                        strokeDashoffset={cardOffset}
                      />
                    )}
                    {cashPct > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#f59e0b"
                        strokeWidth="14"
                        fill="transparent"
                        strokeDasharray={`${(cashPct / 100) * C} ${C}`}
                        strokeDashoffset={cashOffset}
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-1">
                    <span className="text-[11px] font-black text-slate-900 font-mono leading-none">₹{paymentMetrics.totalCollected.toLocaleString('en-IN')}</span>
                    <span className="text-[8px] font-extrabold text-emerald-600 mt-0.5">{paymentMetrics.digitalShare}% Digital</span>
                  </div>
                </div>

                {/* Legend List */}
                <div className="grid grid-cols-1 gap-1.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between px-2 py-1 bg-white rounded-lg border border-slate-200/80 text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-[11px] font-bold text-slate-700 truncate">UPI / PhonePe</span>
                      <span className="text-[9px] text-slate-400 font-medium">({upiPct}%)</span>
                    </div>
                    <span className="text-[11px] font-black font-mono text-emerald-700 shrink-0 ml-1">₹{paymentMetrics.upiCollected.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex items-center justify-between px-2 py-1 bg-white rounded-lg border border-slate-200/80 text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                      <span className="text-[11px] font-bold text-slate-700 truncate">Card</span>
                      <span className="text-[9px] text-slate-400 font-medium">({cardPct}%)</span>
                    </div>
                    <span className="text-[11px] font-black font-mono text-sky-700 shrink-0 ml-1">₹{paymentMetrics.cardCollected.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex items-center justify-between px-2 py-1 bg-white rounded-lg border border-slate-200/80 text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-[11px] font-bold text-slate-700 truncate">Cash</span>
                      <span className="text-[9px] text-slate-400 font-medium">({cashPct}%)</span>
                    </div>
                    <span className="text-[11px] font-black font-mono text-amber-700 shrink-0 ml-1">₹{paymentMetrics.cashCollected.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* 3.6 PRACTICE OPERATIONAL PIPELINE FUNNEL */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4" id="clinical-conversion-funnel">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-teal-600">
                <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
              </svg>
              Practice Operational Pipeline Funnel
            </h3>
            <p className="text-[10.5px] text-slate-400 font-semibold mt-0.5">
              Conversion flow from lead inquiry to appointment & treatment completion
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Period:</span>
            <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 inline-flex items-center">
              {(['today', 'weekly', 'monthly', 'ltd'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFunnelPeriod(t)}
                  className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                    funnelPeriod === t
                      ? 'bg-white text-slate-800 shadow-3xs font-black'
                      : 'text-slate-400 hover:text-slate-650'
                  }`}
                >
                  {t === 'ltd' ? 'LTD' : t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Clear Visual Funnel Steps */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 space-y-3">
          <div className="space-y-2">
            {[
              { label: '1. Inquiries', count: funnelStats.inquiries, pct: 100, color: 'bg-slate-800' },
              { label: '2. Scheduled', count: funnelStats.scheduled, pct: safePercent(funnelStats.scheduled, funnelStats.inquiries || 1), color: 'bg-teal-600' },
              { label: '3. Visited', count: funnelStats.visited, pct: safePercent(funnelStats.visited, funnelStats.inquiries || 1), color: 'bg-emerald-600' },
              { label: '4. Treatment', count: funnelStats.treatment, pct: safePercent(funnelStats.treatment, funnelStats.inquiries || 1), color: 'bg-cyan-600' },
              { label: '5. Completed', count: funnelStats.completed, pct: safePercent(funnelStats.completed, funnelStats.inquiries || 1), color: 'bg-indigo-600' }
            ].map((stage, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <span>{stage.label}</span>
                  <span className="font-mono text-slate-900 font-extrabold">{stage.count} <span className="text-[10px] font-semibold text-slate-400">({stage.pct}%)</span></span>
                </div>
                <div className="w-full bg-slate-200/80 h-2.5 rounded-full overflow-hidden flex">
                  <div
                    className={`${stage.color} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(6, stage.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Inbound Lead Channels Footer */}
          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-slate-600 flex-wrap gap-1.5">
            <span className="text-[10px] uppercase text-slate-400 font-extrabold">Inbound Channels:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[9.5px]">🟢 WhatsApp (48%)</span>
              <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-[9.5px]">📞 Phone & Web (22%)</span>
              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[9.5px]">🚶 Walk-in (16%)</span>
              <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded text-[9.5px]">🔄 Recalls (14%)</span>
            </div>
          </div>
        </div>
      </div>

        </div> {/* END RIGHT MAIN PANEL */}
      </div> {/* END MAIN 2-COLUMN LAYOUT */}

      {/* 4. IMMEDIATE APPOINTMENT BOOKING MODAL */}
      <AnimatePresence>
        {isImmediateBookingOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-3xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 overflow-hidden space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <UserPlus className="h-4.5 w-4.5 text-teal-600" />
                  Schedule Immediate Appointment
                </h3>
                <button
                  onClick={() => setIsImmediateBookingOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleImmediateBookingSubmit} className="space-y-3.5">
                {/* Searchable Patient Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Patient</label>
                  <select
                    required
                    value={immediateContactId}
                    onChange={(e) => setImmediateContactId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">-- Choose a patient --</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Date Input */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={immediateDate}
                      onChange={(e) => setImmediateDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  {/* Time slot picker */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Time Slot</label>
                    <select
                      required
                      value={immediateTime}
                      onChange={(e) => setImmediateTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      {timeSlots.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Treatment details */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Treatment Type</label>
                  <input
                    type="text"
                    placeholder="e.g. Scaling, Implant, Consultation"
                    value={immediateTreatment}
                    onChange={(e) => setImmediateTreatment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                {/* Expected Value */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Estimated Value (₹)</label>
                  <input
                    type="number"
                    value={immediateValue}
                    onChange={(e) => setImmediateValue(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono font-bold"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Provide appointment comments..."
                    value={immediateNotes}
                    onChange={(e) => setImmediateNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsImmediateBookingOpen(false)}
                    className="px-4 py-2 border border-slate-250 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Confirm Booking
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
