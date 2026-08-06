import React, { useState } from 'react';
import { 
  ShieldCheck, AlertTriangle, Clock, Calendar, CheckCircle2, 
  Save, Zap, RefreshCw, Lock
} from 'lucide-react';
import { AutomationSettings } from '../../types';
import { AutomationService } from '../../services/automation/AutomationService';

interface SettingsSectionProps {
  settings: AutomationSettings;
  onUpdateSettings: (newSettings: AutomationSettings) => void;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  settings,
  onUpdateSettings
}) => {
  const [formData, setFormData] = useState<AutomationSettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await AutomationService.saveSettingsAsync(formData);
    onUpdateSettings(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleToggleKillSwitch = async () => {
    if (!formData.globalKillSwitch) {
      if (confirm('CRITICAL SAFEGUARD: Are you sure you want to turn ON the Global Automation Kill Switch? This will immediately pause all outgoing WhatsApp automated messages across all workflows.')) {
        const updated = { ...formData, globalKillSwitch: true };
        setFormData(updated);
        await AutomationService.saveSettingsAsync(updated);
        onUpdateSettings(updated);
      }
    } else {
      const updated = { ...formData, globalKillSwitch: false };
      setFormData(updated);
      await AutomationService.saveSettingsAsync(updated);
      onUpdateSettings(updated);
    }
  };


  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-display text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#176B72]" />
            <span>Automation Safeguards & System Settings</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure global guardrails, quiet hours, frequency limits, and Google Calendar sync parameters.
          </p>
        </div>

        {saveSuccess && (
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" />
            <span>Safeguards Saved!</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* 1. GLOBAL KILL SWITCH PANEL */}
        <div className={`p-5 rounded-2xl border transition-all space-y-3 ${
          formData.globalKillSwitch
            ? 'bg-rose-50/90 border-rose-300 shadow-sm'
            : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${formData.globalKillSwitch ? 'text-rose-600' : 'text-amber-500'}`} />
                <span>Global Emergency Kill Switch</span>
              </div>
              <p className="text-xs text-slate-600">
                Immediately freeze all automated WhatsApp message triggers across the entire practice.
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleKillSwitch}
              className={`px-4 py-2 font-black text-xs rounded-xl transition-all cursor-pointer shadow-xs ${
                formData.globalKillSwitch
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
              }`}
            >
              {formData.globalKillSwitch ? 'KILL SWITCH ACTIVE (CLICK TO RESUME)' : 'PAUSE ALL AUTOMATIONS'}
            </button>
          </div>
        </div>

        {/* 2. QUIET HOURS & FREQUENCY CAPS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#176B72]" />
            <span>Quiet Hours & Frequency Guardrails</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900">Enable Quiet Hours</label>
                <input
                  type="checkbox"
                  checked={formData.quietHoursEnabled}
                  onChange={(e) => setFormData({ ...formData, quietHoursEnabled: e.target.checked })}
                  className="h-4 w-4 text-[#176B72] rounded cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-500">Hold messages generated overnight and send at 8:00 AM.</p>
              
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Start Time</label>
                  <input
                    type="time"
                    value={formData.quietHoursStart}
                    onChange={(e) => setFormData({ ...formData, quietHoursStart: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">End Time</label>
                  <input
                    type="time"
                    value={formData.quietHoursEnd}
                    onChange={(e) => setFormData({ ...formData, quietHoursEnd: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-900">Daily Message Frequency Cap per Contact</label>
              <select
                value={formData.frequencyCapDays}
                onChange={(e) => setFormData({ ...formData, frequencyCapDays: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              >
                <option value={1}>Maximum 1 automated message per 24 hours</option>
                <option value={2}>Maximum 2 automated messages per 24 hours</option>
                <option value={3}>Maximum 3 automated messages per 24 hours</option>
                <option value={0}>No frequency limit</option>
              </select>
              <p className="text-[11px] text-slate-500">Prevents spamming patients with multiple automated messages on the same day.</p>
            </div>
          </div>
        </div>

        {/* 3. GOOGLE CALENDAR & SENDER PREFERENCES */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#176B72]" />
            <span>Google Calendar & Identity Defaults</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Fallback Doctor Name</label>
              <input
                type="text"
                value={formData.fallbackDoctorName}
                onChange={(e) => setFormData({ ...formData, fallbackDoctorName: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Default WhatsApp Sender Display Name</label>
              <input
                type="text"
                value={formData.whatsappDefaultSender}
                onChange={(e) => setFormData({ ...formData, whatsappDefaultSender: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#176B72] hover:bg-[#13585e] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            <span>Save Automation Safeguards</span>
          </button>
        </div>

      </form>

    </div>
  );
};
