/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { 
  MessageSquare, 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  Database, 
  Sparkles, 
  QrCode, 
  Search, 
  Menu, 
  X, 
  ChevronRight, 
  Building2, 
  Zap, 
  Activity, 
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Calendar
} from 'lucide-react';


import { VyapariNestamLogo } from './VyapariNestamLogo';

interface AuthBarProps {
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  spreadsheetId: string | null;
  patientsLabel?: string;
  onOpenCommandPalette?: () => void;
  businessName?: string;
  senderName?: string;
}

export const AuthBar: React.FC<AuthBarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onLogin,
  onLogout,
  isLoggingIn,
  spreadsheetId,
  patientsLabel = 'Patients',
  onOpenCommandPalette,
  businessName = 'Nestam Clinic Workspace',
  senderName = 'Dr. Prasad'
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Primary Navigation Sections
  const navItems = [
    { id: 'dashboard', label: 'Mission Control', icon: LayoutDashboard },
    { id: 'contacts', label: 'Patients', icon: Users },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'whatsapp_hub', label: 'Communications', icon: QrCode },
    { id: 'seo_audit', label: 'Growth', icon: Sparkles },
    { id: 'automation', label: 'Automation', icon: Zap },
    { id: 'settings', label: 'Clinic & Workspace', icon: Settings },
  ];

  // Helper to get active tab title for top breadcrumb
  const getActiveTabTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'MISSION CONTROL DASHBOARD';
      case 'contacts': return 'PATIENT 360° PROFILE & CLINICAL WORKSPACE';
      case 'appointments': return 'APPOINTMENTS & OPERATIONS';
      case 'whatsapp_hub': return 'WHATSAPP INBOX';
      case 'seo_audit': return 'GROWTH CENTER';
      case 'automation': return 'AUTOMATION CENTER';
      case 'settings': return 'CLINIC & WORKSPACE SETTINGS';
      default: return 'VYAPARI NESTAM BUSINESS OS';
    }
  };

  // Manage mobile drawer escape key and focus
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        menuTriggerRef.current?.focus();
      }
    };
    if (isMobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* ==================== 1. LEFT SIDEBAR PANEL (DESKTOP) ==================== */}
      <aside 
        aria-label="Main Application Navigation"
        className="hidden xl:flex xl:w-64 xl:flex-col fixed top-0 bottom-0 left-0 bg-white text-slate-800 border-r border-slate-200/90 z-50 shadow-2xs select-none overflow-y-auto scrollbar-none"
      >
        
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-100/90 bg-[#FAF9F5]/60 hover:bg-[#FAF9F5] transition-colors cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <VyapariNestamLogo 
            variant="full" 
            symbolClassName="h-10 w-10" 
            textClassName="text-slate-900 text-sm font-black tracking-tight"
            taglineClassName="text-slate-500 text-[9px] font-bold"
            showTagline={true}
          />
        </div>

        {/* Vertical Nav List */}
        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Sidebar Links">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer vn-focus-ring ${
                  isActive
                    ? 'bg-[#176B72]/10 text-[#176B72] font-bold shadow-3xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-[#176B72]' : 'text-slate-400'}`} />
                  <span className="tracking-tight">{item.label}</span>
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#176B72]" />}
              </button>
            );
          })}
        </nav>

        {/* Footer Auth Status / Logout */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 space-y-2">
          {user || spreadsheetId ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200/80 rounded-xl">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <div className="truncate">
                  <p className="text-[11px] font-bold text-emerald-900 truncate">{user?.displayName || 'Google Connected'}</p>
                  <p className="text-[9px] text-emerald-700 truncate">{user?.email || 'Cloud Sheets Active'}</p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all shadow-3xs cursor-pointer vn-focus-ring"
                title="Sign Out"
              >
                <span className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Shift+L</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="px-2 py-1 bg-amber-50 border border-amber-200/80 rounded-lg text-[10px] font-bold text-amber-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span>Guest Session (Offline)</span>
              </div>
              <button
                onClick={onLogin}
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 active:scale-98 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer border border-slate-700 vn-focus-ring"
                title="Sign in with Google Account"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.1 9 5 12 5z"/>
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                  <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"/>
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.1-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"/>
                </svg>
                <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ==================== 2. TOP HEADER BAR ==================== */}
      <header className="xl:ml-64 bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shrink-0 shadow-2xs">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Left Controls: Section Title & Workspace Badge */}
          <div className="flex items-center gap-3">
            <button
              ref={menuTriggerRef}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer vn-focus-ring"
              aria-label="Open Navigation Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div 
                onClick={() => setActiveTab('settings')}
                className="hidden md:flex items-center gap-2 bg-slate-100/90 hover:bg-slate-200/70 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 transition-colors cursor-pointer vn-focus-ring"
                title="Click to edit workspace settings"
              >
                <Building2 className="h-3.5 w-3.5 text-[#176B72]" />
                <span className="truncate max-w-[180px]">{businessName}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
                <span className="text-[9px] font-bold text-emerald-600 uppercase">Active</span>
              </div>

              <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight hidden lg:block">
                {getActiveTabTitle()}
              </h2>
            </div>
          </div>

          {/* Center Search Input */}
          <div className="flex-1 max-w-md mx-2">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <button
                type="button"
                id="cmd-k-trigger-btn"
                onClick={onOpenCommandPalette}
                className="w-full bg-slate-100/70 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs pl-9 pr-4 py-2 text-slate-700 text-left cursor-pointer focus:outline-none transition-all flex items-center justify-between text-slate-400 vn-focus-ring"
                aria-label="Search patients, appointments, actions..."
              >
                <span className="truncate">Search patients, appointments...</span>
                <kbd className="hidden sm:inline-flex text-[10px] font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500">⌘K</kbd>
              </button>
            </div>
          </div>

          {/* Right Header Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Google Sign-In button if not signed in */}
            {!user && !spreadsheetId && (
              <button
                onClick={onLogin}
                disabled={isLoggingIn}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-98 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer border border-slate-700 vn-focus-ring"
                title="Sign in with Google Account"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.1 9 5 12 5z"/>
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                  <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"/>
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.1-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"/>
                </svg>
                <span className="hidden sm:inline">{isLoggingIn ? 'Connecting...' : 'Sign in'}</span>
              </button>
            )}

            {/* WhatsApp Inbox Action */}
            <button 
              onClick={() => setActiveTab('whatsapp_hub')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 text-emerald-800 rounded-xl transition-all cursor-pointer shadow-3xs vn-focus-ring"
              title="WhatsApp Live Chat Inbox"
            >
              <MessageSquare className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-[11px] font-bold hidden md:inline">WhatsApp</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>

            {/* Notifications Activity Button */}
            <button 
              onClick={() => setActiveTab('automation')}
              className="p-2 bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200/80 text-slate-700 rounded-xl transition-all cursor-pointer relative shadow-3xs vn-focus-ring"
              title="Activity & Automation Hub"
              aria-label="Activity & Automation Hub"
            >
              <Activity className="h-4 w-4 text-slate-700" />
            </button>

            {/* User Profile Pill */}
            <div 
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-2 bg-slate-100/80 hover:bg-teal-50 hover:border-teal-200 border border-slate-200/80 px-2.5 py-1 rounded-xl cursor-pointer group transition-all shadow-3xs vn-focus-ring"
              title="Click to edit staff profile & clinic details in Settings"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveTab('settings'); }}
            >
              <div className="w-7 h-7 bg-[#176B72] text-white font-black rounded-lg flex items-center justify-center text-xs shadow-3xs uppercase shrink-0">
                {(user?.displayName || senderName || 'D')[0]}
              </div>
              <div className="hidden sm:block text-left pr-1">
                <p className="text-[11px] font-bold text-slate-900 group-hover:text-[#176B72] transition-colors leading-tight truncate max-w-[120px]">
                  {user?.displayName || senderName || 'Dr. Prasad'}
                </p>
                <p className="text-[9.5px] text-slate-500 font-semibold truncate max-w-[120px]">
                  {user?.email ? user.email : 'Staff Desk'}
                </p>
              </div>
              <Settings className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#176B72] transition-colors hidden sm:block shrink-0" />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <>
          <div
            onClick={() => {
              setIsMobileMenuOpen(false);
              menuTriggerRef.current?.focus();
            }}
            className="xl:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 animate-fade-in"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Menu"
            className="xl:hidden fixed top-0 bottom-0 left-0 w-72 bg-slate-900 text-slate-100 z-50 flex flex-col border-r border-slate-800 shadow-2xl animate-slide-in-left"
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <VyapariNestamLogo 
                variant="compact" 
                symbolClassName="h-8 w-8" 
                textClassName="text-white text-xs font-extrabold"
                lightText={true}
              />
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  menuTriggerRef.current?.focus();
                }} 
                className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg vn-focus-ring"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Mobile Links">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                      menuTriggerRef.current?.focus();
                    }}
                    className={`w-full flex items-center gap-3 min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer vn-focus-ring ${
                      isActive ? 'bg-[#176B72] text-white font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-800">
              {user || spreadsheetId ? (
                <button
                  onClick={() => {
                    onLogout();
                    setIsMobileMenuOpen(false);
                    menuTriggerRef.current?.focus();
                  }}
                  className="w-full flex items-center justify-center gap-2 min-h-[44px] px-3 py-2 bg-slate-800 text-rose-300 rounded-xl text-xs font-semibold hover:bg-slate-700 transition-colors vn-focus-ring"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    onLogin();
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={isLoggingIn}
                  className="w-full flex items-center justify-center gap-2 min-h-[44px] px-3 py-2 bg-[#176B72] text-white rounded-xl text-xs font-bold hover:bg-[#10555C] transition-colors vn-focus-ring"
                >
                  <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
                </button>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
};
