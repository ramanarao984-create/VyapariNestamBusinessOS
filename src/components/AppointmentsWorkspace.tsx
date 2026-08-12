import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, Clock, Users, Plus, ChevronLeft, ChevronRight, 
  Filter, Search, UserCheck, AlertCircle, CheckCircle2, UserPlus, 
  ShieldCheck, ArrowRight, Activity, MapPin, Stethoscope, Trash2, Edit2, 
  X, Check, Phone, MessageSquare, Zap, RefreshCw, User, Briefcase
} from 'lucide-react';
import { Contact, Doctor, Appointment } from '../types';

interface AppointmentsWorkspaceProps {
  contacts: Contact[];
  doctors: Doctor[];
  appointments: Appointment[];
  onAddDoctor: (doc: Omit<Doctor, 'id'>) => void;
  onDeleteDoctor: (id: string) => void;
  onEditDoctor?: (doc: Doctor) => void;
  onAddAppointment: (apt: Omit<Appointment, 'id'>) => void;
  onUpdateAppointmentStatus: (id: string, status: Appointment['status'], type: Appointment['type']) => void;
  onDeleteAppointment: (id: string) => void;
  onOpenBookingModal: (contact?: Contact, docId?: string, time?: string) => void;
  onSendWhatsApp?: (text: string) => void;
  businessName?: string;
}

export const AppointmentsWorkspace: React.FC<AppointmentsWorkspaceProps> = ({
  contacts,
  doctors,
  appointments,
  onAddDoctor,
  onDeleteDoctor,
  onEditDoctor,
  onAddAppointment,
  onUpdateAppointmentStatus,
  onDeleteAppointment,
  onOpenBookingModal,
  onSendWhatsApp,
  businessName = 'Sri Sai Dental Clinic'
}) => {
  const [selectedSubTab, setSelectedSubTab] = useState<'calendar' | 'queue' | 'walkins' | 'followups' | 'recalls' | 'waitlist' | 'resources'>('calendar');
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'timeline' | 'agenda'>('day');
  
  // Date State - Default to Today ISO string e.g. YYYY-MM-DD
  const [selectedDateIso, setSelectedDateIso] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Doctor Modals
  const [isAddDoctorModalOpen, setIsAddDoctorModalOpen] = useState(false);
  const [docName, setDocName] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docPhone, setDocPhone] = useState('');
  const [docColor, setDocColor] = useState('teal');

  // New Appointment Modal inside AppointmentsWorkspace
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [apptDocId, setApptDocId] = useState('');
  const [apptPatientName, setApptPatientName] = useState('');
  const [apptPatientPhone, setApptPatientPhone] = useState('');
  const [apptTreatment, setApptTreatment] = useState('General Consultation');
  const [apptTime, setApptTime] = useState('09:00 AM');
  const [apptNotes, setApptNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Doctor color mapper
  const getDocColorBadge = (color?: string) => {
    switch (color) {
      case 'indigo': return { bg: 'bg-indigo-600', lightBg: 'bg-indigo-50 border-indigo-200 text-indigo-900', text: 'text-indigo-600' };
      case 'amber': return { bg: 'bg-amber-600', lightBg: 'bg-amber-50 border-amber-200 text-amber-900', text: 'text-amber-600' };
      case 'emerald': return { bg: 'bg-emerald-600', lightBg: 'bg-emerald-50 border-emerald-200 text-emerald-900', text: 'text-emerald-600' };
      case 'rose': return { bg: 'bg-rose-600', lightBg: 'bg-rose-50 border-rose-200 text-rose-900', text: 'text-rose-600' };
      case 'purple': return { bg: 'bg-purple-600', lightBg: 'bg-purple-50 border-purple-200 text-purple-900', text: 'text-purple-600' };
      case 'sky': return { bg: 'bg-sky-600', lightBg: 'bg-sky-50 border-sky-200 text-sky-900', text: 'text-sky-600' };
      case 'teal':
      default:
        return { bg: 'bg-teal-600', lightBg: 'bg-teal-50 border-teal-200 text-teal-900', text: 'text-teal-600' };
    }
  };

  // Timeline slots
  const timeSlots = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'
  ];

  // Helper date formatted display
  const getFormattedDisplayDate = (isoStr: string) => {
    try {
      const parts = isoStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', weekday: 'short' });
      }
    } catch (e) {
      // fallback
    }
    return isoStr;
  };

  const handlePrevDay = () => {
    const parts = selectedDateIso.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    d.setDate(d.getDate() - 1);
    setSelectedDateIso(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const parts = selectedDateIso.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    d.setDate(d.getDate() + 1);
    setSelectedDateIso(d.toISOString().split('T')[0]);
  };

  const handleSetToday = () => {
    setSelectedDateIso(new Date().toISOString().split('T')[0]);
  };

  // Add Doctor Handler
  const handleSaveDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim() || !docTitle.trim()) {
      setFormError('Enter both the doctor name and specialization before saving.');
      return;
    }
    setFormError(null);
    const initials = docName.replace('Dr.', '').trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'DR';
    onAddDoctor({
      name: docName.startsWith('Dr.') ? docName.trim() : `Dr. ${docName.trim()}`,
      title: docTitle.trim(),
      phone: docPhone.trim() || undefined,
      avatar: initials,
      color: docColor,
      totalAppts: 0
    });
    setDocName('');
    setDocTitle('');
    setDocPhone('');
    setIsAddDoctorModalOpen(false);
  };

  // Open Appt Modal from Empty Slot
  const handleOpenSlotModal = (docId: string, slotTime: string) => {
    setApptDocId(docId);
    setApptTime(slotTime);
    setIsApptModalOpen(true);
  };

  // Save Appointment Handler
  const handleSaveAppt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apptDocId || !apptPatientName.trim()) {
      setFormError('Choose a doctor and enter the patient name before booking.');
      return;
    }
    setFormError(null);
    const docObj = doctors.find(d => d.id === apptDocId);
    onAddAppointment({
      docId: apptDocId,
      doctorName: docObj?.name || 'Dr. Assigned',
      patientName: apptPatientName.trim(),
      patientPhone: apptPatientPhone.trim() || undefined,
      treatment: apptTreatment,
      time: `${apptTime} - ${apptTime.replace('00', '45')}`,
      date: selectedDateIso,
      status: 'Confirmed',
      type: 'confirmed',
      notes: apptNotes.trim()
    });
    setApptPatientName('');
    setApptPatientPhone('');
    setApptNotes('');
    setIsApptModalOpen(false);
  };

  // Filtered doctors
  const visibleDoctors = selectedDoctorFilter === 'all' 
    ? doctors 
    : doctors.filter(d => d.id === selectedDoctorFilter);

  // Filtered appointments for current date & query
  const visibleAppointments = appointments.filter(a => {
    const matchesDate = !a.date || a.date === selectedDateIso;
    const matchesDoc = selectedDoctorFilter === 'all' || a.docId === selectedDoctorFilter;
    const matchesSearch = !searchQuery.trim() || 
      a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      a.treatment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.doctorName && a.doctorName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDate && matchesDoc && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Header Card matching Patients section style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-3xs">
        <div>
          <h1 className="text-xl font-black font-display text-slate-900 tracking-tight flex items-center gap-2">
            Appointments
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage live patient queues, doctor rosters, walk-in slots, and clinical operations seamlessly.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setFormError(null); setIsAddDoctorModalOpen(true); }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-250 shadow-3xs transition-all cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5 text-slate-500" />
            <span>Add Doctor</span>
          </button>

          <button
            onClick={() => { setFormError(null); setIsApptModalOpen(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0d9488] hover:bg-[#0f766e] text-white font-black text-xs rounded-xl shadow-md shadow-teal-600/20 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Appointment</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Navigation & Doctor Roster Panel (Span 3) */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Workspace Sub-Tabs */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            {[
              { id: 'calendar', label: 'Calendar View', icon: CalendarIcon, badge: `${visibleAppointments.length}` },
              { id: 'queue', label: 'Live Queue', icon: Users, badge: '5' },
              { id: 'walkins', label: 'Walk-ins', icon: UserPlus, badge: '3' },
              { id: 'followups', label: 'Follow-ups', icon: CheckCircle2, badge: '12' },
              { id: 'recalls', label: 'Recalls', icon: Clock, badge: '8' },
              { id: 'waitlist', label: 'Waitlist', icon: AlertCircle, badge: '2' },
              { id: 'resources', label: 'Chairs & Equipment', icon: Stethoscope, badge: '4' },
            ].map(item => {
              const Icon = item.icon;
              const isActive = selectedSubTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedSubTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isActive ? 'bg-slate-800 text-teal-300' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {item.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Doctor Management & Roster Section */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5 text-teal-600" />
                Clinic Doctors ({doctors.length})
              </h4>
              <button
                onClick={() => { setFormError(null); setIsAddDoctorModalOpen(true); }}
                className="text-[11px] font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1 cursor-pointer bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {doctors.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No doctors registered yet. Click "+ Add" to add a doctor.
                </div>
              ) : (
                doctors.map(doc => {
                  const badge = getDocColorBadge(doc.color);
                  const docApptCount = appointments.filter(a => a.docId === doc.id && (!a.date || a.date === selectedDateIso)).length;
                  
                  return (
                    <div 
                      key={doc.id} 
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-slate-300 transition-all group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg ${badge.bg} text-white font-extrabold flex items-center justify-center text-[11px] shrink-0 shadow-3xs`}>
                          {doc.avatar}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 leading-tight truncate">{doc.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{doc.title}</p>
                          {doc.phone && (
                            <p className="text-[9px] font-mono text-slate-400 mt-0.5">{doc.phone}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 text-[10px] font-bold rounded-md shadow-3xs">
                          {docApptCount} Slots
                        </span>
                        
                        {/* Delete Doctor Action */}
                        <button
                          onClick={() => onDeleteDoctor(doc.id)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title={`Delete ${doc.name} from roster`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Right Timetable Panel (Span 9) */}
        <div className="lg:col-span-9 space-y-4">
          
          {/* Top Date Navigator & Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            
            {/* Interactive Date Controls */}
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrevDay}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer shadow-3xs"
                title="Previous Day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1">
                <CalendarIcon className="h-4 w-4 text-teal-600" />
                <input
                  type="date"
                  value={selectedDateIso}
                  onChange={(e) => setSelectedDateIso(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                />
              </div>

              <button 
                onClick={handleNextDay}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer shadow-3xs"
                title="Next Day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button 
                onClick={handleSetToday}
                className="px-2.5 py-1.5 text-[11px] font-extrabold bg-slate-900 text-white hover:bg-slate-800 rounded-lg ml-1 cursor-pointer shadow-3xs transition-all"
              >
                Today
              </button>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
              {(['day', 'week', 'timeline', 'agenda'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                    viewMode === mode ? 'bg-white text-slate-900 shadow-3xs font-black' : 'hover:text-slate-900'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Doctor Filter Dropdown */}
            <div className="flex items-center gap-2">
              <select
                value={selectedDoctorFilter}
                onChange={(e) => setSelectedDoctorFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs px-3 py-1.5 rounded-xl font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">All Doctors ({doctors.length})</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* MAIN CALENDAR DISPLAY */}
          {selectedSubTab === 'calendar' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
              
              {/* Day View Timetable */}
              {viewMode === 'day' && (
                <>
                  {/* Doctor Header Columns */}
                  <div className={`grid ${visibleDoctors.length === 1 ? 'grid-cols-2' : visibleDoctors.length === 2 ? 'grid-cols-3' : visibleDoctors.length === 3 ? 'grid-cols-4' : 'grid-cols-5'} bg-slate-100 border-b border-slate-200 text-xs font-black text-slate-700`}>
                    <div className="p-3 border-r border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider font-mono flex items-center justify-center">
                      Time Slot
                    </div>
                    {visibleDoctors.map(doc => {
                      const badge = getDocColorBadge(doc.color);
                      return (
                        <div key={doc.id} className="p-3 border-r border-slate-200 flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-md ${badge.bg} text-white font-extrabold flex items-center justify-center text-[10px] shrink-0`}>
                            {doc.avatar}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900 text-xs truncate">{doc.name}</p>
                            <p className="text-[9px] text-slate-500 truncate font-normal">{doc.title}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Time Slot Rows */}
                  <div className="divide-y divide-slate-100 text-xs">
                    {timeSlots.map(time => {
                      return (
                        <div key={time} className={`grid ${visibleDoctors.length === 1 ? 'grid-cols-2' : visibleDoctors.length === 2 ? 'grid-cols-3' : visibleDoctors.length === 3 ? 'grid-cols-4' : 'grid-cols-5'} min-h-[68px]`}>
                          
                          {/* Time Label */}
                          <div className="p-3 border-r border-slate-200 text-slate-400 font-mono text-[11px] font-bold flex items-start justify-center bg-slate-50/50">
                            {time}
                          </div>

                          {/* Doctor Columns */}
                          {visibleDoctors.map(doc => {
                            const matchApt = visibleAppointments.find(a => 
                              a.docId === doc.id && 
                              (a.time.startsWith(time.substring(0, 5)) || a.time.includes(time))
                            );
                            
                            if (!matchApt) {
                              return (
                                <div
                                  key={doc.id}
                                  onClick={() => handleOpenSlotModal(doc.id, time)}
                                  className="p-2 border-r border-slate-100 hover:bg-teal-50/40 transition-colors cursor-pointer group flex items-center justify-center"
                                >
                                  <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-teal-700 flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-teal-200 shadow-3xs">
                                    <Plus className="h-3 w-3" /> Book {doc.name.split(' ')[1] || 'Slot'}
                                  </span>
                                </div>
                              );
                            }

                            // Render Appointment Card
                            let bgCard = 'bg-teal-50 border-teal-200 text-teal-900';
                            if (matchApt.type === 'completed' || matchApt.status === 'Completed') bgCard = 'bg-emerald-50 border-emerald-200 text-emerald-900';
                            else if (matchApt.type === 'walkin' || matchApt.status === 'Walk-in Slot') bgCard = 'bg-sky-50 border-sky-200 text-sky-900';
                            else if (matchApt.type === 'break' || matchApt.status === 'Lunch/Break') bgCard = 'bg-rose-50 border-rose-200 text-rose-800';
                            else if (matchApt.type === 'blocked' || matchApt.status === 'Blocked') bgCard = 'bg-slate-100 border-slate-300 text-slate-600';

                            return (
                              <div key={doc.id} className="p-1.5 border-r border-slate-100">
                                <div className={`p-2.5 rounded-xl border ${bgCard} shadow-3xs text-xs space-y-1.5 h-full flex flex-col justify-between group relative`}>
                                  
                                  <div>
                                    <div className="flex items-center justify-between font-extrabold text-[11px]">
                                      <span className="truncate">{matchApt.patientName}</span>
                                      <span className="text-[9px] font-mono opacity-80 shrink-0">{matchApt.time.split(' - ')[0]}</span>
                                    </div>
                                    <p className="text-[10px] font-medium opacity-85 truncate mt-0.5">{matchApt.treatment}</p>
                                    {matchApt.doctorName && (
                                      <p className="text-[9px] font-bold opacity-75 flex items-center gap-1 mt-0.5">
                                        🧑‍⚕️ {matchApt.doctorName}
                                      </p>
                                    )}
                                  </div>

                                  {/* Quick Interactive Actions */}
                                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-1 mt-1 opacity-90">
                                    <select
                                      value={matchApt.status}
                                      onChange={(e) => {
                                        const newStatus = e.target.value as Appointment['status'];
                                        let newType: Appointment['type'] = 'confirmed';
                                        if (newStatus === 'Completed') newType = 'completed';
                                        else if (newStatus === 'Walk-in Slot') newType = 'walkin';
                                        else if (newStatus === 'Lunch/Break') newType = 'break';
                                        else if (newStatus === 'Blocked') newType = 'blocked';
                                        onUpdateAppointmentStatus(matchApt.id, newStatus, newType);
                                      }}
                                      className="text-[9px] font-black bg-white/80 border border-slate-200 rounded px-1 py-0.5 text-slate-800 cursor-pointer focus:outline-none"
                                    >
                                      <option value="Confirmed">Confirmed</option>
                                      <option value="In Treatment">In Treatment</option>
                                      <option value="Completed">Completed</option>
                                      <option value="Walk-in Slot">Walk-in Slot</option>
                                      <option value="Lunch/Break">Lunch/Break</option>
                                      <option value="Blocked">Blocked</option>
                                    </select>

                                    <div className="flex items-center gap-1">
                                      {matchApt.patientPhone && onSendWhatsApp && (
                                        <button
                                          onClick={() => onSendWhatsApp(`Namaste ${matchApt.patientName}! Reminder for your appointment with ${matchApt.doctorName || 'our clinic'} scheduled today at ${matchApt.time}.`)}
                                          className="p-1 hover:bg-white rounded text-teal-700 cursor-pointer"
                                          title="Send WhatsApp Confirmation"
                                        >
                                          <Zap className="h-3 w-3 text-amber-500 fill-amber-400" />
                                        </button>
                                      )}

                                      <button
                                        onClick={() => onDeleteAppointment(matchApt.id)}
                                        className="p-1 hover:bg-white rounded text-red-600 cursor-pointer"
                                        title="Cancel appointment"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>

                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Agenda / List View */}
              {(viewMode === 'agenda' || viewMode === 'week' || viewMode === 'timeline') && (
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-teal-600" />
                      Appointments Schedule ({getFormattedDisplayDate(selectedDateIso)})
                    </h3>

                    <input
                      type="text"
                      placeholder="Filter appointments or patient name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-teal-500 w-64"
                    />
                  </div>

                  {visibleAppointments.length === 0 ? (
                    <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                      <CalendarIcon className="h-8 w-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-600">No appointments scheduled for this date.</p>
                      <button
                        onClick={() => { setFormError(null); setIsApptModalOpen(true); }}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Book Appointment
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {visibleAppointments.map(apt => (
                        <div key={apt.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start justify-between gap-3 shadow-3xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 text-sm">{apt.patientName}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-teal-50 text-teal-700 border border-teal-200">
                                {apt.status}
                              </span>
                            </div>
                            
                            <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                              <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                              {apt.treatment}
                            </p>

                            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                              <Stethoscope className="h-3.5 w-3.5 text-teal-600" />
                              Doctor: <strong className="text-slate-800">{apt.doctorName || 'Assigned Specialist'}</strong>
                            </p>

                            <p className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              {apt.time}
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <button
                              onClick={() => onDeleteAppointment(apt.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete appointment"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Sub-Tabs: Live Queue / Walk-ins / Follow-ups */}
          {selectedSubTab !== 'calendar' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 capitalize flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-teal-600" />
                  Operational View: {selectedSubTab.replace('_', ' ')}
                </h3>
                <span className="text-xs font-bold text-slate-400">Live Workspace Module</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contacts.slice(0, 6).map((c, idx) => (
                  <div key={c.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-xs text-slate-900">{c.name}</p>
                      <span className="px-2 py-0.5 text-[9px] font-extrabold rounded bg-teal-50 text-teal-700 border border-teal-200">
                        Queue #{idx + 1}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{c.treatmentType || 'General Dental Consultation'}</p>
                    <p className="text-[10px] font-mono text-slate-400">{c.phone}</p>
                    
                    <button
                      onClick={() => onOpenBookingModal(c)}
                      className="w-full mt-2 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                    >
                      Schedule Session 📅
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Legend */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-600">
            <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Status Legend:</span>
            <div className="flex items-center gap-4 flex-wrap text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                <span>Confirmed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span>In Treatment</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span>Walk-in Slot</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span>Lunch/Break</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ==================== ADD DOCTOR MODAL ==================== */}
      {isAddDoctorModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-[150] animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 font-display">Add Doctor / Practitioner</h3>
                  <p className="text-[11px] text-slate-500">Register new doctor to clinic schedule roster</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddDoctorModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDoctor} className="space-y-3.5">
              {formError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">{formError}</div>}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Doctor Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Sai Krishna"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Specialty / Designation *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Endodontist / Orthodontist"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 9876543210"
                  value={docPhone}
                  onChange={(e) => setDocPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl text-xs font-mono text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Avatar Theme Color
                </label>
                <div className="flex items-center gap-2">
                  {['teal', 'indigo', 'amber', 'emerald', 'rose', 'purple', 'sky'].map(clr => (
                    <button
                      key={clr}
                      type="button"
                      onClick={() => setDocColor(clr)}
                      className={`w-7 h-7 rounded-full border-2 capitalize text-[10px] font-bold cursor-pointer transition-all ${
                        docColor === clr ? 'border-slate-900 scale-110 shadow-3xs' : 'border-transparent opacity-80'
                      }`}
                      style={{
                        backgroundColor: clr === 'teal' ? '#0d9488' : clr === 'indigo' ? '#4f46e5' : clr === 'amber' ? '#d97706' : clr === 'emerald' ? '#059669' : clr === 'rose' ? '#e11d48' : clr === 'purple' ? '#9333ea' : '#0284c7'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddDoctorModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Save Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== NEW APPOINTMENT MODAL ==================== */}
      {isApptModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-[150] animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 font-display">Schedule New Appointment</h3>
                  <p className="text-[11px] text-slate-500">Book slot with assigned doctor</p>
                </div>
              </div>
              <button 
                onClick={() => setIsApptModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAppt} className="space-y-3.5">
              {formError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">{formError}</div>}
              {/* Doctor Selection */}
              <div>
                <label className="block text-[10px] font-bold text-teal-700 uppercase tracking-wider mb-1">
                  Assign Doctor *
                </label>
                <select
                  required
                  value={apptDocId}
                  onChange={(e) => setApptDocId(e.target.value)}
                  className="w-full px-3 py-2 bg-teal-50/40 border border-teal-200 focus:bg-white focus:border-teal-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Choose Doctor --</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.title})</option>
                  ))}
                </select>
              </div>

              {/* Patient Name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Patient Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={apptPatientName}
                  onChange={(e) => setApptPatientName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                />
              </div>

              {/* WhatsApp Phone */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Patient WhatsApp Phone
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 9876543210"
                  value={apptPatientPhone}
                  onChange={(e) => setApptPatientPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl text-xs font-mono text-slate-800 focus:outline-none"
                />
              </div>

              {/* Treatment Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Treatment / Procedure
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Root Canal / Cleaning"
                    value={apptTreatment}
                    onChange={(e) => setApptTreatment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Time Slot
                  </label>
                  <select
                    value={apptTime}
                    onChange={(e) => setApptTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    {timeSlots.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Clinical Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Special instructions or clinical details..."
                  value={apptNotes}
                  onChange={(e) => setApptNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl text-xs font-medium text-slate-800 focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsApptModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Book Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
