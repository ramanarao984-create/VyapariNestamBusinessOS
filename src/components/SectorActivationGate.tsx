import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Layers, 
  History, 
  ArrowRight, 
  RotateCcw, 
  Sparkles, 
  Lock, 
  Building2, 
  FileCheck, 
  Check, 
  RefreshCw 
} from 'lucide-react';
import { INDUSTRIES, APPROVED_MEDICAL_SECTOR_IDS, IndustryType } from '../industryConfig';
import { authenticatedFetch } from '../auth/apiClient';

interface ReadinessCheckItem {
  id: string;
  title: string;
  category: string;
  status: 'complete' | 'incomplete' | 'warning' | 'blocking';
  isBlocking: boolean;
  message: string;
}

interface ReadinessResult {
  overallStatus: 'READY' | 'BLOCKED' | 'WARNING';
  canActivate: boolean;
  completionPercentage: number;
  checks: ReadinessCheckItem[];
  blockingCount: number;
  evaluatedAt: string;
}

interface ImpactPreview {
  currentSectorId: IndustryType | null;
  targetSectorId: IndustryType;
  targetSectorName: string;
  terminologyChanges: Array<{ field: string; current: string; proposed: string }>;
  defaultServicesAdded: number;
  recommendedTemplatesCount: number;
  recommendedWorkflowsCount: number;
  preservedDataSummary: {
    patientsPreserved: boolean;
    appointmentsPreserved: boolean;
    paymentsPreserved: boolean;
    consentRecordsPreserved: boolean;
    customTemplatesPreserved: boolean;
    customWorkflowsPreserved: boolean;
    auditLogsPreserved: boolean;
  };
  warnings: string[];
}

interface SectorConfigRecord {
  tenantId: string;
  sectorId: IndustryType;
  version: number;
  activationStatus: 'draft' | 'pending_activation' | 'active' | 'suspended';
  terminology: Record<string, string>;
  selectedBy: string;
  lastChangedBy: string;
  lastChangedAt: string;
}

interface SectorHistoryItem {
  id: string;
  sectorId: IndustryType;
  version: number;
  changeType: string;
  reason?: string;
  changedBy: string;
  createdAt: string;
}

interface Props {
  activeSectorId: IndustryType;
  onSectorChange?: (newSectorId: IndustryType) => void;
  isImplementationAdmin?: boolean;
}

export const SectorActivationGate: React.FC<Props> = ({
  activeSectorId,
  onSectorChange,
  isImplementationAdmin = true,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [config, setConfig] = useState<SectorConfigRecord | null>(null);
  const [history, setHistory] = useState<SectorHistoryItem[]>([]);
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null);

  const [selectedTargetSector, setSelectedTargetSector] = useState<IndustryType>(activeSectorId);
  const [preview, setPreview] = useState<ImpactPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [typedConfirmation, setTypedConfirmation] = useState<string>('');
  const [applyStrategy, setApplyStrategy] = useState<'retain' | 'merge' | 'replace_presets'>('retain');
  const [applying, setApplying] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [rollbackVersion, setRollbackVersion] = useState<number | null>(null);
  const [rollbackConfirmation, setRollbackConfirmation] = useState<string>('');
  const [rollingBack, setRollingBack] = useState<boolean>(false);

  const [activating, setActivating] = useState<boolean>(false);

  useEffect(() => {
    fetchSectorData();
    fetchReadiness();
  }, []);

  const fetchSectorData = async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch('/api/tenant/sector-config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setHistory(data.history || []);
        if (data.config?.sectorId) {
          setSelectedTargetSector(data.config.sectorId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch sector config', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReadiness = async () => {
    try {
      const res = await authenticatedFetch('/api/tenant/readiness-check');
      if (res.ok) {
        const data = await res.json();
        setReadiness(data);
      }
    } catch (err) {
      console.error('Failed to fetch readiness', err);
    }
  };

  const handleGeneratePreview = async (targetId: IndustryType) => {
    try {
      setPreviewLoading(true);
      setActionError(null);
      setSelectedTargetSector(targetId);
      const res = await authenticatedFetch('/api/tenant/sector-config/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetSectorId: targetId }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreview(data);
      } else {
        const err = await res.json();
        setActionError(err.message || 'Failed to generate preview');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error connecting to server');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApplySectorChange = async () => {
    if (!preview) return;
    try {
      setApplying(true);
      setActionError(null);
      setActionSuccess(null);

      const res = await authenticatedFetch('/api/tenant/sector-config/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-implementation-admin': 'true',
        },
        body: JSON.stringify({
          targetSectorId: preview.targetSectorId,
          typedConfirmation,
          strategy: applyStrategy,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActionSuccess(data.message);
        setPreview(null);
        setTypedConfirmation('');
        await fetchSectorData();
        await fetchReadiness();
        if (onSectorChange) {
          onSectorChange(preview.targetSectorId);
        }
      } else {
        const err = await res.json();
        setActionError(err.message || 'Failed to apply sector change');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error processing request');
    } finally {
      setApplying(false);
    }
  };

  const handleRollback = async (version: number) => {
    try {
      setRollingBack(true);
      setActionError(null);
      setActionSuccess(null);

      const res = await authenticatedFetch('/api/tenant/sector-config/rollback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-implementation-admin': 'true',
        },
        body: JSON.stringify({
          targetVersion: version,
          typedConfirmation: rollbackConfirmation,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActionSuccess(data.message);
        setRollbackVersion(null);
        setRollbackConfirmation('');
        await fetchSectorData();
        await fetchReadiness();
        if (onSectorChange && data.config?.sectorId) {
          onSectorChange(data.config.sectorId);
        }
      } else {
        const err = await res.json();
        setActionError(err.message || 'Rollback failed');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error connecting to server');
    } finally {
      setRollingBack(false);
    }
  };

  const handleActivateWorkspace = async () => {
    try {
      setActivating(true);
      setActionError(null);
      setActionSuccess(null);

      const res = await authenticatedFetch('/api/tenant/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-implementation-admin': 'true',
        },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const data = await res.json();
        setActionSuccess(data.message);
        await fetchSectorData();
        await fetchReadiness();
      } else {
        const err = await res.json();
        setActionError(err.message || 'Activation blocked');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error connecting to server');
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
        Loading tenant sector configuration and activation gate status...
      </div>
    );
  }

  const currentSectorDef = INDUSTRIES[config?.sectorId || activeSectorId];

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-2">
      {/* Top Banner: Current Sector & Status */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{currentSectorDef?.icon || '🩺'}</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{currentSectorDef?.name || 'Medical Sector'}</h2>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
                  v{config?.version || 1}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded uppercase font-semibold tracking-wider ${
                  config?.activationStatus === 'active' 
                    ? 'bg-emerald-500 text-slate-950' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {config?.activationStatus || 'DRAFT'}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">{currentSectorDef?.description}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleGeneratePreview(config?.sectorId || activeSectorId)}
            className="px-4 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 flex items-center gap-2 transition"
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            Sector Configuration
          </button>
          
          {config?.activationStatus !== 'active' && (
            <button
              onClick={handleActivateWorkspace}
              disabled={activating || !readiness?.canActivate}
              className={`px-5 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 shadow-sm transition ${
                readiness?.canActivate
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              {activating ? 'Activating...' : 'Activate Workspace'}
            </button>
          )}
        </div>
      </div>

      {/* Action Messages */}
      {actionError && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm">{actionError}</div>
        </div>
      )}

      {actionSuccess && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-sm font-medium">{actionSuccess}</div>
        </div>
      )}

      {/* SECTION 1: Service Sector Selection Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              12 Approved Medical Service Sectors
            </h3>
            <p className="text-sm text-slate-500">
              Preset terminology, default fee catalogue, Meta templates and AI knowledge co-pilot adapt dynamically.
            </p>
          </div>
          {!isImplementationAdmin && (
            <div className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-md">
              <Lock className="w-3.5 h-3.5" />
              Only authorized Implementation Admins can apply sector changes
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {APPROVED_MEDICAL_SECTOR_IDS.map((sectorId) => {
            const sectorDef = INDUSTRIES[sectorId];
            const isCurrent = config?.sectorId === sectorId;

            return (
              <div
                key={sectorId}
                onClick={() => handleGeneratePreview(sectorId)}
                className={`p-4 rounded-xl border transition cursor-pointer relative flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-2xl">{sectorDef.icon}</span>
                    {isCurrent && (
                      <span className="text-xs bg-emerald-600 text-white font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">{sectorDef.name}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{sectorDef.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span>{sectorDef.terminology.patient} / {sectorDef.terminology.appointment}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Sector Impact Preview & Confirmation Modal/Panel */}
      {preview && (
        <div className="bg-slate-900 text-white rounded-xl p-6 border border-emerald-500/40 shadow-xl space-y-6 animate-in fade-in duration-200">
          <div className="flex justify-between items-start border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold">
                  Sector Migration Impact Summary: {preview.targetSectorName}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Review proposed terminology changes, preset additions, and tenant data preservation guarantees before applying.
              </p>
            </div>
            <button
              onClick={() => setPreview(null)}
              className="text-slate-400 hover:text-white text-sm"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            {/* Terminology Changes */}
            <div className="bg-slate-850 p-4 rounded-lg border border-slate-800">
              <h4 className="font-semibold text-emerald-400 mb-3 text-xs uppercase tracking-wider">
                Adapted Terminology ({preview.terminologyChanges.length} fields)
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {preview.terminologyChanges.map((t) => (
                  <div key={t.field} className="flex justify-between items-center text-xs py-1 border-b border-slate-800">
                    <span className="capitalize text-slate-400">{t.field}:</span>
                    <div className="flex items-center gap-2">
                      <span className="line-through text-slate-500">{t.current || 'Default'}</span>
                      <ArrowRight className="w-3 h-3 text-emerald-500" />
                      <span className="font-semibold text-emerald-300">{t.proposed}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preserved Data Summary */}
            <div className="bg-slate-850 p-4 rounded-lg border border-slate-800">
              <h4 className="font-semibold text-emerald-400 mb-3 text-xs uppercase tracking-wider">
                Tenant Data Preservation Guarantee
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Patient Records
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Appointments
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Payment History
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Consent Records
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Custom Templates
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Audit Trail Logs
                </div>
              </div>
            </div>
          </div>

          {/* Strategy Selection */}
          <div className="bg-slate-850 p-4 rounded-lg border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Fee Catalogue Strategy
              </label>
              <select
                value={applyStrategy}
                onChange={(e: any) => setApplyStrategy(e.target.value)}
                className="bg-slate-900 text-slate-200 border border-slate-700 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="retain">Retain Existing Fee Catalogue (Recommended)</option>
                <option value="merge">Merge Sector Presets with Existing Catalogue</option>
                <option value="replace_presets">Replace Catalogue with Sector Default Presets</option>
              </select>
            </div>

            {/* Typed Confirmation */}
            <div className="w-full sm:w-auto">
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Type <span className="text-emerald-400 font-mono">CONFIRM CHANGE</span> to apply
              </label>
              <input
                type="text"
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                placeholder="CONFIRM CHANGE"
                className="bg-slate-900 text-white border border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono uppercase tracking-wider focus:outline-none focus:border-emerald-500 w-full sm:w-64"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setPreview(null)}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleApplySectorChange}
              disabled={
                applying ||
                !isImplementationAdmin ||
                (typedConfirmation.trim().toUpperCase() !== 'CONFIRM CHANGE' &&
                  typedConfirmation.trim().toUpperCase() !== preview.targetSectorName.toUpperCase())
              }
              className={`px-5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 ${
                typedConfirmation.trim().toUpperCase() === 'CONFIRM CHANGE' ||
                typedConfirmation.trim().toUpperCase() === preview.targetSectorName.toUpperCase()
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'
              }`}
            >
              {applying ? 'Applying Transaction...' : `Apply Sector Preset v${(config?.version || 1) + 1}`}
            </button>
          </div>
        </div>
      )}

      {/* SECTION 3: 12-Item Activation Readiness Gate */}
      {readiness && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  12-Item Go-Live Activation Gate
                </h3>
              </div>
              <p className="text-sm text-slate-500">
                Calculated dynamically from real configuration, WhatsApp Meta API, and Google integration statuses.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-black text-slate-900">
                  {readiness.completionPercentage}%
                </div>
                <div className="text-xs text-slate-500 font-medium">Readiness Score</div>
              </div>

              <div className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                readiness.canActivate
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}>
                {readiness.canActivate ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> READY FOR GO-LIVE
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-600" /> {readiness.blockingCount} BLOCKING CHECKS
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {readiness.checks.map((check, idx) => {
              const isPassed = check.status === 'complete';

              return (
                <div
                  key={check.id}
                  className={`p-4 rounded-lg border transition flex items-start gap-3 ${
                    isPassed
                      ? 'bg-slate-50/50 border-slate-200'
                      : 'bg-red-50/40 border-red-200'
                  }`}
                >
                  <div className="mt-0.5">
                    {isPassed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-400">#{idx + 1}</span>
                      <h5 className="text-sm font-semibold text-slate-900 truncate">
                        {check.title}
                      </h5>
                      {check.isBlocking && !isPassed && (
                        <span className="text-[10px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded uppercase">
                          Blocking
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{check.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 4: Version History & Rollback Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-700" />
            <h3 className="text-lg font-bold text-slate-900">
              Configuration Version Audit History
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Total Snapshots: {history.length}
          </span>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No configuration history recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 text-sm">
            {history.map((item) => (
              <div key={item.id} className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800 text-xs bg-slate-100 px-2 py-0.5 rounded">
                      v{item.version}
                    </span>
                    <span className="font-semibold text-slate-900 text-xs capitalize">
                      {INDUSTRIES[item.sectorId]?.name || item.sectorId}
                    </span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded capitalize">
                      {item.changeType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {item.reason || 'Sector configuration updated'} • Changed by{' '}
                    <span className="font-medium text-slate-700">{item.changedBy}</span> on{' '}
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>

                {item.version < (config?.version || 1) && (
                  <div>
                    {rollbackVersion === item.version ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="CONFIRM ROLLBACK"
                          value={rollbackConfirmation}
                          onChange={(e) => setRollbackConfirmation(e.target.value)}
                          className="px-2 py-1 border border-slate-300 rounded text-xs font-mono uppercase focus:outline-none focus:border-red-500"
                        />
                        <button
                          onClick={() => handleRollback(item.version)}
                          disabled={rollingBack || rollbackConfirmation.trim().toUpperCase() !== 'CONFIRM ROLLBACK'}
                          className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold"
                        >
                          {rollingBack ? 'Rolling Back...' : 'Execute'}
                        </button>
                        <button
                          onClick={() => { setRollbackVersion(null); setRollbackConfirmation(''); }}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRollbackVersion(item.version)}
                        className="px-3 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3 text-slate-500" />
                        Rollback to v{item.version}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
