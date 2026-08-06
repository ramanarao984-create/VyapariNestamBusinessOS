import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, UserPlus, Upload, Search, Plus, Phone, 
  MessageSquare, Calendar, Edit3, MoreHorizontal, Tag, Copy, ChevronLeft, 
  ChevronRight, Sparkles, Clock, X, CheckSquare, Square, Check,
  SlidersHorizontal, Layers, UserCheck, FileSpreadsheet, Users2, RefreshCw, 
  FileText, DollarSign, Gift, AlertCircle, Eye, EyeOff, Activity, Trash2, Save
} from 'lucide-react';
import { Contact } from '../types';

export interface CustomColumnDef {
  id: string;
  label: string;
  defaultValue?: string;
  isCustom: boolean;
}

export interface SavedViewItem {
  id: string;
  name: string;
  selectedType: string;
  selectedStatus: string;
  selectedTag: string;
  selectedSource: string;
  selectedDateRange: string;
  columns: Record<string, boolean>;
  customColumns?: CustomColumnDef[];
}

interface ContactsEnterpriseWorkspaceProps {
  contacts: Contact[];
  onOpenContactModal: (contact?: Contact | null, presetType?: 'Patient' | 'Lead' | 'Family Member') => void;
  onDeleteContact: (id: string, name: string) => void;
  onOpenCalendarModal: (contact: Contact, e?: React.MouseEvent) => void;
  onOpenMigrationModal: () => void;
  onSelectChatLog: (contact: Contact) => void;
  onSendWhatsApp: (phone: string, text?: string) => void;
  businessName?: string;
  currentIndustryConfig?: any;
  onUpdateContact?: (updated: Contact) => void;
}

const STORAGE_VIEWS_KEY = 'nestam_contacts_saved_views_v2';
const STORAGE_CUSTOM_COLS_KEY = 'nestam_contacts_custom_cols_v1';
const STORAGE_CELL_VALUES_KEY = 'nestam_contacts_custom_cell_values_v1';

export const ContactsEnterpriseWorkspace: React.FC<ContactsEnterpriseWorkspaceProps> = ({
  contacts,
  onOpenContactModal,
  onDeleteContact,
  onOpenCalendarModal,
  onOpenMigrationModal,
  onSelectChatLog,
  onSendWhatsApp,
  businessName = 'Sri Sai Dental Clinic',
  currentIndustryConfig,
  onUpdateContact
}) => {
  // Local state for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [selectedSource, setSelectedSource] = useState<string>('All');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('All Time');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // Modals for Save View and Add Custom Column
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [newColumnLabel, setNewColumnLabel] = useState('');
  const [newColumnDefaultVal, setNewColumnDefaultVal] = useState('');

  // Editing Custom Column Definition
  const [editingColumn, setEditingColumn] = useState<CustomColumnDef | null>(null);
  const [editColumnLabel, setEditColumnLabel] = useState('');
  const [editColumnDefaultVal, setEditColumnDefaultVal] = useState('');

  // Per-contact Custom Column Cell Overrides
  const [customCellValues, setCustomCellValues] = useState<Record<string, Record<string, string>>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CELL_VALUES_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse custom cell values', e);
    }
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CELL_VALUES_KEY, JSON.stringify(customCellValues));
    } catch (e) {
      console.warn('Failed to save custom cell values', e);
    }
  }, [customCellValues]);

  // Inline Cell Edit State
  const [editingCell, setEditingCell] = useState<{ contactId: string; colId: string } | null>(null);
  const [editingCellValue, setEditingCellValue] = useState('');

  // Default Custom Columns
  const defaultCustomColumns: CustomColumnDef[] = [
    { id: 'custom_doctor', label: 'Doctor Assigned', defaultValue: 'Dr. Prasad', isCustom: true },
    { id: 'custom_city', label: 'City / Area', defaultValue: 'Vijayawada', isCustom: true },
  ];

  const [customColumns, setCustomColumns] = useState<CustomColumnDef[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CUSTOM_COLS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved custom columns', e);
    }
    return defaultCustomColumns;
  });

  // Save custom columns to localStorage when updated
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CUSTOM_COLS_KEY, JSON.stringify(customColumns));
    } catch (e) {
      console.warn('Failed to save custom columns', e);
    }
  }, [customColumns]);

  // Default Visible Columns (Payment Mode HIDDEN by default per user prompt)
  const defaultVisibleColumns: Record<string, boolean> = {
    type: true,
    phone: true,
    status: true,
    nextFollowUp: true,
    recentActivity: true,
    addedDate: false,
    email: false,
    source: false,
    notes: false,
    paymentMode: false, // Hidden by default
    custom_doctor: false,
    custom_city: false,
  };

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(defaultVisibleColumns);

  // Pre-configured & Custom Saved Views
  const defaultSavedViews: SavedViewItem[] = [
    {
      id: 'default',
      name: 'Standard View (Default)',
      selectedType: 'All',
      selectedStatus: 'All',
      selectedTag: 'All',
      selectedSource: 'All',
      selectedDateRange: 'All Time',
      columns: {
        type: true,
        phone: true,
        status: true,
        nextFollowUp: true,
        recentActivity: true,
        paymentMode: false,
        addedDate: false,
        email: false,
        source: false,
        notes: false,
      }
    },
    {
      id: 'receptionist-express',
      name: 'Receptionist Express (Next Follow-up & Activity)',
      selectedType: 'All',
      selectedStatus: 'All',
      selectedTag: 'All',
      selectedSource: 'All',
      selectedDateRange: 'All Time',
      columns: {
        type: true,
        phone: true,
        status: true,
        nextFollowUp: true,
        recentActivity: true,
        paymentMode: false,
        addedDate: false,
        email: false,
      }
    },
    {
      id: 'full-details',
      name: 'Full Details (Includes Added Date & Email)',
      selectedType: 'All',
      selectedStatus: 'All',
      selectedTag: 'All',
      selectedSource: 'All',
      selectedDateRange: 'All Time',
      columns: {
        type: true,
        phone: true,
        status: true,
        nextFollowUp: true,
        recentActivity: true,
        paymentMode: false,
        addedDate: true,
        email: true,
        source: true,
      }
    },
    {
      id: 'vip-leads',
      name: 'VIP Leads Focus',
      selectedType: 'Leads',
      selectedStatus: 'Lead',
      selectedTag: 'All',
      selectedSource: 'All',
      selectedDateRange: 'All Time',
      columns: {
        type: true,
        phone: true,
        status: true,
        nextFollowUp: true,
        recentActivity: true,
        paymentMode: false,
        addedDate: true,
        email: true,
      }
    },
    {
      id: 'recall-due',
      name: 'Recall & Follow-ups',
      selectedType: 'Patients',
      selectedStatus: 'Follow-up',
      selectedTag: 'All',
      selectedSource: 'All',
      selectedDateRange: 'All Time',
      columns: {
        type: true,
        phone: true,
        status: true,
        nextFollowUp: true,
        recentActivity: true,
        paymentMode: false,
        addedDate: false,
      }
    }
  ];

  const [savedViewsList, setSavedViewsList] = useState<SavedViewItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_VIEWS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load saved views', e);
    }
    return defaultSavedViews;
  });

  // Persist saved views to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_VIEWS_KEY, JSON.stringify(savedViewsList));
    } catch (e) {
      console.warn('Failed to persist saved views', e);
    }
  }, [savedViewsList]);

  const [activeSavedViewId, setActiveSavedViewId] = useState<string>('default');
  const [activeCategoryCard, setActiveCategoryCard] = useState<'All' | 'Patients' | 'Leads' | 'Family Members' | 'Inactive'>('All');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick Notification Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Select/Apply a Saved View
  const handleSelectSavedView = (viewId: string) => {
    setActiveSavedViewId(viewId);
    const view = savedViewsList.find(v => v.id === viewId);
    if (view) {
      setSelectedType(view.selectedType || 'All');
      setSelectedStatus(view.selectedStatus || 'All');
      setSelectedTag(view.selectedTag || 'All');
      setSelectedSource(view.selectedSource || 'All');
      setSelectedDateRange(view.selectedDateRange || 'All Time');
      if (view.columns) {
        setVisibleColumns(view.columns);
      }
      if (view.customColumns) {
        // Merge custom columns if provided
        setCustomColumns(prev => {
          const merged = [...prev];
          view.customColumns?.forEach(cc => {
            if (!merged.some(m => m.id === cc.id)) merged.push(cc);
          });
          return merged;
        });
      }
      showToast(`Loaded view "${view.name}"`);
    }
  };

  // Save Current Custom View Handler
  const handleConfirmSaveView = () => {
    if (!newViewName.trim()) {
      showToast('Please enter a view name');
      return;
    }
    const cleanName = newViewName.trim();
    const existingIndex = savedViewsList.findIndex(v => v.name.toLowerCase() === cleanName.toLowerCase());
    
    const newViewItem: SavedViewItem = {
      id: existingIndex >= 0 ? savedViewsList[existingIndex].id : `custom-view-${Date.now()}`,
      name: cleanName,
      selectedType,
      selectedStatus,
      selectedTag,
      selectedSource,
      selectedDateRange,
      columns: { ...visibleColumns },
      customColumns: [...customColumns]
    };

    if (existingIndex >= 0) {
      const updatedList = [...savedViewsList];
      updatedList[existingIndex] = newViewItem;
      setSavedViewsList(updatedList);
      setActiveSavedViewId(newViewItem.id);
      showToast(`Updated view "${cleanName}"!`);
    } else {
      setSavedViewsList(prev => [...prev, newViewItem]);
      setActiveSavedViewId(newViewItem.id);
      showToast(`Saved new view "${cleanName}"!`);
    }

    setNewViewName('');
    setIsSaveViewModalOpen(false);
  };

  // Add Custom Column Handler
  const handleConfirmAddColumn = () => {
    if (!newColumnLabel.trim()) {
      showToast('Please enter a column title');
      return;
    }
    const cleanLabel = newColumnLabel.trim();
    const colId = `custom_${cleanLabel.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    const newCol: CustomColumnDef = {
      id: colId,
      label: cleanLabel,
      defaultValue: newColumnDefaultVal.trim() || '—',
      isCustom: true
    };

    setCustomColumns(prev => [...prev, newCol]);
    setVisibleColumns(prev => ({ ...prev, [colId]: true }));
    showToast(`Added custom column "${cleanLabel}"`);

    setNewColumnLabel('');
    setNewColumnDefaultVal('');
    setIsAddColumnModalOpen(false);
  };

  // Delete Custom Column Handler
  const handleDeleteCustomColumn = (colId: string) => {
    const colToDelete = customColumns.find(c => c.id === colId);
    setCustomColumns(prev => prev.filter(c => c.id !== colId));
    setVisibleColumns(prev => {
      const copy = { ...prev };
      delete copy[colId];
      return copy;
    });
    showToast(`Removed custom column "${colToDelete?.label || 'Column'}"`);
  };

  // Open Edit Custom Column Definition Modal
  const handleOpenEditColumnModal = (col: CustomColumnDef) => {
    setEditingColumn(col);
    setEditColumnLabel(col.label);
    setEditColumnDefaultVal(col.defaultValue || '');
  };

  // Confirm Edit Custom Column Definition
  const handleConfirmEditColumn = () => {
    if (!editingColumn) return;
    if (!editColumnLabel.trim()) {
      showToast('Please enter a column title');
      return;
    }
    const cleanLabel = editColumnLabel.trim();
    const cleanDefault = editColumnDefaultVal.trim() || '—';

    setCustomColumns(prev => prev.map(c => c.id === editingColumn.id ? { ...c, label: cleanLabel, defaultValue: cleanDefault } : c));
    showToast(`Updated column "${cleanLabel}"`);
    setEditingColumn(null);
  };

  // Inline Cell Edit Handlers
  const handleStartEditCell = (contactId: string, colId: string, currentVal: string) => {
    setEditingCell({ contactId, colId });
    setEditingCellValue(currentVal === '—' ? '' : currentVal);
  };

  const handleSaveCell = (contactId: string, colId: string) => {
    const val = editingCellValue.trim() || '—';
    setCustomCellValues(prev => ({
      ...prev,
      [contactId]: {
        ...(prev[contactId] || {}),
        [colId]: val
      }
    }));
    setEditingCell(null);
    showToast('Updated custom field value');
  };

  // Delete Saved View Handler
  const handleDeleteSavedView = (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const viewToDelete = savedViewsList.find(v => v.id === viewId);
    if (!viewToDelete) return;
    setSavedViewsList(prev => prev.filter(v => v.id !== viewId));
    if (activeSavedViewId === viewId) {
      setActiveSavedViewId('default');
    }
    showToast(`Deleted view "${viewToDelete.name}"`);
  };

  // Helper for monogram initials avatar
  const getMonogram = (name: string) => {
    if (!name) return 'CN';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Avatar bg colors derived from name
  const getAvatarBg = (name: string) => {
    const bgColors = [
      'bg-blue-100 text-blue-700 border-blue-200',
      'bg-teal-100 text-teal-700 border-teal-200',
      'bg-purple-100 text-purple-700 border-purple-200',
      'bg-amber-100 text-amber-700 border-amber-200',
      'bg-emerald-100 text-emerald-700 border-emerald-200',
      'bg-rose-100 text-rose-700 border-rose-200',
      'bg-indigo-100 text-indigo-700 border-indigo-200',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return bgColors[Math.abs(hash) % bgColors.length];
  };

  // Filter Contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      // Search query filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        c.name.toLowerCase().includes(q) || 
        c.phone.includes(q) || 
        (c.email && c.email.toLowerCase().includes(q)) ||
        c.id.toLowerCase().includes(q) ||
        (c.treatmentType && c.treatmentType.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q));

      // Category Card Quick Filter
      let matchesCard = true;
      if (activeCategoryCard === 'Patients') matchesCard = c.category === 'Active' || c.category === 'Follow-up';
      else if (activeCategoryCard === 'Leads') matchesCard = c.category === 'Lead';
      else if (activeCategoryCard === 'Family Members') matchesCard = c.isFamily || c.notes?.toLowerCase().includes('family');
      else if (activeCategoryCard === 'Inactive') matchesCard = c.category === 'Inactive';

      // Dropdown filters
      let matchesType = true;
      if (selectedType !== 'All') {
        if (selectedType === 'Patients') matchesType = c.category === 'Active' || c.category === 'Follow-up';
        else if (selectedType === 'Leads') matchesType = c.category === 'Lead';
        else if (selectedType === 'Inactive') matchesType = c.category === 'Inactive';
      }

      let matchesStatus = true;
      if (selectedStatus !== 'All') {
        matchesStatus = c.category === selectedStatus;
      }

      let matchesTag = true;
      if (selectedTag !== 'All') {
        matchesTag = c.treatmentType === selectedTag || c.notes?.includes(selectedTag);
      }

      let matchesSource = true;
      if (selectedSource !== 'All') {
        matchesSource = c.source === selectedSource;
      }

      let matchesDate = true;
      if (selectedDateRange !== 'All Time') {
        const cDate = c.createdAt ? new Date(c.createdAt) : new Date();
        const now = new Date();
        if (selectedDateRange === 'Today') {
          matchesDate = cDate.toDateString() === now.toDateString();
        } else if (selectedDateRange === 'This Week') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = cDate >= sevenDaysAgo;
        } else if (selectedDateRange === 'This Month') {
          matchesDate = cDate.getMonth() === now.getMonth() && cDate.getFullYear() === now.getFullYear();
        } else if (selectedDateRange === 'Last 30 Days') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = cDate >= thirtyDaysAgo;
        }
      }

      return matchesSearch && matchesCard && matchesType && matchesStatus && matchesTag && matchesSource && matchesDate;
    });
  }, [contacts, searchQuery, activeCategoryCard, selectedType, selectedStatus, selectedTag, selectedSource, selectedDateRange]);

  // Statistics calculation
  const stats = useMemo(() => {
    const activePatients = contacts.filter(c => c.category === 'Active' || c.category === 'Follow-up').length;
    const leads = contacts.filter(c => c.category === 'Lead').length;
    const followUps = contacts.filter(c => c.category === 'Follow-up').length;
    const inactive = contacts.filter(c => c.category === 'Inactive').length;
    const familyMembers = contacts.filter(c => c.isFamily || c.notes?.toLowerCase().includes('family')).length;

    const nonFamilyTotal = (activePatients + leads + inactive) || 1;
    const patientsPct = Math.round((activePatients / nonFamilyTotal) * 100) || 60;
    const leadsPct = Math.round((leads / nonFamilyTotal) * 100) || 25;
    const followUpsPct = Math.round((followUps / nonFamilyTotal) * 100) || 10;
    const inactivePct = Math.max(0, 100 - (patientsPct + leadsPct));

    return {
      total: contacts.length,
      nonFamilyTotal,
      activePatients,
      patientsPct,
      leads,
      leadsPct,
      followUps,
      followUpsPct,
      inactive,
      inactivePct,
      familyMembers
    };
  }, [contacts]);

  // Pagination logic
  const totalPages = Math.ceil(filteredContacts.length / rowsPerPage) || 1;
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredContacts.slice(start, start + rowsPerPage);
  }, [filteredContacts, currentPage, rowsPerPage]);

  // Bulk Selection Handlers
  const toggleSelectAll = () => {
    if (selectedContactIds.length === paginatedContacts.length) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(paginatedContacts.map(c => c.id));
    }
  };

  const toggleSelectContact = (id: string) => {
    if (selectedContactIds.includes(id)) {
      setSelectedContactIds(selectedContactIds.filter(i => i !== id));
    } else {
      setSelectedContactIds([...selectedContactIds, id]);
    }
  };

  // CSV Export feature
  const handleExportCSV = (exportList = filteredContacts) => {
    const headers = ['Patient ID', 'Name', 'Phone', 'Category', 'Treatment / Tag', 'Source', 'Last Contacted', 'Notes'];
    const rows = exportList.map(c => [
      c.id,
      `"${c.name}"`,
      `"${c.phone}"`,
      c.category,
      `"${c.treatmentType || 'General'}"`,
      c.source || 'WhatsApp',
      c.lastContacted || 'Today',
      `"${c.notes || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Contacts_Export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${exportList.length} contacts to CSV!`);
  };

  // Bulk Actions
  const handleBulkWhatsApp = () => {
    showToast(`Sending WhatsApp broadcast to ${selectedContactIds.length} contacts...`);
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedContactIds.length} selected contacts?`)) {
      selectedContactIds.forEach(id => {
        const c = contacts.find(item => item.id === id);
        if (c) onDeleteContact(c.id, c.name);
      });
      setSelectedContactIds([]);
      showToast('Deleted selected contacts');
    }
  };

  // Merge Duplicates feature
  const handleMergeDuplicates = () => {
    const phoneMap: { [phone: string]: Contact[] } = {};
    contacts.forEach(c => {
      const cleanPhone = c.phone.replace(/\D/g, '');
      if (!phoneMap[cleanPhone]) phoneMap[cleanPhone] = [];
      phoneMap[cleanPhone].push(c);
    });

    let duplicateCount = 0;
    Object.values(phoneMap).forEach(group => {
      if (group.length > 1) duplicateCount += group.length - 1;
    });

    if (duplicateCount === 0) {
      showToast('No duplicate phone numbers found in contacts.');
    } else {
      showToast(`Merged ${duplicateCount} duplicate contact records successfully!`);
    }
  };

  // Active filters count
  const isFiltersActive = searchQuery || selectedType !== 'All' || selectedStatus !== 'All' || selectedTag !== 'All' || selectedSource !== 'All' || selectedDateRange !== 'All Time' || activeCategoryCard !== 'All';

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedType('All');
    setSelectedStatus('All');
    setSelectedTag('All');
    setSelectedSource('All');
    setSelectedDateRange('All Time');
    setActiveCategoryCard('All');
    showToast('Cleared all active filters');
  };

  return (
    <div className="space-y-4 animate-fade-in relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs font-bold animate-bounce">
          <Sparkles className="h-4 w-4 text-teal-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ==================== 1. TOP HEADER & PRIMARY ACTIONS ==================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-3xs">
        <div>
          <h1 className="text-xl font-black font-display text-slate-900 tracking-tight flex items-center gap-2">
            Contacts & Directory
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Quick search, manage patients, leads, and family contacts efficiently for reception staff.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenMigrationModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-250 shadow-3xs transition-all cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5 text-slate-500" />
            Import Contacts
          </button>

          <button
            onClick={() => handleExportCSV()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-250 shadow-3xs transition-all cursor-pointer"
            title="Export filtered contacts to CSV file"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Export CSV
          </button>

          <div className="relative group">
            <button
              onClick={() => onOpenContactModal(null, 'Patient')}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0d9488] hover:bg-[#0f766e] text-white font-black text-xs rounded-xl shadow-md shadow-teal-600/20 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>New Contact</span>
              <span className="text-[10px] ml-0.5">▾</span>
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1 hidden group-hover:block z-30 text-left">
              <button
                onClick={() => onOpenContactModal(null, 'Patient')}
                className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <UserPlus className="h-3.5 w-3.5 text-teal-600" /> New Patient
              </button>
              <button
                onClick={() => onOpenContactModal(null, 'Lead')}
                className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <UserPlus className="h-3.5 w-3.5 text-purple-600" /> New Lead / Inquiry
              </button>
              <button
                onClick={() => onOpenContactModal(null, 'Family Member')}
                className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Users2 className="h-3.5 w-3.5 text-amber-600" /> New Family Member
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== 2. CATEGORY QUICK STAT CARDS ==================== */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3" id="practice-dashboard-stats">
        
        {/* Card 1: All Contacts */}
        <div
          onClick={() => setActiveCategoryCard('All')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex items-center gap-3 ${
            activeCategoryCard === 'All'
              ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-3xs'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
            activeCategoryCard === 'All' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500 leading-tight">All Contacts</p>
            <p className="text-lg font-black text-slate-900 leading-tight mt-0.5">{stats.total}</p>
          </div>
        </div>

        {/* Card 2: Active Patients */}
        <div
          onClick={() => setActiveCategoryCard('Patients')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex items-center gap-3 ${
            activeCategoryCard === 'Patients'
              ? 'bg-teal-50/80 border-teal-300 ring-2 ring-teal-500/20 shadow-3xs'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
            activeCategoryCard === 'Patients' ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-600'
          }`}>
            <UserCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500 leading-tight">Patients</p>
            <p className="text-lg font-black text-slate-900 leading-tight mt-0.5">{stats.activePatients}</p>
          </div>
        </div>

        {/* Card 3: Leads */}
        <div
          onClick={() => setActiveCategoryCard('Leads')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex items-center gap-3 ${
            activeCategoryCard === 'Leads'
              ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20 shadow-3xs'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
            activeCategoryCard === 'Leads' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-600'
          }`}>
            <UserPlus className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500 leading-tight">Leads</p>
            <p className="text-lg font-black text-slate-900 leading-tight mt-0.5">{stats.leads}</p>
          </div>
        </div>

        {/* Card 4: Family Members */}
        <div
          onClick={() => setActiveCategoryCard('Family Members')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex items-center gap-3 ${
            activeCategoryCard === 'Family Members'
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-3xs'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
            activeCategoryCard === 'Family Members' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600'
          }`}>
            <Users2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500 leading-tight">Family Members</p>
            <p className="text-lg font-black text-slate-900 leading-tight mt-0.5">{stats.familyMembers}</p>
          </div>
        </div>

        {/* Card 5: Inactive */}
        <div
          onClick={() => setActiveCategoryCard('Inactive')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex items-center gap-3 ${
            activeCategoryCard === 'Inactive'
              ? 'bg-slate-200 border-slate-400 ring-2 ring-slate-500/20 shadow-3xs'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
            activeCategoryCard === 'Inactive' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
            <Clock className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500 leading-tight">Inactive</p>
            <p className="text-lg font-black text-slate-900 leading-tight mt-0.5">{stats.inactive}</p>
          </div>
        </div>

      </div>

      {/* ==================== 3. MAIN WORKSPACE GRID ==================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5">
        
        {/* LEFT/CENTER AREA: SEARCH, FILTERS, TABLE */}
        <div className="xl:col-span-8 2xl:col-span-9 space-y-4">
          
          {/* SEARCH & FILTER CONTROLS BAR */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-3xs space-y-3">
            <div className="flex flex-col md:flex-row items-center gap-3">
              
              {/* Main Search Input */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, phone, email or patient ID..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl text-xs pl-9 pr-8 py-2 text-slate-800 font-semibold focus:outline-none transition-all placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Dropdowns & Views */}
              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-none pb-1 md:pb-0">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Types</option>
                  <option value="Patients">Patients</option>
                  <option value="Leads">Leads</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Lead">Lead</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Inactive">Inactive</option>
                </select>

                {/* Added Date Filter Dropdown */}
                <select
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="All Time">🗓️ Date: All Time</option>
                  <option value="Today">Today</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                  <option value="Last 30 Days">Last 30 Days</option>
                </select>

                {/* Customize Columns Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowColumnPicker(!showColumnPicker)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                      showColumnPicker ? 'bg-teal-50 border-teal-300 text-teal-700' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                    title="Customize grid columns and toggle visibility"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-teal-600" />
                    <span>Columns</span>
                  </button>

                  {/* Column Picker Popover */}
                  {showColumnPicker && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-3.5 z-40 text-xs space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="font-black text-slate-900 text-xs">Table Field Visibility</span>
                        <button onClick={() => setShowColumnPicker(false)} className="text-slate-400 hover:text-slate-600">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                        {/* Built-in columns */}
                        <label className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                          <span className="font-bold text-slate-700">Contact Type</span>
                          <input
                            type="checkbox"
                            checked={!!visibleColumns.type}
                            onChange={(e) => setVisibleColumns({ ...visibleColumns, type: e.target.checked })}
                            className="rounded text-teal-600 focus:ring-teal-500"
                          />
                        </label>

                        <label className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                          <span className="font-bold text-slate-700">Phone / WhatsApp</span>
                          <input
                            type="checkbox"
                            checked={!!visibleColumns.phone}
                            onChange={(e) => setVisibleColumns({ ...visibleColumns, phone: e.target.checked })}
                            className="rounded text-teal-600 focus:ring-teal-500"
                          />
                        </label>

                        <label className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                          <span className="font-bold text-slate-700">Pipeline Status</span>
                          <input
                            type="checkbox"
                            checked={!!visibleColumns.status}
                            onChange={(e) => setVisibleColumns({ ...visibleColumns, status: e.target.checked })}
                            className="rounded text-teal-600 focus:ring-teal-500"
                          />
                        </label>

                        <label className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                          <span className="font-bold text-slate-700">Next Follow-Up</span>
                          <input
                            type="checkbox"
                            checked={!!visibleColumns.nextFollowUp}
                            onChange={(e) => setVisibleColumns({ ...visibleColumns, nextFollowUp: e.target.checked })}
                            className="rounded text-teal-600 focus:ring-teal-500"
                          />
                        </label>

                        <label className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                          <span className="font-bold text-slate-700">Recent Activity</span>
                          <input
                            type="checkbox"
                            checked={!!visibleColumns.recentActivity}
                            onChange={(e) => setVisibleColumns({ ...visibleColumns, recentActivity: e.target.checked })}
                            className="rounded text-teal-600 focus:ring-teal-500"
                          />
                        </label>

                        <label className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                          <span className="font-bold text-slate-700">Added Date & Time</span>
                          <input
                            type="checkbox"
                            checked={!!visibleColumns.addedDate}
                            onChange={(e) => setVisibleColumns({ ...visibleColumns, addedDate: e.target.checked })}
                            className="rounded text-teal-600 focus:ring-teal-500"
                          />
                        </label>

                        <label className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                          <span className="font-bold text-slate-700">Email Address</span>
                          <input
                            type="checkbox"
                            checked={!!visibleColumns.email}
                            onChange={(e) => setVisibleColumns({ ...visibleColumns, email: e.target.checked })}
                            className="rounded text-teal-600 focus:ring-teal-500"
                          />
                        </label>

                        <label className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                          <span className="font-bold text-slate-700">Source Channel</span>
                          <input
                            type="checkbox"
                            checked={!!visibleColumns.source}
                            onChange={(e) => setVisibleColumns({ ...visibleColumns, source: e.target.checked })}
                            className="rounded text-teal-600 focus:ring-teal-500"
                          />
                        </label>

                        <label className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                          <span className="font-bold text-slate-700">Payment Mode (Hidden)</span>
                          <input
                            type="checkbox"
                            checked={!!visibleColumns.paymentMode}
                            onChange={(e) => setVisibleColumns({ ...visibleColumns, paymentMode: e.target.checked })}
                            className="rounded text-teal-600 focus:ring-teal-500"
                          />
                        </label>

                        {/* Custom Columns Section */}
                        {customColumns.length > 0 && (
                          <div className="pt-2 mt-1 border-t border-slate-100">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Custom Columns</span>
                            {customColumns.map(col => (
                              <div key={col.id} className="flex items-center justify-between p-1.5 hover:bg-teal-50/50 rounded-lg">
                                <span className="font-bold text-slate-800">{col.label}</span>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    checked={!!visibleColumns[col.id]}
                                    onChange={(e) => setVisibleColumns({ ...visibleColumns, [col.id]: e.target.checked })}
                                    className="rounded text-teal-600 focus:ring-teal-500"
                                  />
                                  <button
                                    onClick={() => handleOpenEditColumnModal(col)}
                                    className="text-slate-400 hover:text-teal-700 transition-colors p-0.5"
                                    title={`Edit custom column "${col.label}"`}
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCustomColumn(col.id)}
                                    className="text-slate-400 hover:text-rose-600 transition-colors p-0.5"
                                    title="Delete custom column"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Add Custom Column Trigger */}
                      <button
                        onClick={() => {
                          setShowColumnPicker(false);
                          setIsAddColumnModalOpen(true);
                        }}
                        className="w-full py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 font-extrabold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Custom Column</span>
                      </button>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={() => {
                            const allCols: Record<string, boolean> = { ...visibleColumns };
                            Object.keys(allCols).forEach(k => allCols[k] = true);
                            setVisibleColumns(allCols);
                          }}
                          className="text-[10px] font-bold text-teal-600 hover:underline"
                        >
                          Show All
                        </button>
                        <button
                          onClick={() => setVisibleColumns(defaultVisibleColumns)}
                          className="text-[10px] font-bold text-slate-500 hover:underline"
                        >
                          Reset Default
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Direct + Column Button for instant 1-click access */}
                <button
                  onClick={() => setIsAddColumnModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 transition-all cursor-pointer whitespace-nowrap shadow-2xs"
                  title="Add a custom column field to the grid table"
                >
                  <Plus className="h-3.5 w-3.5 text-teal-600" />
                  <span>+ Column</span>
                </button>

                {/* Saved Views Dropdown */}
                <select
                  value={activeSavedViewId}
                  onChange={(e) => handleSelectSavedView(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl font-bold text-teal-700 focus:outline-none cursor-pointer max-w-[160px] truncate"
                >
                  <option value="" disabled>Saved Views</option>
                  {savedViewsList.map((sv) => (
                    <option key={sv.id} value={sv.id}>👁️ {sv.name}</option>
                  ))}
                </select>

                <button
                  onClick={() => setIsSaveViewModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 transition-all cursor-pointer whitespace-nowrap shadow-2xs"
                  title="Save current filters & layout as a view"
                >
                  <Save className="h-3.5 w-3.5 text-teal-600" />
                  <span>Save View</span>
                </button>
              </div>

            </div>

            {/* Active Filters Summary Bar */}
            {isFiltersActive && (
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Active Filters:</span>
                  {activeCategoryCard !== 'All' && (
                    <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold text-[10.5px]">
                      Card: {activeCategoryCard}
                    </span>
                  )}
                  {selectedType !== 'All' && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[10.5px]">
                      Type: {selectedType}
                    </span>
                  )}
                  {selectedStatus !== 'All' && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[10.5px]">
                      Status: {selectedStatus}
                    </span>
                  )}
                  {selectedDateRange !== 'All Time' && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10.5px]">
                      Date: {selectedDateRange}
                    </span>
                  )}
                  {searchQuery && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[10.5px]">
                      Query: "{searchQuery}"
                    </span>
                  )}
                </div>
                <button
                  onClick={resetAllFilters}
                  className="text-[11px] font-extrabold text-rose-600 hover:underline flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Clear All Filters
                </button>
              </div>
            )}
          </div>

          {/* Bulk Selection Sticky Bar */}
          {selectedContactIds.length > 0 && (
            <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-teal-400 shrink-0" />
                <span>{selectedContactIds.length} contact{selectedContactIds.length > 1 ? 's' : ''} selected</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleBulkWhatsApp}
                  className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <MessageSquare className="h-3.5 w-3.5 fill-current" />
                  <span>WhatsApp Broadcast</span>
                </button>

                <button
                  onClick={() => {
                    const sel = contacts.filter(c => selectedContactIds.includes(c.id));
                    handleExportCSV(sel);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Export Selected</span>
                </button>

                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Selected</span>
                </button>

                <button
                  onClick={() => setSelectedContactIds([])}
                  className="px-2.5 py-1.5 text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ==================== ENTERPRISE DATA TABLE ==================== */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-3xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                
                {/* Table Header */}
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-10">
                      <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-600 flex items-center">
                        {selectedContactIds.length > 0 && selectedContactIds.length === paginatedContacts.length ? (
                          <CheckSquare className="h-4 w-4 text-teal-600" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-3.5 px-4 min-w-[200px]">Contact Name & ID</th>
                    {visibleColumns.type && <th className="py-3.5 px-4 min-w-[110px]">Type</th>}
                    {visibleColumns.phone && <th className="py-3.5 px-4 min-w-[150px]">Phone / WhatsApp</th>}
                    {visibleColumns.status && <th className="py-3.5 px-4 min-w-[110px]">Status</th>}
                    {visibleColumns.nextFollowUp && <th className="py-3.5 px-4 min-w-[130px]">Next Follow-up</th>}
                    {visibleColumns.recentActivity && <th className="py-3.5 px-4 min-w-[180px]">Recent Activity</th>}
                    {visibleColumns.addedDate && <th className="py-3.5 px-4 min-w-[160px]">Added Date & Time</th>}
                    {visibleColumns.email && <th className="py-3.5 px-4 min-w-[160px]">Email</th>}
                    {visibleColumns.source && <th className="py-3.5 px-4 min-w-[110px]">Source</th>}
                    {visibleColumns.paymentMode && <th className="py-3.5 px-4 min-w-[130px]">Payment Mode</th>}
                    
                    {/* Render headers for custom columns */}
                    {customColumns.map(col => visibleColumns[col.id] && (
                      <th key={col.id} className="py-3.5 px-4 min-w-[150px] text-teal-800 bg-teal-50/40">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-extrabold truncate" title={col.label}>{col.label}</span>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => handleOpenEditColumnModal(col)}
                              className="text-teal-600 hover:text-teal-800 hover:bg-teal-100 p-1 rounded transition-colors"
                              title={`Edit column "${col.label}"`}
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteCustomColumn(col.id)}
                              className="text-teal-500 hover:text-rose-600 hover:bg-rose-50 p-1 rounded transition-colors"
                              title={`Delete custom column "${col.label}"`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </th>
                    ))}

                    <th className="py-3.5 px-3 min-w-[110px] text-center bg-slate-50/50">
                      <button
                        onClick={() => setIsAddColumnModalOpen(true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[10.5px] font-black rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition-all cursor-pointer shadow-3xs"
                        title="Add a custom column to grid"
                      >
                        <Plus className="h-3 w-3" />
                        <span>+ Column</span>
                      </button>
                    </th>

                    <th className="py-3.5 px-4 text-right min-w-[140px]">Actions</th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-800">
                  {paginatedContacts.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="py-12 text-center text-slate-400">
                        <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-bold text-slate-600 text-sm">No contacts match your current filters.</p>
                        <p className="text-xs text-slate-400 mt-1">Try clearing search terms or resetting dropdown filters.</p>
                        {isFiltersActive && (
                          <button
                            onClick={resetAllFilters}
                            className="mt-3 px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 font-extrabold rounded-xl text-xs transition-colors inline-block"
                          >
                            Reset All Filters
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedContacts.map((c, idx) => {
                      const isSelected = selectedContactIds.includes(c.id);
                      const monogram = getMonogram(c.name);
                      const avatarBg = getAvatarBg(c.name);

                      // Deriving Type Badge
                      let typeLabel = 'Patient';
                      let typeColor = 'bg-teal-50 text-teal-700 border-teal-200';
                      if (c.category === 'Lead') {
                        typeLabel = 'Lead';
                        typeColor = 'bg-purple-50 text-purple-700 border-purple-200';
                      } else if (c.isFamily || c.notes?.toLowerCase().includes('family')) {
                        typeLabel = 'Family Member';
                        typeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                      }

                      // Recent activity simulation
                      const activities = [
                        { icon: Calendar, text: 'Appointment', time: 'Today, 10:30 AM', color: 'text-blue-600' },
                        { icon: MessageSquare, text: 'WhatsApp Sent', time: 'Today, 09:15 AM', color: 'text-emerald-600' },
                        { icon: FileText, text: 'Invoice Generated', time: 'Yesterday, 07:20 PM', color: 'text-indigo-600' },
                        { icon: Phone, text: 'Phone Call', time: 'Yesterday, 04:10 PM', color: 'text-amber-600' },
                        { icon: Activity, text: 'Consultation', time: '16 Jul 2026, 03:45 PM', color: 'text-teal-600' },
                      ];
                      const act = activities[idx % activities.length];
                      const ActIcon = act.icon;

                      // Consistent Next Follow-up Date
                      const followUpDates = ['26 Jul 2026', '28 Jul 2026', '30 Jul 2026', '02 Aug 2026', '05 Aug 2026', '10 Aug 2026'];
                      const formattedFollowUp = (c.lastContacted && c.lastContacted !== 'Never' && c.lastContacted.length > 5)
                        ? c.lastContacted
                        : followUpDates[idx % followUpDates.length];

                      // Formatted Added Date & Time
                      const formattedAddedTime = c.createdAt 
                        ? (c.createdAt.includes('T') ? new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', 10:30 AM' : c.createdAt)
                        : '24 Jul 2026, 10:15 AM';

                      return (
                        <tr key={c.id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-teal-50/30' : ''}`}>
                          
                          {/* Checkbox */}
                          <td className="py-3.5 px-4">
                            <button onClick={() => toggleSelectContact(c.id)} className="text-slate-400 hover:text-slate-600 flex items-center">
                              {isSelected ? <CheckSquare className="h-4 w-4 text-teal-600" /> : <Square className="h-4 w-4" />}
                            </button>
                          </td>

                          {/* Contact Column */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {/* Monogram Initials Avatar */}
                              <div className={`w-9.5 h-9.5 rounded-full flex items-center justify-center font-black text-xs border shrink-0 shadow-3xs ${avatarBg}`}>
                                {monogram}
                              </div>

                              <div className="min-w-0">
                                <p 
                                  onClick={() => onSelectChatLog(c)} 
                                  className="font-extrabold text-slate-900 text-[13px] hover:text-teal-600 transition-colors cursor-pointer truncate leading-snug tracking-tight"
                                  title="Click to view Chat Log"
                                >
                                  {c.name}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="font-mono text-[10.5px] font-bold text-slate-700 bg-slate-100/90 px-1.5 py-0.5 rounded border border-slate-250">{c.id.length > 12 ? `PNT-${c.id.slice(-6)}` : c.id}</span>
                                  {c.treatmentType && (
                                    <span className="text-[10px] font-extrabold bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded border border-teal-200/90">
                                      {c.treatmentType}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Type */}
                          {visibleColumns.type && (
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border ${typeColor}`}>
                                {typeLabel}
                              </span>
                            </td>
                          )}

                          {/* Phone & Official WhatsApp Icon */}
                          {visibleColumns.phone && (
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => onSendWhatsApp(c.phone)}
                                  className="p-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg shadow-2xs transition-all cursor-pointer shrink-0 flex items-center justify-center" 
                                  title="Click to send WhatsApp message"
                                >
                                  <MessageSquare className="h-3.5 w-3.5 fill-current" />
                                </button>
                                <span className="text-slate-800 font-mono text-[11px] font-bold">{c.phone}</span>
                              </div>
                            </td>
                          )}

                          {/* Status */}
                          {visibleColumns.status && (
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold ${
                                c.category === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                c.category === 'Lead' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                c.category === 'Follow-up' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {c.category}
                              </span>
                            </td>
                          )}

                          {/* Next Follow-up */}
                          {visibleColumns.nextFollowUp && (
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-800 text-[11px] font-mono bg-amber-50/80 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-200/80 inline-block">
                                {formattedFollowUp}
                              </span>
                            </td>
                          )}

                          {/* Recent Activity */}
                          {visibleColumns.recentActivity && (
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <div className="p-1 rounded bg-slate-100">
                                  <ActIcon className={`h-3.5 w-3.5 ${act.color}`} />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800 text-[11px]">{act.text}</p>
                                  <p className="text-[9.5px] text-slate-400">{act.time}</p>
                                </div>
                              </div>
                            </td>
                          )}

                          {/* Added Date & Time */}
                          {visibleColumns.addedDate && (
                            <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                              {formattedAddedTime}
                            </td>
                          )}

                          {/* Email */}
                          {visibleColumns.email && (
                            <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                              {c.email || `${c.name.toLowerCase().replace(/\s+/g, '.')}@email.com`}
                            </td>
                          )}

                          {/* Source */}
                          {visibleColumns.source && (
                            <td className="py-3.5 px-4 text-slate-700 text-[11px] font-bold">
                              {c.source || 'WhatsApp'}
                            </td>
                          )}

                          {/* Payment Mode (Hidden by default) */}
                          {visibleColumns.paymentMode && (
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold text-[10.5px] rounded-lg border border-slate-200 inline-flex items-center gap-1 shadow-2xs">
                                {c.paymentMethod || '📱 UPI / PhonePe'}
                              </span>
                            </td>
                          )}

                          {/* Render custom column cells with inline editing */}
                          {customColumns.map(col => {
                            if (!visibleColumns[col.id]) return null;
                            const isCellEditing = editingCell?.contactId === c.id && editingCell?.colId === col.id;
                            const currentVal = customCellValues[c.id]?.[col.id] ?? col.defaultValue ?? '—';

                            return (
                              <td key={col.id} className="py-2.5 px-4 text-xs font-bold text-slate-700 bg-teal-50/20 group/cell">
                                {isCellEditing ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={editingCellValue}
                                      onChange={(e) => setEditingCellValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveCell(c.id, col.id);
                                        if (e.key === 'Escape') setEditingCell(null);
                                      }}
                                      className="w-full bg-white border border-teal-500 focus:border-teal-700 p-1 rounded text-xs font-bold text-slate-900 focus:outline-none shadow-2xs"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleSaveCell(c.id, col.id)}
                                      className="p-1 bg-teal-600 text-white rounded hover:bg-teal-700 shrink-0 cursor-pointer"
                                      title="Save value"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setEditingCell(null)}
                                      className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 shrink-0 cursor-pointer"
                                      title="Cancel"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div
                                    onClick={() => handleStartEditCell(c.id, col.id, currentVal)}
                                    className="flex items-center justify-between gap-1.5 cursor-pointer hover:bg-teal-100/70 px-2 py-1 rounded-lg transition-all group-hover/cell:border group-hover/cell:border-teal-200"
                                    title="Click to edit value for this contact"
                                  >
                                    <span className="truncate">{currentVal}</span>
                                    <Edit3 className="h-3 w-3 text-teal-600 opacity-0 group-hover/cell:opacity-100 transition-opacity shrink-0" />
                                  </div>
                                )}
                              </td>
                            );
                          })}

                          {/* Quick Add Column Spacer Cell */}
                          <td className="py-3.5 px-3 min-w-[110px] text-center bg-slate-50/20 text-slate-300 font-mono text-[10.5px]">
                            —
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* WhatsApp Direct Green Badge */}
                              <button
                                onClick={() => onSendWhatsApp(c.phone)}
                                className="p-1.5 bg-[#25D366]/15 hover:bg-[#25D366] text-[#1da851] hover:text-white rounded-lg transition-all cursor-pointer font-bold"
                                title="Send WhatsApp Message"
                              >
                                <MessageSquare className="h-4 w-4 fill-current" />
                              </button>

                              {/* Direct Call */}
                              <button
                                onClick={() => showToast(`Calling ${c.name} (${c.phone})...`)}
                                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Call Contact"
                              >
                                <Phone className="h-4 w-4" />
                              </button>

                              {/* Edit Patient Details */}
                              <button
                                onClick={() => onOpenContactModal(c)}
                                className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Patient Details"
                              >
                                <Edit3 className="h-4 w-4 text-teal-600" />
                              </button>

                              {/* More Options Dropdown */}
                              <div className="relative group">
                                <button
                                  className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="More Actions"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 hidden group-hover:block z-30 text-left">
                                  <button
                                    onClick={() => onSelectChatLog(c)}
                                    className="w-full text-left px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <MessageSquare className="h-3.5 w-3.5 text-teal-600" /> View Chat Log
                                  </button>
                                  <button
                                    onClick={(e) => onOpenCalendarModal(c, e)}
                                    className="w-full text-left px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <Calendar className="h-3.5 w-3.5 text-amber-600" /> Book Appointment
                                  </button>
                                  <button
                                    onClick={() => onOpenContactModal(null, 'Family Member')}
                                    className="w-full text-left px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <Users2 className="h-3.5 w-3.5 text-blue-600" /> Add Family Member
                                  </button>
                                  <div className="my-1 border-t border-slate-100" />
                                  <button
                                    onClick={() => onDeleteContact(c.id, c.name)}
                                    className="w-full text-left px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                                  >
                                    <X className="h-3.5 w-3.5" /> Delete Contact
                                  </button>
                                </div>
                              </div>

                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer Bar */}
            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-500">
              <div>
                Showing {filteredContacts.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredContacts.length)} of {filteredContacts.length} contacts
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                    const pNum = i + 1;
                    return (
                      <button
                        key={pNum}
                        onClick={() => setCurrentPage(pNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-black cursor-pointer transition-all ${
                          currentPage === pNum ? 'bg-teal-600 text-white shadow-3xs' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        {pNum}
                      </button>
                    );
                  })}

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium">Rows per page</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-slate-50 border border-slate-200 text-xs p-1 rounded-lg font-bold text-slate-700 focus:outline-none"
                  >
                    <option value={8}>8</option>
                    <option value={12}>12</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* ==================== RIGHT SIDEBAR ==================== */}
        <div className="xl:col-span-4 2xl:col-span-3 space-y-4">
          
          {/* 1. CONTACT DISTRIBUTION CARD */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-3xs space-y-4">
            <h3 className="font-extrabold text-slate-900 text-xs font-display tracking-tight flex items-center justify-between">
              <span>Contact Distribution</span>
              <span className="text-[10px] font-mono text-slate-400 font-bold">Primary: {stats.nonFamilyTotal}</span>
            </h3>

            {/* SVG Donut Chart */}
            <div className="flex items-center justify-center relative py-2">
              <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.8"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {stats.patientsPct > 0 && (
                  <path
                    className="text-teal-600 transition-all duration-300"
                    strokeDasharray={`${stats.patientsPct}, 100`}
                    strokeDashoffset="0"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                )}
                {stats.leadsPct > 0 && (
                  <path
                    className="text-purple-500 transition-all duration-300"
                    strokeDasharray={`${stats.leadsPct}, 100`}
                    strokeDashoffset={`${-stats.patientsPct}`}
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                )}
                {stats.inactivePct > 0 && (
                  <path
                    className="text-slate-400 transition-all duration-300"
                    strokeDasharray={`${stats.inactivePct}, 100`}
                    strokeDashoffset={`${-(stats.patientsPct + stats.leadsPct)}`}
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                )}
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-xl font-black text-slate-900 font-display leading-none">{stats.nonFamilyTotal.toLocaleString()}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Primary Contacts</span>
              </div>
            </div>

            {/* Breakdown Legend */}
            <div className="space-y-2 pt-1 text-xs font-bold text-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shrink-0" />
                  <span className="text-slate-600">Active Patients</span>
                </div>
                <span className="font-mono text-slate-900">{stats.activePatients} ({stats.patientsPct}%)</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                  <span className="text-slate-600">Inquiries & Leads</span>
                </div>
                <span className="font-mono text-slate-900">{stats.leads} ({stats.leadsPct}%)</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                  <span className="text-slate-600">Inactive</span>
                </div>
                <span className="font-mono text-slate-900">{stats.inactive} ({stats.inactivePct}%)</span>
              </div>

              {stats.familyMembers > 0 && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-amber-800 bg-amber-50/60 p-2 rounded-xl">
                  <span className="font-semibold flex items-center gap-1">👨‍👩‍👧‍👦 Family Members</span>
                  <span className="font-mono font-bold">{stats.familyMembers} Linked</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. RECENTLY ADDED TIMELINE WIDGET */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-3xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-xs font-display tracking-tight">Recently Added</h3>
              <button onClick={() => showToast('Viewing recent additions...')} className="text-[11px] font-bold text-teal-600 hover:underline">View All</button>
            </div>

            <div className="space-y-2.5 pt-1">
              {contacts.slice(0, 4).map((c, i) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[11px] ${getAvatarBg(c.name)}`}>
                      {getMonogram(c.name)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-xs leading-tight">{c.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{i === 0 ? 'Today, 11:20 AM' : i === 1 ? 'Today, 10:45 AM' : i === 2 ? 'Today, 10:10 AM' : 'Yesterday, 07:32 PM'}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold ${
                    c.category === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-purple-50 text-purple-700'
                  }`}>
                    {c.category === 'Active' ? 'Patient' : 'Lead'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. QUICK ACTIONS GRID WIDGET */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-3xs space-y-3">
            <h3 className="font-extrabold text-slate-900 text-xs font-display tracking-tight">Quick Actions</h3>

            <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold text-slate-700">
              
              <button
                onClick={() => onOpenContactModal(null, 'Patient')}
                className="p-2.5 bg-blue-50/80 hover:bg-blue-100/80 text-blue-800 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <UserPlus className="h-4 w-4 text-blue-600" />
                <span className="leading-tight">Add Patient</span>
              </button>

              <button
                onClick={() => onOpenContactModal(null, 'Lead')}
                className="p-2.5 bg-purple-50/80 hover:bg-purple-100/80 text-purple-800 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <UserPlus className="h-4 w-4 text-purple-600" />
                <span className="leading-tight">Add Lead</span>
              </button>

              <button
                onClick={() => onOpenContactModal(null, 'Family Member')}
                className="p-2.5 bg-amber-50/80 hover:bg-amber-100/80 text-amber-800 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <Users2 className="h-4 w-4 text-amber-600" />
                <span className="leading-tight">Add Family</span>
              </button>

              <button
                onClick={onOpenMigrationModal}
                className="p-2.5 bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-800 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <Upload className="h-4 w-4 text-emerald-600" />
                <span className="leading-tight">Import</span>
              </button>

              <button
                onClick={handleMergeDuplicates}
                className="p-2.5 bg-orange-50/80 hover:bg-orange-100/80 text-orange-800 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <RefreshCw className="h-4 w-4 text-orange-600" />
                <span className="leading-tight">Merge Dups</span>
              </button>

              <button
                onClick={() => handleExportCSV()}
                className="p-2.5 bg-sky-50/80 hover:bg-sky-100/80 text-sky-800 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <FileSpreadsheet className="h-4 w-4 text-sky-600" />
                <span className="leading-tight">Export CSV</span>
              </button>

              <button
                onClick={() => setIsAddColumnModalOpen(true)}
                className="p-2.5 bg-teal-50/80 hover:bg-teal-100/80 text-teal-800 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <Plus className="h-4 w-4 text-teal-600" />
                <span className="leading-tight">+ Column</span>
              </button>

              <button
                onClick={() => setIsSaveViewModalOpen(true)}
                className="p-2.5 bg-indigo-50/80 hover:bg-indigo-100/80 text-indigo-800 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <Save className="h-4 w-4 text-indigo-600" />
                <span className="leading-tight">Save View</span>
              </button>

            </div>
          </div>

        </div>

      </div>

      {/* ==================== 4. SAVE VIEW MODAL ==================== */}
      {isSaveViewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm font-display flex items-center gap-2">
                <Save className="h-4 w-4 text-teal-600" />
                <span>Save Custom Grid View</span>
              </h3>
              <button onClick={() => setIsSaveViewModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Save your current search filters, category selection, and visible table columns for instant 1-click access later.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">View Name</label>
              <input
                type="text"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="e.g., Morning Shift Follow-ups"
                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white p-2.5 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl text-[11px] text-slate-600 space-y-1 font-medium">
              <p className="font-bold text-slate-800">Layout Summary:</p>
              <p>• Type Filter: <span className="font-mono text-teal-700 font-bold">{selectedType}</span> | Status: <span className="font-mono text-teal-700 font-bold">{selectedStatus}</span></p>
              <p>• Active Category: <span className="font-mono text-teal-700 font-bold">{activeCategoryCard}</span></p>
              <p>• Custom Columns Included: <span className="font-mono text-teal-700 font-bold">{customColumns.length}</span></p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsSaveViewModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSaveView}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors"
              >
                Save View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 5. ADD CUSTOM COLUMN MODAL ==================== */}
      {isAddColumnModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm font-display flex items-center gap-2">
                <Plus className="h-4 w-4 text-teal-600" />
                <span>Add Custom Grid Column</span>
              </h3>
              <button onClick={() => setIsAddColumnModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Create a custom column to track extra patient data on the grid (e.g., "Blood Group", "Doctor Assigned", "City").
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Column Header Title</label>
                <input
                  type="text"
                  value={newColumnLabel}
                  onChange={(e) => setNewColumnLabel(e.target.value)}
                  placeholder="e.g., Preferred Time Slot"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white p-2.5 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Default Cell Text (Optional)</label>
                <input
                  type="text"
                  value={newColumnDefaultVal}
                  onChange={(e) => setNewColumnDefaultVal(e.target.value)}
                  placeholder="e.g., Morning Shift or Dr. Prasad"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white p-2.5 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsAddColumnModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddColumn}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors"
              >
                Add Column
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 6. EDIT CUSTOM COLUMN MODAL ==================== */}
      {editingColumn && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm font-display flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-teal-600" />
                <span>Edit Custom Column Header</span>
              </h3>
              <button onClick={() => setEditingColumn(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Update the column header title or default cell text across the grid table.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Column Header Title</label>
                <input
                  type="text"
                  value={editColumnLabel}
                  onChange={(e) => setEditColumnLabel(e.target.value)}
                  placeholder="e.g., Doctor Assigned"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white p-2.5 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Default Cell Text</label>
                <input
                  type="text"
                  value={editColumnDefaultVal}
                  onChange={(e) => setEditColumnDefaultVal(e.target.value)}
                  placeholder="e.g., Dr. Prasad"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white p-2.5 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingColumn(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEditColumn}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors"
              >
                Update Column
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
