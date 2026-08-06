-- SQL Schema for Vyapari Nestam CRM (Enterprise Production & SaaS Foundation)
-- This schema stores ONLY SaaS metadata. Business data remains inside clinic-owned Google Sheets.

-- 1. Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY, -- Unique immutable tenantId (e.g. 'tenant_clinic_name')
    name TEXT NOT NULL,
    spreadsheet_id TEXT NOT NULL,
    calendar_id TEXT NOT NULL,
    drive_folder_id TEXT NOT NULL,
    clinic_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- Dynamic clinic config (branding, timing, address)
    feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb, -- Feature toggles: enableWhatsApp, enableInventory, etc.
    subscription_status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'trial'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS tenants_id_idx ON tenants (id);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, -- Firebase Auth UID
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Owner', 'Admin', 'Doctor', 'Receptionist', 'ReadOnly')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lookup performance
CREATE UNIQUE INDEX IF NOT EXISTS users_id_idx ON users (id);
CREATE INDEX IF NOT EXISTS users_tenant_id_idx ON users (tenant_id);
CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);

-- 3. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
    user_id TEXT, -- Firebase UID or email
    event_type TEXT NOT NULL, -- e.g., 'Login', 'Logout', 'Role Changed', 'Clinic Created', 'Spreadsheet Updated', 'Subscription Updated'
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb, -- Strict metadata events only, NO patient records
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for rapid analytical queries
CREATE INDEX IF NOT EXISTS audit_logs_tenant_id_idx ON audit_logs (tenant_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at);

-- 4. WhatsApp Connections Table (Dedicated, AES-256 Encrypted Credential Vault)
CREATE TABLE IF NOT EXISTS whatsapp_connections (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'meta',
    waba_id TEXT,
    phone_number_id TEXT UNIQUE NOT NULL, -- Strict multi-tenant rule: 1 active phone number = 1 tenant
    display_phone_number TEXT,
    verified_name TEXT,
    connection_status TEXT NOT NULL DEFAULT 'disconnected', -- 'connected', 'disconnected', 'expired', 'revoked'
    business_verification_status TEXT DEFAULT 'pending',
    display_name_status TEXT DEFAULT 'pending',
    token_ciphertext TEXT, -- AES-256-GCM encrypted token (Server-only)
    token_expiry_at TIMESTAMPTZ,
    verify_token TEXT NOT NULL, -- Webhook verification handshake token
    connected_at TIMESTAMPTZ,
    disconnected_at TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT whatsapp_connections_tenant_unique UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS whatsapp_connections_phone_idx ON whatsapp_connections (phone_number_id);
CREATE INDEX IF NOT EXISTS whatsapp_connections_tenant_idx ON whatsapp_connections (tenant_id);

-- 5. WhatsApp Conversations Table
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    whatsapp_connection_id TEXT REFERENCES whatsapp_connections(id) ON DELETE SET NULL,
    contact_id TEXT,
    external_contact_identifier TEXT NOT NULL, -- E.164 phone number without '+'
    contact_name TEXT DEFAULT 'New Lead',
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'closed', 'archived'
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    assigned_user_id TEXT,
    automation_mode TEXT NOT NULL DEFAULT 'ai_active', -- 'ai_active', 'paused', 'human_takeover'
    is_handover_required BOOLEAN DEFAULT FALSE,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT whatsapp_conversations_tenant_contact_unique UNIQUE (tenant_id, external_contact_identifier)
);

CREATE INDEX IF NOT EXISTS whatsapp_conv_tenant_idx ON whatsapp_conversations (tenant_id);
CREATE INDEX IF NOT EXISTS whatsapp_conv_phone_idx ON whatsapp_conversations (external_contact_identifier);

-- 6. WhatsApp Messages Table (Persistent Message Vault)
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    whatsapp_connection_id TEXT REFERENCES whatsapp_connections(id) ON DELETE SET NULL,
    meta_message_id TEXT UNIQUE, -- Unique Meta message ID for idempotency & status lifecycle
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'template', 'image', 'document', 'audio', 'video', 'interactive'
    body TEXT,
    media_url TEXT,
    media_mime_type TEXT,
    reply_to_message_id TEXT,
    template_name TEXT,
    status TEXT NOT NULL DEFAULT 'received', -- 'received', 'sent', 'delivered', 'read', 'failed'
    source TEXT NOT NULL DEFAULT 'human', -- 'human', 'ai', 'template', 'automation', 'webhook'
    error_code TEXT,
    error_details JSONB,
    provider_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whatsapp_msg_tenant_idx ON whatsapp_messages (tenant_id);
CREATE INDEX IF NOT EXISTS whatsapp_msg_conv_idx ON whatsapp_messages (conversation_id);
CREATE INDEX IF NOT EXISTS whatsapp_msg_meta_id_idx ON whatsapp_messages (meta_message_id);

-- 7. WhatsApp Templates Table
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en_US',
    category TEXT DEFAULT 'UTILITY',
    status TEXT NOT NULL DEFAULT 'APPROVED', -- 'APPROVED', 'PENDING', 'REJECTED', 'PAUSED'
    components JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT whatsapp_templates_tenant_name_lang_unique UNIQUE (tenant_id, name, language)
);

CREATE INDEX IF NOT EXISTS whatsapp_tmpl_tenant_idx ON whatsapp_templates (tenant_id);

-- 8. WhatsApp Idempotency & Event Processing Logs
CREATE TABLE IF NOT EXISTS whatsapp_idempotency_logs (
    event_id TEXT PRIMARY KEY, -- meta_message_id or webhook event ID
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'processed', 'failed'
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whatsapp_idem_tenant_idx ON whatsapp_idempotency_logs (tenant_id);

-- 9. WhatsApp Message Status Events Table
CREATE TABLE IF NOT EXISTS whatsapp_message_status_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    meta_message_id TEXT NOT NULL,
    status TEXT NOT NULL,
    error_code TEXT,
    error_details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whatsapp_status_evt_meta_idx ON whatsapp_message_status_events (meta_message_id);

-- 10. WhatsApp Outbound Jobs & Dead Letter Queue Table
CREATE TABLE IF NOT EXISTS whatsapp_outbound_jobs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    recipient TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INT NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whatsapp_jobs_tenant_idx ON whatsapp_outbound_jobs (tenant_id);

-- 11. WhatsApp Embedded Signup OAuth Session States Table
CREATE TABLE IF NOT EXISTS whatsapp_signup_states (
    state_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whatsapp_signup_states_tenant_idx ON whatsapp_signup_states (tenant_id);

-- 12. WhatsApp 24-Hour Customer Service Windows Table
CREATE TABLE IF NOT EXISTS whatsapp_conversation_windows (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    last_inbound_at TIMESTAMPTZ NOT NULL,
    window_expires_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT whatsapp_conv_windows_tenant_conv_unique UNIQUE (tenant_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS whatsapp_windows_tenant_conv_idx ON whatsapp_conversation_windows (tenant_id, conversation_id);

-- 13. WhatsApp Handover Events & Lifecycle Table
CREATE TABLE IF NOT EXISTS whatsapp_handovers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    reason_code TEXT NOT NULL,
    sanitized_context JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'REQUIRED', -- 'REQUIRED', 'UNASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_STAFF', 'RESOLVED', 'REOPENED'
    priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    branch_id TEXT,
    assigned_user_id TEXT,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whatsapp_handovers_tenant_idx ON whatsapp_handovers (tenant_id);
CREATE INDEX IF NOT EXISTS whatsapp_handovers_conv_idx ON whatsapp_handovers (conversation_id);
CREATE INDEX IF NOT EXISTS whatsapp_handovers_status_idx ON whatsapp_handovers (status);

-- 14. WhatsApp Conversation Assignments History Table
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

-- 15. WhatsApp Internal Notes Table
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

-- 16. WhatsApp Staff In-App Notifications Table
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

-- 17. WhatsApp SLA Policies Table
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

-- 18. WhatsApp SLA Instances Table
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

-- 19. WhatsApp Conversation Status History Table
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

-- Enable Row Level Security (RLS) on all WhatsApp Tables
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_idempotency_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_message_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_outbound_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_signup_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversation_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversation_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_staff_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sla_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversation_status_history ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation RLS Policies
CREATE POLICY "Tenant isolation for whatsapp_connections" ON whatsapp_connections
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation for whatsapp_conversations" ON whatsapp_conversations
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation for whatsapp_messages" ON whatsapp_messages
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation for whatsapp_templates" ON whatsapp_templates
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation for whatsapp_idempotency_logs" ON whatsapp_idempotency_logs
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation for whatsapp_message_status_events" ON whatsapp_message_status_events
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation for whatsapp_outbound_jobs" ON whatsapp_outbound_jobs
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation for whatsapp_signup_states" ON whatsapp_signup_states
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation for whatsapp_conversation_windows" ON whatsapp_conversation_windows
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

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

-- 16. Tenant Sector Configurations & Version History
CREATE TABLE IF NOT EXISTS tenant_sector_configs (
    tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    sector_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    activation_status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'pending_activation', 'active', 'suspended'
    terminology JSONB NOT NULL DEFAULT '{}'::jsonb,
    service_catalogue JSONB NOT NULL DEFAULT '[]'::jsonb,
    preset_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    customizations JSONB NOT NULL DEFAULT '{}'::jsonb,
    readiness_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
    selected_by TEXT NOT NULL,
    selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_changed_by TEXT NOT NULL,
    last_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tenant_sector_configs_sector_id_idx ON tenant_sector_configs (sector_id);

CREATE TABLE IF NOT EXISTS tenant_sector_history (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sector_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    config_snapshot JSONB NOT NULL,
    change_type TEXT NOT NULL, -- 'initial_select', 'preset_switch', 'customization_update', 'rollback', 'activation'
    reason TEXT,
    changed_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tenant_sector_history_tenant_version_idx ON tenant_sector_history (tenant_id, version);

-- RLS Policies
ALTER TABLE tenant_sector_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_sector_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for tenant_sector_configs" ON tenant_sector_configs
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation for tenant_sector_history" ON tenant_sector_history
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

-- Notify PostgREST to refresh schema cache
NOTIFY pgrst, 'reload schema';

