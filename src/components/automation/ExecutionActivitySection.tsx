import React, { useState } from 'react';
import { 
  Activity, Search, Filter, CheckCircle2, AlertTriangle, Clock, 
  X, RefreshCw, ChevronRight, Zap, MessageSquare, Calendar, ShieldCheck, User
} from 'lucide-react';
import { AutomationExecution } from '../../types';

interface ExecutionActivitySectionProps {
  executions: AutomationExecution[];
  selectedExecution: AutomationExecution | null;
  onSelectExecution: (exec: AutomationExecution | null) => void;
  onRetryExecution: (exec: AutomationExecution) => void;
}

export const ExecutionActivitySection: React.FC<ExecutionActivitySectionProps> = ({
  executions,
  selectedExecution,
  onSelectExecution,
  onRetryExecution
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = executions.filter(exec => {
    const matchesSearch = 
      (exec.contactName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exec.contactPhone || '').includes(searchQuery) ||
      (exec.workflowName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exec.whatsappMessageId || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || exec.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Search & Filter Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search logs by patient name, phone, message ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#176B72]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['All', 'completed', 'running', 'waiting', 'failed'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer capitalize whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-[#176B72] text-white border-[#176B72] shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Execution Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Patient / Recipient</th>
                <th className="p-4">Workflow & Trigger</th>
                <th className="p-4">Status</th>
                <th className="p-4">WhatsApp Delivery</th>
                <th className="p-4">Calendar Sync</th>
                <th className="p-4">Timestamp</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
              {filtered.map(exec => (
                <tr 
                  key={exec.id} 
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  onClick={() => onSelectExecution(exec)}
                >
                  <td className="p-4 font-semibold">
                    <div className="text-slate-900 font-bold">{exec.contactName || 'Valued Client'}</div>
                    <div className="text-[11px] text-slate-500">{exec.contactPhone}</div>
                  </td>

                  <td className="p-4">
                    <div className="font-bold text-slate-900">{exec.workflowName}</div>
                    <div className="text-[10px] text-[#176B72] font-semibold mt-0.5">{exec.triggerType}</div>
                  </td>

                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 ${
                      exec.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : exec.status === 'failed'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      <CheckCircle2 className="h-3 w-3" />
                      {exec.status.toUpperCase()}
                    </span>
                  </td>

                  <td className="p-4">
                    <span className="px-2 py-0.5 bg-sky-50 text-sky-800 font-bold text-[10px] rounded-md border border-sky-100">
                      {exec.whatsappDeliveryStatus || 'sent'}
                    </span>
                    {exec.whatsappMessageId && (
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate max-w-[120px]">
                        {exec.whatsappMessageId}
                      </div>
                    )}
                  </td>

                  <td className="p-4">
                    <span className={`px-2 py-0.5 font-bold text-[10px] rounded-md border ${
                      exec.calendarSyncStatus === 'synced'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {exec.calendarSyncStatus || 'not_applicable'}
                    </span>
                  </td>

                  <td className="p-4 text-slate-500 font-medium">
                    {new Date(exec.startedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>

                  <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onSelectExecution(exec)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Execution Detail Slide-Out Drawer */}
      {selectedExecution && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end animate-fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6 flex flex-col justify-between border-l border-slate-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="text-xs font-bold text-[#176B72] uppercase tracking-wider">Execution Log Details</div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">{selectedExecution.workflowName}</h3>
                </div>
                <button 
                  onClick={() => onSelectExecution(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Recipient Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recipient Contact</div>
                <div className="text-sm font-bold text-slate-900">{selectedExecution.contactName || 'Valued Client'}</div>
                <div className="text-xs text-slate-600 font-mono">{selectedExecution.contactPhone}</div>
              </div>

              {/* Step-by-Step Timeline Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Execution Timeline Steps</h4>
                <div className="space-y-3 pl-2 border-l-2 border-teal-500/40">
                  {selectedExecution.stepsLog.map((step, idx) => (
                    <div key={idx} className="relative pl-4 space-y-0.5">
                      <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-teal-600 border-2 border-white"></div>
                      <div className="text-xs font-bold text-slate-900">{step.stepName}</div>
                      <div className="text-[11px] text-slate-600">{step.output}</div>
                      <div className="text-[10px] text-slate-400">{new Date(step.timestamp).toLocaleTimeString()}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Meta Message & Calendar Metadata */}
              <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-100 space-y-2 text-xs text-teal-900">
                <div><strong>Meta Message ID:</strong> <code className="font-mono">{selectedExecution.whatsappMessageId || 'N/A'}</code></div>
                <div><strong>Google Calendar Event:</strong> <code className="font-mono">{selectedExecution.calendarEventId || 'G-CAL-SYNCED'}</code></div>
                <div><strong>Delivery Status:</strong> {selectedExecution.whatsappDeliveryStatus || 'delivered'}</div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                onClick={() => onRetryExecution(selectedExecution)}
                className="w-full px-4 py-2.5 bg-[#176B72] hover:bg-[#13585e] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Retry Failed / Re-trigger Step</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
