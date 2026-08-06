import React, { useState, useEffect, useRef } from 'react';
import { authenticatedFetch } from '../auth/apiClient';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Phone, 
  Mail, 
  Calendar, 
  Layers, 
  FileText, 
  Clock, 
  MessageSquare, 
  Activity, 
  Save, 
  Plus, 
  DollarSign, 
  CheckCircle,
  HelpCircle,
  User,
  Zap,
  Tag,
  Camera,
  Trash2,
  Globe,
  Upload,
  Loader2
} from 'lucide-react';
import { Contact, Interaction, InteractionType } from '../types';
import { INDUSTRIES, IndustryType, getSectorDefinition } from '../industryConfig';

interface ContactSlideOutProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStage: (id: string, stage: 'Inquiry' | 'Scheduled' | 'Visited' | 'Treatment' | 'Completed') => void;
  onUpdateContactNotes: (id: string, notes: string) => void;
  onUpdateContactTreatment: (id: string, type: string, value: number) => void;
  onUpdateContactPhotos: (id: string, photos: string[]) => void;
  interactions: Interaction[];
  onAddInteraction: (contactId: string, type: InteractionType, notes: string) => void;
  industryId?: IndustryType;
}

export const ContactSlideOut: React.FC<ContactSlideOutProps> = ({
  contact,
  isOpen,
  onClose,
  onUpdateStage,
  onUpdateContactNotes,
  onUpdateContactTreatment,
  onUpdateContactPhotos,
  interactions,
  onAddInteraction,
  industryId = 'dental',
}) => {
  const config = getSectorDefinition(industryId);
  const term = config.terminology;

  // Local state for editing fields
  const [localNotes, setLocalNotes] = useState('');
  const [localTreatmentType, setLocalTreatmentType] = useState('');
  const [localTreatmentValue, setLocalTreatmentValue] = useState<number>(0);
  const [isSaved, setIsSaved] = useState(false);

  // Photo uploads & Google Business Profile Sync states
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [syncingPhotoIndex, setSyncingPhotoIndex] = useState<number | null>(null);
  const [photoSyncStatus, setPhotoSyncStatus] = useState<{ [key: number]: { success: boolean; message: string; url?: string } }>({});
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const currentPhotos = contact.photos || [];
      const updatedPhotos = [...currentPhotos, base64];
      onUpdateContactPhotos(contact.id, updatedPhotos);
      onAddInteraction(contact.id, 'Note', `Uploaded clinical photo "${file.name}" to profile.`);
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    };
    reader.onerror = () => {
      setIsUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSyncPhotoToGbp = async (photoBase64: string, index: number) => {
    setSyncingPhotoIndex(index);
    try {
      const businessName = localStorage.getItem('nestam_business_name') || 'My Practice';

      const response = await authenticatedFetch('/api/sync-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          photoBase64,
          businessName,
          fileName: `contact_${contact.name.replace(/\s+/g, '_')}_photo_${index + 1}.jpg`,
          category: 'additional'
        })
      });

      const res = await response.json();

      if (res.success) {
        setPhotoSyncStatus(prev => ({
          ...prev,
          [index]: { success: true, message: res.message, url: res.viewUrl }
        }));
        onAddInteraction(contact.id, 'Note', `Synced profile photo #${index + 1} to Google Business Listing for "${businessName}".`);
      } else {
        setPhotoSyncStatus(prev => ({
          ...prev,
          [index]: { success: false, message: res.error || 'Sync failed.' }
        }));
      }
    } catch (err: any) {
      setPhotoSyncStatus(prev => ({
        ...prev,
        [index]: { success: false, message: 'Sync error occurred.' }
      }));
    } finally {
      setSyncingPhotoIndex(null);
    }
  };

  const handleDeletePhoto = (index: number) => {
    const currentPhotos = contact.photos || [];
    const updatedPhotos = currentPhotos.filter((_, i) => i !== index);
    onUpdateContactPhotos(contact.id, updatedPhotos);

    setPhotoSyncStatus(prev => {
      const copy = { ...prev };
      delete copy[index];
      // Shift indices back for remaining statuses
      const newStatus: typeof prev = {};
      Object.keys(copy).forEach(k => {
        const ki = parseInt(k);
        if (ki > index) {
          newStatus[ki - 1] = copy[ki];
        } else {
          newStatus[ki] = copy[ki];
        }
      });
      return newStatus;
    });
  };

  // New Interaction Form
  const [newLogType, setNewLogType] = useState<InteractionType>('Note');
  const [newLogNotes, setNewLogNotes] = useState('');

  useEffect(() => {
    if (contact) {
      setLocalNotes(contact.notes || '');
      setLocalTreatmentType(contact.treatmentType || '');
      setLocalTreatmentValue(contact.treatmentValue || 0);
      setIsSaved(false);
    }
  }, [contact]);

  if (!contact) return null;

  // Filter interaction history for this contact only
  const contactInteractions = interactions
    .filter(i => i.contactId === contact.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleSaveChanges = () => {
    onUpdateContactNotes(contact.id, localNotes);
    onUpdateContactTreatment(contact.id, localTreatmentType, localTreatmentValue);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogNotes.trim()) return;

    onAddInteraction(contact.id, newLogType, newLogNotes);
    setNewLogNotes('');
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const stages: Array<'Inquiry' | 'Scheduled' | 'Visited' | 'Treatment' | 'Completed'> = [
    'Inquiry', 'Scheduled', 'Visited', 'Treatment', 'Completed'
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Slideout Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xs z-40 cursor-pointer"
          />

          {/* Slideout Side Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl border-l border-slate-100 z-50 flex flex-col h-full overflow-hidden"
          >
            {/* Header section */}
            <div className="p-6 bg-slate-900 text-white shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-extrabold text-sm uppercase">
                  {contact.name.substring(0, 2)}
                </div>
                <div>
                  <h3 className="text-sm font-black font-display tracking-tight leading-none">{contact.name}</h3>
                  <span className="text-[10px] text-teal-400 font-mono mt-1 block">{contact.phone}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Body content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* 1. Quick Info details */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    WhatsApp Number
                  </span>
                  <a 
                    href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-teal-600 flex items-center gap-1 hover:underline"
                  >
                    <Phone className="h-3 w-3 shrink-0" />
                    {contact.phone}
                  </a>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Email Address
                  </span>
                  {contact.email ? (
                    <a 
                      href={`mailto:${contact.email}`}
                      className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline truncate"
                    >
                      <Mail className="h-3 w-3 shrink-0" />
                      {contact.email}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-450 italic font-medium">None added</span>
                  )}
                </div>
              </div>

              {/* 2. Interactive Pipeline Stage Tracker */}
              <div className="space-y-2">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                  Pipeline Stage (Active Cycle)
                </label>
                
                <div className="grid grid-cols-5 gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-150">
                  {stages.map((st) => {
                    const isActive = (contact.pipelineStage || 'Inquiry') === st;
                    return (
                      <button
                        key={st}
                        onClick={() => onUpdateStage(contact.id, st)}
                        className={`py-2 px-1 rounded-lg text-[9px] font-black text-center transition-all cursor-pointer ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-3xs font-extrabold scale-102'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-bold'
                        }`}
                        title={`Move contact to ${st} stage`}
                      >
                        {st.substring(0, 4)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Clinical treatment assignment & cost info */}
              <div className="space-y-3.5 bg-slate-50/50 p-4 rounded-xl border border-slate-150">
                <h4 className="text-[10px] font-black text-slate-450 uppercase tracking-widest flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5 text-teal-600" />
                  Service & Procedure Billing
                </h4>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                      {term.treatmentLabel} Type
                    </label>
                    <input
                      type="text"
                      value={localTreatmentType}
                      onChange={(e) => setLocalTreatmentType(e.target.value)}
                      placeholder="e.g. Teeth Whitening"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-teal-500 text-slate-750"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                      Value / Price (₹)
                    </label>
                    <input
                      type="number"
                      value={localTreatmentValue}
                      onChange={(e) => setLocalTreatmentValue(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-teal-500 text-slate-750"
                    />
                  </div>
                </div>

                {contact.amountCollected !== undefined && contact.amountCollected > 0 && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 flex items-center justify-between text-emerald-800 font-medium animate-fade-in">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded bg-emerald-500 text-white font-extrabold flex items-center justify-center font-mono text-[10px]">₹</div>
                      <div>
                        <p className="text-[9px] font-bold uppercase text-emerald-600 tracking-wider">Payment Collected</p>
                        <p className="text-xs font-black">
                          ₹{contact.amountCollected.toLocaleString('en-IN')}
                          {contact.paymentMethod && <span className="font-normal text-[10px] text-emerald-700 ml-1.5">via {contact.paymentMethod}</span>}
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider scale-95">Paid</span>
                  </div>
                )}

                {/* Patient Clinical Notes */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block flex items-center justify-between">
                    <span>Clinical History / Context notes</span>
                    {isSaved && (
                      <span className="text-emerald-600 font-bold normal-case text-[9px] flex items-center gap-0.5">
                        <CheckCircle className="h-3 w-3" /> Saved!
                      </span>
                    )}
                  </label>
                  <textarea
                    rows={4}
                    value={localNotes}
                    onChange={(e) => setLocalNotes(e.target.value)}
                    placeholder="Provide patient complaints, dental history, treatment updates, or scheduling preferences..."
                    className="w-full p-3 bg-white border border-slate-200 focus:border-teal-500 rounded-xl text-xs font-semibold focus:outline-none resize-none text-slate-700 leading-relaxed"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSaveChanges}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black rounded-lg transition-colors cursor-pointer shadow-3xs"
                  >
                    <Save className="h-3 w-3" />
                    Save Service Details
                  </button>
                </div>
              </div>

              {/* Patient / Clinical Photos Sync Section */}
              <div className="space-y-3.5 bg-slate-50/50 p-4 rounded-xl border border-slate-150">
                <h4 className="text-[10px] font-black text-slate-450 uppercase tracking-widest flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Camera className="h-3.5 w-3.5 text-teal-600" />
                    Patient / Clinical Photos Sync
                  </span>
                  <span className="text-[9px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                    <Globe className="h-2.5 w-2.5" /> GBP API Active
                  </span>
                </h4>

                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  Upload patient clinical records, treatments, or showcase before-and-after photos and sync them directly to your verified Google Business Profile.
                </p>

                {/* Upload Button Box */}
                <div>
                  <input
                    type="file"
                    ref={photoInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploadingPhoto}
                    onClick={() => photoInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 text-[10px] font-extrabold rounded-xl transition-all cursor-pointer shadow-3xs disabled:opacity-50"
                  >
                    {isUploadingPhoto ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-650" />
                        Reading image file...
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5 text-slate-500" />
                        Upload New Photo
                      </>
                    )}
                  </button>
                </div>

                {/* Grid of uploaded/synced photos */}
                {contact.photos && contact.photos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {contact.photos.map((photo, index) => {
                      const status = photoSyncStatus[index];
                      const isSyncing = syncingPhotoIndex === index;
                      
                      return (
                        <div key={index} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-3xs flex flex-col justify-between p-2 space-y-2 group relative">
                          {/* Image preview */}
                          <div className="h-24 w-full rounded-lg overflow-hidden relative bg-slate-100">
                            <img
                              src={photo}
                              alt={`Clinic sync media #${index + 1}`}
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={() => handleDeletePhoto(index)}
                              className="absolute top-1 right-1 p-1 bg-rose-50/90 text-rose-600 hover:bg-rose-100 rounded-lg shadow-sm cursor-pointer transition-colors"
                              title="Delete Photo"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Sync Action & Status indicator */}
                          <div className="space-y-1.5">
                            {status?.success ? (
                              <div className="space-y-1">
                                <div className="text-[9px] text-emerald-700 font-extrabold flex items-center gap-1">
                                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  Google Business Synced
                                </div>
                                {status.url && (
                                  <a
                                    href={status.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[8px] text-indigo-600 hover:text-indigo-800 font-black hover:underline flex items-center gap-0.5"
                                  >
                                    <Globe className="h-2.5 w-2.5" />
                                    View Live Dashboard
                                  </a>
                                )}
                              </div>
                            ) : status && !status.success ? (
                              <div className="text-[9px] text-rose-600 font-bold leading-tight">
                                ❌ {status.message}
                              </div>
                            ) : null}

                            <button
                              type="button"
                              disabled={isSyncing}
                              onClick={() => handleSyncPhotoToGbp(photo, index)}
                              className={`w-full py-1.5 px-2 rounded-lg text-[9px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                status?.success
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50 hover:bg-emerald-100'
                                  : 'bg-teal-650 hover:bg-teal-700 text-white shadow-3xs'
                              }`}
                            >
                              {isSyncing ? (
                                <>
                                  <Loader2 className="h-2.5 w-2.5 animate-spin text-white animate-pulse" />
                                  Syncing...
                                </>
                              ) : status?.success ? (
                                <>
                                  <Globe className="h-2.5 w-2.5" />
                                  Sync Again
                                </>
                              ) : (
                                <>
                                  <Globe className="h-2.5 w-2.5" />
                                  Sync to Google
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-4 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-[10px] font-semibold">
                    No clinical photos uploaded for this {term.patientLabel.toLowerCase()} yet.
                  </div>
                )}
              </div>

              {/* 4. Timeline logs Section */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  Communication Logs Timeline
                </h4>

                {/* Form to log dynamic interaction */}
                <form onSubmit={handleAddLog} className="bg-slate-50 p-3.5 rounded-xl border border-slate-150 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Log New Interaction</span>
                    
                    <select
                      value={newLogType}
                      onChange={(e) => setNewLogType(e.target.value as InteractionType)}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold focus:outline-none"
                    >
                      <option value="Note">📝 Add Note</option>
                      <option value="WhatsApp Sent">💬 WhatsApp Outbound</option>
                      <option value="Incoming Message">📲 WhatsApp Inbound</option>
                      <option value="Phone Call">📞 Phone Callback</option>
                      <option value="In-Person">🏥 In-Person Consultation</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Discussed treatment, patient agrees to book RCT slot next week."
                      value={newLogNotes}
                      onChange={(e) => setNewLogNotes(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      className="px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      Log
                    </button>
                  </div>
                </form>

                {/* Items timeline list */}
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {contactInteractions.map((i) => {
                    let logIcon = <FileText className="h-3 w-3" />;
                    let logColor = 'bg-slate-100 text-slate-600 border border-slate-200';
                    
                    if (i.type.includes('WhatsApp')) {
                      logIcon = <MessageSquare className="h-3 w-3" />;
                      logColor = 'bg-emerald-100 text-emerald-700 border border-emerald-150';
                    } else if (i.type.includes('Call')) {
                      logIcon = <Phone className="h-3 w-3" />;
                      logColor = 'bg-blue-100 text-blue-700 border border-blue-150';
                    } else if (i.type === 'In-Person') {
                      logIcon = <Activity className="h-3 w-3" />;
                      logColor = 'bg-cyan-100 text-cyan-700 border border-cyan-150';
                    } else if (i.type === 'Calendar Follow-up') {
                      logIcon = <Calendar className="h-3 w-3" />;
                      logColor = 'bg-amber-100 text-amber-700 border border-amber-150';
                    }

                    return (
                      <div key={i.id} className="flex gap-3 items-start">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${logColor}`}>
                          {logIcon}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-black text-slate-700">{i.type}</span>
                            <span className="text-[9px] text-slate-400 font-mono">{formatTimestamp(i.timestamp)}</span>
                          </div>
                          <p className="text-[10px] text-slate-600 leading-normal font-medium">{i.notes}</p>
                        </div>
                      </div>
                    );
                  })}

                  {contactInteractions.length === 0 && (
                    <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-[10px]">
                      No communication logs recorded for this {term.patientLabel.toLowerCase()}.
                    </div>
                  )}
                </div>
              </div>

            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
