-- Versioned Migration for WhatsApp Persistence & Vault Schema
-- Migration File: 20260726000000_whatsapp_persistence.sql

-- 1. Base Tenants Table (if not exists)
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    spreadsheet_id TEXT NOT NULL,
    calendar_id TEXT NOT NULL,
    drive_folder_id TEXT NOT NULL,
    clinic_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
    subscription_status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS tenants_id_idx ON tenants (id);

-- Seed default tenant record for foreign key integrity
INSERT INTO tenants (id, name, spreadsheet_id, calendar_id, drive_folder_id)
VALUES ('tenant_default', 'Default Workspace Tenant', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- 2. WhatsApp Connections Table (Dedicated, AES-256 Encrypted Credential Vault)
CREATE TABLE IF NOT EXISTS whatsapp_connections (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'meta',
    waba_id TEXT,
    phone_number_id TEXT UNIQUE NOT NULL, -- 1 active phone number per tenant
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

-- 3. WhatsApp Conversations Table
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    whatsapp_connection_id TEXT REFERENCES whatsapp_connections(id) ON DELETE SET NULL,
    contact_id TEXT,
    external_contact_identifier TEXT NOT NULL, -- E.164 phone number without '+'
    contact_name TEXT DEFAULT 'New Lead',
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'closed', 'archived'
    assigned_user_id TEXT,
    automation_mode TEXT NOT NULL DEFAULT 'ai_active', -- 'ai_active', 'paused', 'human_takeover'
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT whatsapp_conversations_tenant_contact_unique UNIQUE (tenant_id, external_contact_identifier)
);

CREATE INDEX IF NOT EXISTS whatsapp_conv_tenant_idx ON whatsapp_conversations (tenant_id);
CREATE INDEX IF NOT EXISTS whatsapp_conv_phone_idx ON whatsapp_conversations (external_contact_identifier);

-- 4. WhatsApp Messages Table (Persistent Message Vault)
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

-- 5. WhatsApp Templates Table
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

-- 6. WhatsApp Idempotency & Event Logs
CREATE TABLE IF NOT EXISTS whatsapp_idempotency_logs (
    event_id TEXT PRIMARY KEY, -- meta_message_id or webhook event ID
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'processed', 'failed'
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whatsapp_idem_tenant_idx ON whatsapp_idempotency_logs (tenant_id);

-- 7. WhatsApp Message Status Events Table
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

-- 8. WhatsApp Outbound Jobs & Dead Letter Queue Table
CREATE TABLE IF NOT EXISTS whatsapp_outbound_jobs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    recipient TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'dead_letter'
    attempts INT NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whatsapp_jobs_tenant_idx ON whatsapp_outbound_jobs (tenant_id);

-- 9. WhatsApp Embedded Signup OAuth Session States Table
CREATE TABLE IF NOT EXISTS whatsapp_signup_states (
    state_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'expired'
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whatsapp_signup_states_tenant_idx ON whatsapp_signup_states (tenant_id);

-- Enable Row Level Security (RLS) on all WhatsApp Tables
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_idempotency_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_message_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_outbound_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_signup_states ENABLE ROW LEVEL SECURITY;

-- Drop old policies if re-applying
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_connections" ON whatsapp_connections;
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_conversations" ON whatsapp_conversations;
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_templates" ON whatsapp_templates;
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_idempotency_logs" ON whatsapp_idempotency_logs;
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_message_status_events" ON whatsapp_message_status_events;
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_outbound_jobs" ON whatsapp_outbound_jobs;
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_signup_states" ON whatsapp_signup_states;

-- Create Tenant Isolation Policies (Service Role bypasses RLS in Supabase)
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

-- Notify PostgREST to immediately refresh its schema cache
NOTIFY pgrst, 'reload schema';
