import React, { useState, useRef } from 'react';

export interface TabItem {
  id: string;
  label: string | React.ReactNode;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTabId: string;
  onChange: (tabId: string) => void;
  variant?: 'underline' | 'pills' | 'enclosed';
  className?: string;
  children?: React.ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTabId,
  onChange,
  variant = 'underline',
  className = '',
}) => {
  const tabListRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    const enabledTabs = tabs.filter((t) => !t.disabled);
    const enabledIndex = enabledTabs.findIndex((t) => t.id === tabs[currentIndex].id);

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextTab = enabledTabs[(enabledIndex + 1) % enabledTabs.length];
      if (nextTab) onChange(nextTab.id);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevTab = enabledTabs[(enabledIndex - 1 + enabledTabs.length) % enabledTabs.length];
      if (prevTab) onChange(prevTab.id);
    } else if (e.key === 'Home') {
      e.preventDefault();
      if (enabledTabs[0]) onChange(enabledTabs[0].id);
    } else if (e.key === 'End') {
      e.preventDefault();
      if (enabledTabs[enabledTabs.length - 1]) onChange(enabledTabs[enabledTabs.length - 1].id);
    }
  };

  const variantContainerStyles = {
    underline: 'border-b border-[#DDE5E5] gap-6',
    pills: 'p-1 bg-[#F6F8F8] rounded-xl gap-1 border border-[#DDE5E5]',
    enclosed: 'border-b border-[#DDE5E5] gap-2',
  };

  return (
    <div
      ref={tabListRef}
      role="tablist"
      aria-label="Navigation Tabs"
      className={`flex items-center overflow-x-auto no-scrollbar ${variantContainerStyles[variant]} ${className}`}
    >
      {tabs.map((tab, idx) => {
        const isActive = tab.id === activeTabId;

        let tabStyles = '';
        if (variant === 'underline') {
          tabStyles = isActive
            ? 'border-b-2 border-[#176B72] text-[#176B72] font-semibold pb-3 -mb-px'
            : 'text-[#5F6F71] hover:text-[#172B2D] hover:border-b-2 hover:border-[#CBD5D5] pb-3 -mb-px font-medium';
        } else if (variant === 'pills') {
          tabStyles = isActive
            ? 'bg-white text-[#172B2D] font-semibold shadow-3xs rounded-lg py-1.5 px-3'
            : 'text-[#5F6F71] hover:text-[#172B2D] font-medium py-1.5 px-3 rounded-lg hover:bg-white/50';
        } else if (variant === 'enclosed') {
          tabStyles = isActive
            ? 'bg-white border-t-2 border-x border-[#DDE5E5] border-t-[#176B72] text-[#176B72] font-semibold rounded-t-lg py-2 px-4 -mb-px'
            : 'text-[#5F6F71] hover:text-[#172B2D] font-medium py-2 px-4';
        }

        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`inline-flex items-center gap-2 text-sm whitespace-nowrap transition-all duration-150 vn-focus-ring cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${tabStyles}`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                  isActive ? 'bg-[#176B72] text-white' : 'bg-[#DDE5E5] text-[#172B2D]'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export interface TabPanelProps {
  id: string;
  activeTabId: string;
  children: React.ReactNode;
  className?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({ id, activeTabId, children, className = '' }) => {
  if (id !== activeTabId) return null;

  return (
    <div
      id={`panel-${id}`}
      role="tabpanel"
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
      className={`mt-4 vn-focus-ring ${className}`}
    >
      {children}
    </div>
  );
};
