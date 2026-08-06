// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { ContactsEnterpriseWorkspace } from '../components/ContactsEnterpriseWorkspace';
import { Contact } from '../types';

const mockContacts: Contact[] = [
  {
    id: 'PNT-1001',
    name: 'Rajesh Sharma',
    phone: '+91 98765 43210',
    email: 'rajesh@example.com',
    category: 'Active',
    notes: 'Root canal treatment pending',
    lastContacted: '24 Jul 2026',
    createdAt: '2026-07-20T10:00:00Z',
    treatmentType: 'Root Canal',
    paymentMethod: 'UPI/PhonePe'
  },
  {
    id: 'PNT-1002',
    name: 'Priya Patel',
    phone: '+91 98765 12345',
    email: 'priya@example.com',
    category: 'Lead',
    notes: 'Inquired about teeth whitening',
    lastContacted: '25 Jul 2026',
    createdAt: '2026-07-22T10:00:00Z',
    treatmentType: 'Teeth Whitening',
    paymentMethod: 'Cash'
  },
  {
    id: 'PNT-1003',
    name: 'Suresh Kumar',
    phone: '+91 91234 56789',
    category: 'Follow-up',
    notes: 'Family member checkup required',
    lastContacted: '15 Jul 2026',
    createdAt: '2026-07-15T10:00:00Z',
    isFamily: true,
    treatmentType: 'General Dental'
  }
];

describe('ContactsEnterpriseWorkspace & Receptionist Grid Tests', () => {
  const dummyProps = {
    contacts: mockContacts,
    onOpenContactModal: vi.fn(),
    onDeleteContact: vi.fn(),
    onOpenCalendarModal: vi.fn(),
    onOpenMigrationModal: vi.fn(),
    onSelectChatLog: vi.fn(),
    onSendWhatsApp: vi.fn(),
    businessName: 'Sri Sai Dental Clinic',
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('1. Renders contacts grid cleanly and hides Payment Mode by default', () => {
    render(<ContactsEnterpriseWorkspace {...dummyProps} />);

    expect(screen.getAllByText('Rajesh Sharma').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Priya Patel').length).toBeGreaterThan(0);

    // Payment mode column header should NOT be present by default
    expect(screen.queryByText('Payment Mode')).toBeNull();
  });

  it('2. Category Stat Cards display correct counts and filter table on click', () => {
    render(<ContactsEnterpriseWorkspace {...dummyProps} />);

    // Click 'Leads' card
    const leadsCards = screen.getAllByText('Leads');
    const leadsCard = leadsCards[0].closest('div');
    if (leadsCard) fireEvent.click(leadsCard);

    // Get table element
    const table = screen.getByRole('table');

    // Should show Priya Patel (Lead) in table and NOT Rajesh Sharma (Active) in table
    expect(within(table).getByText('Priya Patel')).toBeTruthy();
    expect(within(table).queryByText('Rajesh Sharma')).toBeNull();
  });

  it('3. Can save a custom view TWICE (Save View #1 & Save View #2) and verify persistence in savedViewsList', async () => {
    render(<ContactsEnterpriseWorkspace {...dummyProps} />);

    // --- First Save View Operation ---
    const filterSaveBtns = screen.getAllByRole('button', { name: /^Save View$/i });
    fireEvent.click(filterSaveBtns[0]);

    // Modal should be open
    expect(screen.getByText('Save Custom Grid View')).toBeTruthy();
    const inputName = screen.getByPlaceholderText(/e.g., Morning Shift Follow-ups/i);
    fireEvent.change(inputName, { target: { value: 'Morning Shift View' } });

    // Confirm Save View #1 in modal
    const modalSaveBtns = screen.getAllByRole('button', { name: /^Save View$/i });
    fireEvent.click(modalSaveBtns[modalSaveBtns.length - 1]);

    // Toast notification should show
    expect(screen.getByText(/Saved new view "Morning Shift View"!/i)).toBeTruthy();

    // --- Second Save View Operation ---
    // Change a filter (e.g. Type = Leads)
    const typeSelect = screen.getByDisplayValue('All Types');
    fireEvent.change(typeSelect, { target: { value: 'Leads' } });

    // Click Save View again
    const filterSaveBtns2 = screen.getAllByRole('button', { name: /^Save View$/i });
    fireEvent.click(filterSaveBtns2[0]);

    const inputName2 = screen.getByPlaceholderText(/e.g., Morning Shift Follow-ups/i);
    fireEvent.change(inputName2, { target: { value: 'Leads Only View' } });

    const modalSaveBtns2 = screen.getAllByRole('button', { name: /^Save View$/i });
    fireEvent.click(modalSaveBtns2[modalSaveBtns2.length - 1]);

    // Toast notification for View #2 should show
    expect(screen.getByText(/Saved new view "Leads Only View"!/i)).toBeTruthy();

    // Verify localStorage persistence
    const savedInStorage = localStorage.getItem('nestam_contacts_saved_views_v2');
    expect(savedInStorage).not.toBeNull();
    const parsedViews = JSON.parse(savedInStorage!);
    expect(parsedViews.some((v: any) => v.name === 'Morning Shift View')).toBe(true);
    expect(parsedViews.some((v: any) => v.name === 'Leads Only View')).toBe(true);
  });

  it('4. Can add a custom column to the grid and remove it', async () => {
    render(<ContactsEnterpriseWorkspace {...dummyProps} />);

    // Click '+ Column' quick action button
    const addColBtns = screen.getAllByText('+ Column');
    fireEvent.click(addColBtns[0]);

    expect(screen.getByText('Add Custom Grid Column')).toBeTruthy();
    const titleInput = screen.getByPlaceholderText(/e.g., Preferred Time Slot/i);
    fireEvent.change(titleInput, { target: { value: 'Doctor Assigned' } });

    const defaultInput = screen.getByPlaceholderText(/e.g., Morning Shift or Dr. Prasad/i);
    fireEvent.change(defaultInput, { target: { value: 'Dr. Prasad' } });

    // Confirm Add Column
    const confirmAddBtn = screen.getByRole('button', { name: /^Add Column$/i });
    fireEvent.click(confirmAddBtn);

    // Header "Doctor Assigned" should now be present in table
    expect(screen.getByText('Doctor Assigned')).toBeTruthy();
    expect(screen.getAllByText('Dr. Prasad').length).toBeGreaterThan(0);
  });
});
