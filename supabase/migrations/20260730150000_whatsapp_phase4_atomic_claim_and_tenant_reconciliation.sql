-- ============================================================================
-- VYAPARI NESTAM CRM - PHASE 4.1D ATOMIC CLAIM AND TENANT RECONCILIATION MIGRATION
-- Migration Version: 20260730150000
-- Target Access Architecture: Server-Only via Service-Role Client
-- ============================================================================

-- 1. Tenant Authority Reconciliation & Sync Trigger
-- Ensure tenant_metadata FK references tenants(id) to enforce single authoritative tenant identity
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tenant_metadata_tenants') THEN
        ALTER TABLE public.tenant_metadata 
        ADD CONSTRAINT fk_tenant_metadata_tenants 
        FOREIGN KEY (id) REFERENCES public.tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Automatic synchronization trigger keeping tenant_metadata and tenants in 1:1 parity
CREATE OR REPLACE FUNCTION public.sync_tenant_metadata_to_tenants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.tenants (
        id, name, spreadsheet_id, calendar_id, drive_folder_id, clinic_config, feature_flags, subscription_status, created_at, updated_at
    ) VALUES (
        NEW.id,
        NEW.name,
        COALESCE(NEW.spreadsheet_id, ''),
        COALESCE(NEW.calendar_id, ''),
        COALESCE(NEW.drive_folder_id, ''),
        COALESCE(NEW.clinic_config, '{}'::jsonb),
        COALESCE(NEW.feature_flags, '{}'::jsonb),
        COALESCE(NEW.subscription_status, 'active'),
        COALESCE(NEW.created_at, pg_catalog.now()),
        COALESCE(NEW.updated_at, pg_catalog.now())
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        spreadsheet_id = EXCLUDED.spreadsheet_id,
        calendar_id = EXCLUDED.calendar_id,
        drive_folder_id = EXCLUDED.drive_folder_id,
        clinic_config = EXCLUDED.clinic_config,
        feature_flags = EXCLUDED.feature_flags,
        subscription_status = EXCLUDED.subscription_status,
        updated_at = EXCLUDED.updated_at;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_tenant_metadata_to_tenants ON public.tenant_metadata;
CREATE TRIGGER trg_sync_tenant_metadata_to_tenants
    BEFORE INSERT OR UPDATE ON public.tenant_metadata
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_tenant_metadata_to_tenants();

-- 2. Tenant-Scoped Database Invariant Constraints
-- Prevent concurrent active handovers on the same conversation within a tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_handovers_tenant_conv 
ON public.whatsapp_handovers (tenant_id, conversation_id) 
WHERE status IN ('REQUIRED', 'UNASSIGNED', 'OPEN', 'PENDING', 'ASSIGNED', 'IN_PROGRESS');

-- Ensure composite tenant isolation foreign keys on dependent tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_assignments_tenant_conversation') THEN
        ALTER TABLE public.whatsapp_conversation_assignments
        ADD CONSTRAINT fk_assignments_tenant_conversation
        FOREIGN KEY (tenant_id, conversation_id)
        REFERENCES public.whatsapp_conversations(tenant_id, id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_handover_events_tenant_handover') THEN
        ALTER TABLE public.whatsapp_handover_events
        ADD CONSTRAINT fk_handover_events_tenant_handover
        FOREIGN KEY (tenant_id, handover_id)
        REFERENCES public.whatsapp_handovers(tenant_id, id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Atomic Handover Claim RPC with Strict Transactional Consistency
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
    v_updated_handover RECORD;
    v_new_version INT;
    v_assignment_id TEXT;
    v_event_id TEXT;
BEGIN
    -- Step A: Explicitly lock handover record for update to prevent race conditions
    SELECT * INTO v_handover
    FROM public.whatsapp_handovers
    WHERE tenant_id = p_tenant_id AND id = p_handover_id
    FOR UPDATE;

    IF v_handover IS NULL THEN
        RAISE EXCEPTION 'HANDOVER_NOT_FOUND: Handover % does not exist for tenant %', p_handover_id, p_tenant_id;
    END IF;

    -- Step B: Validate exact version match
    IF v_handover.version <> p_expected_version THEN
        RAISE EXCEPTION 'VERSION_CONFLICT: Expected version % but found %', p_expected_version, v_handover.version;
    END IF;

    -- Step C: Check if already assigned to a different user
    IF v_handover.assigned_user_id IS NOT NULL AND v_handover.assigned_user_id <> p_user_id THEN
        RAISE EXCEPTION 'ALREADY_ASSIGNED: Handover is already assigned to user %', v_handover.assigned_user_id;
    END IF;

    -- Step D: Validate explicitly claimable status
    IF v_handover.status NOT IN ('REQUIRED', 'UNASSIGNED', 'OPEN', 'PENDING', 'ASSIGNED') THEN
        RAISE EXCEPTION 'INVALID_STATUS: Handover status % cannot be claimed', v_handover.status;
    END IF;

    -- Step E: Defined idempotent response if already assigned to p_user_id and status is ASSIGNED
    IF v_handover.assigned_user_id = p_user_id AND v_handover.status = 'ASSIGNED' THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', true,
            'handover_id', p_handover_id,
            'tenant_id', p_tenant_id,
            'assigned_user_id', p_user_id,
            'new_version', v_handover.version,
            'status', 'ASSIGNED',
            'idempotent', true
        );
    END IF;

    v_new_version := v_handover.version + 1;

    -- Step F: Atomic conditional state transition with RETURNING verification
    UPDATE public.whatsapp_handovers
    SET status = 'ASSIGNED',
        assigned_user_id = p_user_id,
        version = v_new_version,
        updated_at = pg_catalog.now()
    WHERE tenant_id = p_tenant_id
      AND id = p_handover_id
      AND version = p_expected_version
      AND (assigned_user_id IS NULL OR assigned_user_id = p_user_id)
      AND status IN ('REQUIRED', 'UNASSIGNED', 'OPEN', 'PENDING')
    RETURNING * INTO v_updated_handover;

    -- Verify that exactly 1 row transition succeeded
    IF v_updated_handover IS NULL THEN
        RAISE EXCEPTION 'CONCURRENCY_CONFLICT: Handover state was modified concurrently.';
    END IF;

    -- Step G: Dependent writes executed ONLY AFTER handover transition succeeds
    UPDATE public.whatsapp_conversations
    SET automation_mode = 'human_takeover',
        assigned_user_id = p_user_id,
        updated_at = pg_catalog.now()
    WHERE tenant_id = p_tenant_id AND id = v_updated_handover.conversation_id;

    v_assignment_id := 'asgn_' || public.gen_random_uuid()::text;
    INSERT INTO public.whatsapp_conversation_assignments (
        id, tenant_id, conversation_id, assigner_user_id, assigned_user_id, action, created_at
    ) VALUES (
        v_assignment_id, p_tenant_id, v_updated_handover.conversation_id, p_user_id, p_user_id, 'CLAIM', pg_catalog.now()
    );

    v_event_id := 'hndevt_' || public.gen_random_uuid()::text;
    INSERT INTO public.whatsapp_handover_events (
        id, tenant_id, handover_id, conversation_id, actor_user_id, event_type, old_state, new_state, created_at
    ) VALUES (
        v_event_id, p_tenant_id, p_handover_id, v_updated_handover.conversation_id, p_user_id, 'CLAIMED',
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
        'status', 'ASSIGNED',
        'idempotent', false
    );
END;
$$;

-- Explicitly revoke public EXECUTE and grant service_role only
REVOKE EXECUTE ON FUNCTION public.claim_whatsapp_handover(TEXT, TEXT, TEXT, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_whatsapp_handover(TEXT, TEXT, TEXT, INT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_whatsapp_handover(TEXT, TEXT, TEXT, INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_handover(TEXT, TEXT, TEXT, INT) TO service_role;

NOTIFY pgrst, 'reload schema';
