/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Command, 
  Users, 
  LayoutDashboard, 
  Calendar, 
  CreditCard, 
  MessageSquare, 
  Sparkles, 
  Bot, 
  Settings, 
  Plus, 
  Upload, 
  ChevronRight, 
  X,
  FileSpreadsheet,
  QrCode,
  ShieldCheck,
  Building
} from 'lucide-react';
import { Contact } from '../types';
import { IndustryType, INDUSTRIES, getSectorDefinition } from '../industryConfig';

import { VyapariNestamLogo } from './VyapariNestamLogo';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  currentIndustry: IndustryType;
  onNavigateTab: (tab: string) => void;
  onSelectContact: (contactId: string) => void;
  onOpenIntakeModal: () => void;
  onOpenCalendarModal: () => void;
  onOpenMigrationModal: () => void;
  onSwitchIndustry: (industry: IndustryType) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  contacts,
  currentIndustry,
  onNavigateTab,
  onSelectContact,
  onOpenIntakeModal,
  onOpenCalendarModal,
  onOpenMigrationModal,
  onSwitchIndustry,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle global Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open via parent
          const searchBtn = document.getElementById('cmd-k-trigger-btn');
          if (searchBtn) searchBtn.click();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentConfig = getSectorDefinition(currentIndustry);

  // Navigation Items
  const workspaceItems = [
    { id: 'dashboard', title: 'Mission Control Dashboard', category: 'Workspace', icon: LayoutDashboard, tab: 'dashboard', badge: 'Overview' },
    { id: 'contacts', title: `${currentConfig?.terminology.patientsLabel || 'Patients'} & Clinical Pipeline`, category: 'Workspace', icon: Users, tab: 'contacts', badge: 'CRM' },
    { id: 'whatsapp_hub', title: 'Ambient WhatsApp Hub & Journeys', category: 'Workspace', icon: QrCode, tab: 'whatsapp_hub', badge: 'Comms' },
    { id: 'seo_audit', title: 'Growth Orbit & Google Business Profile SEO', category: 'Workspace', icon: Sparkles, tab: 'seo_audit', badge: 'Growth' },
    { id: 'settings', title: 'Workspace Administration & BYOS Health', category: 'Workspace', icon: Settings, tab: 'settings', badge: 'Admin' },
  ];

  // Action Items
  const actionItems = [
    { 
      id: 'action-intake', 
      title: `New ${currentConfig?.terminology.intakeLabel || 'Patient Intake'}`, 
      category: 'Quick Action', 
      icon: Plus, 
      action: () => { onOpenIntakeModal(); onClose(); },
      badge: 'Create'
    },
    { 
      id: 'action-calendar', 
      title: 'Book Appointment / Schedule Follow-up', 
      category: 'Quick Action', 
      icon: Calendar, 
      action: () => { onOpenCalendarModal(); onClose(); },
      badge: 'Schedule'
    },
    { 
      id: 'action-migrate', 
      title: 'Import Contacts / Migrate Database', 
      category: 'Quick Action', 
      icon: Upload, 
      action: () => { onOpenMigrationModal(); onClose(); },
      badge: 'Data'
    },
  ];

  // Filtered Patients
  const patientResults = contacts
    .filter(c => 
      c.name.toLowerCase().includes(query.toLowerCase()) || 
      c.phone.includes(query) ||
      (c.treatmentType && c.treatmentType.toLowerCase().includes(query.toLowerCase()))
    )
    .slice(0, 5)
    .map(c => ({
      id: `patient-${c.id}`,
      title: c.name,
      subtitle: `${c.phone} • ${c.treatmentType || 'General Consultation'} • ${c.pipelineStage || 'Inquiry'}`,
      category: `${currentConfig?.terminology.patientLabel || 'Patient'} Records`,
      icon: Users,
      action: () => {
        onNavigateTab('contacts');
        onSelectContact(c.id);
        onClose();
      },
      badge: c.pipelineStage || 'Inquiry'
    }));

  // Industry Presets
  const industryItems = Object.keys(INDUSTRIES).map(key => {
    const ind = INDUSTRIES[key as IndustryType];
    return {
      id: `industry-${key}`,
      title: `Switch Industry Preset: ${ind.name}`,
      subtitle: `${ind.terminology.patientLabel} CRM Preset • Default: ${ind.defaultBusinessName}`,
      category: 'Industry Presets',
      icon: Building,
      action: () => {
        onSwitchIndustry(key as IndustryType);
        onClose();
      },
      badge: key === currentIndustry ? 'Active' : 'Preset'
    };
  });

  // Combine results
  const allResults = [
    ...(query.trim() === '' ? workspaceItems : workspaceItems.filter(w => w.title.toLowerCase().includes(query.toLowerCase()))),
    ...(query.trim() === '' ? actionItems : actionItems.filter(a => a.title.toLowerCase().includes(query.toLowerCase()))),
    ...patientResults,
    ...(query.trim() === '' ? industryItems.slice(0, 2) : industryItems.filter(i => i.title.toLowerCase().includes(query.toLowerCase()))),
  ];

  const handleKeyDownModal = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, allResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allResults.length) % Math.max(1, allResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = allResults[selectedIndex];
      if (selected) {
        if ('tab' in selected && selected.tab) {
          onNavigateTab(selected.tab);
          onClose();
        } else if ('action' in selected && selected.action) {
          selected.action();
        }
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDownModal}
      >
        {/* Command Search Input Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-[#FAF9F5]">
          <VyapariNestamLogo variant="symbol" symbolClassName="h-6 w-6" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={`Type a command, customer name, phone, or search workspace...`}
            className="w-full text-sm font-medium text-slate-800 placeholder-slate-400 bg-transparent outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono bg-white border border-slate-200 px-2 py-1 rounded text-slate-500 shadow-3xs shrink-0">
            ESC
          </kbd>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 divide-y divide-slate-100 flex-1">
          {allResults.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">
              No matching commands, patients, or actions found.
            </div>
          ) : (
            allResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if ('tab' in item && item.tab) {
                      onNavigateTab(item.tab);
                      onClose();
                    } else if ('action' in item && item.action) {
                      item.action();
                    }
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                    isSelected ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      isSelected ? 'bg-slate-800 text-teal-400' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold truncate">{item.title}</span>
                        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {item.badge}
                        </span>
                      </div>
                      {'subtitle' in item && item.subtitle && (
                        <p className={`text-[10px] truncate mt-0.5 ${
                          isSelected ? 'text-slate-300' : 'text-slate-400'
                        }`}>
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <ChevronRight className={`h-4 w-4 shrink-0 ${
                    isSelected ? 'text-teal-400' : 'text-slate-300'
                  }`} />
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Legend */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between text-[10px] text-slate-500 font-medium">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="bg-white border border-slate-200 px-1 rounded shadow-3xs font-mono">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-white border border-slate-200 px-1 rounded shadow-3xs font-mono">↵</kbd> select
            </span>
          </div>
          <span className="font-semibold text-slate-600">Vyapari Nestam Business OS</span>
        </div>
      </div>
    </div>
  );
};
