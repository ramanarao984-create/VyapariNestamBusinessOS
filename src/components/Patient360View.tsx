import React, { useState } from 'react';
import { 
  User, Phone, Mail, MessageSquare, Calendar, FileText, Activity, 
  DollarSign, Clock, ShieldCheck, ChevronRight, Edit3, MoreHorizontal,
  CheckCircle2, Plus, ArrowLeft, Filter, Heart, Stethoscope
} from 'lucide-react';
import { Contact } from '../types';

interface Patient360ViewProps {
  contact: Contact;
  onBack?: () => void;
  onEdit?: (contact: Contact) => void;
  onSchedule?: (contact: Contact) => void;
}

export const Patient360View: React.FC<Patient360ViewProps> = ({
  contact,
  onBack,
  onEdit,
  onSchedule
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'appointments' | 'treatments' | 'payments' | 'whatsapp' | 'files' | 'notes'>('timeline');

  const initials = contact.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();

  // Living Timeline events matching Screen 2 exact replica
  const timelineEvents = [
    { id: 'ev-1', time: '17 Jul 09:30 AM', title: 'Appointment Booked', desc: 'With Dr. Sai Krishna for Tooth Filling', type: 'appointment' },
    { id: 'ev-2', time: '17 Jul 09:35 AM', title: 'Patient Checked-in', desc: 'Arrived at clinic', type: 'checkin' },
    { id: 'ev-3', time: '17 Jul 09:40 AM', title: 'Treatment Completed', desc: 'Tooth Filling - Upper Right Molar', type: 'treatment' },
    { id: 'ev-4', time: '17 Jul 09:50 AM', title: 'Invoice Created', desc: 'INV-2026-1254 • ₹2,950', type: 'invoice' },
    { id: 'ev-5', time: '17 Jul 09:55 AM', title: 'Payment Received', desc: 'UPI Payment • ₹2,950', type: 'payment' },
    { id: 'ev-6', time: '17 Jul 10:00 AM', title: 'WhatsApp Message Sent', desc: 'Post treatment care instructions', type: 'whatsapp' },
    { id: 'ev-7', time: '17 Jul 10:05 AM', title: 'AI Summary Generated', desc: 'Treatment compliance score: Good', type: 'ai' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
          {onBack && (
            <button onClick={onBack} className="hover:text-slate-900 flex items-center gap-1 cursor-pointer">
              <ArrowLeft className="h-3.5 w-3.5" /> Patients
            </button>
          )}
          <span>/</span>
          <span className="text-slate-900 font-extrabold">{contact.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit && onEdit(contact)}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 text-xs rounded-xl shadow-3xs transition-colors cursor-pointer"
          >
            Edit Profile
          </button>
          <button className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl cursor-pointer">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Patient Summary Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Patient Details */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-teal-600 text-white font-black text-xl rounded-2xl flex items-center justify-center shadow-md">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black font-display text-slate-900">{contact.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {contact.category || 'Active'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-1">
                32 Y • Female • {contact.phone}
              </p>
              
              {/* Communication Icons */}
              <div className="flex items-center gap-2 mt-2">
                <button className="p-1.5 bg-slate-50 hover:bg-teal-50 text-slate-600 hover:text-teal-700 rounded-lg border border-slate-200 text-xs flex items-center gap-1 cursor-pointer font-bold">
                  <Phone className="h-3 w-3" /> Call
                </button>
                <button className="p-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-lg border border-slate-200 text-xs flex items-center gap-1 cursor-pointer font-bold">
                  <MessageSquare className="h-3 w-3" /> WhatsApp
                </button>
                <button className="p-1.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg border border-slate-200 text-xs flex items-center gap-1 cursor-pointer font-bold">
                  <Mail className="h-3 w-3" /> Email
                </button>
              </div>
            </div>
          </div>

          {/* Key Metric Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-center">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase">Total Visits</p>
              <p className="text-lg font-black text-slate-900 mt-0.5">12</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-center">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase">Total Spent</p>
              <p className="text-lg font-black text-teal-700 font-mono mt-0.5">₹24,500</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-center">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase">Outstanding</p>
              <p className="text-lg font-black text-rose-600 font-mono mt-0.5">₹3,450</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-center">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase">Next Appt</p>
              <p className="text-xs font-black text-slate-900 mt-1">18 Jul 2026</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-center col-span-2 sm:col-span-1">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase">Next Follow-up</p>
              <p className="text-lg font-black text-slate-900 mt-0.5">26</p>
            </div>
          </div>

        </div>

        {/* Patient Section Tabs */}
        <div className="flex items-center gap-1 border-t border-slate-100 pt-3 overflow-x-auto text-xs font-bold">
          {['overview', 'timeline', 'appointments', 'treatments', 'payments', 'whatsapp', 'files', 'notes'].map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t as any)}
              className={`px-3.5 py-1.5 rounded-xl capitalize transition-all cursor-pointer whitespace-nowrap ${
                activeTab === t
                  ? 'bg-slate-900 text-white shadow-3xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Living Timeline + Patient Summary Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Living Timeline Feed (Span 8) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm font-display flex items-center gap-2">
              <Activity className="h-4 w-4 text-teal-600" />
              Living Patient Activity Timeline
            </h3>
            <button className="text-xs text-slate-500 font-bold hover:text-slate-900 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Filter Timeline
            </button>
          </div>

          {/* Timeline Events List */}
          <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
            {timelineEvents.map((ev, idx) => (
              <div key={ev.id} className="relative group">
                {/* Node Bullet */}
                <div className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-teal-500 border-2 border-white shadow-3xs" />
                
                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-150 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-900">{ev.title}</span>
                    <span className="font-mono text-[10px] text-slate-400 font-bold">{ev.time}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">{ev.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-xl border border-slate-200 cursor-pointer">
            Load Older Activity
          </button>
        </div>

        {/* Patient Health Summary Card (Span 4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs font-semibold">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Stethoscope className="h-4 w-4 text-teal-600" />
              Clinical Summary
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400 font-bold">Blood Group</span>
                <span className="font-extrabold text-slate-900">B+</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400 font-bold">Allergies</span>
                <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">Penicillin</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400 font-bold">Medical Conditions</span>
                <span className="font-extrabold text-slate-900">None</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400 font-bold">Preferred Language</span>
                <span className="font-extrabold text-slate-900">Telugu</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block mb-1">Clinical Notes</span>
                <p className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 text-slate-700 text-xs font-medium leading-relaxed">
                  Good oral hygiene. Follow up scheduled for crown fitment after 10 days.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
