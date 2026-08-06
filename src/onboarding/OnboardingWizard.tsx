/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useOnboarding } from './useOnboarding';
import { OnboardingService } from './OnboardingService';
import {
  Building2,
  User,
  Mail,
  Phone,
  Database,
  Calendar,
  FolderOpen,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Activity,
  CreditCard,
  ShieldCheck,
  ToggleLeft,
} from 'lucide-react';

import { VyapariNestamLogo } from '../components/VyapariNestamLogo';

interface OnboardingWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  onComplete,
  onCancel,
}) => {
  const {
    step,
    formData,
    updateField,
    error,
    isSubmitting,
    isCompleted,
    nextStep,
    prevStep,
    submit,
  } = useOnboarding(onComplete);

  const stepsInfo = [
    { num: 1, label: 'Clinic Info', desc: 'Core business details' },
    { num: 2, label: 'Google Setup', desc: 'Workspace links' },
    { num: 3, label: 'Subscription', desc: 'Select trial tier' },
    { num: 4, label: 'Default Setup', desc: 'Review & initialize' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto"
      id="clinic-onboarding-overlay"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col my-8"
        id="onboarding-wizard-container"
      >
        {/* Decorative Top Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 via-emerald-500 to-indigo-500" />

        {/* Wizard Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between bg-[#FAF9F5]">
          <div className="flex items-center gap-3">
            <VyapariNestamLogo 
              variant="full" 
              symbolClassName="h-10 w-10" 
              textClassName="text-slate-900 text-base font-black"
              taglineClassName="text-slate-500 text-[10px] font-bold"
              showTagline={true}
            />
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600 font-semibold text-xs p-1.5 hover:bg-slate-100 rounded-xl transition-all"
              id="onboarding-cancel-btn"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Steps Progress Bar */}
        <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
          <div className="flex justify-between items-center relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
            <div
              className="absolute top-1/2 left-0 h-0.5 bg-teal-500 -translate-y-1/2 z-0 transition-all duration-300"
              style={{ width: `${((step - 1) / (stepsInfo.length - 1)) * 100}%` }}
            />

            {stepsInfo.map((s) => {
              const isPast = step > s.num;
              const isActive = step === s.num;
              return (
                <div key={s.num} className="flex flex-col items-center z-10 relative">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                      isPast
                        ? 'bg-teal-500 text-white shadow-xs'
                        : isActive
                        ? 'bg-white text-teal-600 border-2 border-teal-500 shadow-md ring-4 ring-teal-50'
                        : 'bg-white text-slate-400 border-2 border-slate-200'
                    }`}
                    id={`step-indicator-${s.num}`}
                  >
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                  </div>
                  <span
                    className={`text-[10px] font-bold mt-2 transition-colors duration-300 ${
                      isActive ? 'text-teal-600 font-extrabold' : isPast ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Errors Panel */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-6 pt-4"
              key="error-box"
            >
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 text-red-700 p-3.5 rounded-2xl text-xs font-semibold shadow-3xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span className="leading-relaxed">{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wizard Main Content Views */}
        <div className="p-6 flex-1 min-h-[300px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
                key="step-1"
              >
                <div>
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                    <Building2 className="w-4 h-4 text-teal-500" />
                    Clinic & Owner Registry
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Establish your digital healthcare facility metadata credentials.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">
                      Clinic Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.clinicName}
                        onChange={(e) => updateField('clinicName', e.target.value)}
                        placeholder="e.g. Apex Health Clinic"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all font-medium text-slate-800"
                        id="onboarding-clinic-name-input"
                      />
                      <Building2 className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">
                      Tenant ID Slug *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.tenantId}
                        onChange={(e) => updateField('tenantId', e.target.value)}
                        placeholder="e.g. apex-health"
                        className="w-full pl-3 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all font-mono text-slate-800"
                        id="onboarding-tenant-id-input"
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 font-mono">
                      Derived: {OnboardingService.generateTenantId(formData.clinicName) || 'apex-health'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">
                      Owner/Doctor Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.ownerName}
                        onChange={(e) => updateField('ownerName', e.target.value)}
                        placeholder="e.g. Dr. Haritha Rao"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all font-medium text-slate-800"
                        id="onboarding-owner-name-input"
                      />
                      <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">
                      Owner Email *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        placeholder="owner@example.com"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all font-medium text-slate-800"
                        id="onboarding-owner-email-input"
                      />
                      <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-500">
                      Clinic Phone Number *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        placeholder="+91 XXXXX XXXXX"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all font-medium text-slate-800"
                        id="onboarding-owner-phone-input"
                      />
                      <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
                key="step-2"
              >
                <div>
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                    <Database className="w-4 h-4 text-teal-500" />
                    Google Workspace Integration
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Connect your secure Google Sheets database, Calendar scheduling API, and Drive media storage folders.
                  </p>
                </div>

                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <Database className="w-3.5 h-3.5 text-emerald-500" />
                      Google Spreadsheet ID *
                    </label>
                    <input
                      type="text"
                      value={formData.spreadsheetId}
                      onChange={(e) => updateField('spreadsheetId', e.target.value)}
                      placeholder="1aB2c3D4e5F6g7H8i9J0kLMN..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all font-mono text-slate-800"
                      id="onboarding-spreadsheet-id-input"
                    />
                    <p className="text-[9px] text-slate-400">
                      Located in the Google Sheet URL: /spreadsheets/d/<strong>[SPREADSHEET_ID]</strong>/edit
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                      Google Drive Folder ID *
                    </label>
                    <input
                      type="text"
                      value={formData.driveFolderId}
                      onChange={(e) => updateField('driveFolderId', e.target.value)}
                      placeholder="1XyZ2aB3cd4e_FGhIJkl..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all font-mono text-slate-800"
                      id="onboarding-drive-folder-id-input"
                    />
                    <p className="text-[9px] text-slate-400">
                      The folder identifier used to securely store and attach patient media files and digital X-Rays.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      Google Calendar ID *
                    </label>
                    <input
                      type="text"
                      value={formData.calendarId}
                      onChange={(e) => updateField('calendarId', e.target.value)}
                      placeholder="primary OR clinic-cal@group.calendar.google.com"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all font-mono text-slate-800"
                      id="onboarding-calendar-id-input"
                    />
                    <p className="text-[9px] text-slate-400">
                      Set to <strong>primary</strong> to sync directly onto your personal calendar, or enter a custom Shared Calendar address.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
                key="step-3"
              >
                <div>
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                    <CreditCard className="w-4 h-4 text-teal-500" />
                    Subscription Management
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Select a core tenant billing tier to allocate processing cycles and database services.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {[
                    {
                      id: 'trial',
                      name: 'Free Trial',
                      desc: 'Full-featured 14-day playground. No credit card required. Perfect for exploring workflows.',
                      badge: 'Popular',
                      color: 'border-teal-500 bg-teal-50/20 text-teal-700',
                    },
                    {
                      id: 'active',
                      name: 'Active Status',
                      desc: 'Production tier with high-frequency Google Workspace syncing, automated messaging, and daily audits.',
                      badge: 'Enterprise',
                      color: 'border-indigo-500 bg-indigo-50/20 text-indigo-700',
                    },
                    {
                      id: 'inactive',
                      name: 'Inactive / Suspended',
                      desc: 'Temporarily disabled. Restricts data writes but preserves existing Google integration links.',
                      badge: 'On Hold',
                      color: 'border-slate-300 bg-slate-50 text-slate-600',
                    },
                  ].map((sub) => {
                    const isSelected = formData.subscriptionStatus === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => updateField('subscriptionStatus', sub.id as any)}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-300 flex items-start gap-3 cursor-pointer ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50/30 shadow-xs'
                            : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-2xs'
                        }`}
                        id={`subscription-card-${sub.id}`}
                      >
                        <div
                          className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-teal-600 text-teal-600' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 bg-teal-600 rounded-full" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">
                              {sub.name}
                            </span>
                            <span
                              className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full ${
                                isSelected ? sub.color : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {sub.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            {sub.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
                key="step-4"
              >
                <div>
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                    <Activity className="w-4 h-4 text-teal-500" />
                    Review & Initialize Setup
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Verify metadata records before creating security links and audit trails.
                  </p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3.5 text-xs text-slate-700">
                  <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200/60 font-medium">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                        Clinic Details
                      </span>
                      <strong className="text-slate-800 block text-xs">{formData.clinicName}</strong>
                      <span className="text-[10px] text-slate-500 block font-mono">
                        Tenant ID: {formData.tenantId || OnboardingService.generateTenantId(formData.clinicName)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                        Clinic Owner & Contact
                      </span>
                      <strong className="text-slate-800 block text-xs">{formData.ownerName}</strong>
                      <span className="text-[10px] text-slate-500 block">{formData.email}</span>
                      <span className="text-[10px] text-slate-500 block">{formData.phone}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider mb-1.5">
                      Target Google Integrations
                    </span>
                    <ul className="space-y-1 text-[10px] font-mono text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/40">
                      <li className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
                        <Database className="w-3 h-3 text-emerald-500 shrink-0" />
                        Spreadsheet: {formData.spreadsheetId}
                      </li>
                      <li className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
                        <FolderOpen className="w-3 h-3 text-amber-500 shrink-0" />
                        Folder ID: {formData.driveFolderId}
                      </li>
                      <li className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
                        <Calendar className="w-3 h-3 text-indigo-500 shrink-0" />
                        Calendar ID: {formData.calendarId}
                      </li>
                    </ul>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider mb-1.5">
                      Initialization Blueprint
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-600">
                      <div className="bg-teal-50 text-teal-800 p-2 rounded-xl flex items-center gap-1 border border-teal-100">
                        <ToggleLeft className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        Feature Flags
                      </div>
                      <div className="bg-indigo-50 text-indigo-800 p-2 rounded-xl flex items-center gap-1 border border-indigo-100">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        Owner RBAC Role
                      </div>
                      <div className="bg-emerald-50 text-emerald-800 p-2 rounded-xl flex items-center gap-1 border border-emerald-100">
                        <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        Config Metadata
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Wizard Action Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 1 || isSubmitting}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all outline-none ${
              step === 1
                ? 'opacity-0 pointer-events-none'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 cursor-pointer'
            }`}
            id="onboarding-prev-btn"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              id="onboarding-next-btn"
            >
              Continue
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={isSubmitting}
              className={`px-6 py-2.5 text-xs font-extrabold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
              id="onboarding-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Provisioning...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirm & Initialize
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
