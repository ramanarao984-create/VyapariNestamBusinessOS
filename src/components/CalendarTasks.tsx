import React, { useState } from 'react';
import { UpcomingFollowUp, Contact, Doctor } from '../types';
import { INDUSTRIES, IndustryType, getSectorDefinition } from '../industryConfig';
import { safeCopyToClipboard } from '../utils';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Phone, 
  ExternalLink, 
  AlertCircle, 
  Sparkles, 
  UserPlus, 
  Check, 
  Zap,
  User,
  Activity,
  Briefcase
} from 'lucide-react';

interface CalendarTasksProps {
  tasks: UpcomingFollowUp[];
  contacts: Contact[];
  doctors?: Doctor[];
  isAuthenticated: boolean;
  onSelectContact: (phone: string) => void;
  onLogin: () => void;
  industryId?: IndustryType;
  onBookAppointment?: (
    contactId: string, 
    details: { 
      summary: string; 
      date: string; 
      time: string; 
      notes: string;
      service: string;
      assignee: string;
    }
  ) => void;
  onTriggerConfirmation?: (phone: string, msg: string) => void;
}

export const CalendarTasks: React.FC<CalendarTasksProps> = ({
  tasks,
  contacts = [],
  doctors = [],
  isAuthenticated,
  onSelectContact,
  onLogin,
  industryId = 'dental',
  onBookAppointment,
  onTriggerConfirmation,
}) => {
  const config = getSectorDefinition(industryId);
  const term = config.terminology;

  // Form states
  const [selectedContactId, setSelectedContactId] = useState('');
  const [eventSummary, setEventSummary] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventNotes, setEventNotes] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [assignedStaff, setAssignedStaff] = useState('');

  // Search filter for contact dropdown
  const [searchTerm, setSearchTerm] = useState('');

  // Default Services list based on industry for the dropdown
  const defaultServices = {
    dental: ['General Consultation', 'Teeth Whitening', 'Root Canal Treatment', 'Dental Braces Aligners', 'Scaling & Polishing'],
    cosmetic: ['Laser Hair Removal', 'HydraFacial Skin Treatment', 'Acne Scar Evaluation', 'Chemical Peel Skin Brightening'],
    multispecialty: ['General OPD Consult', 'Full Body Lab Screening', 'Pediatric Vaccination', 'Cardiology Diagnostics'],
    gym: ['Personal Training Intro', 'General Workout Trial', 'Zumba Group Fitness Session', 'Yoga Mindfulness Consult'],
    realestate: ['Premium Villa Project Site Tour', 'Resale Value Appraisal', 'Legal Documentation Filing']
  }[industryId] || ['General Consultation'];

  // Default Staff List
  const defaultStaff = {
    dental: ['Dr. Prasad Babu', 'Dr. Srilatha', 'Dr. Rakesh Kumar'],
    cosmetic: ['Dr. Anjali Sen', 'Therapist Kavitha'],
    multispecialty: ['Dr. V. Srinivasan', 'Dr. P. Arundhati', 'Nurse Vijay'],
    gym: ['Coach Vijay Kumar', 'Trainer Lakshmi'],
    realestate: ['Manager Srinivas Rao', 'Consultant Krishna']
  }[industryId] || ['Manager Sridhar'];

  const formatEventTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const isExpired = (isoString: string) => {
    try {
      return new Date(isoString).getTime() < Date.now();
    } catch {
      return false;
    }
  };

  // Mock calendar items to show when not authenticated
  const mockCalendarTasks: UpcomingFollowUp[] = [
    {
      id: 'm-cal-1',
      contactId: 'c-1',
      contactName: 'Sarah Jenkins',
      contactPhone: '+919876543210',
      summary: `Root Canal Diagnosis - Dr. Prasad`,
      description: '🔧 Service: Root Canal Treatment\n🧑‍⚕️ Assigned: Dr. Prasad Babu\nNotes: Discuss premium RCT and crowns. Client requested follow-up call first.',
      start: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), // tomorrow
      end: new Date(Date.now() + 24.5 * 3600 * 1000).toISOString(),
    },
    {
      id: 'm-cal-2',
      contactId: 'c-3',
      contactName: 'Chloe Dubois',
      contactPhone: '+919848022338',
      summary: `Laser Hair Session - Dr. Anjali`,
      description: '🔧 Service: Laser Hair Removal\n🧑‍⚕️ Assigned: Dr. Anjali Sen\nNotes: Patient requested late afternoon slot for facial skin laser checkup.',
      start: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(), // 3 days
      end: new Date(Date.now() + 3.1 * 24 * 3600 * 1000).toISOString(),
    }
  ];

  const activeTasks = isAuthenticated ? tasks : [...tasks, ...mockCalendarTasks];

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactId || !eventDate || !eventTime || !onBookAppointment) {
      alert('Please select a contact, date, and time slot.');
      return;
    }

    const contact = contacts.find(c => c.id === selectedContactId);
    if (!contact) return;

    // Combine parameters into notes and summary
    const summary = eventSummary || `${selectedService || 'Consultation'} with ${assignedStaff || 'Staff'}`;
    const description = `🔧 Service: ${selectedService || 'General'}\n🧑‍⚕️ Assigned: ${assignedStaff || 'Staff'}\nNotes: ${eventNotes}`;

    onBookAppointment(selectedContactId, {
      summary,
      date: eventDate,
      time: eventTime,
      notes: description,
      service: selectedService,
      assignee: assignedStaff
    });

    // Reset form
    setSelectedContactId('');
    setEventSummary('');
    setEventDate('');
    setEventTime('');
    setEventNotes('');
    setSelectedService('');
    setAssignedStaff('');
    setSearchTerm('');
  };

  // Click handler to trigger WhatsApp confirmation dispatch
  const handleSendWhatsAppConfirm = (task: UpcomingFollowUp) => {
    const timeFormatted = formatEventTime(task.start);
    // Parse service and staff from description if possible
    let serviceText = selectedService || defaultServices[0];
    let staffText = assignedStaff || defaultStaff[0];

    const matchService = task.description.match(/🔧 Service:\s*(.*)/);
    const matchStaff = task.description.match(/🧑‍⚕️ Assigned:\s*(.*)/);

    if (matchService && matchService[1]) serviceText = matchService[1];
    if (matchStaff && matchStaff[1]) staffText = matchStaff[1];

    const message = `Namaste! This is an automated message from our team. We have scheduled your upcoming appointment on *${timeFormatted}*.
🔧 *Service*: ${serviceText}
🧑‍⚕️ *Assigned Expert*: ${staffText}
We look forward to welcoming you! Please message us back if you need any directions or help. 🙏✨`;

    if (onTriggerConfirmation) {
      onTriggerConfirmation(task.contactPhone, message);
    } else {
      // Fallback alert copy
      safeCopyToClipboard(message);
      alert(`WhatsApp Confirmation copied to clipboard:\n\n${message}`);
    }
  };

  return (
    <div className="space-y-6" id="calendar-appointments">
      
      {/* Header and status banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight font-display text-slate-800 flex items-center gap-2">
            Smart Calendar Scheduler & Tasks
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Keep track of live callbacks and appointments on Google Calendar. Pre-configure services, assign operators, and trigger single-click WhatsApp confirmations.
          </p>
        </div>

        {!isAuthenticated && (
          <button
            onClick={onLogin}
            className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm shadow-amber-100 transition-colors cursor-pointer shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            Connect Google Calendar
          </button>
        )}
      </div>

      {/* Grid split: Scheduler Form vs Tasks List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Appointment Booking Engine (Span 4) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <UserPlus className="h-4 w-4 text-emerald-500" />
            Schedule Immediate Appointment
          </h3>

          <form onSubmit={handleSubmitBooking} className="space-y-4">
            
            {/* Searchable Contact Select */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Select {term.patientLabel}
              </label>
              
              <input
                type="text"
                placeholder="Type name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-500 focus:bg-white mb-2"
              />

              <select
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
                className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                required
              >
                <option value="">-- Choose {term.patientLabel} --</option>
                {filteredContacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                ))}
              </select>
            </div>

            {/* Custom Event Summary */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Appointment Summary / Title
              </label>
              <input
                type="text"
                value={eventSummary}
                onChange={(e) => setEventSummary(e.target.value)}
                placeholder="e.g. Scaling & Consultation Session"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-lg text-xs font-medium focus:outline-none"
              />
            </div>

            {/* Service Assignment */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Assign {term.treatmentLabel}
                </label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">-- Select Service --</option>
                  {defaultServices.map((srv, idx) => (
                    <option key={idx} value={srv}>{srv}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Assign {term.doctorLabel}
                </label>
                <select
                  value={assignedStaff}
                  onChange={(e) => setAssignedStaff(e.target.value)}
                  className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">-- Select Expert / Doctor --</option>
                  {doctors && doctors.length > 0 ? (
                    doctors.map((d) => (
                      <option key={d.id} value={d.name}>{d.name} ({d.title})</option>
                    ))
                  ) : (
                    defaultStaff.map((st, idx) => (
                      <option key={idx} value={st}>{st}</option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Date</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-lg text-xs font-medium focus:outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Time</label>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-lg text-xs font-medium focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Event Notes */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Special Clinical Notes</label>
              <textarea
                rows={2}
                value={eventNotes}
                onChange={(e) => setEventNotes(e.target.value)}
                placeholder="e.g. Patient requests late hours consult due to office timing conflict."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-lg text-xs font-medium focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CalendarIcon className="h-4 w-4" />
              Book Appointment 📅
            </button>
          </form>

          {!isAuthenticated && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-800 flex items-start gap-2.5 mt-2">
              <AlertCircle className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Google integration pending</p>
                <p className="mt-1 leading-relaxed text-amber-750">
                  Appointments booked will post to local CRM logs. Link Google account to push events live to Google Calendar.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Appointments List with WhatsApp Confirm triggers (Span 8) */}
        <div className="lg:col-span-8 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Scheduled Slots</h3>
          
          <div className="space-y-4">
            {activeTasks.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center border border-slate-200">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">No scheduled callbacks</p>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Use the Booking Engine on the left to schedule appointments and generate confirmation reminders.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeTasks.map(task => {
                  const overdue = isExpired(task.start);
                  
                  return (
                    <div
                      key={task.id}
                      className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                        overdue ? 'border-red-200 bg-red-50/5' : 'border-slate-200'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Title & Timing header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <h4 className="font-extrabold text-slate-850 tracking-tight text-xs">
                              {task.summary}
                            </h4>
                            
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                              <Clock className={`h-3.5 w-3.5 shrink-0 ${overdue ? 'text-red-500' : 'text-slate-400'}`} />
                              <span className={overdue ? 'text-red-600 font-bold' : ''}>
                                {formatEventTime(task.start)} {overdue && '(Overdue)'}
                              </span>
                            </div>
                          </div>

                          {overdue ? (
                            <span className="bg-red-50 text-red-700 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 border border-red-200">
                              Overdue
                            </span>
                          ) : (
                            <span className="bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 border border-teal-200">
                              Active
                            </span>
                          )}
                        </div>

                        {/* Service / Assignee details parsed */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {task.description.includes('🔧 Service:') && (
                            <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-150 rounded-lg px-2 py-0.5 text-[9px] font-bold text-slate-600">
                              <Briefcase className="h-3 w-3 text-slate-400" />
                              {task.description.split('🔧 Service:')[1]?.split('\n')[0]?.trim()}
                            </span>
                          )}
                          {task.description.includes('🧑‍⚕️ Assigned:') && (
                            <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-150 rounded-lg px-2 py-0.5 text-[9px] font-bold text-indigo-700">
                              <User className="h-3 w-3 text-indigo-400" />
                              {task.description.split('🧑‍⚕️ Assigned:')[1]?.split('\n')[0]?.trim()}
                            </span>
                          )}
                        </div>

                        {/* Desc notes */}
                        <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-150 whitespace-pre-wrap">
                          {task.description.includes('Notes:') 
                            ? task.description.split('Notes:')[1]?.trim() 
                            : task.description.replace(/🔧 Service:.*\n?|🧑‍⚕️ Assigned:.*\n?/g, '').trim() || 'No appointment details.'}
                        </p>
                      </div>

                      {/* Actions footer */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3.5 mt-4">
                        <div className="text-[11px] font-mono text-slate-400 font-bold">
                          {term.patientLabel}: <span className="font-extrabold text-slate-600">{task.contactName}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* ⚡ Send Confirmation Trigger */}
                          <button
                            onClick={() => handleSendWhatsAppConfirm(task)}
                            className="flex items-center gap-1 text-[10px] font-black bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-3xs"
                            title="Format and Send WhatsApp Confirmation to patient"
                          >
                            <Zap className="h-3 w-3 text-amber-400" />
                            ⚡ Send Confirm
                          </button>

                          {/* Jump to chat */}
                          {task.contactPhone && (
                            <button
                              onClick={() => onSelectContact(task.contactPhone)}
                              className="flex items-center gap-1 text-[10px] font-bold bg-teal-50 hover:bg-teal-150 text-teal-700 px-2.5 py-1.5 rounded-lg border border-teal-150 transition-colors cursor-pointer"
                            >
                              <Phone className="h-3 w-3 text-teal-400" />
                              Chat Log
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
