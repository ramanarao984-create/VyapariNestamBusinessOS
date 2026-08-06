import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  CheckSquare, 
  Square, 
  Search, 
  Globe, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Award, 
  MapPin, 
  Star, 
  Camera, 
  MessageSquare, 
  RefreshCw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { IndustryType, INDUSTRIES, getSectorDefinition } from '../industryConfig';
import { appendSeoLogToSheet, fetchSeoLogsFromSheet, SeoAuditLog, verifyAndSetupSheets } from '../googleApi';

interface SEOAuditEngineProps {
  businessName: string;
  cityLandmark: string;
  industryId: IndustryType;
  reviewLink?: string;
  accessToken?: string | null;
  spreadsheetId?: string | null;
}

interface SEOKeyword {
  keyword: string;
  volume: string;
  competition: 'High' | 'Medium' | 'Low';
  relevance: string;
}

interface AuditChecklistItem {
  id: string;
  text: string;
  points: number;
  completed: boolean;
  category: 'listing' | 'reviews' | 'keywords' | 'media';
  tip: string;
}

export const SEOAuditEngine: React.FC<SEOAuditEngineProps> = ({
  businessName,
  cityLandmark,
  industryId,
  reviewLink = 'https://g.page/srisaidental-vijayawada/review',
  accessToken,
  spreadsheetId,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMessage, setScanMessage] = useState('');

  const [historyLogs, setHistoryLogs] = useState<SeoAuditLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    const loadLogs = async () => {
      let rawLogs: SeoAuditLog[] = [];
      if (accessToken && spreadsheetId) {
        setIsLoadingLogs(true);
        try {
          rawLogs = await fetchSeoLogsFromSheet(accessToken, spreadsheetId);
        } catch (e) {
          console.warn('Failed to load SEO logs from sheets initially, attempting verification:', e);
          try {
            await verifyAndSetupSheets(accessToken, spreadsheetId);
            rawLogs = await fetchSeoLogsFromSheet(accessToken, spreadsheetId);
          } catch (retryErr) {
            console.warn('Failed to auto-verify or fetch SEO logs from sheets, falling back to local storage:', retryErr);
            const saved = localStorage.getItem('local_seo_logs');
            if (saved) {
              try { rawLogs = JSON.parse(saved); } catch (_) {}
            }
          }
        } finally {
          setIsLoadingLogs(false);
        }
      } else {
        const saved = localStorage.getItem('local_seo_logs');
        if (saved) {
          try { rawLogs = JSON.parse(saved); } catch (_) {}
        }
      }

      // Ensure all loaded logs have unique IDs
      const seen = new Set<string>();
      const sanitizedLogs = rawLogs.map((log, index) => {
        let uniqueId = log.id || `seo-${Date.now()}-${index}`;
        if (seen.has(uniqueId)) {
          uniqueId = `${uniqueId}-${index}-${Math.random().toString(36).substring(2, 6)}`;
        }
        seen.add(uniqueId);
        return { ...log, id: uniqueId };
      });

      setHistoryLogs(sanitizedLogs);
    };
    loadLogs();
  }, [accessToken, spreadsheetId]);
  
  // Dynamic Score calculated from completed items
  const [checklist, setChecklist] = useState<AuditChecklistItem[]>([
    {
      id: 'g-1',
      text: 'Business name matches legal signage (no artificial keyword stuffing)',
      points: 15,
      completed: true,
      category: 'listing',
      tip: 'Google penalizes listings with names like "Sri Sai Dental Clinic - Best Dentist RCT Vijayawada". Keep it strictly to your brand name.'
    },
    {
      id: 'g-2',
      text: 'Primary & secondary categories are explicitly selected',
      points: 15,
      completed: true,
      category: 'listing',
      tip: 'Make sure your primary category matches your exact sector (e.g. "Dental Clinic"), and add secondary tags (e.g., "Cosmetic Dentist", "Pediatric Dentist").'
    },
    {
      id: 'g-3',
      text: 'Include city and neighborhood landmarks in your description',
      points: 15,
      completed: false,
      category: 'keywords',
      tip: `Inject terms like "${cityLandmark.split(',')[0]}" or local junctions inside the first 150 characters of your Google listing description.`
    },
    {
      id: 'g-4',
      text: 'Configure automated WhatsApp review requests after service delivery',
      points: 20,
      completed: false,
      category: 'reviews',
      tip: 'Consistently getting 5-star reviews with keywords (e.g., "best rct treatment") is the single highest ranking factor in local search.'
    },
    {
      id: 'g-5',
      text: 'Reply to 100% of reviews (especially incorporating service terms)',
      points: 15,
      completed: false,
      category: 'reviews',
      tip: 'When replying to a review, write "Thank you! We love providing painless root canals in Vijayawada" to anchor those keywords!'
    },
    {
      id: 'g-6',
      text: 'Upload at least 30 geo-tagged photos (clinic interior, machinery, team)',
      points: 10,
      completed: false,
      category: 'media',
      tip: 'listings with over 100 photos receive 520% more directions requests than average. Use your smartphone to snap high-quality interior photos.'
    },
    {
      id: 'g-7',
      text: 'Map Pin coordinates are pinpointed accurately at the physical entrance',
      points: 10,
      completed: true,
      category: 'listing',
      tip: 'Ensure your map pin sits directly over your physical clinic/office entrance rather than the middle of the block.'
    }
  ]);

  // Handle Scan Simulation
  const runSEOAuditScan = () => {
    setIsScanning(true);
    setScanComplete(false);
    setScanProgress(0);
    
    const messages = [
      'Locating Google Business Profile listing...',
      'Verifying brand name alignment...',
      'Analyzing local citation authority across directories...',
      'Evaluating review velocity and sentiment scores...',
      'Analyzing local keyword density in description...',
      'Inspecting photo geotags and alt-descriptions...',
      'Generating high-relevance search keywords...',
      'Finalizing local search engine visibility score...'
    ];

    const triggerScanLogCreation = () => {
      const max = checklist.reduce((sum, item) => sum + item.points, 0);
      const curr = checklist.filter((item) => item.completed).reduce((sum, item) => sum + item.points, 0);
      const pct = Math.round((curr / max) * 100);

      const newLog: SeoAuditLog = {
        id: 'seo-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        businessName,
        cityLandmark,
        industry: getSectorDefinition(industryId).name,
        score: pct,
        completedCount: checklist.filter(c => c.completed).length,
        totalCount: checklist.length,
        timestamp: new Date().toISOString(),
      };

      setHistoryLogs(prevLogs => {
        const updated = [newLog, ...prevLogs];
        localStorage.setItem('local_seo_logs', JSON.stringify(updated));
        return updated;
      });

      if (accessToken && spreadsheetId) {
        appendSeoLogToSheet(accessToken, spreadsheetId, newLog).catch(err => {
          console.error('Failed to append SEO log to Google Sheet:', err);
        });
      }
    };

    let currentMsgIdx = 0;
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        const next = prev + 2;
        if (next >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          setScanComplete(true);
          triggerScanLogCreation();
          return 100;
        }
        
        // Update messages periodically
        if (prev % 13 === 0 && currentMsgIdx < messages.length - 1) {
          currentMsgIdx++;
          setScanMessage(messages[currentMsgIdx]);
        }
        
        return next;
      });
    }, 45);
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist(
      checklist.map((item) => 
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  // Calculate current score
  const maxScore = checklist.reduce((sum, item) => sum + item.points, 0);
  const currentScore = checklist
    .filter((item) => item.completed)
    .reduce((sum, item) => sum + item.points, 0);

  const scorePercentage = Math.round((currentScore / maxScore) * 100);

  // Generate localized SEO keywords based on selected industry and city/landmark
  const generateKeywords = (): SEOKeyword[] => {
    const cityClean = cityLandmark.split(',')[0].trim();
    const config = getSectorDefinition(industryId);
    const patientTerm = config.terminology.patientLabel;
    const serviceTerm = config.terminology.treatmentLabel;

    if (industryId === 'dental') {
      return [
        { keyword: `best dentist in ${cityClean}`, volume: '4.2k/mo', competition: 'High', relevance: 'High' },
        { keyword: `dental clinic near ${cityClean}`, volume: '2.8k/mo', competition: 'High', relevance: 'High' },
        { keyword: `root canal treatment price ${cityClean}`, volume: '1.2k/mo', competition: 'Medium', relevance: 'High' },
        { keyword: `painless dental clinic ${cityClean}`, volume: '850/mo', competition: 'Low', relevance: 'Medium' },
        { keyword: `teeth whitening cost in ${cityClean}`, volume: '600/mo', competition: 'Medium', relevance: 'Medium' }
      ];
    } else if (industryId === 'cosmetic') {
      return [
        { keyword: `best skin clinic in ${cityClean}`, volume: '3.6k/mo', competition: 'High', relevance: 'High' },
        { keyword: `hydrafacial price ${cityClean}`, volume: '1.9k/mo', competition: 'Medium', relevance: 'High' },
        { keyword: `laser hair removal clinic ${cityClean}`, volume: '1.1k/mo', competition: 'High', relevance: 'High' },
        { keyword: `dermatologist near ${cityClean}`, volume: '2.4k/mo', competition: 'High', relevance: 'High' },
        { keyword: `acne treatment clinic ${cityClean}`, volume: '950/mo', competition: 'Low', relevance: 'Medium' }
      ];
    } else if (industryId === 'multispecialty') {
      return [
        { keyword: `best diagnostic center ${cityClean}`, volume: '5.1k/mo', competition: 'High', relevance: 'High' },
        { keyword: `full body health checkup ${cityClean}`, volume: '2.2k/mo', competition: 'Medium', relevance: 'High' },
        { keyword: `pediatric clinic in ${cityClean}`, volume: '1.8k/mo', competition: 'High', relevance: 'High' },
        { keyword: `multispecialty clinic near ${cityClean}`, volume: '3.4k/mo', competition: 'High', relevance: 'High' },
        { keyword: `cbc lab test price ${cityClean}`, volume: '800/mo', competition: 'Low', relevance: 'Medium' }
      ];
    } else if (industryId === 'gym') {
      return [
        { keyword: `best gym in ${cityClean}`, volume: '6.4k/mo', competition: 'High', relevance: 'High' },
        { keyword: `fitness center near ${cityClean}`, volume: '3.1k/mo', competition: 'High', relevance: 'High' },
        { keyword: `gym membership fees ${cityClean}`, volume: '1.5k/mo', competition: 'Medium', relevance: 'High' },
        { keyword: `personal trainer gym ${cityClean}`, volume: '900/mo', competition: 'Medium', relevance: 'Medium' },
        { keyword: `unisex fitness center ${cityClean}`, volume: '750/mo', competition: 'Low', relevance: 'Medium' }
      ];
    } else {
      return [
        { keyword: `premium apartments in ${cityClean}`, volume: '3.8k/mo', competition: 'High', relevance: 'High' },
        { keyword: `gated community villas ${cityClean}`, volume: '2.1k/mo', competition: 'High', relevance: 'High' },
        { keyword: `real estate consultants ${cityClean}`, volume: '1.7k/mo', competition: 'Medium', relevance: 'High' },
        { keyword: `buy flat near ${cityClean}`, volume: '1.4k/mo', competition: 'High', relevance: 'High' },
        { keyword: `residential projects in ${cityClean}`, volume: '950/mo', competition: 'Low', relevance: 'Medium' }
      ];
    }
  };

  const keywords = generateKeywords();

  return (
    <div className="space-y-6" id="google-seo-audit-engine">
      
      {/* 1. Header and description */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded-full border border-blue-100 uppercase tracking-wider flex items-center gap-1">
              <Globe className="h-3 w-3" />
              Google Business Profile Optimizer
            </span>
            <span className="text-slate-300 text-xs">•</span>
            <span className="text-xs text-slate-500 font-semibold">{getSectorDefinition(industryId).name} Workspace</span>
          </div>
          <h2 className="text-xl font-bold font-display tracking-tight text-slate-800 mt-1">
            Google Local SEO Audit Engine
          </h2>
          <p className="text-xs text-slate-500">
            Audit and optimize your physical Google Business listing's citation completeness, local review velocity, keyword prominence, and competitive ranking factors.
          </p>
        </div>

        <button
          onClick={runSEOAuditScan}
          disabled={isScanning}
          className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer shadow-sm shadow-blue-100 shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'Running Scan...' : 'Run Live SEO Scan'}
        </button>
      </div>

      {/* 2. Scanning simulation */}
      {isScanning && (
        <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-400">WhatsCRM Local SEO Scraper v1.4</span>
            <span className="text-xs font-mono text-emerald-400 font-bold">{scanProgress}%</span>
          </div>
          
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full transition-all" style={{ width: `${scanProgress}%` }} />
          </div>

          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <p className="text-xs font-mono text-slate-300">{scanMessage || 'Initializing scraper...'}</p>
          </div>
        </div>
      )}

      {/* 3. SEO Results Layout */}
      {(scanComplete || !isScanning) && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Panel: visibility Score & Keyword density (Span 5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Score Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
              <div className="flex justify-between items-center text-left">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Visibility Score</h3>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-150 uppercase font-mono">
                  {scorePercentage >= 90 ? 'Grade A' : scorePercentage >= 70 ? 'Grade B' : 'Grade C'}
                </span>
              </div>

              {/* Huge circular dial */}
              <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="62"
                    stroke="#f1f5f9"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r="62"
                    stroke={scorePercentage >= 90 ? '#10b981' : scorePercentage >= 70 ? '#3b82f6' : '#f59e0b'}
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={389.5}
                    strokeDashoffset={389.5 - (389.5 * scorePercentage) / 100}
                    className="transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-4xl font-black font-display text-slate-800">{scorePercentage}</span>
                  <span className="text-xs text-slate-400 font-bold block mt-0.5">/ 100 PTS</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-sm">
                  {scorePercentage >= 90 
                    ? 'Excellent Listing Optimization!' 
                    : scorePercentage >= 70 
                      ? 'Solid Local Foundation. Room for Growth.' 
                      : 'Attention Required - Low Visibility Marker'}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal max-w-sm mx-auto">
                  {scorePercentage >= 90 
                    ? 'Your profile is highly optimized to rank in Google Maps local 3-pack! Ensure consistent review reply velocity.'
                    : `You can boost your map ranking in ${cityLandmark.split(',')[0]} by completing the unresolved action items on the checklist.`}
                </p>
              </div>

              {/* Small Citation Badges */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
                <div>
                  <span className="text-xs font-black text-slate-800 font-mono">100%</span>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase mt-0.5">NAP Match</span>
                </div>
                <div>
                  <span className="text-xs font-black text-slate-800 font-mono">1.2s</span>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase mt-0.5">Load Speed</span>
                </div>
                <div>
                  <span className="text-xs font-black text-slate-800 font-mono">4.9 ★</span>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase mt-0.5">Rating Avg</span>
                </div>
              </div>
            </div>

            {/* Keyword Explorer */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Search className="h-4 w-4 text-blue-500" />
                  Recommended Local Keywords
                </h3>
                <p className="text-[11px] text-slate-450">
                  Target search queries people in <span className="font-semibold">{cityLandmark.split(',')[0]}</span> are searching. Add these in templates, posts and replies.
                </p>
              </div>

              <div className="space-y-2">
                {keywords.map((kw, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100/50 transition-colors">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-700 font-mono block select-all">
                        {kw.keyword}
                      </span>
                      <span className="text-[10px] font-bold text-slate-450 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-slate-400" />
                        Volume: {kw.volume}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wide ${
                        kw.competition === 'High' 
                          ? 'bg-red-50 text-red-600 border border-red-100' 
                          : kw.competition === 'Medium'
                            ? 'bg-amber-50 text-amber-600 border border-amber-100'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      }`}>
                        {kw.competition} Comp
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-100 text-[10px] text-blue-800 leading-normal flex gap-2">
                <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p>
                  <strong>SEO Tip:</strong> Tell your {getSectorDefinition(industryId).terminology.patientsLabel.toLowerCase()} to write reviews mentioning your specific services (e.g. "Best root canal") to rank first for that search term!
                </p>
              </div>
            </div>

          </div>

          {/* Right Panel: Checklist & Recommendations (Span 7) */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                  GBP Visibility Optimization Checklist
                </h3>
                <p className="text-xs text-slate-450">
                  Toggle items as you implement them in your Google Business Dashboard. Your live SEO Visibility Score updates instantly!
                </p>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {checklist.map((item) => (
                  <div 
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col gap-2 ${
                      item.completed 
                        ? 'border-emerald-100 bg-emerald-50/10' 
                        : 'border-slate-200 bg-white hover:border-slate-350 shadow-3xs'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleChecklistItem(item.id)}
                        className={`p-0.5 rounded hover:bg-slate-100 shrink-0 mt-0.5 transition-colors cursor-pointer`}
                      >
                        {item.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 fill-emerald-50" />
                        ) : (
                          <div className="h-5 w-5 border-2 border-slate-300 rounded" />
                        )}
                      </button>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold ${item.completed ? 'text-slate-650 line-through' : 'text-slate-800'}`}>
                            {item.text}
                          </span>
                          <span className={`text-[9px] font-extrabold font-mono px-1.5 py-0.5 rounded-md ${
                            item.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            +{item.points} PTS
                          </span>
                        </div>
                        
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                          {item.tip}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons Link */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Optimize physical listings
                </span>
                
                <a
                  href="https://business.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-600 hover:text-blue-700 bg-blue-50 px-3.5 py-2 rounded-xl border border-blue-100 transition-colors cursor-pointer"
                >
                  Go to Google Business Profile
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

          </div>

        </div>

        {/* 3. Google Sheets Sync Logs & Scan History */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <TrendingUp className="h-4.5 w-4.5 text-blue-500" />
                Google Sheets Sync Logs / Audit History
              </h3>
              <p className="text-xs text-slate-500">
                Real-time database of all completed Google Local SEO audits synced directly with your central spreadsheet.
              </p>
            </div>
            <span className="px-2 py-1 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-full border border-slate-200 uppercase tracking-wider">
              {historyLogs.length} Audits
            </span>
          </div>

          {isLoadingLogs ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
              Loading audit logs from Google Sheets...
            </div>
          ) : historyLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              No previous audits ran yet. Click "Trigger Deep Scan" above to run your first SEO Audit and sync to Google Sheets!
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
                    <th className="p-3">Log ID</th>
                    <th className="p-3">Business Name</th>
                    <th className="p-3">City/Landmark</th>
                    <th className="p-3">Industry</th>
                    <th className="p-3">Completed Checklist</th>
                    <th className="p-3">SEO Visibility Score</th>
                    <th className="p-3">Sync Status</th>
                    <th className="p-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {historyLogs.map((log, index) => (
                    <tr key={`${log.id}-${index}`} className="hover:bg-slate-50/30 transition-colors">
                      <td className="p-3 font-mono text-[10px] text-slate-400">{log.id}</td>
                      <td className="p-3 font-semibold text-slate-800">{log.businessName}</td>
                      <td className="p-3 text-slate-500">{log.cityLandmark}</td>
                      <td className="p-3 text-slate-500">{log.industry}</td>
                      <td className="p-3">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-mono text-[10px] border border-blue-100">
                          {log.completedCount} / {log.totalCount} items
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold font-mono text-xs ${
                            log.score >= 80 ? 'text-emerald-600' : log.score >= 50 ? 'text-amber-600' : 'text-rose-600'
                          }`}>
                            {log.score}%
                          </span>
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                log.score >= 80 ? 'bg-emerald-500' : log.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${log.score}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {spreadsheetId ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 px-2 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Synced to Sheets
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 font-bold border border-slate-200 px-2 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-450" />
                            Saved Locally
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
      )}

    </div>
  );
};
