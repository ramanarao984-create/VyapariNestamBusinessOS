import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Upload, 
  Clipboard, 
  Trash2, 
  AlertTriangle, 
  Check, 
  HelpCircle, 
  Plus, 
  FileSpreadsheet, 
  CheckSquare, 
  Square,
  Sparkles,
  Info,
  Settings
} from 'lucide-react';
import { Contact, ContactCategory } from '../types';

interface MigrationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  existingContacts: Contact[];
  onImportContacts: (newContacts: Contact[]) => void;
  currentIndustryConfig: {
    terminology: {
      patientLabel: string;
      patientsLabel: string;
    };
    stages: Array<{ id: string; label: string }>;
  };
}

interface ParsedContact {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  pipelineStage: 'Inquiry' | 'Scheduled' | 'Visited' | 'Treatment' | 'Completed';
  category: ContactCategory;
  isDuplicate: boolean;
  selected: boolean;
  isValid: boolean;
}

export function MigrationCenter({
  isOpen,
  onClose,
  existingContacts,
  onImportContacts,
  currentIndustryConfig
}: MigrationCenterProps) {
  const [activeTab, setActiveTab] = useState<'paste' | 'file'>('paste');
  const [inputText, setInputText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [parsedList, setParsedList] = useState<ParsedContact[]>([]);
  const [defaultStage, setDefaultStage] = useState<'Inquiry' | 'Scheduled' | 'Visited' | 'Treatment' | 'Completed'>('Inquiry');
  const [defaultCategory, setDefaultCategory] = useState<ContactCategory>('Lead');
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'overwrite'>('skip');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to format/clean phone numbers (India 91 default or clean international)
  const formatWhatsAppPhone = (phone: string): string => {
    let digits = phone.replace(/[^0-9]/g, '');
    
    // Remove leading zeros
    while (digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    
    // If it's a 10 digit number, prepend 91 to make it 12 digits starting with 91
    if (digits.length === 10) {
      return '91' + digits;
    }
    
    // If it's a 12 digit number starting with 91, return as is
    if (digits.length === 12 && digits.startsWith('91')) {
      return digits;
    }
    
    // If it starts with 91 but is longer or shorter, standardize using the last 10 digits
    if (digits.length > 10) {
      const last10 = digits.slice(-10);
      return '91' + last10;
    }
    
    // If shorter than 10 digits, pad it to 10 digits then prepend 91
    if (digits.length < 10 && digits.length > 0) {
      const padded = digits.padStart(10, '0');
      return '91' + padded;
    }
    
    return digits;
  };

  // Helper to detect if a row is a CSV or data header
  const isHeaderRow = (line: string): boolean => {
    const lower = line.toLowerCase();
    const hasName = lower.includes('name') || lower.includes('client') || lower.includes('patient') || lower.includes('customer');
    const hasPhone = lower.includes('phone') || lower.includes('mobile') || lower.includes('whatsapp') || lower.includes('number') || lower.includes('contact');
    return hasName && hasPhone;
  };

  // Smart WhatsApp Copy-Paste list parser
  const parsePastedText = (text: string) => {
    if (!text.trim()) return;

    const lines = text.split('\n');
    const results: ParsedContact[] = [];

    lines.forEach((line, idx) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      // Ensure NO rows are accidentally sliced off assuming they are CSV headers when in plain-text mode.
      // We do not skip line 0 based on isHeaderRow() in this plain text copy-paste list mode.

      let phone = '';
      let notes = '';

      // 1. Extract notes first (anything in parentheses or square brackets)
      const parenRegex = /\(([^)]+)\)/g;
      const parenMatches = [...trimmedLine.matchAll(parenRegex)];
      let parenNotes = '';
      if (parenMatches.length > 0) {
        parenNotes = parenMatches.map(m => m[1].trim()).join(', ');
      }

      const bracketRegex = /\[([^\]]+)\]/g;
      const bracketMatches = [...trimmedLine.matchAll(bracketRegex)];
      let bracketNotes = '';
      if (bracketMatches.length > 0) {
        bracketNotes = bracketMatches.map(m => m[1].trim()).join(', ');
      }

      if (parenNotes && bracketNotes) {
        notes = `${parenNotes}, ${bracketNotes}`;
      } else {
        notes = parenNotes || bracketNotes;
      }

      // Clean the line by removing paren and bracket blocks to get workingLine
      let workingLine = trimmedLine
        .replace(/\(([^)]+)\)/g, '')
        .replace(/\[([^\]]+)\]/g, '')
        .trim();

      // 2. Extract phone number using standard and non-standard spacing, including missing country codes
      // Matches any sequence of optional +, digits, spaces, hyphens, dots
      const phoneCandidatesRegex = /\+?[\d\s\-\.]{10,24}/g;
      const candidates = workingLine.match(phoneCandidatesRegex) || [];
      
      let rawPhoneMatch = '';
      if (candidates.length > 0) {
        for (const cand of candidates) {
          const stripped = cand.replace(/[^0-9]/g, '');
          let cleanStripped = stripped;
          // Strip leading zero if present
          while (cleanStripped.startsWith('0')) {
            cleanStripped = cleanStripped.slice(1);
          }
          if (cleanStripped.length >= 10 && cleanStripped.length <= 15) {
            rawPhoneMatch = cand;
            phone = cleanStripped;
            break;
          }
        }
      }

      // Fallback: match any word or block containing at least 10 digits
      if (!phone && !rawPhoneMatch) {
        const words = workingLine.split(/[\s,;\t|]+/);
        for (const word of words) {
          const stripped = word.replace(/[^0-9]/g, '');
          let cleanStripped = stripped;
          while (cleanStripped.startsWith('0')) {
            cleanStripped = cleanStripped.slice(1);
          }
          if (cleanStripped.length >= 10 && cleanStripped.length <= 15) {
            rawPhoneMatch = word;
            phone = cleanStripped;
            break;
          }
        }
      }

      // 3. Clean the name of trailing / leading delimiters and trailing characters
      let remainder = workingLine;
      if (rawPhoneMatch) {
        remainder = workingLine.replace(rawPhoneMatch, '').trim();
      }

      let cleanedName = remainder
        .replace(/^[:\-\s,|;\\/|_]+|[:\-\s,|;\\/|_]+$/g, '') // Strip leading/trailing delimiters including pipe, underscores, colons
        .replace(/^(Name|Client|Patient|Contact)\s*:\s*/i, '') // Strip common labels from the start of the name
        .replace(/^[:\-\s,|;\\/|_]+|[:\-\s,|;\\/|_]+$/g, '') // Strip again after labels are removed
        .trim();

      // Standardize the phone format to E.164, default "+91" when country code is missing
      let standardizedPhone = '';
      if (phone) {
        if (phone.length === 10) {
          standardizedPhone = '+91' + phone;
        } else if (phone.length === 12 && phone.startsWith('91')) {
          standardizedPhone = '+' + phone;
        } else {
          standardizedPhone = '+' + phone;
        }
      }

      const cleanedPhone = formatWhatsAppPhone(phone);

      if (!cleanedName) {
        cleanedName = standardizedPhone 
          ? `Client ${standardizedPhone.slice(-4)}`
          : `Contact ${idx + 1}`;
      }

      const isDuplicate = existingContacts.some(c => formatWhatsAppPhone(c.phone) === cleanedPhone);
      const isValid = cleanedPhone.length === 12 && cleanedPhone.startsWith('91');

      if (cleanedPhone) {
        results.push({
          id: cleanedPhone || `parsed-${idx}-${Date.now()}`,
          name: cleanedName,
          phone: standardizedPhone || 'Missing Phone',
          email: '',
          notes: notes || 'Imported via bulk migration tool',
          pipelineStage: defaultStage,
          category: defaultCategory,
          isDuplicate,
          selected: isValid,
          isValid
        });
      }
    });

    if (results.length > 0) {
      setParsedList(prev => [...prev, ...results]);
      setInputText('');
    } else {
      alert("We couldn't detect any valid phone numbers in your pasted text. Make sure numbers contain at least 10 digits (e.g. VVL Srinivas +91 98480 12345 or +919876543210).");
    }
  };

  // Simple CSV file reader
  const handleCSVUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (rawLines.length === 0) return;

      const results: ParsedContact[] = [];
      const firstLine = rawLines[0];
      const isHeader = isHeaderRow(firstLine);
      
      let startIdx = 1;
      let nameIdx = -1;
      let phoneIdx = -1;
      let notesIdx = -1;
      let emailIdx = -1;

      if (isHeader) {
        const headers = firstLine.toLowerCase().split(/[,;\t]/).map(h => h.trim().replace(/^["']|["']$/g, ''));
        nameIdx = headers.findIndex(h => h.includes('name') || h.includes('client') || h.includes('patient') || h.includes('first'));
        phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('whatsapp') || h.includes('number') || h.includes('contact'));
        notesIdx = headers.findIndex(h => h.includes('note') || h.includes('remark') || h.includes('comment') || h.includes('desc'));
        emailIdx = headers.findIndex(h => h.includes('mail'));
        startIdx = 1;
      } else {
        startIdx = 0;
      }

      const activeNameIdx = nameIdx !== -1 ? nameIdx : 0;
      const activePhoneIdx = phoneIdx !== -1 ? phoneIdx : 1;
      const activeNotesIdx = notesIdx !== -1 ? notesIdx : 2;
      const activeEmailIdx = emailIdx !== -1 ? emailIdx : -1;

      for (let i = startIdx; i < rawLines.length; i++) {
        const line = rawLines[i].trim();
        if (!line) continue;

        let parts: string[] = [];
        let insideQuote = false;
        let currentPart = '';

        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"' || char === "'") {
            insideQuote = !insideQuote;
          } else if (char === ',' && !insideQuote) {
            parts.push(currentPart.trim().replace(/^["']|["']$/g, ''));
            currentPart = '';
          } else {
            currentPart += char;
          }
        }
        parts.push(currentPart.trim().replace(/^["']|["']$/g, ''));

        if (parts.length > 0) {
          const rawName = parts[activeNameIdx] || `Client ${i + 1}`;
          const rawPhone = parts[activePhoneIdx] || '';
          const rawNotes = activeNotesIdx < parts.length ? parts[activeNotesIdx] : '';
          const rawEmail = activeEmailIdx !== -1 && activeEmailIdx < parts.length ? parts[activeEmailIdx] : '';

          const cleanedPhone = formatWhatsAppPhone(rawPhone);
          if (!cleanedPhone) continue;

          const isDuplicate = existingContacts.some(c => formatWhatsAppPhone(c.phone) === cleanedPhone);
          const isValid = cleanedPhone.length === 12 && cleanedPhone.startsWith('91');

          results.push({
            id: cleanedPhone || `csv-${i}-${Date.now()}`,
            name: rawName,
            phone: rawPhone,
            email: rawEmail,
            notes: rawNotes || 'Imported from CSV File',
            pipelineStage: defaultStage,
            category: defaultCategory,
            isDuplicate,
            selected: isValid,
            isValid
          });
        }
      }

      if (results.length > 0) {
        setParsedList(prev => [...prev, ...results]);
      } else {
        alert("Could not extract any valid contact records from this CSV file. Please check that it has columns for 'Name' and 'Phone'.");
      }
    };

    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        handleCSVUpload(file);
      } else {
        alert('Please upload a CSV or TXT file.');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleCSVUpload(e.target.files[0]);
    }
  };

  // Row inline modification handlers
  const handleUpdateRow = (idx: number, field: keyof ParsedContact, value: any) => {
    setParsedList(prev => prev.map((row, i) => {
      if (i === idx) {
        const updated = { ...row, [field]: value };
        if (field === 'phone') {
          const cleaned = formatWhatsAppPhone(value);
          updated.id = cleaned;
          updated.isValid = cleaned.length >= 10;
          updated.isDuplicate = existingContacts.some(c => formatWhatsAppPhone(c.phone) === cleaned);
        }
        return updated;
      }
      return row;
    }));
  };

  const handleDeleteRow = (idx: number) => {
    setParsedList(prev => prev.filter((_, i) => i !== idx));
  };

  const handleToggleSelectAll = () => {
    const allSelected = parsedList.every(r => r.selected);
    setParsedList(prev => prev.map(r => ({ ...r, selected: !allSelected })));
  };

  const handleApplyBatchConfig = () => {
    setParsedList(prev => prev.map(r => ({
      ...r,
      pipelineStage: defaultStage,
      category: defaultCategory
    })));
  };

  // Complete Import Process
  const handleExecuteImport = () => {
    const selectedRows = parsedList.filter(r => r.selected && r.isValid);
    if (selectedRows.length === 0) {
      alert('Please select at least one valid contact record to import.');
      return;
    }

    const contactsToSave: Contact[] = [];
    const timestamp = new Date().toISOString();

    selectedRows.forEach(row => {
      const cleanedPhone = formatWhatsAppPhone(row.phone);
      
      const isDuplicate = existingContacts.some(c => formatWhatsAppPhone(c.phone) === cleanedPhone);
      
      if (isDuplicate && duplicateStrategy === 'skip') {
        // Skip
        return;
      }

      contactsToSave.push({
        id: cleanedPhone,
        name: row.name.trim() || `Client ${cleanedPhone.slice(-4)}`,
        phone: cleanedPhone,
        email: row.email.trim() || undefined,
        category: row.category,
        notes: row.notes.trim() || 'Imported via Migration Hub',
        lastContacted: 'Never',
        createdAt: timestamp,
        pipelineStage: row.pipelineStage,
        treatmentType: '',
        treatmentValue: 0
      });
    });

    onImportContacts(contactsToSave);
    setParsedList([]);
    onClose();
  };

  if (!isOpen) return null;

  const validCount = parsedList.filter(r => r.selected && r.isValid).length;
  const duplicateCount = parsedList.filter(r => r.selected && r.isValid && r.isDuplicate).length;

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-fade-in overflow-y-auto">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-5xl w-full h-[85vh] max-h-[780px] min-h-[580px] flex flex-col overflow-hidden border border-slate-100"
      >
        {/* Modal Header */}
        <div className="bg-slate-950 p-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-teal-500 rounded-lg text-white">
              <Upload className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold font-display text-xs">
                Migration & Bulk Import Center
              </h3>
              <p className="text-[10px] text-slate-400">
                Easily shift contacts from WhatsApp, spreadsheets, or export files to Vyapari Nestam CRM
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Modal Body Grid */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left panel: Inputs (35% width) */}
          <div className="w-full md:w-[35%] bg-slate-50 border-r border-slate-200 p-5 flex flex-col overflow-y-auto space-y-4">
            
            {/* Tab selector */}
            <div className="flex bg-slate-200/60 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('paste');
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'paste' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Clipboard className="h-3.5 w-3.5" />
                Copy-Paste List
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('file');
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'file' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                CSV/Excel File
              </button>
            </div>

            {/* TAB CONTENT: COPY PASTE */}
            {activeTab === 'paste' && (
              <div className="space-y-3 flex flex-col shrink-0">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Paste WhatsApp / Raw Text List
                    </label>
                    <button
                      type="button"
                      onClick={() => setInputText(`VVL Srinivas - +91 98480 12345 (Requires dental implants consult)\nHari Prasad: 919876543210 [Wants appointment on Friday afternoon]\n+91 99887 76655 | Ramesh Babu (VIP patient)\nSrinivas Murthy, 9876543211\n09876543212 - Anita Rao (Follow up on root canal)\n+919876543213 | Dr. Kiran Kumar\nJustANumber 919900112233\n91-98765-43214 - Lakshmi Narayana (Senior Citizen)\n9876543215 (Inquiry about laser cleaning no name)\nSwapna Priya | +91 98765 43216 | swapna@example.com (Interested in invisible braces)`)}
                      className="text-[9px] font-bold text-teal-600 hover:text-teal-700 underline cursor-pointer hover:no-underline transition-all"
                    >
                      Load Test Sample
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-400 mb-2 leading-relaxed">
                    Paste standard lines (e.g. <code>Name, 919848012345</code> or copied list with name and numbers). Our AI-friendly parser will auto-extract!
                  </p>
                  <textarea
                    rows={8}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`e.g.\nVVL Srinivas - +91 98480 12345\nHari Prasad: 919876543210 (Dental inquiry)\nSrinivas Murthy, 9876543211`}
                    className="w-full p-3 bg-white border border-slate-200 focus:border-teal-500 rounded-xl text-xs focus:outline-none font-mono text-slate-700 placeholder-slate-350 resize-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => parsePastedText(inputText)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5 text-teal-400" />
                  Parse Text List ({inputText.split('\n').filter(Boolean).length} lines)
                </button>
              </div>
            )}

            {/* TAB CONTENT: FILE UPLOAD */}
            {activeTab === 'file' && (
              <div className="space-y-3 flex flex-col shrink-0">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border border-dashed rounded-xl p-4 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-2 bg-white ${
                    isDragging ? 'border-teal-500 bg-teal-50/10 scale-[0.98]' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/30'
                  }`}
                >
                  <div className="w-8 h-8 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center shrink-0">
                    <Upload className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Drag & Drop Contact Export File</h4>
                    <p className="text-[9px] text-slate-400 mt-0.5">Supports standard <code>.csv</code> or <code>.txt</code> files</p>
                  </div>
                  <span className="px-2.5 py-0.5 text-[9px] font-bold text-slate-500 bg-slate-100 rounded-lg">
                    Browse Files
                  </span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".csv,.txt"
                    className="hidden"
                  />
                </div>
                <div className="bg-teal-50/40 p-3.5 rounded-xl border border-teal-100/60 text-[10px] text-slate-600 space-y-1.5">
                  <div className="font-bold text-teal-800 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-teal-600 animate-pulse" />
                    Recommended CSV Columns:
                  </div>
                  <div className="font-mono text-[9px] bg-white px-2 py-1 rounded border border-slate-100 font-bold text-slate-700">
                    Name, Phone, Email, Notes
                  </div>
                  <div className="text-[9px] leading-relaxed text-slate-500">
                    If columns are unlabelled, the first column is parsed as Name and the second as WhatsApp Phone.
                  </div>
                </div>
              </div>
            )}

            <div className="h-px bg-slate-200 my-2" />

            {/* BATCH ASSIGN CONFIGURATION */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
              <h4 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                <Settings className="h-3.5 w-3.5 text-slate-500" />
                Batch Config
              </h4>
              
              <div>
                <label className="block text-[9px] font-bold text-slate-400 mb-1">
                  Default Stage
                </label>
                <select
                  value={defaultStage}
                  onChange={(e: any) => setDefaultStage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs px-2.5 py-1.5 focus:outline-none focus:border-slate-400 rounded-lg font-bold text-slate-600 cursor-pointer"
                >
                  {currentIndustryConfig.stages.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 mb-1">
                  Default CRM Category
                </label>
                <select
                  value={defaultCategory}
                  onChange={(e: any) => setDefaultCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs px-2.5 py-1.5 focus:outline-none focus:border-slate-400 rounded-lg font-bold text-slate-600 cursor-pointer"
                >
                  <option value="Lead">Lead</option>
                  <option value="Active">Active Patient</option>
                  <option value="Follow-up">Follow-up Needed</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <button
                type="button"
                disabled={parsedList.length === 0}
                onClick={handleApplyBatchConfig}
                className="w-full py-1.5 border border-slate-250 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
              >
                Apply Batch Config to Grid
              </button>
            </div>

          </div>

          {/* Right Panel: Interactive Grid Preview (65% width) */}
          <div className="w-full md:w-[65%] flex flex-col overflow-hidden bg-white">
            
            {/* Grid Header Actions */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleToggleSelectAll}
                  disabled={parsedList.length === 0}
                  className="p-1 text-slate-500 hover:bg-slate-100 rounded-lg disabled:opacity-40"
                  title="Toggle Select All"
                >
                  {parsedList.length > 0 && parsedList.every(r => r.selected) ? (
                    <CheckSquare className="h-4.5 w-4.5 text-teal-600" />
                  ) : (
                    <Square className="h-4.5 w-4.5 text-slate-400" />
                  )}
                </button>
                <span className="text-[11px] font-bold text-slate-700">
                  Import Preview ({parsedList.length} parsed records)
                </span>
              </div>

              {parsedList.length > 0 && (
                <button
                  onClick={() => setParsedList([])}
                  className="text-[10px] text-red-600 hover:text-red-700 font-bold flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear Grid
                </button>
              )}
            </div>

            {/* Safe Grid Table wrapper */}
            <div className="flex-1 overflow-auto p-4">
              {parsedList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-350">
                    <Clipboard className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700">No imported records yet</h4>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                      Paste a copied contact list on the left, or upload a CSV file to load a preview grid. You can edit names and numbers here before synchronizing.
                    </p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[550px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2 w-[40px]">Import</th>
                      <th className="py-2 px-2 w-[160px]">Client Name</th>
                      <th className="py-2 px-2 w-[140px]">WhatsApp Phone</th>
                      <th className="py-2 px-2 w-[110px]">Pipeline Stage</th>
                      <th className="py-2 px-2">Migration Notes</th>
                      <th className="py-2 w-[40px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedList.map((row, idx) => {
                      const displayPhone = row.phone;
                      const isRowDuplicate = row.isDuplicate;

                      return (
                        <tr 
                          key={idx} 
                          className={`text-xs ${!row.selected ? 'opacity-50' : ''} ${!row.isValid ? 'bg-red-50/40' : ''} hover:bg-slate-50/50 transition-colors`}
                        >
                          <td className="py-2.5">
                            <button
                              onClick={() => handleUpdateRow(idx, 'selected', !row.selected)}
                              className="text-slate-500"
                            >
                              {row.selected ? (
                                <CheckSquare className="h-4 w-4 text-teal-600" />
                              ) : (
                                <Square className="h-4 w-4 text-slate-400" />
                              )}
                            </button>
                          </td>
                          <td className="py-2.5 px-2">
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) => handleUpdateRow(idx, 'name', e.target.value)}
                              className="w-full bg-slate-50 border border-transparent hover:border-slate-200 focus:border-teal-500 focus:bg-white rounded px-2 py-1 text-xs text-slate-700 font-bold"
                            />
                          </td>
                          <td className="py-2.5 px-2">
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={row.phone}
                                onChange={(e) => handleUpdateRow(idx, 'phone', e.target.value)}
                                className={`w-full bg-slate-50 border ${!row.isValid ? 'border-red-300' : 'border-transparent'} hover:border-slate-200 focus:border-teal-500 focus:bg-white rounded px-2 py-1 text-xs font-mono text-slate-600`}
                              />
                              <div className="flex items-center gap-1 pl-1 flex-wrap">
                                {!row.isValid && (
                                  <span className="text-[8px] font-bold text-red-600 bg-red-50 border border-red-100 px-1 rounded">
                                    Invalid phone
                                  </span>
                                )}
                                {isRowDuplicate && (
                                  <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1 rounded flex items-center gap-0.5" title="Matches an existing phone in database">
                                    <AlertTriangle className="h-2 w-2" />
                                    Existing Client
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-2">
                            <select
                              value={row.pipelineStage}
                              onChange={(e: any) => handleUpdateRow(idx, 'pipelineStage', e.target.value)}
                              className="w-full bg-slate-50 border border-transparent hover:border-slate-200 focus:border-slate-400 rounded px-1.5 py-1 text-[11px] font-bold text-slate-600 cursor-pointer"
                            >
                              {currentIndustryConfig.stages.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5 px-2">
                            <input
                              type="text"
                              value={row.notes}
                              onChange={(e) => handleUpdateRow(idx, 'notes', e.target.value)}
                              className="w-full bg-slate-50 border border-transparent hover:border-slate-200 focus:border-teal-500 focus:bg-white rounded px-2 py-1 text-[11px] text-slate-500"
                            />
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => handleDeleteRow(idx)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-100 transition-colors"
                              title="Delete row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* DUPLICATE DETECT / ACTION BAR */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
              
              {/* Duplicate Handling Strategies */}
              <div className="flex items-center gap-3">
                {duplicateCount > 0 && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 p-2 rounded-xl text-[10px] text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <div>
                      <span className="font-bold">{duplicateCount} existing phone number matches detected.</span>
                      <div className="mt-1 flex items-center gap-3">
                        <label className="flex items-center gap-1 font-semibold cursor-pointer">
                          <input
                            type="radio"
                            name="strategy"
                            checked={duplicateStrategy === 'skip'}
                            onChange={() => setDuplicateStrategy('skip')}
                            className="text-teal-600 focus:ring-teal-500 h-3 w-3"
                          />
                          Skip Import
                        </label>
                        <label className="flex items-center gap-1 font-semibold cursor-pointer">
                          <input
                            type="radio"
                            name="strategy"
                            checked={duplicateStrategy === 'overwrite'}
                            onChange={() => setDuplicateStrategy('overwrite')}
                            className="text-teal-600 focus:ring-teal-500 h-3 w-3"
                          />
                          Overwrite Records
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 ml-auto self-end sm:self-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-250 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={validCount === 0}
                  onClick={handleExecuteImport}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Import {validCount} Selected {validCount === 1 ? currentIndustryConfig.terminology.patientLabel : currentIndustryConfig.terminology.patientsLabel}
                </button>
              </div>

            </div>

          </div>

        </div>

      </motion.div>
    </div>
  );
}
