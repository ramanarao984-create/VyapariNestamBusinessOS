-- ============================================================================
-- VYAPARI NESTAM CRM - PHASE 4.1C AUTHORIZATION BOUNDARY HARDENING MIGRATION
-- Migration Version: 20260730140000
-- Target Access Architecture: Server-Only via Service-Role Client
-- ============================================================================

-- 1. Ensure Metadata Tables Exist
CREATE TABLE IF NOT EXISTS tenant_metadata (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    spreadsheet_id TEXT,
    calendar_id TEXT,
    drive_folder_id TEXT,
    clinic_config JSONB DEFAULT '{}'::jsonb,
    feature_flags JSONB DEFAULT '{}'::jsonb,
    subscription_status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_metadata (
    id TEXT PRIMARY KEY,
    firebase_uid TEXT UNIQUE NOT NULL,
    tenant_id TEXT NOT NULL REFERENCES tenant_metadata(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Doctor',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    user_id TEXT,
    event_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_resumption_tokens (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on Metadata and Utility Tables
ALTER TABLE tenant_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_resumption_tokens ENABLE ROW LEVEL SECURITY;

-- 2. Privileged RPC Correction: claim_whatsapp_handover
-- SET search_path = '' and fully qualify all references
CREATE OR REPLACE FUNCTION public.claim_whatsapp_handover(
    p_tenant_id TEXT,
    p_handover_id TEXT,
    p_user_id TEXT,
    p_expected_version INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_handover RECORD;
    v_new_version INT;
    v_assignment_id TEXT;
    v_event_id TEXT;
BEGIN
    -- Verify handover exists and belongs to the exact tenant with matching version
    SELECT * INTO v_handover
    FROM public.whatsapp_handovers
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
    UPDATE public.whatsapp_handovers
    SET status = 'ASSIGNED',
        assigned_user_id = p_user_id,
        version = v_new_version,
        updated_at = pg_catalog.now()
    WHERE tenant_id = p_tenant_id AND id = p_handover_id AND version = p_expected_version;

    -- Update parent conversation automation mode
    UPDATE public.whatsapp_conversations
    SET automation_mode = 'human_takeover',
        assigned_user_id = p_user_id,
        updated_at = pg_catalog.now()
    WHERE tenant_id = p_tenant_id AND id = v_handover.conversation_id;

    -- Record assignment record
    v_assignment_id := 'asgn_' || public.gen_random_uuid()::text;
    INSERT INTO public.whatsapp_conversation_assignments (
        id, tenant_id, conversation_id, assigner_user_id, assigned_user_id, action, created_at
    ) VALUES (
        v_assignment_id, p_tenant_id, v_handover.conversation_id, p_user_id, p_user_id, 'CLAIM', pg_catalog.now()
    );

    -- Record handover lifecycle event
    v_event_id := 'hndevt_' || public.gen_random_uuid()::text;
    INSERT INTO public.whatsapp_handover_events (
        id, tenant_id, handover_id, conversation_id, actor_user_id, event_type, old_state, new_state, created_at
    ) VALUES (
        v_event_id, p_tenant_id, p_handover_id, v_handover.conversation_id, p_user_id, 'CLAIMED',
        pg_catalog.jsonb_build_object('status', v_handover.status, 'assigned_user_id', v_handover.assigned_user_id, 'version', v_handover.version),
        pg_catalog.jsonb_build_object('status', 'ASSIGNED', 'assigned_user_id', p_user_id, 'version', v_new_version),
        pg_catalog.now()
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'handover_id', p_handover_id,
        'tenant_id', p_tenant_id,
        'assigned_user_id', p_user_id,
        'new_version', v_new_version,
        'status', 'ASSIGNED'
    );
END;
$$;

-- Explicitly revoke EXECUTE from PUBLIC, anon, and authenticated
REVOKE EXECUTE ON FUNCTION public.claim_whatsapp_handover(TEXT, TEXT, TEXT, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_whatsapp_handover(TEXT, TEXT, TEXT, INT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_whatsapp_handover(TEXT, TEXT, TEXT, INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_handover(TEXT, TEXT, TEXT, INT) TO service_role;

-- 3. Database Idempotency & Tenant-Scoped Uniqueness Constraints
CREATE UNIQUE INDEX IF NOT EXISTS uq_messages_tenant_wam_id ON public.whatsapp_messages (tenant_id, wam_id) WHERE wam_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_messages_tenant_meta_message_id ON public.whatsapp_messages (tenant_id, meta_message_id) WHERE meta_message_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_idempotency_logs_tenant_key ON public.whatsapp_idempotency_logs (tenant_id, idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS uq_status_events_tenant_event ON public.whatsapp_message_status_events (tenant_id, event_id) WHERE event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_tenant_dedup ON public.whatsapp_staff_notifications (tenant_id, deduplication_key);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sla_instances_tenant_conv_type ON public.whatsapp_sla_instances (tenant_id, conversation_id, sla_type);
CREATE UNIQUE INDEX IF NOT EXISTS uq_resumption_tokens_tenant_hash ON public.whatsapp_resumption_tokens (tenant_id, token_hash);

-- 4. Revoke All Browser/Public Grants & Restrict Schema Permissions To Service Role
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 5. Default Privileges Hardening (Prevent Future Unintended Public Grants)
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

NOTIFY pgrst, 'reload schema';
