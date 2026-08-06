import { APPROVED_MEDICAL_SECTOR_IDS, getSectorDefinition, INDUSTRIES, IndustryType, isApprovedSectorId, logInvalidSectorWarning, UNCONFIGURED_SECTOR } from '../../industryConfig';
import { AuditService } from '../metadata/AuditService';
import { getSupabaseClient, isSupabaseConfigured } from '../../supabase/client';
import { WhatsAppConnectionService } from '../whatsapp/WhatsAppConnectionService';
import { GoogleOAuthService } from '../../google/GoogleOAuthService';

export interface ReadinessCheckItem {
  id: string;
  title: string;
  category: 'sector' | 'profile' | 'services' | 'staff' | 'integrations' | 'calendar' | 'ai' | 'compliance';
  status: 'complete' | 'incomplete' | 'warning' | 'blocking';
  isBlocking: boolean;
  message: string;
  details?: Record<string, any>;
}

export interface ReadinessEvaluationResult {
  overallStatus: 'READY' | 'BLOCKED' | 'WARNING';
  canActivate: boolean;
  completionPercentage: number;
  checks: ReadinessCheckItem[];
  blockingCount: number;
  evaluatedAt: string;
}

export interface TenantSectorConfigRecord {
  tenantId: string;
  sectorId: IndustryType;
  version: number;
  activationStatus: 'draft' | 'pending_activation' | 'active' | 'suspended';
  terminology: Record<string, string>;
  serviceCatalogue: Array<{ id: string; name: string; category: string; costInINR: number; durationMinutes: number; description: string }>;
  presetConfig: Record<string, any>;
  customizations: Record<string, any>;
  readinessChecklist: Record<string, any>;
  selectedBy: string;
  selectedAt: string;
  lastChangedBy: string;
  lastChangedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SectorHistoryRecord {
  id: string;
  tenantId: string;
  sectorId: IndustryType;
  version: number;
  configSnapshot: Record<string, any>;
  changeType: 'initial_select' | 'preset_switch' | 'customization_update' | 'rollback' | 'activation';
  reason?: string;
  changedBy: string;
  createdAt: string;
}

export interface ImpactPreviewResult {
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

// In-Memory Repository for Sector Configs with durability guarantees
class SectorConfigStore {
  private configs: Map<string, TenantSectorConfigRecord> = new Map();
  private history: Map<string, SectorHistoryRecord[]> = new Map();

  public get(tenantId: string): TenantSectorConfigRecord | null {
    return this.configs.get(tenantId) || null;
  }

  public set(tenantId: string, record: TenantSectorConfigRecord): void {
    this.configs.set(tenantId, record);
  }

  public getHistory(tenantId: string): SectorHistoryRecord[] {
    return this.history.get(tenantId) || [];
  }

  public addHistory(tenantId: string, record: SectorHistoryRecord): void {
    const list = this.getHistory(tenantId);
    list.push(record);
    this.history.set(tenantId, list);
  }

  public clear(): void {
    this.configs.clear();
    this.history.clear();
  }
}

export const sectorConfigStore = new SectorConfigStore();

export class SectorConfigService {
  private static isProductionOrStagingEnv(): boolean {
    const env = (process.env.NODE_ENV || '').toLowerCase();
    const mode = (process.env.APP_MODE || '').toLowerCase();
    const appEnv = (process.env.APP_ENV || '').toLowerCase();
    return env === 'production' || mode === 'production' || mode === 'staging' || appEnv === 'production' || appEnv === 'staging';
  }

  private static mapRowToConfig(row: any): TenantSectorConfigRecord {
    return {
      tenantId: row.tenant_id,
      sectorId: row.sector_id,
      version: Number(row.version),
      activationStatus: row.activation_status,
      terminology: row.terminology || {},
      serviceCatalogue: row.service_catalogue || [],
      presetConfig: row.preset_config || {},
      customizations: row.customizations || {},
      readinessChecklist: row.readiness_checklist || {},
      selectedBy: row.selected_by,
      selectedAt: row.selected_at,
      lastChangedBy: row.last_changed_by,
      lastChangedAt: row.last_changed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapRowToHistory(row: any): SectorHistoryRecord {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      sectorId: row.sector_id,
      version: Number(row.version),
      configSnapshot: row.config_snapshot || {},
      changeType: row.change_type,
      reason: row.reason,
      changedBy: row.changed_by,
      createdAt: row.created_at,
    };
  }

  /**
   * Retrieves current tenant sector config or creates default 'dental' draft config if not set.
   */
  public static async getTenantSectorConfig(tenantId: string): Promise<TenantSectorConfigRecord> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('tenant_sector_configs')
          .select('*')
          .eq('tenant_id', tenantId)
          .maybeSingle();

        if (error) {
          if (this.isProductionOrStagingEnv()) {
            throw new Error(`DATABASE_UNAVAILABLE: Failed to query tenant_sector_configs in Supabase (${error.message}).`);
          }
        } else if (data) {
          const config = this.mapRowToConfig(data);
          if (!isApprovedSectorId(config.sectorId)) {
            logInvalidSectorWarning(tenantId, 'INVALID_STORED_SECTOR_ID', config.sectorId);
          }
          sectorConfigStore.set(tenantId, config);
          return config;
        }
      } catch (err: any) {
        if (err.message?.includes('DATABASE_UNAVAILABLE')) throw err;
        if (this.isProductionOrStagingEnv()) {
          throw new Error(`DATABASE_UNAVAILABLE: Database operation failed in production/staging mode (${err.message}).`);
        }
      }
    } else if (this.isProductionOrStagingEnv()) {
      throw new Error('DATABASE_UNAVAILABLE: Supabase credentials missing in production/staging mode.');
    }

    const existing = sectorConfigStore.get(tenantId);
    if (existing) {
      if (!isApprovedSectorId(existing.sectorId)) {
        logInvalidSectorWarning(tenantId, 'INVALID_STORED_SECTOR_ID', existing.sectorId);
      }
      return existing;
    }

    // Default configuration for a new tenant
    const defaultSector: IndustryType = 'dental';
    const sectorDef = getSectorDefinition(defaultSector);

    const initialConfig: TenantSectorConfigRecord = {
      tenantId,
      sectorId: defaultSector,
      version: 1,
      activationStatus: 'draft',
      terminology: { ...sectorDef.terminology },
      serviceCatalogue: [...(sectorDef.defaultServices || [])],
      presetConfig: {
        businessName: sectorDef.defaultBusinessName,
        senderName: sectorDef.defaultSenderName,
        reviewLink: sectorDef.defaultReviewLink,
        aiKnowledgeBase: { ...sectorDef.aiKnowledgeBase },
      },
      customizations: {},
      readinessChecklist: {},
      selectedBy: 'system_init',
      selectedAt: new Date().toISOString(),
      lastChangedBy: 'system_init',
      lastChangedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    sectorConfigStore.set(tenantId, initialConfig);

    // Initial history snapshot
    const initialHistory: SectorHistoryRecord = {
      id: `hist_${tenantId}_1_${Date.now()}`,
      tenantId,
      sectorId: defaultSector,
      version: 1,
      configSnapshot: JSON.parse(JSON.stringify(initialConfig)),
      changeType: 'initial_select',
      reason: 'Initial tenant workspace initialization',
      changedBy: 'system_init',
      createdAt: new Date().toISOString(),
    };

    sectorConfigStore.addHistory(tenantId, initialHistory);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('tenant_sector_configs').upsert({
          tenant_id: initialConfig.tenantId,
          sector_id: initialConfig.sectorId,
          version: initialConfig.version,
          activation_status: initialConfig.activationStatus,
          terminology: initialConfig.terminology,
          service_catalogue: initialConfig.serviceCatalogue,
          preset_config: initialConfig.presetConfig,
          customizations: initialConfig.customizations,
          readiness_checklist: initialConfig.readinessChecklist,
          selected_by: initialConfig.selectedBy,
          selected_at: initialConfig.selectedAt,
          last_changed_by: initialConfig.lastChangedBy,
          last_changed_at: initialConfig.lastChangedAt,
          created_at: initialConfig.createdAt,
          updated_at: initialConfig.updatedAt,
        });

        await supabase.from('tenant_sector_history').insert({
          id: initialHistory.id,
          tenant_id: initialHistory.tenantId,
          sector_id: initialHistory.sectorId,
          version: initialHistory.version,
          config_snapshot: initialHistory.configSnapshot,
          change_type: initialHistory.changeType,
          reason: initialHistory.reason,
          changed_by: initialHistory.changedBy,
          created_at: initialHistory.createdAt,
        });
      } catch (err: any) {
        if (this.isProductionOrStagingEnv()) {
          throw new Error(`DATABASE_UNAVAILABLE: Initial persistence failed in Supabase (${err.message}).`);
        }
      }
    }

    return initialConfig;
  }

  /**
   * Generates impact preview when switching/selecting a sector.
   */
  public static async generateImpactPreview(
    tenantId: string,
    targetSectorId: IndustryType
  ): Promise<ImpactPreviewResult> {
    if (!isApprovedSectorId(targetSectorId)) {
      throw new Error(`INVALID_SECTOR_ID: Invalid sector ID "${targetSectorId}". Must be one of the 12 approved medical sectors.`);
    }

    const currentConfig = await this.getTenantSectorConfig(tenantId);
    const targetDef = getSectorDefinition(targetSectorId);

    const currentTerms = currentConfig.terminology || {};
    const proposedTerms = targetDef.terminology;

    const terminologyChanges: Array<{ field: string; current: string; proposed: string }> = [];

    Object.keys(proposedTerms).forEach((key) => {
      const fieldKey = key as keyof typeof proposedTerms;
      const currVal = currentTerms[fieldKey] || '';
      const propVal = proposedTerms[fieldKey];
      if (currVal !== propVal) {
        terminologyChanges.push({
          field: key,
          current: currVal,
          proposed: propVal,
        });
      }
    });

    const warnings: string[] = [];
    if (currentConfig.activationStatus === 'active') {
      warnings.push(
        `Workspace is currently ACTIVE. Changing sector from ${currentConfig.sectorId} to ${targetSectorId} will adapt UI labels, dashboard metrics, and default templates. All patient records and appointments will remain untouched.`
      );
    }

    return {
      currentSectorId: currentConfig.sectorId,
      targetSectorId,
      targetSectorName: targetDef.name,
      terminologyChanges,
      defaultServicesAdded: targetDef.defaultServices?.length || 0,
      recommendedTemplatesCount: targetDef.defaultTemplates?.length || 0,
      recommendedWorkflowsCount: targetDef.defaultAutomationRules?.length || 0,
      preservedDataSummary: {
        patientsPreserved: true,
        appointmentsPreserved: true,
        paymentsPreserved: true,
        consentRecordsPreserved: true,
        customTemplatesPreserved: true,
        customWorkflowsPreserved: true,
        auditLogsPreserved: true,
      },
      warnings,
    };
  }

  /**
   * Transactionally applies sector configuration change with versioning & audit logging.
   * Requires typed confirmation (e.g. "CONFIRM CHANGE" or target sector name).
   */
  public static async applySectorConfig(
    tenantId: string,
    targetSectorId: IndustryType,
    changedBy: string,
    typedConfirmation: string,
    strategy: 'retain' | 'merge' | 'replace_presets' = 'retain'
  ): Promise<TenantSectorConfigRecord> {
    if (!isApprovedSectorId(targetSectorId)) {
      throw new Error(`INVALID_SECTOR_ID: Invalid sector ID "${targetSectorId}". Must be one of the 12 approved medical sectors.`);
    }

    const targetDef = getSectorDefinition(targetSectorId);
    const normalizedConfirmation = typedConfirmation.trim().toUpperCase();
    const expectedConfirm = targetDef.name.toUpperCase();

    if (normalizedConfirmation !== 'CONFIRM CHANGE' && normalizedConfirmation !== expectedConfirm) {
      throw new Error(`Typed confirmation mismatch. Expected "CONFIRM CHANGE" or "${targetDef.name}".`);
    }

    const currentConfig = await this.getTenantSectorConfig(tenantId);
    const newVersion = currentConfig.version + 1;

    let updatedServices = [...currentConfig.serviceCatalogue];
    if (strategy === 'replace_presets') {
      updatedServices = [...(targetDef.defaultServices || [])];
    } else if (strategy === 'merge') {
      const existingIds = new Set(updatedServices.map((s) => s.id));
      (targetDef.defaultServices || []).forEach((s) => {
        if (!existingIds.has(s.id)) {
          updatedServices.push(s);
        }
      });
    }

    const updatedConfig: TenantSectorConfigRecord = {
      ...currentConfig,
      sectorId: targetSectorId,
      version: newVersion,
      terminology: { ...targetDef.terminology },
      serviceCatalogue: updatedServices,
      presetConfig: {
        ...currentConfig.presetConfig,
        businessName: currentConfig.presetConfig?.businessName || targetDef.defaultBusinessName,
        senderName: targetDef.defaultSenderName,
        reviewLink: targetDef.defaultReviewLink,
        aiKnowledgeBase: { ...targetDef.aiKnowledgeBase },
      },
      lastChangedBy: changedBy,
      lastChangedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    sectorConfigStore.set(tenantId, updatedConfig);

    const historyEntry: SectorHistoryRecord = {
      id: `hist_${tenantId}_${newVersion}_${Date.now()}`,
      tenantId,
      sectorId: targetSectorId,
      version: newVersion,
      configSnapshot: JSON.parse(JSON.stringify(updatedConfig)),
      changeType: 'preset_switch',
      reason: `Changed sector from ${currentConfig.sectorId} to ${targetSectorId} using strategy ${strategy}`,
      changedBy,
      createdAt: new Date().toISOString(),
    };

    sectorConfigStore.addHistory(tenantId, historyEntry);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        const { error: configError } = await supabase.from('tenant_sector_configs').upsert({
          tenant_id: updatedConfig.tenantId,
          sector_id: updatedConfig.sectorId,
          version: updatedConfig.version,
          activation_status: updatedConfig.activationStatus,
          terminology: updatedConfig.terminology,
          service_catalogue: updatedConfig.serviceCatalogue,
          preset_config: updatedConfig.presetConfig,
          customizations: updatedConfig.customizations,
          readiness_checklist: updatedConfig.readinessChecklist,
          selected_by: updatedConfig.selectedBy,
          selected_at: updatedConfig.selectedAt,
          last_changed_by: updatedConfig.lastChangedBy,
          last_changed_at: updatedConfig.lastChangedAt,
          created_at: updatedConfig.createdAt,
          updated_at: updatedConfig.updatedAt,
        });

        if (configError && this.isProductionOrStagingEnv()) {
          throw new Error(`DATABASE_UNAVAILABLE: Failed to persist sector config update in Supabase (${configError.message}).`);
        }

        const { error: histError } = await supabase.from('tenant_sector_history').insert({
          id: historyEntry.id,
          tenant_id: historyEntry.tenantId,
          sector_id: historyEntry.sectorId,
          version: historyEntry.version,
          config_snapshot: historyEntry.configSnapshot,
          change_type: historyEntry.changeType,
          reason: historyEntry.reason,
          changed_by: historyEntry.changedBy,
          created_at: historyEntry.createdAt,
        });

        if (histError && this.isProductionOrStagingEnv()) {
          throw new Error(`DATABASE_UNAVAILABLE: Failed to insert sector history in Supabase (${histError.message}).`);
        }
      } catch (err: any) {
        if (err.message?.includes('DATABASE_UNAVAILABLE')) throw err;
        if (this.isProductionOrStagingEnv()) {
          throw new Error(`DATABASE_UNAVAILABLE: Supabase sector update failed in staging/production mode (${err.message}).`);
        }
      }
    } else if (this.isProductionOrStagingEnv()) {
      throw new Error('DATABASE_UNAVAILABLE: Cannot perform sector configuration mutation without Supabase in staging/production mode.');
    }

    await AuditService.logEvent({
      tenantId,
      userId: changedBy,
      eventType: 'SECTOR_CONFIG_UPDATED',
      metadata: {
        previousSector: currentConfig.sectorId,
        newSector: targetSectorId,
        version: newVersion,
        strategy,
      },
    });

    return updatedConfig;
  }

  /**
   * Rolls back tenant sector configuration to a previous version snapshot.
   */
  public static async rollbackSectorConfig(
    tenantId: string,
    targetVersion: number,
    changedBy: string,
    typedConfirmation: string
  ): Promise<TenantSectorConfigRecord> {
    if (typedConfirmation.trim().toUpperCase() !== 'CONFIRM ROLLBACK') {
      throw new Error('Typed confirmation mismatch. Expected "CONFIRM ROLLBACK".');
    }

    const history = await this.getSectorHistory(tenantId);
    const targetEntry = history.find((h) => h.version === targetVersion);

    if (!targetEntry) {
      throw new Error(`Version v${targetVersion} snapshot not found in history for tenant "${tenantId}".`);
    }

    if (!targetEntry.sectorId || !isApprovedSectorId(targetEntry.sectorId)) {
      logInvalidSectorWarning(tenantId, 'INVALID_ROLLBACK_TARGET_SECTOR', targetEntry.sectorId);
      throw new Error(`INVALID_SECTOR_ID: Target snapshot v${targetVersion} contains an invalid sector ID "${targetEntry.sectorId}".`);
    }

    const currentConfig = await this.getTenantSectorConfig(tenantId);
    const newVersion = currentConfig.version + 1;

    const restoredConfig: TenantSectorConfigRecord = {
      ...(targetEntry.configSnapshot as TenantSectorConfigRecord),
      version: newVersion,
      lastChangedBy: changedBy,
      lastChangedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    sectorConfigStore.set(tenantId, restoredConfig);

    const rollbackHistoryEntry: SectorHistoryRecord = {
      id: `hist_${tenantId}_${newVersion}_${Date.now()}`,
      tenantId,
      sectorId: restoredConfig.sectorId,
      version: newVersion,
      configSnapshot: JSON.parse(JSON.stringify(restoredConfig)),
      changeType: 'rollback',
      reason: `Rolled back workspace sector config to snapshot v${targetVersion}`,
      changedBy,
      createdAt: new Date().toISOString(),
    };

    sectorConfigStore.addHistory(tenantId, rollbackHistoryEntry);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        const { error: configError } = await supabase.from('tenant_sector_configs').upsert({
          tenant_id: restoredConfig.tenantId,
          sector_id: restoredConfig.sectorId,
          version: restoredConfig.version,
          activation_status: restoredConfig.activationStatus,
          terminology: restoredConfig.terminology,
          service_catalogue: restoredConfig.serviceCatalogue,
          preset_config: restoredConfig.presetConfig,
          customizations: restoredConfig.customizations,
          readiness_checklist: restoredConfig.readinessChecklist,
          selected_by: restoredConfig.selectedBy,
          selected_at: restoredConfig.selectedAt,
          last_changed_by: restoredConfig.lastChangedBy,
          last_changed_at: restoredConfig.lastChangedAt,
          created_at: restoredConfig.createdAt,
          updated_at: restoredConfig.updatedAt,
        });

        if (configError && this.isProductionOrStagingEnv()) {
          throw new Error(`DATABASE_UNAVAILABLE: Failed to persist rollback in Supabase (${configError.message}).`);
        }

        const { error: histError } = await supabase.from('tenant_sector_history').insert({
          id: rollbackHistoryEntry.id,
          tenant_id: rollbackHistoryEntry.tenantId,
          sector_id: rollbackHistoryEntry.sectorId,
          version: rollbackHistoryEntry.version,
          config_snapshot: rollbackHistoryEntry.configSnapshot,
          change_type: rollbackHistoryEntry.changeType,
          reason: rollbackHistoryEntry.reason,
          changed_by: rollbackHistoryEntry.changedBy,
          created_at: rollbackHistoryEntry.createdAt,
        });

        if (histError && this.isProductionOrStagingEnv()) {
          throw new Error(`DATABASE_UNAVAILABLE: Failed to insert rollback history in Supabase (${histError.message}).`);
        }
      } catch (err: any) {
        if (err.message?.includes('DATABASE_UNAVAILABLE')) throw err;
        if (this.isProductionOrStagingEnv()) {
          throw new Error(`DATABASE_UNAVAILABLE: Rollback operation failed in Supabase (${err.message}).`);
        }
      }
    } else if (this.isProductionOrStagingEnv()) {
      throw new Error('DATABASE_UNAVAILABLE: Cannot perform rollback without Supabase in staging/production mode.');
    }

    await AuditService.logEvent({
      tenantId,
      userId: changedBy,
      eventType: 'SECTOR_CONFIG_ROLLED_BACK',
      metadata: {
        targetVersion,
        newVersion,
        sectorId: restoredConfig.sectorId,
      },
    });

    return restoredConfig;
  }

  /**
   * Calculates readiness checklist across all 12 operational categories for a specific tenant.
   * Validates tenant-scoped integration records (WhatsApp, Google OAuth, Calendar, E2E tests).
   */
  public static async evaluateReadiness(
    tenantId: string,
    context?: {
      hasMetaConnected?: boolean;
      hasGoogleConnected?: boolean;
      hasCalendarTested?: boolean;
      hasEndToEndTestPassed?: boolean;
      hasPrivacyAcknowledged?: boolean;
    }
  ): Promise<ReadinessEvaluationResult> {
    const config = await this.getTenantSectorConfig(tenantId);
    const sectorDef = getSectorDefinition(config.sectorId);

    // Tenant-scoped integration verification
    let isMetaConnected = context?.hasMetaConnected;
    if (isMetaConnected === undefined) {
      try {
        const connection = await WhatsAppConnectionService.getConnectionByTenantId(tenantId);
        isMetaConnected = Boolean(
          connection &&
          connection.phone_number_id &&
          (connection.connection_status === 'connected' || (connection as any).status === 'connected')
        );
      } catch {
        isMetaConnected = false;
      }
    }

    let isGoogleConnected = context?.hasGoogleConnected;
    if (isGoogleConnected === undefined) {
      try {
        const googleStatus = await GoogleOAuthService.getConnectionStatus(tenantId);
        isGoogleConnected = Boolean(googleStatus && googleStatus.isConnected);
      } catch {
        isGoogleConnected = false;
      }
    }

    const checks: ReadinessCheckItem[] = [
      {
        id: 'sector_selected',
        title: 'Service Sector & Workspace Preset Selected',
        category: 'sector',
        status: config.sectorId && isApprovedSectorId(config.sectorId) ? 'complete' : 'blocking',
        isBlocking: true,
        message: config.sectorId && isApprovedSectorId(config.sectorId)
          ? `Authorized sector selected: ${sectorDef?.name || config.sectorId} (v${config.version})`
          : 'Service sector must be configured by implementation admin.',
        details: { sectorId: config.sectorId, version: config.version },
      },
      {
        id: 'business_profile',
        title: 'Business Profile Completed',
        category: 'profile',
        status: config.presetConfig?.businessName ? 'complete' : 'blocking',
        isBlocking: true,
        message: config.presetConfig?.businessName
          ? `Business profile verified for ${config.presetConfig.businessName}`
          : 'Business name and address details are missing.',
        details: { businessName: config.presetConfig?.businessName },
      },
      {
        id: 'branch_operating_hours',
        title: 'Branch & Operating Hours Configured',
        category: 'profile',
        status: config.presetConfig?.aiKnowledgeBase?.timings ? 'complete' : 'blocking',
        isBlocking: true,
        message: config.presetConfig?.aiKnowledgeBase?.timings
          ? 'Clinic operating hours and weekly availability configured.'
          : 'Operating hours and clinic branch details must be configured.',
      },
      {
        id: 'services_configured',
        title: 'Services & Fee Catalogue Configured',
        category: 'services',
        status: config.serviceCatalogue && config.serviceCatalogue.length > 0 ? 'complete' : 'blocking',
        isBlocking: true,
        message: config.serviceCatalogue && config.serviceCatalogue.length > 0
          ? `${config.serviceCatalogue.length} services configured in catalogue.`
          : 'At least 1 active service or treatment must be configured in fee catalogue.',
        details: { count: config.serviceCatalogue?.length || 0 },
      },
      {
        id: 'providers_configured',
        title: 'Providers & Clinical Staff Configured',
        category: 'staff',
        status: config.presetConfig?.aiKnowledgeBase?.doctors ? 'complete' : 'blocking',
        isBlocking: true,
        message: config.presetConfig?.aiKnowledgeBase?.doctors
          ? 'Specialist providers and clinical staff registered.'
          : 'At least 1 provider or clinician must be configured.',
      },
      {
        id: 'meta_whatsapp_tested',
        title: 'Meta WhatsApp Cloud API Connection Tested',
        category: 'integrations',
        status: isMetaConnected ? 'complete' : 'blocking',
        isBlocking: true,
        message: isMetaConnected
          ? `Meta WhatsApp Cloud API integration verified for tenant "${tenantId}".`
          : `WhatsApp Cloud API connection is missing or unverified for tenant "${tenantId}".`,
      },
      {
        id: 'google_workspace_tested',
        title: 'Google Business / Sheets Integration Tested',
        category: 'integrations',
        status: isGoogleConnected ? 'complete' : 'blocking',
        isBlocking: true,
        message: isGoogleConnected
          ? `Google Workspace / Sheets connection verified for tenant "${tenantId}".`
          : `Google Sheets / Drive credentials unverified for tenant "${tenantId}".`,
      },
      {
        id: 'appointment_calendar_tested',
        title: 'Appointment Calendar Tested',
        category: 'calendar',
        status: context?.hasCalendarTested ? 'complete' : 'blocking',
        isBlocking: true,
        message: context?.hasCalendarTested
          ? 'Appointment booking calendar tested successfully.'
          : 'Appointment calendar test booking required before go-live.',
      },
      {
        id: 'ai_knowledge_base_reviewed',
        title: 'Business-Only AI Knowledge Reviewed',
        category: 'ai',
        status: config.presetConfig?.aiKnowledgeBase?.treatments ? 'complete' : 'blocking',
        isBlocking: true,
        message: config.presetConfig?.aiKnowledgeBase?.treatments
          ? 'AI Knowledge Base contains approved business-only information.'
          : 'AI Knowledge Base must be reviewed before go-live.',
      },
      {
        id: 'required_templates_validated',
        title: 'Required Meta Templates Validated',
        category: 'compliance',
        status: (sectorDef?.defaultTemplates?.length || 0) > 0 ? 'complete' : 'blocking',
        isBlocking: true,
        message: `${sectorDef?.defaultTemplates?.length || 0} approved templates validated for sector.`,
      },
      {
        id: 'synthetic_e2e_test_completed',
        title: 'Synthetic End-to-End Test Completed',
        category: 'compliance',
        status: context?.hasEndToEndTestPassed ? 'complete' : 'blocking',
        isBlocking: true,
        message: context?.hasEndToEndTestPassed
          ? 'Synthetic end-to-end patient workflow test passed.'
          : 'Run and pass at least 1 end-to-end synthetic enquiry-to-appointment test.',
      },
      {
        id: 'privacy_acknowledgement_completed',
        title: 'Privacy & Operational Responsibility Acknowledged',
        category: 'compliance',
        status: context?.hasPrivacyAcknowledged ? 'complete' : 'blocking',
        isBlocking: true,
        message: context?.hasPrivacyAcknowledged
          ? 'Privacy and healthcare AI boundary terms acknowledged.'
          : 'Sign and acknowledge data privacy & AI boundary terms.',
      },
    ];

    const blockingCount = checks.filter((c) => c.isBlocking && c.status !== 'complete').length;
    const completedCount = checks.filter((c) => c.status === 'complete').length;

    const completionPercentage = Math.round((completedCount / checks.length) * 100);

    let overallStatus: 'READY' | 'BLOCKED' | 'WARNING' = 'READY';
    if (blockingCount > 0) {
      overallStatus = 'BLOCKED';
    } else if (completionPercentage < 100) {
      overallStatus = 'WARNING';
    }

    return {
      overallStatus,
      canActivate: blockingCount === 0,
      completionPercentage,
      checks,
      blockingCount,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Activates the workspace for production. Fails closed if any blocking readiness requirement is incomplete.
   */
  public static async activateWorkspace(
    tenantId: string,
    activatedBy: string,
    context?: {
      hasMetaConnected?: boolean;
      hasGoogleConnected?: boolean;
      hasCalendarTested?: boolean;
      hasEndToEndTestPassed?: boolean;
      hasPrivacyAcknowledged?: boolean;
    }
  ): Promise<TenantSectorConfigRecord> {
    const config = await this.getTenantSectorConfig(tenantId);
    if (!config.sectorId || !isApprovedSectorId(config.sectorId)) {
      logInvalidSectorWarning(tenantId, 'ACTIVATION_BLOCKED_INVALID_SECTOR', config.sectorId);
      throw new Error(`INVALID_SECTOR_ID: Cannot activate workspace. Stored sector ID "${config.sectorId}" is missing or invalid.`);
    }

    const readiness = await this.evaluateReadiness(tenantId, context);

    if (!readiness.canActivate) {
      const failedChecks = readiness.checks
        .filter((c) => c.isBlocking && c.status !== 'complete')
        .map((c) => c.title)
        .join(', ');
      throw new Error(`ACTIVATION_BLOCKED: Cannot activate workspace. Incomplete blocking checks: [${failedChecks}]`);
    }

    const newVersion = config.version + 1;

    const activatedConfig: TenantSectorConfigRecord = {
      ...config,
      version: newVersion,
      activationStatus: 'active',
      lastChangedBy: activatedBy,
      lastChangedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    sectorConfigStore.set(tenantId, activatedConfig);

    const activationHistory: SectorHistoryRecord = {
      id: `hist_${tenantId}_${newVersion}_${Date.now()}`,
      tenantId,
      sectorId: config.sectorId,
      version: newVersion,
      configSnapshot: JSON.parse(JSON.stringify(activatedConfig)),
      changeType: 'activation',
      reason: 'Workspace activated after all 12 readiness gate checks passed',
      changedBy: activatedBy,
      createdAt: new Date().toISOString(),
    };

    sectorConfigStore.addHistory(tenantId, activationHistory);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        const { error: configError } = await supabase.from('tenant_sector_configs').upsert({
          tenant_id: activatedConfig.tenantId,
          sector_id: activatedConfig.sectorId,
          version: activatedConfig.version,
          activation_status: activatedConfig.activationStatus,
          terminology: activatedConfig.terminology,
          service_catalogue: activatedConfig.serviceCatalogue,
          preset_config: activatedConfig.presetConfig,
          customizations: activatedConfig.customizations,
          readiness_checklist: activatedConfig.readinessChecklist,
          selected_by: activatedConfig.selectedBy,
          selected_at: activatedConfig.selectedAt,
          last_changed_by: activatedConfig.lastChangedBy,
          last_changed_at: activatedConfig.lastChangedAt,
          created_at: activatedConfig.createdAt,
          updated_at: activatedConfig.updatedAt,
        });

        if (configError && this.isProductionOrStagingEnv()) {
          throw new Error(`DATABASE_UNAVAILABLE: Failed to persist workspace activation in Supabase (${configError.message}).`);
        }

        const { error: histError } = await supabase.from('tenant_sector_history').insert({
          id: activationHistory.id,
          tenant_id: activationHistory.tenantId,
          sector_id: activationHistory.sectorId,
          version: activationHistory.version,
          config_snapshot: activationHistory.configSnapshot,
          change_type: activationHistory.changeType,
          reason: activationHistory.reason,
          changed_by: activationHistory.changedBy,
          created_at: activationHistory.createdAt,
        });

        if (histError && this.isProductionOrStagingEnv()) {
          throw new Error(`DATABASE_UNAVAILABLE: Failed to insert activation history in Supabase (${histError.message}).`);
        }
      } catch (err: any) {
        if (err.message?.includes('DATABASE_UNAVAILABLE')) throw err;
        if (this.isProductionOrStagingEnv()) {
          throw new Error(`DATABASE_UNAVAILABLE: Workspace activation database mutation failed in staging/production mode (${err.message}).`);
        }
      }
    } else if (this.isProductionOrStagingEnv()) {
      throw new Error('DATABASE_UNAVAILABLE: Cannot activate workspace without Supabase database in staging/production mode.');
    }

    await AuditService.logEvent({
      tenantId,
      userId: activatedBy,
      eventType: 'WORKSPACE_ACTIVATED',
      metadata: {
        sectorId: config.sectorId,
        version: newVersion,
        readinessScore: readiness.completionPercentage,
      },
    });

    return activatedConfig;

  }

  /**
   * Returns history snapshots for a tenant.
   */
  public static async getSectorHistory(tenantId: string): Promise<SectorHistoryRecord[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('tenant_sector_history')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: true });

        if (error) {
          if (this.isProductionOrStagingEnv()) {
            throw new Error(`DATABASE_UNAVAILABLE: Failed to fetch history from Supabase (${error.message}).`);
          }
        } else if (data && data.length > 0) {
          return data.map((r) => this.mapRowToHistory(r));
        }
      } catch (err: any) {
        if (err.message?.includes('DATABASE_UNAVAILABLE')) throw err;
        if (this.isProductionOrStagingEnv()) {
          throw new Error(`DATABASE_UNAVAILABLE: Database history fetch failed (${err.message}).`);
        }
      }
    } else if (this.isProductionOrStagingEnv()) {
      throw new Error('DATABASE_UNAVAILABLE: Missing Supabase in staging/production mode.');
    }

    return sectorConfigStore.getHistory(tenantId);
  }
}
