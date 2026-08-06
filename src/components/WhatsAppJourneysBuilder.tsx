import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  GitCommit, 
  Clock, 
  MessageSquare, 
  Plus, 
  Trash2, 
  TrendingUp, 
  CheckCircle2, 
  Edit3, 
  ChevronDown, 
  Settings2,
  Sparkles,
  Info,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { IndustryType, INDUSTRIES } from '../industryConfig';
import { MessageTemplate } from '../types';

interface JourneyStep {
  id: string;
  label: string;
  delay: string; // e.g. "Immediate", "1 Day", "3 Days"
  templateId: string;
  templateText: string;
}

interface CustomerJourney {
  id: string;
  name: string;
  triggerStage: string;
  isActive: boolean;
  steps: JourneyStep[];
  stats: {
    enrolled: number;
    delivered: number;
    conversions: number;
  };
}

interface WhatsAppJourneysBuilderProps {
  industryId: IndustryType;
  templates: MessageTemplate[];
  businessName: string;
}

export const WhatsAppJourneysBuilder: React.FC<WhatsAppJourneysBuilderProps> = ({
  industryId,
  templates = [],
  businessName,
}) => {
  const config = INDUSTRIES[industryId] || INDUSTRIES.dental;
  const term = config.terminology;

  // Preset Journeys tailored for Selected Industry
  const [journeys, setJourneys] = useState<CustomerJourney[]>([
    {
      id: 'j-1',
      name: `New Inbound ${term.patientLabel} Nurturing`,
      triggerStage: 'Inquiry',
      isActive: true,
      stats: { enrolled: 45, delivered: 42, conversions: 18 },
      steps: [
        {
          id: 'js-1-1',
          label: 'Immediate Welcome Greeting & Catalog',
          delay: 'Immediate',
          templateId: 't-den-1',
          templateText: `Namaste! Thank you for contacting ${businessName}. This is an automated message confirming we have received your inquiry. We offer premium services. Reply "1" to see pricing.`
        },
        {
          id: 'js-1-2',
          label: 'Timing & Clinical Doctor Details FAQ',
          delay: '24 Hours',
          templateId: 't-den-4',
          templateText: `Hi there! We wanted to check if you had any questions regarding our doctors or timings. We are open Mon-Sat: 9 AM to 8 PM. Would you like to schedule a quick callback consultation?`
        },
        {
          id: 'js-1-3',
          label: 'Soft Engagement Callback Offer',
          delay: '3 Days',
          templateId: 't-den-3',
          templateText: `Namaste! We noticed you haven't scheduled a slot yet. We are offering a complimentary consultation scan this week at ${businessName}! Secure your appointment slot now by replying to this chat.`
        }
      ]
    },
    {
      id: 'j-2',
      name: `Post-${term.treatmentLabel} Support & Review Campaign`,
      triggerStage: 'Completed',
      isActive: false,
      stats: { enrolled: 28, delivered: 28, conversions: 12 },
      steps: [
        {
          id: 'js-2-1',
          label: 'Post-Op Recovery Guidelines',
          delay: 'Immediate',
          templateId: 't-den-2',
          templateText: `Namaste! We hope you are feeling well after your dental procedure at ${businessName}. Please avoid hot drinks/food for 24 hours and take prescribed medications on schedule.`
        },
        {
          id: 'js-2-2',
          label: 'Healing Check-in Survey',
          delay: '3 Days',
          templateId: 't-den-5',
          templateText: `Hello! This is {{senderName}} checking in on your recovery. How is your comfort level today? If you feel any excessive pain, please book a quick follow-up evaluation immediately.`
        },
        {
          id: 'js-2-3',
          label: 'Google Review Request Dispatch',
          delay: '7 Days',
          templateId: 't-den-6',
          templateText: `Dear friend, thank you for trusting ${businessName}! If you are happy with your smile, please help others find quality care by leaving us a 5-star Google review: {{reviewLink}}`
        }
      ]
    }
  ]);

  const [selectedJourneyId, setSelectedJourneyId] = useState<string>('j-1');
  const [isEditingStepId, setIsEditingStepId] = useState<string | null>(null);
  
  // New Node Form states
  const [newStepLabel, setNewStepLabel] = useState('');
  const [newStepDelay, setNewStepDelay] = useState('1 Day');
  const [newStepTemplateId, setNewStepTemplateId] = useState('');

  const activeJourney = journeys.find(j => j.id === selectedJourneyId) || journeys[0];

  const handleToggleJourney = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setJourneys(
      journeys.map(j => j.id === id ? { ...j, isActive: !j.isActive } : j)
    );
  };

  const handleAddStep = (journeyId: string) => {
    if (!newStepLabel) return;
    
    // Find text of selected template, or write custom text
    const selectedTpl = templates.find(t => t.id === newStepTemplateId);
    const templateText = selectedTpl 
      ? selectedTpl.text 
      : `Friendly automated reminder from ${businessName}. Please message back if you need help scheduling callbacks!`;

    const newStep: JourneyStep = {
      id: `js-${Date.now()}`,
      label: newStepLabel,
      delay: newStepDelay,
      templateId: newStepTemplateId || 'custom',
      templateText
    };

    setJourneys(
      journeys.map(j => {
        if (j.id === journeyId) {
          return {
            ...j,
            steps: [...j.steps, newStep]
          };
        }
        return j;
      })
    );

    // Clear form
    setNewStepLabel('');
    setNewStepDelay('1 Day');
    setNewStepTemplateId('');
  };

  const handleDeleteStep = (journeyId: string, stepId: string) => {
    setJourneys(
      journeys.map(j => {
        if (j.id === journeyId) {
          return {
            ...j,
            steps: j.steps.filter(s => s.id !== stepId)
          };
        }
        return j;
      })
    );
  };

  const handleUpdateStepText = (journeyId: string, stepId: string, text: string) => {
    setJourneys(
      journeys.map(j => {
        if (j.id === journeyId) {
          return {
            ...j,
            steps: j.steps.map(s => s.id === stepId ? { ...s, templateText: text } : s)
          };
        }
        return j;
      })
    );
  };

  return (
    <div className="space-y-6" id="whatsapp-journeys-builder">
      
      {/* Header and overview Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-700 rounded-full border border-purple-100 uppercase tracking-wider flex items-center gap-1">
            <GitCommit className="h-3 w-3" />
            Marketing & Retention Sequences
          </span>
          <span className="text-slate-300 text-xs">•</span>
          <span className="text-xs text-slate-500 font-semibold">Visual Automation Hub</span>
        </div>
        <h2 className="text-xl font-bold font-display tracking-tight text-slate-800 mt-1">
          WhatsApp Automated Journeys Builder
        </h2>
        <p className="text-xs text-slate-500">
          Design multi-step messaging campaigns that trigger when a {term.patientLabel.toLowerCase()} transitions between stages in the CRM pipeline. Schedule drip delays, write smart templates, and review delivery metrics.
        </p>
      </div>

      {/* Journeys Grid Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Journeys List selector (Span 4) */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Available Sequences</h3>
          
          <div className="space-y-3">
            {journeys.map((j) => {
              const isSelected = j.id === selectedJourneyId;
              const conversionRate = j.stats.enrolled > 0 ? Math.round((j.stats.conversions / j.stats.enrolled) * 100) : 0;
              
              return (
                <div
                  key={j.id}
                  onClick={() => setSelectedJourneyId(j.id)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-4 ${
                    isSelected 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-102' 
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-350 shadow-3xs'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        Trigger: {j.triggerStage} Stage
                      </span>

                      {/* Power Switch */}
                      <button
                        onClick={(e) => handleToggleJourney(j.id, e)}
                        className={`p-1 rounded-lg border transition-colors flex items-center justify-center cursor-pointer ${
                          j.isActive 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/10 hover:bg-slate-500/20'
                        }`}
                        title={j.isActive ? 'Pause Journey Sequence' : 'Activate Journey Sequence'}
                      >
                        {j.isActive ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                    <h4 className="text-xs font-bold font-display tracking-tight leading-snug">
                      {j.name}
                    </h4>
                    <p className={`text-[10px] leading-normal ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                      Triggers drip messages ({j.steps.length} sequential nodes) when customer enters `{j.triggerStage}` block.
                    </p>
                  </div>

                  {/* Micro stats */}
                  <div className={`grid grid-cols-3 gap-2 pt-3.5 border-t text-center text-[10px] font-mono ${
                    isSelected ? 'border-slate-800' : 'border-slate-100'
                  }`}>
                    <div>
                      <span className={`font-black block text-sm ${isSelected ? 'text-white' : 'text-slate-800'}`}>{j.stats.enrolled}</span>
                      <span className="text-[9px] text-slate-450 uppercase">Enrolled</span>
                    </div>
                    <div>
                      <span className={`font-black block text-sm ${isSelected ? 'text-white' : 'text-slate-800'}`}>{j.stats.delivered}</span>
                      <span className="text-[9px] text-slate-450 uppercase">Dispatched</span>
                    </div>
                    <div>
                      <span className="font-black text-emerald-500 block text-sm">+{conversionRate}%</span>
                      <span className="text-[9px] text-slate-450 uppercase">Conversion</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-500 leading-normal flex gap-2">
            <Info className="h-4.5 w-4.5 text-slate-400 shrink-0 mt-0.5" />
            <p>
              <strong>Campaign Pro-tip:</strong> Journeys operate entirely server-side. Once configured, a patient who has completed treatment is automatically entered into the care follow-up sequence, taking the burden of follow-ups off your front-desk staff.
            </p>
          </div>
        </div>

        {/* Right Side: Flow Chart Editor canvas (Span 8) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 font-display">
                Sequence Workflow Canvas: <span className="text-purple-600">{activeJourney.name}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Visual representation of automated delays and template nodes.</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${activeJourney.isActive ? 'bg-emerald-500 status-pulse' : 'bg-slate-350'}`} />
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{activeJourney.isActive ? 'Active Sequence' : 'Paused Sequence'}</span>
            </div>
          </div>

          {/* Flow Sequence Container */}
          <div className="space-y-4 relative py-2">
            
            {/* Start Node */}
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl max-w-md shadow-3xs z-10 relative">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
                <GitCommit className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Trigger Node</p>
                <p className="text-xs font-bold text-slate-700">
                  {term.patientLabel} transitions to stage: <span className="text-purple-600 font-extrabold">"{activeJourney.triggerStage}"</span>
                </p>
              </div>
            </div>

            {/* Render Step Nodes */}
            {activeJourney.steps.map((step, index) => (
              <React.Fragment key={step.id}>
                
                {/* Arrow Connector Line */}
                <div className="flex justify-center w-8 pl-1 text-slate-300">
                  <div className="h-6 w-0.5 bg-slate-200 relative">
                    <ChevronDown className="h-4 w-4 text-slate-400 absolute left-1/2 -translate-x-1/2 -bottom-2" />
                  </div>
                </div>

                {/* Drip Step Node Box */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-slate-350 transition-all overflow-hidden max-w-xl z-10 relative">
                  
                  {/* Step Header info */}
                  <div className="bg-slate-50/75 p-3.5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black flex items-center justify-center">
                        {index + 1}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800">{step.label}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-lg text-[9px] font-bold">
                        <Clock className="h-3 w-3 text-amber-500" />
                        Delay: {step.delay}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDeleteStep(activeJourney.id, step.id)}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Step Node"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Step Body (Text editor) */}
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>WhatsApp Template Payload</span>
                      <span className="font-mono text-[9px] text-slate-300">ID: {step.templateId}</span>
                    </div>

                    {isEditingStepId === step.id ? (
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          value={step.templateText}
                          onChange={(e) => handleUpdateStepText(activeJourney.id, step.id, e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-lg text-xs font-mono focus:outline-none resize-none"
                        />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setIsEditingStepId(null)}
                            className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            Save Node Text
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="group/text relative bg-slate-50/75 rounded-xl p-3 border border-slate-100 font-mono text-[10px] text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {step.templateText}
                        <button
                          type="button"
                          onClick={() => setIsEditingStepId(step.id)}
                          className="absolute right-2.5 bottom-2.5 bg-white border border-slate-200 p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:shadow-3xs opacity-0 group-hover/text:opacity-100 transition-all cursor-pointer"
                          title="Edit message content"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </React.Fragment>
            ))}

            {activeJourney.steps.length === 0 && (
              <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs">
                No steps in this journey sequence. Click below to append automation nodes!
              </div>
            )}
          </div>

          {/* Add Step Form Node */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Plus className="h-4 w-4 text-purple-600" />
              Append New Automation Step Node
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              <div className="md:col-span-5 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Step Label</label>
                <input
                  type="text"
                  value={newStepLabel}
                  onChange={(e) => setNewStepLabel(e.target.value)}
                  placeholder="e.g. 15-Day Routine Follow-up"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="md:col-span-3 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Delay Timer</label>
                <select
                  value={newStepDelay}
                  onChange={(e) => setNewStepDelay(e.target.value)}
                  className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="Immediate">Immediate</option>
                  <option value="12 Hours">12 Hours</option>
                  <option value="1 Day">1 Day</option>
                  <option value="3 Days">3 Days</option>
                  <option value="7 Days">7 Days</option>
                  <option value="15 Days">15 Days</option>
                  <option value="30 Days">30 Days</option>
                </select>
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Message Template Reference</label>
                <select
                  value={newStepTemplateId}
                  onChange={(e) => setNewStepTemplateId(e.target.value)}
                  className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Custom Drip Template --</option>
                  {templates.map(tpl => (
                    <option key={tpl.id} value={tpl.id}>{tpl.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => handleAddStep(activeJourney.id)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Append Step Node
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
