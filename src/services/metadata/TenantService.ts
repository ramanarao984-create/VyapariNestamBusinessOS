/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient, isSupabaseConfigured } from '../../supabase/client';
import { isDemoModeEnabled } from '../../auth/demoConfig';
import { Tenant, ClinicConfig, FeatureFlags, SubscriptionStatus } from './types';
import { ValidationError, NotFoundError, DatabaseError } from './errors';
import { logger } from './logger';

export class TenantService {
  private static readonly CONTEXT = 'TenantService';

  /**
   * Helper to map database rows to Tenant interface
   */
  private static mapRow(row: any): Tenant {
    return {
      id: row.id,
      name: row.name,
      spreadsheetId: row.spreadsheet_id,
      calendarId: row.calendar_id,
      driveFolderId: row.drive_folder_id,
      clinicConfig: row.clinic_config || {},
      featureFlags: row.feature_flags || {},
      subscriptionStatus: row.subscription_status as SubscriptionStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Validation checks for tenant inputs
   */
  private static validateInputs(
    id: string,
    name: string,
    spreadsheetId: string,
    calendarId: string,
    driveFolderId: string,
    subscriptionStatus?: string
  ): void {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new ValidationError('Tenant ID must be a non-empty string.');
    }
    if (!/^[a-zA-Z0-9_\-]+$/.test(id)) {
      throw new ValidationError('Tenant ID must contain only alphanumeric characters, underscores, or hyphens.');
    }
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new ValidationError('Tenant name must be a non-empty string.');
    }
    if (!spreadsheetId || typeof spreadsheetId !== 'string' || spreadsheetId.trim() === '') {
      throw new ValidationError('Spreadsheet ID must be a non-empty string.');
    }
    if (!calendarId || typeof calendarId !== 'string' || calendarId.trim() === '') {
      throw new ValidationError('Calendar ID must be a non-empty string.');
    }
    if (!driveFolderId || typeof driveFolderId !== 'string' || driveFolderId.trim() === '') {
      throw new ValidationError('Drive Folder ID must be a non-empty string.');
    }
    if (subscriptionStatus) {
      const validStatuses = ['active', 'inactive', 'trial'];
      if (!validStatuses.includes(subscriptionStatus)) {
        throw new ValidationError(`Invalid subscription status: "${subscriptionStatus}". Must be one of: active, inactive, trial.`);
      }
    }
  }

  /**
   * Creates a new tenant metadata record.
   */
  public static async createTenant(params: {
    id: string;
    name: string;
    spreadsheetId: string;
    calendarId: string;
    driveFolderId: string;
    clinicConfig?: ClinicConfig;
    featureFlags?: FeatureFlags;
    subscriptionStatus?: SubscriptionStatus;
  }): Promise<Tenant> {
    const { id, name, spreadsheetId, calendarId, driveFolderId, clinicConfig = {}, featureFlags = {}, subscriptionStatus = 'active' } = params;

    this.validateInputs(id, name, spreadsheetId, calendarId, driveFolderId, subscriptionStatus);
    
    if (clinicConfig && (typeof clinicConfig !== 'object' || Array.isArray(clinicConfig))) {
      throw new ValidationError('Clinic config must be a valid non-array object.');
    }
    if (featureFlags && (typeof featureFlags !== 'object' || Array.isArray(featureFlags))) {
      throw new ValidationError('Feature flags must be a valid non-array object.');
    }

    logger.info(this.CONTEXT, 'Creating new tenant metadata', { tenantId: id });

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('tenants')
        .insert({
          id,
          name,
          spreadsheet_id: spreadsheetId,
          calendar_id: calendarId,
          drive_folder_id: driveFolderId,
          clinic_config: clinicConfig,
          feature_flags: featureFlags,
          subscription_status: subscriptionStatus,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new ValidationError(`Tenant with ID "${id}" already exists.`);
        }
        throw error;
      }

      return this.mapRow(data);
    } catch (err: any) {
      if (err instanceof ValidationError) {
        throw err;
      }
      logger.error(this.CONTEXT, `Database error creating tenant "${id}"`, err);
      throw new DatabaseError(`Failed to create tenant: ${err.message || err}`, err);
    }
  }

  /**
   * Retrieves a tenant metadata record by ID.
   */
  public static async getTenantById(id: string): Promise<Tenant> {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new ValidationError('Tenant ID is required to fetch details.');
    }

    if (id === 'demo-tenant-id' || id.startsWith('demo-')) {
      return {
        id: id || 'demo-tenant-id',
        name: 'Demo Health Clinic',
        spreadsheetId: 'demo-spreadsheet-id',
        calendarId: 'demo-calendar-id',
        driveFolderId: 'demo-drive-folder-id',
        clinicConfig: {
          clinicName: 'Demo Health Clinic',
          timeZone: 'Asia/Kolkata',
        },
        featureFlags: {
          enableWhatsAppAutomation: true,
        },
        subscriptionStatus: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new NotFoundError(`Tenant with ID "${id}" was not found.`);
      }

      return this.mapRow(data);
    } catch (err: any) {
      if (err instanceof NotFoundError || err instanceof ValidationError) {
        throw err;
      }
      logger.error(this.CONTEXT, `Database error fetching tenant "${id}"`, err);
      throw new DatabaseError(`Failed to fetch tenant: ${err.message || err}`, err);
    }
  }

  /**
   * Updates core tenant properties.
   */
  public static async updateTenant(
    id: string,
    updates: Partial<Pick<Tenant, 'name' | 'spreadsheetId' | 'calendarId' | 'driveFolderId'>>
  ): Promise<Tenant> {
    if (!id) {
      throw new ValidationError('Tenant ID is required for updates.');
    }

    try {
      const current = await this.getTenantById(id);
      const name = updates.name !== undefined ? updates.name : current.name;
      const spreadsheetId = updates.spreadsheetId !== undefined ? updates.spreadsheetId : current.spreadsheetId;
      const calendarId = updates.calendarId !== undefined ? updates.calendarId : current.calendarId;
      const driveFolderId = updates.driveFolderId !== undefined ? updates.driveFolderId : current.driveFolderId;

      this.validateInputs(id, name, spreadsheetId, calendarId, driveFolderId);

      logger.info(this.CONTEXT, 'Updating tenant core settings', { tenantId: id });

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('tenants')
        .update({
          name,
          spreadsheet_id: spreadsheetId,
          calendar_id: calendarId,
          drive_folder_id: driveFolderId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return this.mapRow(data);
    } catch (err: any) {
      if (err instanceof NotFoundError || err instanceof ValidationError) {
        throw err;
      }
      logger.error(this.CONTEXT, `Database error updating tenant "${id}"`, err);
      throw new DatabaseError(`Failed to update tenant core: ${err.message || err}`, err);
    }
  }

  /**
   * Updates clinic-specific configuration metadata (e.g. business hours, address, branding).
   */
  public static async updateClinicConfig(id: string, config: ClinicConfig): Promise<Tenant> {
    if (!id) {
      throw new ValidationError('Tenant ID is required to update clinic config.');
    }
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      throw new ValidationError('Clinic configuration must be a valid non-array object.');
    }

    logger.info(this.CONTEXT, 'Updating tenant clinic configuration', { tenantId: id });

    try {
      // Ensure tenant exists first
      await this.getTenantById(id);

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('tenants')
        .update({
          clinic_config: config,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return this.mapRow(data);
    } catch (err: any) {
      if (err instanceof NotFoundError || err instanceof ValidationError) {
        throw err;
      }
      logger.error(this.CONTEXT, `Database error updating clinic config for tenant "${id}"`, err);
      throw new DatabaseError(`Failed to update clinic config: ${err.message || err}`, err);
    }
  }

  /**
   * Updates the feature flag configuration.
   */
  public static async updateFeatureFlags(id: string, flags: FeatureFlags): Promise<Tenant> {
    if (!id) {
      throw new ValidationError('Tenant ID is required to update feature flags.');
    }
    if (!flags || typeof flags !== 'object' || Array.isArray(flags)) {
      throw new ValidationError('Feature flags must be a valid non-array object.');
    }

    logger.info(this.CONTEXT, 'Updating tenant feature flags', { tenantId: id });

    try {
      // Ensure tenant exists first
      await this.getTenantById(id);

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('tenants')
        .update({
          feature_flags: flags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return this.mapRow(data);
    } catch (err: any) {
      if (err instanceof NotFoundError || err instanceof ValidationError) {
        throw err;
      }
      logger.error(this.CONTEXT, `Database error updating feature flags for tenant "${id}"`, err);
      throw new DatabaseError(`Failed to update feature flags: ${err.message || err}`, err);
    }
  }

  /**
   * Updates subscription status.
   */
  public static async updateSubscription(id: string, status: SubscriptionStatus): Promise<Tenant> {
    if (!id) {
      throw new ValidationError('Tenant ID is required to update subscription.');
    }
    const validStatuses = ['active', 'inactive', 'trial'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Invalid subscription status: "${status}". Must be one of: active, inactive, trial.`);
    }

    logger.info(this.CONTEXT, 'Updating tenant subscription status', { tenantId: id, status });

    try {
      // Ensure tenant exists first
      await this.getTenantById(id);

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('tenants')
        .update({
          subscription_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return this.mapRow(data);
    } catch (err: any) {
      if (err instanceof NotFoundError || err instanceof ValidationError) {
        throw err;
      }
      logger.error(this.CONTEXT, `Database error updating subscription for tenant "${id}"`, err);
      throw new DatabaseError(`Failed to update subscription status: ${err.message || err}`, err);
    }
  }

  /**
   * Helper query to resolve tenant by primary business Google Spreadsheet ID.
   */
  public static async getTenantBySpreadsheetId(spreadsheetId: string): Promise<Tenant> {
    if (!spreadsheetId || typeof spreadsheetId !== 'string' || spreadsheetId.trim() === '') {
      throw new ValidationError('Spreadsheet ID is required for reverse tenant lookup.');
    }

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('spreadsheet_id', spreadsheetId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new NotFoundError(`Tenant with Google Spreadsheet ID "${spreadsheetId}" was not found.`);
      }

      return this.mapRow(data);
    } catch (err: any) {
      if (err instanceof NotFoundError || err instanceof ValidationError) {
        throw err;
      }
      logger.error(this.CONTEXT, `Database error looking up tenant by spreadsheet "${spreadsheetId}"`, err);
      throw new DatabaseError(`Failed to find tenant by spreadsheet ID: ${err.message || err}`, err);
    }
  }
}
