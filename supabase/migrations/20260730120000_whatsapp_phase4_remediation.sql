-- Phase 4.1A Corrective Migration: WhatsApp Handover Events, Composite Tenant Constraints, Queue Hardening, and Atomic RPCs
-- Migration File: 20260730120000_whatsapp_phase4_remediation.sql

-- 1. Create missing whatsapp_handover_events table
CREATE TABLE IF NOT EXISTS whatsapp_handover_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    handover_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    actor_user_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'CREATED', 'CLAIMED', 'ASSIGNED', 'REASSIGNED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'NOTE_ADDED', 'RESOLVED', 'REOPENED'
    old_state JSONB DEFAULT '{}'::jsonb,
    new_state JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whatsapp_handover_events_tenant_idx ON whatsapp_handover_events (tenant_id);
CREATE INDEX IF NOT EXISTS whatsapp_handover_events_handover_idx ON whatsapp_handover_events (handover_id);
CREATE INDEX IF NOT EXISTS whatsapp_handover_events_conv_idx ON whatsapp_handover_events (conversation_id);

-- 2. Add Composite Unique Constraints to Parent Tables for Tenant-Safe Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_conversations_tenant_id_unique') THEN
        ALTER TABLE whatsapp_conversations ADD CONSTRAINT whatsapp_conversations_tenant_id_unique UNIQUE (tenant_id, id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_handovers_tenant_id_unique') THEN
        ALTER TABLE whatsapp_handovers ADD CONSTRAINT whatsapp_handovers_tenant_id_unique UNIQUE (tenant_id, id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_sla_policies_tenant_id_unique') THEN
        ALTER TABLE whatsapp_sla_policies ADD CONSTRAINT whatsapp_sla_policies_tenant_id_unique UNIQUE (tenant_id, id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_connections_tenant_id_unique') THEN
        ALTER TABLE whatsapp_connections ADD CONSTRAINT whatsapp_connections_tenant_id_unique UNIQUE (tenant_id, id);
    END IF;
END $$;

-- 3. Add Composite Foreign Keys enforcing strict cross-tenant isolation
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_whatsapp_handovers_tenant_conversation') THEN
        ALTER TABLE whatsapp_handovers
        ADD CONSTRAINT fk_whatsapp_handovers_tenant_conversation
        FOREIGN KEY (tenant_id, conversation_id)
        REFERENCES whatsapp_conversations(tenant_id, id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_whatsapp_handover_events_tenant_handover') THEN
        ALTER TABLE whatsapp_handover_events
        ADD CONSTRAINT fk_whatsapp_handover_events_tenant_handover
        FOREIGN KEY (tenant_id, handover_id)
        REFERENCES whatsapp_handovers(tenant_id, id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_whatsapp_assignments_tenant_conversation') THEN
        ALTER TABLE whatsapp_conversation_assignments
        ADD CONSTRAINT fk_whatsapp_assignments_tenant_conversation
        FOREIGN KEY (tenant_id, conversation_id)
        REFERENCES whatsapp_conversations(tenant_id, id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_whatsapp_notes_tenant_conversation') THEN
        ALTER TABLE whatsapp_internal_notes
        ADD CONSTRAINT fk_whatsapp_notes_tenant_conversation
        FOREIGN KEY (tenant_id, conversation_id)
        REFERENCES whatsapp_conversations(tenant_id, id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_whatsapp_sla_instances_tenant_conversation') THEN
        ALTER TABLE whatsapp_sla_instances
        ADD CONSTRAINT fk_whatsapp_sla_instances_tenant_conversation
        FOREIGN KEY (tenant_id, conversation_id)
        REFERENCES whatsapp_conversations(tenant_id, id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_whatsapp_status_hist_tenant_conversation') THEN
        ALTER TABLE whatsapp_conversation_status_history
        ADD CONSTRAINT fk_whatsapp_status_hist_tenant_conversation
        FOREIGN KEY (tenant_id, conversation_id)
        REFERENCES whatsapp_conversations(tenant_id, id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Harden Outbound Queue Schema (whatsapp_outbound_jobs)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_outbound_jobs' AND column_name='idempotency_key') THEN
        ALTER TABLE whatsapp_outbound_jobs ADD COLUMN idempotency_key TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_outbound_jobs' AND column_name='max_attempts') THEN
        ALTER TABLE whatsapp_outbound_jobs ADD COLUMN max_attempts INT NOT NULL DEFAULT 5;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_outbound_jobs' AND column_name='next_attempt_at') THEN
        ALTER TABLE whatsapp_outbound_jobs ADD COLUMN next_attempt_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_outbound_jobs' AND column_name='locked_at') THEN
        ALTER TABLE whatsapp_outbound_jobs ADD COLUMN locked_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_outbound_jobs' AND column_name='locked_until') THEN
        ALTER TABLE whatsapp_outbound_jobs ADD COLUMN locked_until TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_outbound_jobs' AND column_name='locked_by') THEN
        ALTER TABLE whatsapp_outbound_jobs ADD COLUMN locked_by TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_outbound_jobs' AND column_name='provider_message_id') THEN
        ALTER TABLE whatsapp_outbound_jobs ADD COLUMN provider_message_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_outbound_jobs' AND column_name='error_classification') THEN
        ALTER TABLE whatsapp_outbound_jobs ADD COLUMN error_classification TEXT;
    END IF;
END $$;

-- Idempotency constraint on whatsapp_outbound_jobs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_outbound_jobs_tenant_idempotency_unique') THEN
        ALTER TABLE whatsapp_outbound_jobs ADD CONSTRAINT whatsapp_outbound_jobs_tenant_idempotency_unique UNIQUE (tenant_id, idempotency_key);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS whatsapp_jobs_claim_idx ON whatsapp_outbound_jobs (status, next_attempt_at) WHERE status = 'pending';

-- 5. Additional Idempotency Constraints across Phase 4 Operations
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_sla_instances_tenant_conv_type_unique') THEN
        ALTER TABLE whatsapp_sla_instances ADD CONSTRAINT whatsapp_sla_instances_tenant_conv_type_unique UNIQUE (tenant_id, conversation_id, sla_type);
    END IF;
END $$;

-- 6. Enable RLS and explicit WITH CHECK policies on all Phase 4 tables
ALTER TABLE whatsapp_handover_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for whatsapp_handover_events" ON whatsapp_handover_events;
CREATE POLICY "Tenant isolation for whatsapp_handover_events" ON whatsapp_handover_events
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role')
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

-- Update existing Phase 4 policies to include explicit WITH CHECK
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_handovers" ON whatsapp_handovers;
CREATE POLICY "Tenant isolation for whatsapp_handovers" ON whatsapp_handovers
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role')
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation for whatsapp_conversation_assignments" ON whatsapp_conversation_assignments;
CREATE POLICY "Tenant isolation for whatsapp_conversation_assignments" ON whatsapp_conversation_assignments
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role')
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation for whatsapp_internal_notes" ON whatsapp_internal_notes;
CREATE POLICY "Tenant isolation for whatsapp_internal_notes" ON whatsapp_internal_notes
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role')
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation for whatsapp_staff_notifications" ON whatsapp_staff_notifications;
CREATE POLICY "Tenant isolation for whatsapp_staff_notifications" ON whatsapp_staff_notifications
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role')
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation for whatsapp_sla_policies" ON whatsapp_sla_policies;
CREATE POLICY "Tenant isolation for whatsapp_sla_policies" ON whatsapp_sla_policies
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role')
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation for whatsapp_sla_instances" ON whatsapp_sla_instances;
CREATE POLICY "Tenant isolation for whatsapp_sla_instances" ON whatsapp_sla_instances
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role')
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation for whatsapp_conversation_status_history" ON whatsapp_conversation_status_history;
CREATE POLICY "Tenant isolation for whatsapp_conversation_status_history" ON whatsapp_conversation_status_history
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role')
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

-- 7. Transactional Atomic Claim RPC for Handover & State Transition
CREATE OR REPLACE FUNCTION claim_whatsapp_handover(
    p_tenant_id TEXT,
    p_handover_id TEXT,
    p_user_id TEXT,
    p_expected_version INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_handover RECORD;
    v_new_version INT;
    v_assignment_id TEXT;
    v_event_id TEXT;
BEGIN
    -- Verify handover exists and belongs to the exact tenant with matching version
    SELECT * INTO v_handover
    FROM whatsapp_handovers
    WHERE tenant_id = p_tenant_id AND id = p_handover_id;

    IF v_handover IS NULL THEN
        RAISE EXCEPTION 'HANDOVER_NOT_FOUND: Handover % does not exist for tenant %', p_handover_id, p_tenant_id;
    END IF;

    IF v_handover.version <> p_expected_version THEN
        RAISE EXCEPTION 'VERSION_CONFLICT: Expected version % but found %', p_expected_version, v_handover.version;
    END IF;

    IF v_handover.assigned_user_id IS NOT NULL AND v_handover.assigned_user_id <> p_user_id THEN
        RAISE EXCEPTION 'ALREADY_ASSIGNED: Handover is already assigned to user %', v_handover.assigned_user_id;
    END IF;

    v_new_version := v_handover.version + 1;

    -- Update handover atomically
    UPDATE whatsapp_handovers
    SET status = 'ASSIGNED',
        assigned_user_id = p_user_id,
        version = v_new_version,
        updated_at = NOW()
    WHERE tenant_id = p_tenant_id AND id = p_handover_id AND version = p_expected_version;

    -- Update parent conversation automation mode
    UPDATE whatsapp_conversations
    SET automation_mode = 'human_takeover',
        assigned_user_id = p_user_id,
        updated_at = NOW()
    WHERE tenant_id = p_tenant_id AND id = v_handover.conversation_id;

    -- Record assignment record
    v_assignment_id := 'asgn_' || gen_random_uuid();
    INSERT INTO whatsapp_conversation_assignments (
        id, tenant_id, conversation_id, assigner_user_id, assigned_user_id, action, created_at
    ) VALUES (
        v_assignment_id, p_tenant_id, v_handover.conversation_id, p_user_id, p_user_id, 'CLAIM', NOW()
    );

    -- Record handover lifecycle event
    v_event_id := 'hndevt_' || gen_random_uuid();
    INSERT INTO whatsapp_handover_events (
        id, tenant_id, handover_id, conversation_id, actor_user_id, event_type, old_state, new_state, created_at
    ) VALUES (
        v_event_id, p_tenant_id, p_handover_id, v_handover.conversation_id, p_user_id, 'CLAIMED',
        jsonb_build_object('status', v_handover.status, 'assigned_user_id', v_handover.assigned_user_id, 'version', v_handover.version),
        jsonb_build_object('status', 'ASSIGNED', 'assigned_user_id', p_user_id, 'version', v_new_version),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'handover_id', p_handover_id,
        'tenant_id', p_tenant_id,
        'assigned_user_id', p_user_id,
        'new_version', v_new_version,
        'status', 'ASSIGNED'
    );
END;
$$;

NOTIFY pgrst, 'reload schema';
