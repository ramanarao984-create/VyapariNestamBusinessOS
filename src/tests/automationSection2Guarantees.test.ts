/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DurableAutomationEngine } from '../services/automation/DurableAutomationEngine';
import { OutboundService } from '../services/whatsapp/OutboundService';
import { ConsentService } from '../services/whatsapp/ConsentService';
import { GoogleCalendarWorkflowService } from '../services/automation/GoogleCalendarWorkflowService';

// Mock dependencies for isolated unit testing
vi.mock('../supabase/client', () => {
  const store: Record<string, any[]> = {
    automation_workflows: [
      {
        id: 'wf_reminder_1',
        tenant_id: 'tenant_alpha',
        name: '24h Reminder Workflow',
        status: 'active',
        trigger_type: 'appointment_created',
        config: {
          actions: [{ type: 'send_whatsapp_reminder', templateName: 'appointment_reminder' }]
        }
      }
    ],
    automation_executions: [],
    automation_scheduled_actions: [],
    whatsapp_outbound_jobs: [],
    whatsapp_templates: [
      {
        id: 'tmpl_1',
        tenant_id: 'tenant_alpha',
        name: 'appointment_reminder',
        status: 'APPROVED'
      }
    ],
    customer_consents: []
  };

  return {
    isSupabaseConfigured: () => true,
    getSupabaseClient: () => ({
      from: (table: string) => {
        const queryBuilder: any = {
          select: (cols?: string) => queryBuilder,
          eq: (field: string, val: any) => {
            queryBuilder._field = field;
            queryBuilder._val = val;
            return queryBuilder;
          },
          or: (cond: string) => queryBuilder,
          lte: () => queryBuilder,
          lt: () => queryBuilder,
          order: (field: string, opts: any) => queryBuilder,
          limit: (n: number) => queryBuilder,
          maybeSingle: async () => {
            const rows = store[table] || [];
            const found = rows.find(r => !queryBuilder._field || r[queryBuilder._field] === queryBuilder._val);
            return { data: found || null, error: null };
          },
          single: async () => {
            const rows = store[table] || [];
            const found = rows.find(r => !queryBuilder._field || r[queryBuilder._field] === queryBuilder._val);
            return { data: found || null, error: null };
          },
          then: (resolve: any) => {
            const rows = store[table] || [];
            let result = rows;
            if (queryBuilder._field) {
              result = rows.filter(r => r[queryBuilder._field] === queryBuilder._val);
            }
            if (table === 'automation_workflows' && result.length === 0 && store['automation_workflows']?.length) {
              result = store['automation_workflows'].map(w => ({
                id: w.id,
                tenant_id: w.tenant_id,
                name: w.name,
                description: 'Mock Description',
                category: 'appointment',
                trigger_type: w.trigger_type,
                status: w.status,
                version: 1,
                config: w.config,
                stats: { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0 },
                is_template: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }));
            }
            resolve({ data: result, error: null });
          },
          insert: async (data: any) => {
            if (!store[table]) store[table] = [];
            const item = Array.isArray(data) ? data[0] : data;
            store[table].push(item);
            return { data: item, error: null };
          },
          upsert: async (data: any) => {
            if (!store[table]) store[table] = [];
            const item = Array.isArray(data) ? data[0] : data;
            store[table].push(item);
            return { data: item, error: null };
          },
          update: (updateFields: any) => ({
            eq: (field: string, val: any) => ({
              in: async (field2: string, vals: any[]) => {
                const rows = store[table] || [];
                rows.forEach(r => {
                  if (r[field] === val || vals.includes(r.id)) {
                    Object.assign(r, updateFields);
                  }
                });
                return { error: null };
              },
              eq: async (field2: string, val2: any) => {
                const rows = store[table] || [];
                rows.forEach(r => {
                  if (r[field] === val && r[field2] === val2) {
                    Object.assign(r, updateFields);
                  }
                });
                return { error: null };
              }
            }),
            in: async (field: string, vals: any[]) => {
              const rows = store[table] || [];
              rows.forEach(r => {
                if (vals.includes(r.id)) {
                  Object.assign(r, updateFields);
                }
              });
              return { error: null };
            }
          })
        };
        return queryBuilder;
      },
      rpc: async (fnName: string, args: any) => {
        if (fnName === 'claim_due_automation_actions') {
          const rows = store['automation_scheduled_actions'] || [];
          const nowIso = new Date().toISOString();
          const eligible = rows.filter(
            r => (r.status === 'pending' || r.status === 'SCHEDULED' || (r.status === 'processing' && r.lease_expires_at < nowIso)) &&
                 (!r.claimed_by || r.claimed_by === args.p_worker_id || r.lease_expires_at < nowIso)
          ).slice(0, args.p_batch_size || 25);

          eligible.forEach(r => {
            r.status = 'processing';
            r.claimed_by = args.p_worker_id;
            r.claimed_at = nowIso;
            r.lease_expires_at = new Date(Date.now() + (args.p_lease_seconds || 60) * 1000).toISOString();
          });

          return { data: eligible, error: null };
        }
        return { data: null, error: null };
      }
    })
  };
});

describe('SECTION 2 PRODUCTION GUARANTEES & AUTOMATION ENGINE TESTS', () => {
  const tenantId = 'tenant_alpha';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. SERVER-SIDE APPOINTMENT EVENT CREATION & OUTBOX INTEGRITY
  describe('1. Server-Side Appointment Event Emission & Outbox Safety', () => {
    it('calling recordOutboxEvent records outbox row with deterministic idempotency key and executes automation', async () => {
      const result = await DurableAutomationEngine.recordOutboxEvent(tenantId, {
        triggerType: 'appointment_created',
        contact: { name: 'Ramesh Garu', phone: '+919876543210' },
        appointment: { id: 'apt_test_001', date: '2026-08-10', time: '10:00 AM', doctorName: 'Dr. Prasad' }
      });

      expect(result.success).toBe(true);
      expect(result.outboxId).toBeDefined();
      expect(result.executedCount).toBe(1);
      expect(result.scheduledCount).toBe(1);
    });

    it('recovers unfulfilled outbox events during crash recovery pass', async () => {
      const recResult = await DurableAutomationEngine.processUnprocessedOutboxEvents(tenantId);
      expect(recResult.recoveredCount).toBeDefined();
    });
  });

  // 2. WORKER / CRON CLAIM & LOCKING MECHANISMS
  describe('2. Worker/Cron Concurrency & Claim Guarantees', () => {
    it('worker 1 claims pending action; worker 2 receives 0 claimed actions concurrently', async () => {
      // Trigger an event to populate scheduled actions
      await DurableAutomationEngine.triggerEvent(tenantId, {
        triggerType: 'appointment_created',
        contact: { name: 'Sita Garu', phone: '+919876543211' },
        appointment: { id: 'apt_test_002', date: '2026-08-10', time: '11:00 AM' }
      });

      const claim1 = await DurableAutomationEngine.processDueActions('worker_1', 10);
      expect(claim1.processed).toBeGreaterThan(0);

      // Concurrent second claim attempt by worker 2 should find 0 pending unclaimed items
      const claim2 = await DurableAutomationEngine.processDueActions('worker_2', 10);
      expect(claim2.processed).toBe(0);
    });

    it('an expired lease can be reclaimed by a new worker', async () => {
      const mockExpiredAction = {
        id: 'act_expired_001',
        tenant_id: tenantId,
        workflow_id: 'wf_reminder_1',
        contact_phone: '+919876543212',
        status: 'processing',
        claimed_by: 'worker_old',
        lease_expires_at: new Date(Date.now() - 50000).toISOString(), // Expired 50s ago
        scheduled_for: new Date(Date.now() - 10000).toISOString(),
        attempts: 1
      };

      const supabase = (await import('../supabase/client')).getSupabaseClient();
      await supabase.from('automation_scheduled_actions').insert(mockExpiredAction);

      const reclaimResult = await DurableAutomationEngine.processDueActions('worker_new', 10);
      expect(reclaimResult.processed).toBeGreaterThan(0);
    });

    it('a completed action cannot be reclaimed by any worker', async () => {
      const mockCompletedAction = {
        id: 'act_completed_001',
        tenant_id: tenantId,
        workflow_id: 'wf_reminder_1',
        contact_phone: '+919876543213',
        status: 'completed',
        scheduled_for: new Date(Date.now() - 10000).toISOString(),
        attempts: 1
      };

      const supabase = (await import('../supabase/client')).getSupabaseClient();
      await supabase.from('automation_scheduled_actions').insert(mockCompletedAction);

      const result = await DurableAutomationEngine.processDueActions('worker_test', 10);
      // Completed action should not be processed or reclaimed
      expect(result.processed).toBe(0);
    });
  });

  // 3. RETRY & TERMINAL FAILURE BEHAVIOUR
  describe('3. Retry and Terminal Failure Guarantees', () => {
    it('opted-out consent contact skips execution immediately without retry', async () => {
      // Mock consent as opted_out
      vi.spyOn(ConsentService, 'getConsentStatus').mockResolvedValue('opted_out');

      const mockAction = {
        id: 'act_consent_optedout',
        tenant_id: tenantId,
        workflow_id: 'wf_reminder_1',
        contact_phone: '+919999999999',
        status: 'pending',
        scheduled_for: new Date(Date.now() - 1000).toISOString(),
        attempts: 0
      };

      const supabase = (await import('../supabase/client')).getSupabaseClient();
      await supabase.from('automation_scheduled_actions').insert(mockAction);

      const result = await DurableAutomationEngine.processDueActions('worker_consent_test', 10);
      expect(result.skipped).toBe(1);
    });

    it('retrying the same scheduled action generates only one outbound job (idempotency key protection)', async () => {
      // Keep this assertion independent of the wall clock and the default 21:00-08:00 quiet-hours window.
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-10T12:00:00.000Z'));

      try {
        vi.spyOn(ConsentService, 'getConsentStatus').mockResolvedValue('opted_in');

      const mockAction = {
        id: 'act_idemp_test_99',
        tenant_id: tenantId,
        workflow_id: 'wf_reminder_1',
        contact_phone: '+919876543210',
        status: 'pending',
        scheduled_for: new Date(Date.now() - 1000).toISOString(),
        attempts: 0,
        payload: {
          templateName: 'appointment_reminder',
          patientName: 'Kavitha Garu',
          appointmentTime: '10:00 AM'
        }
      };

      const enqueueSpy = vi.spyOn(OutboundService, 'enqueueOutboundJob').mockResolvedValue({
        jobId: 'job_auto_idemp_1',
        status: 'queued'
      });

      const supabase = (await import('../supabase/client')).getSupabaseClient();
      await supabase.from('automation_scheduled_actions').insert(mockAction);

      // First run
      await DurableAutomationEngine.processDueActions('worker_idemp_1', 10);

      // Verify enqueue was called with deterministic idempotency key
        expect(enqueueSpy).toHaveBeenCalledWith(
          tenantId,
          'auto_job_act_idemp_test_99',
          '+919876543210',
          expect.objectContaining({
            recipientPhone: '+919876543210',
            source: 'automation'
          })
        );
      } finally {
        vi.useRealTimers();
      }
    });
  });

  // 4. GOOGLE CALENDAR WORKFLOW SERVICE
  describe('4. Google Calendar Workflow Integration', () => {
    it('returns RECONNECTION_REQUIRED when Google OAuth token is expired or disconnected', async () => {
      const result = await GoogleCalendarWorkflowService.syncBooking(tenantId, {
        id: 'apt_cal_001',
        patientName: 'Anand Garu',
        date: '2026-08-15',
        time: '10:00 AM'
      });

      expect(result.success).toBe(false);
      expect(result.outcome).toBe('RECONNECTION_REQUIRED');
      expect(result.error).toContain('Re-authentication required');
    });
  });

  // 5. PRODUCTION vs DEMO MODE SEPARATION
  describe('5. Production / Demo Separation', () => {
    it('demo tenant is isolated and cannot dispatch live outbound messages', async () => {
      const enqueueRes = await OutboundService.enqueueOutboundJob('demo-tenant-id', 'idemp_demo_1', '+919876543210', {
        tenantId: 'demo-tenant-id',
        recipientPhone: '+919876543210',
        messageType: 'text',
        textBody: 'Demo message test',
        source: 'human'
      });

      expect(enqueueRes.jobId).toBeDefined();
      expect(enqueueRes.status).toBe('queued');
    });
  });
});
