// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
import {
  Button,
  IconButton,
  Card,
  PageHeader,
  SectionHeader,
  StatusBadge,
  Input,
  Select,
  Textarea,
  Toggle,
  Tabs,
  EmptyState,
  LoadingSkeleton,
  ErrorState,
  Modal,
  Toast,
} from '../components/ui';
import { isApprovedSectorId, getSectorDefinition, UNCONFIGURED_SECTOR } from '../industryConfig';

describe('Phase B — Design Tokens & Shared UI Primitives Specification', () => {
  describe('1. Button Component & Double-Submission Safety', () => {
    it('renders button with primary variant and text', () => {
      render(<Button variant="primary">Submit Data</Button>);
      const btn = screen.getByRole('button', { name: /submit data/i });
      expect(btn).toBeDefined();
      expect(btn.className).toContain('bg-[#176B72]');
      expect(btn.className).toContain('text-white');
    });

    it('prevents click handlers and sets aria-busy when isLoading is true', () => {
      const handleClick = vi.fn();
      render(
        <Button isLoading onClick={handleClick}>
          Save
        </Button>
      );
      const btn = screen.getByRole('button');
      expect(btn.getAttribute('aria-disabled')).toBe('true');
      expect(btn.getAttribute('aria-busy')).toBe('true');

      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('disables button correctly when disabled prop is true', () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled Action
        </Button>
      );
      const btn = screen.getByRole('button', { name: /disabled action/i }) as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('2. IconButton Component Accessibility', () => {
    it('requires aria-label and provides visible title attribute', () => {
      render(<IconButton icon={<span>Icon</span>} aria-label="Open Settings" />);
      const iconBtn = screen.getByRole('button', { name: /open settings/i });
      expect(iconBtn).toBeDefined();
      expect(iconBtn.getAttribute('title')).toBe('Open Settings');
    });
  });

  describe('3. Form Inputs, Labels & ARIA Linking', () => {
    it('associates input label with input id via htmlFor', () => {
      render(<Input label="Clinic Name" required />);
      const label = screen.getByText(/clinic name/i);
      const input = screen.getByLabelText(/clinic name/i);
      expect(label.getAttribute('for')).toBe(input.id);
      expect(input.getAttribute('aria-required')).toBe('true');
    });

    it('links inline error message to input via aria-describedby', () => {
      render(<Input label="Phone Number" errorMessage="Phone is required" />);
      const input = screen.getByLabelText(/phone number/i);
      const errorMsg = screen.getByText('Phone is required');
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toContain(errorMsg.id);
    });

    it('Textarea links labels and helper text correctly', () => {
      render(<Textarea label="Notes" helperText="Provide details" />);
      const textarea = screen.getByLabelText('Notes');
      const helper = screen.getByText('Provide details');
      expect(textarea.getAttribute('aria-describedby')).toContain(helper.id);
    });

    it('Select links labels and error message correctly', () => {
      render(<Select label="Sector" errorMessage="Must select a sector" options={[{ value: 'a', label: 'A' }]} />);
      const select = screen.getByRole('combobox');
      const selectError = screen.getByText('Must select a sector');
      expect(select.getAttribute('aria-describedby')).toContain(selectError.id);
    });
  });

  describe('4. Toggle Component ARIA Semantics', () => {
    it('renders with role="switch" and toggles aria-checked state on click', () => {
      const handleChange = vi.fn();
      render(<Toggle label="Notifications" checked={false} onChange={handleChange} />);
      const toggle = screen.getByRole('switch');
      expect(toggle.getAttribute('aria-checked')).toBe('false');

      fireEvent.click(toggle);
      expect(handleChange).toHaveBeenCalledWith(true);
    });
  });

  describe('5. Tabs Component Keyboard & ARIA Navigation', () => {
    it('renders accessible tablist and tabs with correct role and aria-selected', () => {
      const handleTabChange = vi.fn();
      const tabs = [
        { id: 't1', label: 'Tab One' },
        { id: 't2', label: 'Tab Two' },
      ];
      render(<Tabs tabs={tabs} activeTabId="t1" onChange={handleTabChange} />);

      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeDefined();

      const tab1 = screen.getByRole('tab', { name: /tab one/i });
      const tab2 = screen.getByRole('tab', { name: /tab two/i });

      expect(tab1.getAttribute('aria-selected')).toBe('true');
      expect(tab2.getAttribute('aria-selected')).toBe('false');

      fireEvent.click(tab2);
      expect(handleTabChange).toHaveBeenCalledWith('t2');
    });
  });

  describe('6. StatusBadge Semantic Rendering & Multi-Modal Conveyance', () => {
    it('renders badge with icon and label, avoiding color-only conveyance', () => {
      render(<StatusBadge status="success" label="All Systems Operational" />);
      const badgeText = screen.getByText('All Systems Operational');
      expect(badgeText).toBeDefined();
    });

    it('supports unconfigured status without throwing errors', () => {
      render(<StatusBadge status="unconfigured" />);
      expect(screen.getByText('Not Configured')).toBeDefined();
    });
  });

  describe('7. Modal Component Accessibility & Focus Trapping', () => {
    it('renders accessible dialog with role="dialog", title, and backdrop', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Test Modal Title">
          Modal body content
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeDefined();
      expect(screen.getByText('Test Modal Title')).toBeDefined();
      expect(screen.getByText('Modal body content')).toBeDefined();
    });

    it('triggers onClose when Escape key is pressed', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Modal Title">
          Content
        </Modal>
      );

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not trigger onClose when Escape key is pressed on nonDismissible modal', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Modal Title" nonDismissible>
          Content
        </Modal>
      );

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('8. EmptyState, LoadingSkeleton, ErrorState, Toast', () => {
    it('EmptyState renders action button and description', () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          title="No Data Found"
          description="Try adjusting your filters"
          action={{ label: 'Create Record', onClick: handleAction }}
        />
      );
      expect(screen.getByText('No Data Found')).toBeDefined();
      const btn = screen.getByRole('button', { name: /create record/i });
      fireEvent.click(btn);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('ErrorState renders error message and retry button', () => {
      const handleRetry = vi.fn();
      render(<ErrorState message="API connection lost" onRetry={handleRetry} />);
      expect(screen.getByText('API connection lost')).toBeDefined();
      const retryBtn = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it('Toast renders with live region role="status"', () => {
      render(<Toast type="success" title="Success" message="Operation completed successfully" />);
      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toBeDefined();
      expect(screen.getByText('Operation completed successfully')).toBeDefined();
    });
  });

  describe('9. Sector Configuration Safeguards Verification', () => {
    it('isApprovedSectorId returns false for empty or unknown sectors', () => {
      expect(isApprovedSectorId('')).toBe(false);
      expect(isApprovedSectorId('invalid_sector_xyz')).toBe(false);
      expect(isApprovedSectorId(null as any)).toBe(false);
    });

    it('getSectorDefinition returns UNCONFIGURED_SECTOR and does not fall back to Dental', () => {
      const def = getSectorDefinition('unknown_sector_xyz');
      expect(def.name).toBe('Sector not configured');
      expect(def.id).not.toBe('dental');
      expect(UNCONFIGURED_SECTOR.name).toBe('Sector not configured');
    });
  });
});
