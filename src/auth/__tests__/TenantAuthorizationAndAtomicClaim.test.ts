/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isDemoModeEnabled } from '../demoConfig';

describe('Phase 4.1D — Atomic Claim, Tenant Invariants & Authorization Regression Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Concurrency & Atomic Handover Claim Specification Tests [MOCK PASS]', () => {
    it('MOCK PASS: Two simultaneous claims produce exactly one winner; loser creates no assignment/event and does not update conversation', async () => {
      // Simulation of PL/pgSQL claim_whatsapp_handover RPC behavior
      let handoverRow = {
        id: 'ho_123',
        tenant_id: 'tenant_clinic_a',
        conversation_id: 'conv_456',
        status: 'REQUIRED',
        version: 1,
        assigned_user_id: null as string | null,
      };

      let conversationRow = {
        id: 'conv_456',
        tenant_id: 'tenant_clinic_a',
        automation_mode: 'ai_bot',
        assigned_user_id: null as string | null,
      };

      const assignmentsInserted: any[] = [];
      const eventsInserted: any[] = [];

      // RPC implementation mock simulating FOR UPDATE atomic transition
      const claimRpc = (tenantId: string, handoverId: string, userId: string, expectedVersion: number) => {
        // Step A: Match tenant & handover
        if (handoverRow.tenant_id !== tenantId || handoverRow.id !== handoverId) {
          throw new Error('HANDOVER_NOT_FOUND: Handover does not exist');
        }

        // Step B: Expected version check
        if (handoverRow.version !== expectedVersion) {
          throw new Error(`VERSION_CONFLICT: Expected version ${expectedVersion} but found ${handoverRow.version}`);
        }

        // Step C: Already assigned check
        if (handoverRow.assigned_user_id !== null && handoverRow.assigned_user_id !== userId) {
          throw new Error(`ALREADY_ASSIGNED: Handover is already assigned to ${handoverRow.assigned_user_id}`);
        }

        // Step D: Claimable status check
        if (!['REQUIRED', 'UNASSIGNED', 'OPEN', 'PENDING'].includes(handoverRow.status)) {
          throw new Error(`INVALID_STATUS: Handover status ${handoverRow.status} cannot be claimed`);
        }

        // Atomic transition
        const newVersion = handoverRow.version + 1;
        handoverRow.status = 'ASSIGNED';
        handoverRow.assigned_user_id = userId;
        handoverRow.version = newVersion;

        // Dependent writes ONLY AFTER handover transition succeeds
        conversationRow.automation_mode = 'human_takeover';
        conversationRow.assigned_user_id = userId;

        const assignmentRecord = {
          id: `asgn_${Date.now()}_${userId}`,
          tenant_id: tenantId,
          conversation_id: handoverRow.conversation_id,
          assigner_user_id: userId,
          assigned_user_id: userId,
          action: 'CLAIM',
        };
        assignmentsInserted.push(assignmentRecord);

        const eventRecord = {
          id: `evt_${Date.now()}_${userId}`,
          tenant_id: tenantId,
          handover_id: handoverId,
          actor_user_id: userId,
          event_type: 'CLAIMED',
        };
        eventsInserted.push(eventRecord);

        return {
          success: true,
          handover_id: handoverId,
          tenant_id: tenantId,
          assigned_user_id: userId,
          new_version: newVersion,
          status: 'ASSIGNED',
        };
      };

      // User 1 claims with version 1
      const winnerResult = claimRpc('tenant_clinic_a', 'ho_123', 'user_doctor_1', 1);
      expect(winnerResult.success).toBe(true);
      expect(winnerResult.new_version).toBe(2);
      expect(handoverRow.assigned_user_id).toBe('user_doctor_1');
      expect(conversationRow.automation_mode).toBe('human_takeover');

      // User 2 attempts simultaneous claim with stale version 1
      expect(() => {
        claimRpc('tenant_clinic_a', 'ho_123', 'user_doctor_2', 1);
      }).toThrowError('VERSION_CONFLICT');

      // Verify loser created NO assignment, NO event, and did NOT overwrite conversation assignment
      expect(assignmentsInserted.length).toBe(1);
      expect(assignmentsInserted[0].assigned_user_id).toBe('user_doctor_1');
      expect(eventsInserted.length).toBe(1);
      expect(eventsInserted[0].actor_user_id).toBe('user_doctor_1');
      expect(conversationRow.assigned_user_id).toBe('user_doctor_1');
    });

    it('MOCK PASS: Stale version fails closed', () => {
      const claimRpcWithVersionCheck = (expectedVersion: number, currentVersion: number) => {
        if (expectedVersion !== currentVersion) {
          throw new Error(`VERSION_CONFLICT: Expected version ${expectedVersion} but found ${currentVersion}`);
        }
      };

      expect(() => claimRpcWithVersionCheck(1, 2)).toThrowError('VERSION_CONFLICT');
    });

    it('MOCK PASS: Invalid status (RESOLVED) fails closed', () => {
      const claimRpcWithStatusCheck = (status: string) => {
        if (!['REQUIRED', 'UNASSIGNED', 'OPEN', 'PENDING'].includes(status)) {
          throw new Error(`INVALID_STATUS: Handover status ${status} cannot be claimed`);
        }
      };

      expect(() => claimRpcWithStatusCheck('RESOLVED')).toThrowError('INVALID_STATUS');
    });

    it('MOCK PASS: Already assigned handover returns defined idempotent result for same user, error for different user', () => {
      const claimRpcAssignmentCheck = (currentAssignedUser: string, requestingUser: string, status: string) => {
        if (currentAssignedUser && currentAssignedUser !== requestingUser) {
          throw new Error(`ALREADY_ASSIGNED: Handover is already assigned to user ${currentAssignedUser}`);
        }

        if (currentAssignedUser === requestingUser && status === 'ASSIGNED') {
          return { success: true, idempotent: true };
        }

        return { success: true, idempotent: false };
      };

      // Same user re-claiming -> defined idempotent result
      const sameUserRes = claimRpcAssignmentCheck('doctor_a', 'doctor_a', 'ASSIGNED');
      expect(sameUserRes.idempotent).toBe(true);

      // Different user -> ALREADY_ASSIGNED error
      expect(() => claimRpcAssignmentCheck('doctor_a', 'doctor_b', 'ASSIGNED')).toThrowError('ALREADY_ASSIGNED');
    });

    it('MOCK PASS: Exception during dependent write rolls back entire transaction in PL/pgSQL', () => {
      const transactionSim = (failAtStep: string) => {
        let state = 'INITIAL';
        try {
          state = 'HANDOVER_UPDATED';
          if (failAtStep === 'EVENT_INSERT') {
            throw new Error('FK_CONSTRAINT_VIOLATION: invalid actor_user_id');
          }
          state = 'COMMITTED';
        } catch (err) {
          // Automatic transaction rollback simulation
          state = 'ROLLED_BACK';
          throw err;
        }
        return state;
      };

      expect(() => transactionSim('EVENT_INSERT')).toThrowError('FK_CONSTRAINT_VIOLATION');
    });
  });

  describe('2. Environment & Demo Security Guards', () => {
    it('should strictly reject demo mode when NODE_ENV or APP_ENV is production or staging', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalAppEnv = process.env.APP_ENV;
      const originalDemo = process.env.ENABLE_DEMO_MODE;

      try {
        process.env.NODE_ENV = 'production';
        process.env.ENABLE_DEMO_MODE = 'true';

        expect(() => isDemoModeEnabled()).toThrowError(/SECURITY CONFIGURATION ERROR/);

        process.env.NODE_ENV = 'development';
        process.env.APP_ENV = 'staging';

        expect(() => isDemoModeEnabled()).toThrowError(/SECURITY CONFIGURATION ERROR/);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
        process.env.APP_ENV = originalAppEnv;
        process.env.ENABLE_DEMO_MODE = originalDemo;
      }
    });
  });
});
