import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  MapPin, 
  Layers, 
  MessageSquare, 
  FileSpreadsheet, 
  Calendar, 
  Globe, 
  Plus, 
  Trash2, 
  Volume2, 
  Activity, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles,
  HelpCircle,
  AlertTriangle,
  Smile,
  Zap
} from 'lucide-react';
import { INDUSTRIES, IndustryType, getSectorDefinition } from '../industryConfig';

import { VyapariNestamLogo } from './VyapariNestamLogo';

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  duration: string;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface OnboardingWizardProps {
  onComplete: (data: {
    businessName: string;
    cityLandmark: string;
    selectedIndustry: IndustryType;
    channels: string[];
    services: ServiceItem[];
    faqs: FAQItem[];
    brandTone: string;
    painPoints: string[];
  }) => void;
  onClose: () => void;
  currentIndustry?: IndustryType;
  currentBusinessName?: string;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  onComplete,
  onClose,
  currentIndustry = 'dental',
  currentBusinessName = '',
}) => {
  const [step, setStep] = useState(1);
  
  // Step 1: Profile
  const [businessName, setBusinessName] = useState(currentBusinessName || getSectorDefinition(currentIndustry).defaultBusinessName);
  const [cityLandmark, setCityLandmark] = useState('Vijayawada, AP');
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>(currentIndustry);

  // Step 2: Channels
  const [channels, setChannels] = useState<string[]>(['whatsapp', 'sheets', 'calendar']);

  // Step 3: Services Catalog
  const [services, setServices] = useState<ServiceItem[]>([
    { id: '1', name: 'General Consultation', price: 500, duration: '15 mins' },
    { id: '2', name: 'Premium Scaling & Cleaning', price: 1200, duration: '30 mins' },
    { id: '3', name: 'Painless Root Canal (RCT)', price: 4500, duration: '45 mins' },
  ]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<number | ''>('');
  const [newServiceDuration, setNewServiceDuration] = useState('30 mins');

  // Step 4: Custom FAQs
  const [faqs, setFaqs] = useState<FAQItem[]>([
    { id: '1', question: 'Do you offer Sunday appointments?', answer: 'We are open Mon-Sat 9 AM - 8 PM. Sundays are for pre-booked emergency cases only.' },
    { id: '2', question: 'Is there a digital X-ray facility?', answer: 'Yes! We have state-of-the-art diagnostic digital X-rays on-site for just ₹200.' }
  ]);
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');

  // Step 5: Brand Tone
  const [brandTone, setBrandTone] = useState('mixed-telugu');

  // Step 6: Pain Points
  const [painPoints, setPainPoints] = useState<string[]>([
    'manual-reminders',
    'lost-leads'
  ]);

  // Load industry defaults when changing industry in step 1
  const handleIndustryChange = (ind: IndustryType) => {
    setSelectedIndustry(ind);
    const config = getSectorDefinition(ind);
    setBusinessName(config.defaultBusinessName);
    
    // Set some appropriate default services based on industry
    if (ind === 'dental') {
      setServices([
        { id: '1', name: 'General Dental Consultation', price: 500, duration: '15 mins' },
        { id: '2', name: 'Premium Scaling & Cleaning', price: 1200, duration: '30 mins' },
        { id: '3', name: 'Painless Root Canal (RCT)', price: 4500, duration: '45 mins' },
      ]);
    } else if (ind === 'dermatology') {
      setServices([
        { id: '1', name: 'Dermatology Skin Evaluation', price: 800, duration: '20 mins' },
        { id: '2', name: 'Laser Hair Removal Session', price: 3500, duration: '45 mins' },
        { id: '3', name: 'HydraFacial Clinical Treatment', price: 5000, duration: '60 mins' },
      ]);
    } else if (ind === 'multispecialty') {
      setServices([
        { id: '1', name: 'General Physician OPD Consult', price: 400, duration: '15 mins' },
        { id: '2', name: 'Full Body Health Screening', price: 2999, duration: '60 mins' },
        { id: '3', name: 'Specialist OPD Consultation', price: 700, duration: '20 mins' },
      ]);
    } else if (ind === 'physiotherapy') {
      setServices([
        { id: '1', name: 'Initial Physio Assessment', price: 600, duration: '30 mins' },
        { id: '2', name: 'Targeted Spine/Joint Therapy', price: 1200, duration: '45 mins' },
        { id: '3', name: 'Rehabilitation Session', price: 1500, duration: '60 mins' },
      ]);
    } else if (ind === 'diagnostics') {
      setServices([
        { id: '1', name: 'Complete Blood Count (CBC)', price: 350, duration: '10 mins' },
        { id: '2', name: 'Thyroid Profile Test', price: 650, duration: '10 mins' },
        { id: '3', name: 'Full Executive Diagnostic Package', price: 2499, duration: '30 mins' },
      ]);
    }

  };

  const toggleChannel = (ch: string) => {
    if (channels.includes(ch)) {
      setChannels(channels.filter(c => c !== ch));
    } else {
      setChannels([...channels, ch]);
    }
  };

  const handleAddService = () => {
    if (!newServiceName) return;
    const item: ServiceItem = {
      id: Date.now().toString(),
      name: newServiceName,
      price: newServicePrice === '' ? 0 : newServicePrice,
      duration: newServiceDuration
    };
    setServices([...services, item]);
    setNewServiceName('');
    setNewServicePrice('');
  };

  const handleDeleteService = (id: string) => {
    setServices(services.filter(s => s.id !== id));
  };

  const handleAddFaq = () => {
    if (!newFaqQuestion || !newFaqAnswer) return;
    const item: FAQItem = {
      id: Date.now().toString(),
      question: newFaqQuestion,
      answer: newFaqAnswer
    };
    setFaqs([...faqs, item]);
    setNewFaqQuestion('');
    setNewFaqAnswer('');
  };

  const handleDeleteFaq = (id: string) => {
    setFaqs(faqs.filter(f => f.id !== id));
  };

  const togglePainPoint = (pp: string) => {
    if (painPoints.includes(pp)) {
      setPainPoints(painPoints.filter(p => p !== pp));
    } else {
      setPainPoints([...painPoints, pp]);
    }
  };

  const handleNext = () => {
    if (step < 6) {
      setStep(step + 1);
    } else {
      // Complete!
      onComplete({
        businessName,
        cityLandmark,
        selectedIndustry,
        channels,
        services,
        faqs,
        brandTone,
        painPoints
      });
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Get Brand Tone Preview Text
  const getTonePreview = () => {
    const biz = businessName || "Our Clinic";
    switch (brandTone) {
      case 'mixed-telugu':
        return `Namaste client garu! 🦷 ${biz} nundi message chestunnamu. Your appointment slot confirmation details are enclosed format lo. Please contact us for any dynamic help! 🙏✨`;
      case 'warm-friendly':
        return `Hello dear! We hope you are having an absolutely wonderful day. This is a quick friendly reminder from your family at ${biz}. We are excited to see you and care for your wellness! 💖`;
      case 'formal-professional':
        return `Dear Client, this is an official message from the administration desk at ${biz}. We hereby confirm that your scheduled appointment is fully reserved in our system. Thank you for your cooperation.`;
      case 'direct-informative':
        return `Appointment Confirmation: ${biz}. Time slot secured. Location: ${cityLandmark}. To reschedule or cancel, reply directly to this thread or phone the office. Thank you.`;
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* Wizard Header */}
        <div className="bg-[#FAF9F5] border-b border-slate-200/80 p-5 sm:p-6 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <VyapariNestamLogo 
              variant="full" 
              symbolClassName="h-10 w-10" 
              textClassName="text-slate-900 text-base font-black"
              taglineClassName="text-slate-600 text-[10px] font-bold"
              showTagline={true}
            />
          </div>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 text-xs font-bold transition-all px-3 py-1.5 hover:bg-slate-200/70 rounded-xl"
          >
            Skip Wizard
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-slate-100 h-1.5 w-full flex">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div 
              key={i} 
              className={`h-full flex-1 transition-all duration-300 ${
                i <= step ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Steps Info */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-150 flex items-center justify-between text-xs font-bold text-slate-500 tracking-wider uppercase">
          <span>Step {step} of 6</span>
          <span>
            {step === 1 && '🏢 Business Profile & Industry'}
            {step === 2 && '🔌 Connected Channels'}
            {step === 3 && '🛍️ Services Catalog'}
            {step === 4 && '💬 Frequently Asked Questions'}
            {step === 5 && '🗣️ Brand Tone & Voice Preview'}
            {step === 6 && '🚨 Pain Points & Business Goals'}
          </span>
        </div>

        {/* Wizard Scrollable Body */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              
              {/* STEP 1: BUSINESS PROFILE */}
              {step === 1 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <h4 className="text-base font-extrabold text-slate-800">Tell us about your business</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      This information adapts the CRM's terminology, pricing formulas, and automatically populates WhatsApp template variables.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                        Business / Clinic Name
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="e.g. Sri Sai Dental Clinic"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs focus:outline-none text-slate-700 font-semibold transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                        City & Primary Landmark
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          value={cityLandmark}
                          onChange={(e) => setCityLandmark(e.target.value)}
                          placeholder="e.g. Benz Circle, Vijayawada"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs focus:outline-none text-slate-700 font-semibold transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                      Select Industry Sector
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {(Object.keys(INDUSTRIES) as IndustryType[]).map((indId) => {
                        const ind = getSectorDefinition(indId);
                        const isSelected = selectedIndustry === indId;
                        return (
                          <button
                            key={indId}
                            type="button"
                            onClick={() => handleIndustryChange(indId)}
                            className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2.5 cursor-pointer ${
                              isSelected
                                ? 'bg-slate-900 border-slate-900 text-white shadow-md scale-102 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/80 hover:border-slate-350'
                            }`}
                          >
                            <span className="text-3xl">{ind.icon}</span>
                            <span className="text-[10px] leading-tight block font-bold">{ind.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 text-xs text-emerald-800 flex items-start gap-2.5 mt-2">
                    <Zap className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">CRM Custom Terminology Configured:</p>
                      <p className="mt-1 leading-relaxed text-emerald-750">
                        Selected industry utilizes label <span className="font-extrabold underline">"{getSectorDefinition(selectedIndustry).terminology.patientLabel}"</span> instead of Client, services represented as <span className="font-extrabold underline">"{getSectorDefinition(selectedIndustry).terminology.treatmentLabel}"</span> and manager staff as <span className="font-extrabold underline">"{getSectorDefinition(selectedIndustry).terminology.doctorLabel}"</span>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: CHANNELS */}
              {step === 2 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <h4 className="text-base font-extrabold text-slate-800">Connected Channels & Workspaces</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      We support full integration across channels. Toggle which channels you want active in this workspace sandbox.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* WhatsApp */}
                    <div 
                      onClick={() => toggleChannel('whatsapp')}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex gap-4 ${
                        channels.includes('whatsapp') 
                          ? 'border-emerald-500 bg-emerald-50/20 shadow-sm' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className={`p-3 rounded-xl shrink-0 ${channels.includes('whatsapp') ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        <MessageSquare className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          WhatsApp Automation API
                          {channels.includes('whatsapp') && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                        </h5>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Dispatches automated triggers, instant appointment confirmations, and reviews inquiries with AI Copilot.
                        </p>
                      </div>
                    </div>

                    {/* Google Sheets */}
                    <div 
                      onClick={() => toggleChannel('sheets')}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex gap-4 ${
                        channels.includes('sheets') 
                          ? 'border-blue-500 bg-blue-50/20 shadow-sm' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className={`p-3 rounded-xl shrink-0 ${channels.includes('sheets') ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                        <FileSpreadsheet className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          Google Sheets Synchronization
                          {channels.includes('sheets') && <Check className="h-3.5 w-3.5 text-blue-600" />}
                        </h5>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Establishes live two-way synchronization of contacts, pipeline values, and logs directly with a sheet in Drive.
                        </p>
                      </div>
                    </div>

                    {/* Google Calendar */}
                    <div 
                      onClick={() => toggleChannel('calendar')}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex gap-4 ${
                        channels.includes('calendar') 
                          ? 'border-amber-500 bg-amber-50/20 shadow-sm' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className={`p-3 rounded-xl shrink-0 ${channels.includes('calendar') ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Calendar className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          Google Calendar Scheduler
                          {channels.includes('calendar') && <Check className="h-3.5 w-3.5 text-amber-600" />}
                        </h5>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Saves diagnostic consultations, follow-up calls, and appointments, arming notifications instantly.
                        </p>
                      </div>
                    </div>

                    {/* Google Business Profile */}
                    <div 
                      onClick={() => toggleChannel('gbp')}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex gap-4 ${
                        channels.includes('gbp') 
                          ? 'border-cyan-500 bg-cyan-50/20 shadow-sm' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className={`p-3 rounded-xl shrink-0 ${channels.includes('gbp') ? 'bg-cyan-100 text-cyan-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Globe className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          Google SEO & Business Profile
                          {channels.includes('gbp') && <Check className="h-3.5 w-3.5 text-cyan-600" />}
                        </h5>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Enables Google Business Profile listing checklist, feedback review triggers, and local keyword analyzer.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: SERVICES CATALOG */}
              {step === 3 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <h4 className="text-base font-extrabold text-slate-800">Services & Pricing Catalog</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Build your primary service menu. Our AI Co-pilot reads these exact prices and durations to draft accurate quotes for clients automatically over WhatsApp.
                    </p>
                  </div>

                  {/* Add New Service Form */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-5 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Service Name</label>
                      <input
                        type="text"
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        placeholder="e.g. Teeth Alignment Consultation"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="sm:col-span-3 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Price (₹)</label>
                      <input
                        type="number"
                        value={newServicePrice}
                        onChange={(e) => setNewServicePrice(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="e.g. 1500"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Duration</label>
                      <select
                        value={newServiceDuration}
                        onChange={(e) => setNewServiceDuration(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                      >
                        <option value="15 mins">15 mins</option>
                        <option value="30 mins">30 mins</option>
                        <option value="45 mins">45 mins</option>
                        <option value="60 mins">60 mins</option>
                        <option value="90 mins">90 mins</option>
                        <option value="120 mins">120 mins</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={handleAddService}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Services List */}
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {services.map((item) => (
                      <div 
                        key={item.id} 
                        className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl hover:shadow-3xs transition-shadow"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Estimated Duration: {item.duration}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold font-mono text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                            {item.price > 0 ? `₹${item.price.toLocaleString('en-IN')}` : 'Free'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteService(item.id)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {services.length === 0 && (
                      <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs">
                        No services added yet. Create at least one service offering.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: CUSTOM FAQS */}
              {step === 4 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <h4 className="text-base font-extrabold text-slate-800">Frequently Asked Questions (FAQs)</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Log common inquiries (timings, coordinates, facilities). The AI Vyapari Nestam Chatbot reads this directly to resolve doubts instantaneously.
                    </p>
                  </div>

                  {/* Add New FAQ Form */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Question</label>
                      <input
                        type="text"
                        value={newFaqQuestion}
                        onChange={(e) => setNewFaqQuestion(e.target.value)}
                        placeholder="e.g. Do you accept credit cards or UPI scan?"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Answer Response</label>
                      <textarea
                        rows={2}
                        value={newFaqAnswer}
                        onChange={(e) => setNewFaqAnswer(e.target.value)}
                        placeholder="e.g. Yes! We accept all major Credit/Debit cards, UPI payments via GPay/PhonePe, and cash payments at the registration desk."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-500 resize-none"
                      />
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleAddFaq}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add FAQ Rule
                      </button>
                    </div>
                  </div>

                  {/* FAQ List */}
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {faqs.map((faq) => (
                      <div 
                        key={faq.id} 
                        className="p-3.5 bg-white border border-slate-200 rounded-xl hover:shadow-3xs transition-shadow flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-800">Q: {faq.question}</p>
                          <p className="text-[11px] text-slate-500 leading-normal">A: {faq.answer}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteFaq(faq.id)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {faqs.length === 0 && (
                      <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs">
                        No FAQs added yet. Custom FAQs provide localized intelligence to the AI.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 5: BRAND TONE & PREVIEW */}
              {step === 5 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <h4 className="text-base font-extrabold text-slate-800">Select Brand Tone & Voice Style</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Tailor how the AI chatbot drafts messages or responds to clients. Try different options to preview the greeting!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
                    {[
                      { id: 'mixed-telugu', label: 'Telugu-Tanglish Mix', icon: '🗣️', desc: 'Warm Telugu-English mixed conversational greeting' },
                      { id: 'warm-friendly', label: 'Warm & Friendly', icon: '🤗', desc: 'Gentle, comforting and deeply caring family tone' },
                      { id: 'formal-professional', label: 'Formal & Polished', icon: '👔', desc: 'Direct, administrative, authoritative and professional' },
                      { id: 'direct-informative', label: 'Brief & Direct', icon: '📝', desc: 'Short, clean message with pure parameters' }
                    ].map((tone) => (
                      <button
                        key={tone.id}
                        type="button"
                        onClick={() => setBrandTone(tone.id)}
                        className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between h-36 cursor-pointer ${
                          brandTone === tone.id
                            ? 'bg-emerald-50 border-emerald-500 shadow-3xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-2xl">{tone.icon}</span>
                          {brandTone === tone.id && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-800">{tone.label}</h5>
                          <p className="text-[9px] text-slate-400 leading-tight mt-0.5">{tone.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Brand Tone Preview Display */}
                  <div className="space-y-2 pt-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                      <Volume2 className="h-3.5 w-3.5 text-indigo-500" />
                      Live AI Drafting Preview (WhatsApp Text)
                    </label>
                    <div className="bg-slate-900 text-white rounded-2xl p-4 font-mono text-[11px] leading-relaxed relative border border-slate-800">
                      <div className="absolute right-3.5 top-3.5 px-2 py-0.5 bg-emerald-500 text-slate-950 rounded-full text-[8px] font-bold uppercase tracking-wider">
                        Dynamic Draft
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed max-w-lg">
                        {getTonePreview()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: PAIN POINTS */}
              {step === 6 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <h4 className="text-base font-extrabold text-slate-800">Identify Pain Points & Growth Goals</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Select which operational bottle-necks you are looking to address. This loads tailored local alerts on your main Dashboard!
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {[
                      { id: 'manual-reminders', title: 'Tired of manual patient WhatsApp reminders', desc: 'Enable quick 1-click confirmation dispatches directly from the Google Calendar tab.' },
                      { id: 'lost-leads', title: 'Inquiries slipping away / poor callback tracking', desc: 'Activate CRM Action Center smart alerts alerting staff of uncontacted leads.' },
                      { id: 'no-sheets-sync', title: 'Cannot synchronize customer database with Sheets', desc: 'Provides active OAuth syncing linking contacts live with shared worksheets.' },
                      { id: 'low-seo-reviews', title: 'Google Business listing lacks local review velocity', desc: 'Activate SEO Audit engine recommendations and auto-review dispatches.' }
                    ].map((pt) => {
                      const active = painPoints.includes(pt.id);
                      return (
                        <div
                          key={pt.id}
                          onClick={() => togglePainPoint(pt.id)}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                            active
                              ? 'border-emerald-500 bg-emerald-50/10'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border mt-0.5 flex items-center justify-center shrink-0 ${
                            active ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'
                          }`}>
                            {active && <Check className="h-3.5 w-3.5" />}
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-slate-800">{pt.title}</h5>
                            <p className="text-[10px] text-slate-500 leading-normal mt-0.5">{pt.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-500 leading-relaxed">
                    🌟 <strong>Perfect fit!</strong> We will auto-tune your WhatsCRM layout based on these growth configurations, loaded with presets tailored for <strong>{getSectorDefinition(selectedIndustry).name}</strong>.
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Wizard Footer Actions */}
        <div className="bg-slate-50 p-6 border-t border-slate-150 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handlePrev}
            disabled={step === 1}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-750 text-xs font-bold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Previous
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            {step === 6 ? 'Complete Onboarding & Configure 🚀' : 'Continue'}
            {step < 6 ? <ArrowRight className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          </button>
        </div>

      </motion.div>
    </div>
  );
};
