-- Phase 4.1B Additive Migration: RLS & RPC Security Hardening
-- Migration File: 20260730130000_whatsapp_phase4_rls_rpc_hardening.sql

-- 1. Explicit RLS Policies for Authenticated Users with Tenant Session Setting (removing deprecated auth.role() = 'service_role' checks)
-- Note: Supabase service_role automatically bypasses RLS. Policies specify TO authenticated for application context.

-- Table: whatsapp_handovers
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_handovers" ON whatsapp_handovers;
CREATE POLICY "Tenant isolation for whatsapp_handovers" ON whatsapp_handovers
    FOR ALL
    TO authenticated
    USING (tenant_id = current_setting('app.current_tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

-- Table: whatsapp_conversation_assignments
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_conversation_assignments" ON whatsapp_conversation_assignments;
CREATE POLICY "Tenant isolation for whatsapp_conversation_assignments" ON whatsapp_conversation_assignments
    FOR ALL
    TO authenticated
    USING (tenant_id = current_setting('app.current_tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

-- Table: whatsapp_handover_events
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_handover_events" ON whatsapp_handover_events;
CREATE POLICY "Tenant isolation for whatsapp_handover_events" ON whatsapp_handover_events
    FOR ALL
    TO authenticated
    USING (tenant_id = current_setting('app.current_tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

-- Table: whatsapp_internal_notes
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_internal_notes" ON whatsapp_internal_notes;
CREATE POLICY "Tenant isolation for whatsapp_internal_notes" ON whatsapp_internal_notes
    FOR ALL
    TO authenticated
    USING (tenant_id = current_setting('app.current_tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

-- Table: whatsapp_staff_notifications
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_staff_notifications" ON whatsapp_staff_notifications;
CREATE POLICY "Tenant isolation for whatsapp_staff_notifications" ON whatsapp_staff_notifications
    FOR ALL
    TO authenticated
    USING (tenant_id = current_setting('app.current_tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

-- Table: whatsapp_sla_policies
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_sla_policies" ON whatsapp_sla_policies;
CREATE POLICY "Tenant isolation for whatsapp_sla_policies" ON whatsapp_sla_policies
    FOR ALL
    TO authenticated
    USING (tenant_id = current_setting('app.current_tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

-- Table: whatsapp_sla_instances
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_sla_instances" ON whatsapp_sla_instances;
CREATE POLICY "Tenant isolation for whatsapp_sla_instances" ON whatsapp_sla_instances
    FOR ALL
    TO authenticated
    USING (tenant_id = current_setting('app.current_tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

-- Table: whatsapp_conversation_status_history
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_conversation_status_history" ON whatsapp_conversation_status_history;
CREATE POLICY "Tenant isolation for whatsapp_conversation_status_history" ON whatsapp_conversation_status_history
    FOR ALL
    TO authenticated
    USING (tenant_id = current_setting('app.current_tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));


-- 2. RPC Hardening: Fixed search_path and EXECUTE revocation
CREATE OR REPLACE FUNCTION claim_whatsapp_handover(
    p_tenant_id TEXT,
    p_handover_id TEXT,
    p_user_id TEXT,
    p_expected_version INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- Revoke public execution on SECURITY DEFINER RPC
REVOKE EXECUTE ON FUNCTION claim_whatsapp_handover(TEXT, TEXT, TEXT, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION claim_whatsapp_handover(TEXT, TEXT, TEXT, INT) FROM anon;
GRANT EXECUTE ON FUNCTION claim_whatsapp_handover(TEXT, TEXT, TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION claim_whatsapp_handover(TEXT, TEXT, TEXT, INT) TO authenticated;

NOTIFY pgrst, 'reload schema';
