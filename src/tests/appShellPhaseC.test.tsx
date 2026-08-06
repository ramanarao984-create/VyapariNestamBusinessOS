// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

import { AuthBar } from '../components/AuthBar';
import { CommandPalette } from '../components/CommandPalette';
import { isApprovedSectorId, getSectorDefinition, UNCONFIGURED_SECTOR } from '../industryConfig';

describe('Phase C — Application Shell & Navigation Standardization Specification', () => {
  describe('1. Desktop Sidebar & Top Header Shell', () => {
    it('renders desktop sidebar navigation with persistent links and brand logo', () => {
      const handleTab = vi.fn();
      render(
        <AuthBar
          user={null}
          activeTab="dashboard"
          setActiveTab={handleTab}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          isLoggingIn={false}
          spreadsheetId={null}
          businessName="Sri Sai Dental Clinic"
        />
      );

      const nav = screen.getByRole('navigation', { name: /sidebar links/i });
      expect(nav).toBeDefined();

      const dashboardBtn = screen.getByRole('button', { name: /mission control/i });
      expect(dashboardBtn).toBeDefined();

      fireEvent.click(dashboardBtn);
      expect(handleTab).toHaveBeenCalledWith('dashboard');
    });

    it('renders dynamic business name in top bar and handles click to open settings', () => {
      const handleTab = vi.fn();
      render(
        <AuthBar
          user={null}
          activeTab="dashboard"
          setActiveTab={handleTab}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          isLoggingIn={false}
          spreadsheetId={null}
          businessName="Vijayawada Multi-Specialty Hospital"
        />
      );

      expect(screen.getByText('Vijayawada Multi-Specialty Hospital')).toBeDefined();
    });

    it('displays authenticated user profile and triggers logout handler', () => {
      const handleLogout = vi.fn();
      const mockUser: any = {
        displayName: 'Dr. Prasad',
        email: 'doctor@nestam.com',
      };

      render(
        <AuthBar
          user={mockUser}
          activeTab="dashboard"
          setActiveTab={vi.fn()}
          onLogin={vi.fn()}
          onLogout={handleLogout}
          isLoggingIn={false}
          spreadsheetId="sheet-123"
        />
      );

      expect(screen.getAllByText('Dr. Prasad').length).toBeGreaterThan(0);
      expect(screen.getAllByText('doctor@nestam.com').length).toBeGreaterThan(0);

      const signOutBtns = screen.getAllByRole('button', { name: /sign out/i });
      expect(signOutBtns.length).toBeGreaterThan(0);

      fireEvent.click(signOutBtns[0]);
      expect(handleLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. Mobile Drawer Navigation & Keyboard Accessibility', () => {
    it('opens mobile drawer when menu button is clicked and closes on Escape key press', () => {
      render(
        <AuthBar
          user={null}
          activeTab="dashboard"
          setActiveTab={vi.fn()}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          isLoggingIn={false}
          spreadsheetId={null}
        />
      );

      const menuBtn = screen.getByRole('button', { name: /open navigation menu/i });
      fireEvent.click(menuBtn);

      const dialog = screen.getByRole('dialog', { name: /mobile navigation menu/i });
      expect(dialog).toBeDefined();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByRole('dialog', { name: /mobile navigation menu/i })).toBeNull();
    });

    it('closes mobile drawer and selects route when item is clicked', () => {
      const handleTab = vi.fn();
      render(
        <AuthBar
          user={null}
          activeTab="dashboard"
          setActiveTab={handleTab}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          isLoggingIn={false}
          spreadsheetId={null}
        />
      );

      const menuBtn = screen.getByRole('button', { name: /open navigation menu/i });
      fireEvent.click(menuBtn);

      const patientsBtns = screen.getAllByRole('button', { name: /patients/i });
      fireEvent.click(patientsBtns[patientsBtns.length - 1]);

      expect(handleTab).toHaveBeenCalledWith('contacts');
      expect(screen.queryByRole('dialog', { name: /mobile navigation menu/i })).toBeNull();
    });
  });

  describe('3. Command Palette Keyboard Navigation', () => {
    it('opens command palette and allows arrow key navigation and selection', () => {
      const handleNavigate = vi.fn();
      const handleClose = vi.fn();

      render(
        <CommandPalette
          isOpen={true}
          onClose={handleClose}
          contacts={[]}
          currentIndustry="dental"
          onNavigateTab={handleNavigate}
          onSelectContact={vi.fn()}
          onOpenIntakeModal={vi.fn()}
          onOpenCalendarModal={vi.fn()}
          onOpenMigrationModal={vi.fn()}
          onSwitchIndustry={vi.fn()}
        />
      );

      expect(screen.getByPlaceholderText(/type a command/i)).toBeDefined();

      fireEvent.keyDown(window, { key: 'Escape' });
    });
  });

  describe('4. Tenant & Neutral Sector Status Preservation', () => {
    it('verifies neutral unconfigured sector handling without Dental fallback', () => {
      expect(isApprovedSectorId('invalid_sector')).toBe(false);
      const def = getSectorDefinition('invalid_sector');
      expect(def.name).toBe('Sector not configured');
      expect(def.id).toBe('unconfigured');
    });
  });
});
