/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DurableAutomationEngine } from '../services/automation/DurableAutomationEngine';

// Mock Supabase & OutboundService
vi.mock('../supabase/client', () => ({
  isSupabaseConfigured: () => false,
  getSupabaseClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
      upsert: () => Promise.resolve({ error: null })
    })
  })
}));

describe('DurableAutomationEngine Unit Tests', () => {
  const tenantId = 'tenant_test_123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return default settings when Supabase is unconfigured', async () => {
    const settings = await DurableAutomationEngine.getSettings(tenantId);
    expect(settings).toBeDefined();
    expect(settings.globalKillSwitch).toBe(false);
    expect(settings.quietHoursEnabled).toBe(true);
    expect(settings.quietHoursStart).toBe('21:00');
    expect(settings.quietHoursEnd).toBe('08:00');
  });

  it('should update settings in memory fallback', async () => {
    const updated = await DurableAutomationEngine.updateSettings(tenantId, {
      globalKillSwitch: true,
      quietHoursStart: '22:00'
    });
    expect(updated.globalKillSwitch).toBe(true);
    expect(updated.quietHoursStart).toBe('22:00');
  });

  it('should evaluate activation readiness correctly', async () => {
    const readiness = await DurableAutomationEngine.validateActivationReadiness(tenantId, {
      id: 'wf_test',
      name: 'Test Workflow',
      description: 'Test Workflow Description',
      category: 'appointment',

      triggerType: 'appointment_created',
      status: 'draft',
      version: 1,
      config: {
        actions: [{ type: 'send_whatsapp_reminder', templateName: 'apt_confirm' }]
      },
      stats: { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0 },
      isTemplate: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    expect(readiness).toBeDefined();
    expect(Array.isArray(readiness.errors)).toBe(true);
    expect(Array.isArray(readiness.warnings)).toBe(true);
  });

  it('should trigger events gracefully without crashing when no active workflows exist', async () => {
    const result = await DurableAutomationEngine.triggerEvent(tenantId, {
      triggerType: 'appointment_created',
      contact: { name: 'Test Patient', phone: '+919876543210' },
      appointment: { id: 'apt_99', date: '2026-08-10', time: '10:00 AM' }
    });

    expect(result.success).toBe(true);
    expect(result.executedCount).toBe(0);
    expect(result.scheduledCount).toBe(0);
  });

  it('should return 0 processed actions when no scheduled actions exist', async () => {
    const cronStats = await DurableAutomationEngine.processDueActions('worker_test_1', 10);
    expect(cronStats).toBeDefined();
    expect(cronStats.processed).toBe(0);
    expect(cronStats.succeeded).toBe(0);
    expect(cronStats.failed).toBe(0);
  });
});
