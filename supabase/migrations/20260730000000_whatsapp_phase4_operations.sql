-- Phase 4 Migration: WhatsApp Operations, Handover Lifecycle, Staff Notifications, SLAs, and Internal Notes
-- Migration File: 20260730000000_whatsapp_phase4_operations.sql

-- 1. Extend whatsapp_handovers table if needed or create with full Phase 4 schema
DO $$
BEGIN
    -- Add columns if table existed from Phase 3
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_handovers') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_handovers' AND column_name='priority') THEN
            ALTER TABLE whatsapp_handovers ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_handovers' AND column_name='branch_id') THEN
            ALTER TABLE whatsapp_handovers ADD COLUMN branch_id TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_handovers' AND column_name='version') THEN
            ALTER TABLE whatsapp_handovers ADD COLUMN version INT NOT NULL DEFAULT 1;
        END IF;
    ELSE
        CREATE TABLE whatsapp_handovers (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            conversation_id TEXT NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
            reason_code TEXT NOT NULL,
            sanitized_context JSONB DEFAULT '{}'::jsonb,
            status TEXT NOT NULL DEFAULT 'REQUIRED', -- 'REQUIRED', 'UNASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_STAFF', 'RESOLVED', 'REOPENED'
            priority TEXT NOT NULL DEFAULT 'medium',
            branch_id TEXT,
            assigned_user_id TEXT,
            version INT NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS whatsapp_handovers_tenant_idx ON whatsapp_handovers (tenant_id);
CREATE INDEX IF NOT EXISTS whatsapp_handovers_conv_idx ON whatsapp_handovers (conversation_id);
CREATE INDEX IF NOT EXISTS whatsapp_handovers_status_idx ON whatsapp_handovers (status);

-- 2. WhatsApp Conversation Assignments History Table
CREATE TABLE IF NOT EXISTS whatsapp_conversation_assignments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    assigner_user_id TEXT NOT NULL,
    assigned_user_id TEXT,
    branch_id TEXT,
    action TEXT NOT NULL, -- 'CLAIM', 'ASSIGN', 'REASSIGN', 'UNASSIGN', 'RELEASE'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whatsapp_assignments_tenant_idx ON whatsapp_conversation_assignments (tenant_id);
CREATE INDEX IF NOT EXISTS whatsapp_assignments_conv_idx ON whatsapp_conversation_assignments (conversation_id);

-- 3. WhatsApp Internal Notes Table
CREATE TABLE IF NOT EXISTS whatsapp_internal_notes (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    author_user_id TEXT NOT NULL,
    author_name TEXT,
    note_body TEXT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS whatsapp_notes_tenant_idx ON whatsapp_internal_notes (tenant_id);
CREATE INDEX IF NOT EXISTS whatsapp_notes_conv_idx ON whatsapp_internal_notes (conversation_id);

-- 4. WhatsApp Staff In-App Notifications Table
CREATE TABLE IF NOT EXISTS whatsapp_staff_notifications (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    recipient_user_id TEXT,
    recipient_role TEXT,
    notification_type TEXT NOT NULL, -- 'HANDOVER_REQUIRED', 'ASSIGNED', 'REASSIGNED', 'SLA_WARNING', 'SLA_BREACHED', 'CUSTOMER_REPLIED', 'REOPENED'
    conversation_id TEXT REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    deduplication_key TEXT UNIQUE NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whatsapp_notif_tenant_user_idx ON whatsapp_staff_notifications (tenant_id, recipient_user_id);
CREATE INDEX IF NOT EXISTS whatsapp_notif_dedup_idx ON whatsapp_staff_notifications (deduplication_key);

-- 5. WhatsApp SLA Policies Table
CREATE TABLE IF NOT EXISTS whatsapp_sla_policies (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    first_response_target_mins INT NOT NULL DEFAULT 15,
    follow_up_target_mins INT NOT NULL DEFAULT 60,
    acknowledgement_target_mins INT NOT NULL DEFAULT 10,
    resolution_target_mins INT NOT NULL DEFAULT 240,
    business_hours JSONB DEFAULT '{"enabled": false}'::jsonb,
    warning_threshold_pct INT NOT NULL DEFAULT 80,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT whatsapp_sla_policies_tenant_unique UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS whatsapp_sla_pol_tenant_idx ON whatsapp_sla_policies (tenant_id);

-- 6. WhatsApp SLA Instances Table
CREATE TABLE IF NOT EXISTS whatsapp_sla_instances (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    sla_type TEXT NOT NULL, -- 'first_response', 'follow_up', 'acknowledgement', 'resolution'
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'NOT_STARTED', 'ACTIVE', 'WARNING', 'BREACHED', 'PAUSED', 'COMPLETED'
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_time TIMESTAMPTZ NOT NULL,
    warning_time TIMESTAMPTZ NOT NULL,
    acknowledged_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whatsapp_sla_inst_tenant_idx ON whatsapp_sla_instances (tenant_id);
CREATE INDEX IF NOT EXISTS whatsapp_sla_inst_conv_idx ON whatsapp_sla_instances (conversation_id);

-- 7. WhatsApp Conversation Status History Table
CREATE TABLE IF NOT EXISTS whatsapp_conversation_status_history (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    actor_user_id TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT,
    old_handover_status TEXT,
    new_handover_status TEXT,
    old_automation_mode TEXT,
    new_automation_mode TEXT,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whatsapp_status_hist_tenant_idx ON whatsapp_conversation_status_history (tenant_id);
CREATE INDEX IF NOT EXISTS whatsapp_status_hist_conv_idx ON whatsapp_conversation_status_history (conversation_id);

-- Enable RLS
ALTER TABLE whatsapp_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversation_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_staff_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sla_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversation_status_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_handovers" ON whatsapp_handovers;
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_conversation_assignments" ON whatsapp_conversation_assignments;
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_internal_notes" ON whatsapp_internal_notes;
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_staff_notifications" ON whatsapp_staff_notifications;
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_sla_policies" ON whatsapp_sla_policies;
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_sla_instances" ON whatsapp_sla_instances;
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_conversation_status_history" ON whatsapp_conversation_status_history;

-- Create Tenant Isolation Policies
CREATE POLICY "Tenant isolation for whatsapp_handovers" ON whatsapp_handovers
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation for whatsapp_conversation_assignments" ON whatsapp_conversation_assignments
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation for whatsapp_internal_notes" ON whatsapp_internal_notes
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation for whatsapp_staff_notifications" ON whatsapp_staff_notifications
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation for whatsapp_sla_policies" ON whatsapp_sla_policies
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation for whatsapp_sla_instances" ON whatsapp_sla_instances
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation for whatsapp_conversation_status_history" ON whatsapp_conversation_status_history
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

NOTIFY pgrst, 'reload schema';
