-- Phase 3 Migration: WhatsApp Compliance, Consent, 24h Window, Flow State & Metering
-- Migration File: 20260729000000_whatsapp_compliance_phase3.sql

-- 1. WhatsApp Consents Table
CREATE TABLE IF NOT EXISTS whatsapp_consents (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    external_contact_identifier TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'opted_in', -- 'opted_in', 'opted_out'
    source TEXT NOT NULL DEFAULT 'inbound_msg', -- 'inbound_msg', 'staff', 'system'
    last_command TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT whatsapp_consents_tenant_contact_unique UNIQUE (tenant_id, external_contact_identifier)
);

CREATE INDEX IF NOT EXISTS whatsapp_consents_tenant_idx ON whatsapp_consents (tenant_id);
CREATE INDEX IF NOT EXISTS whatsapp_consents_contact_idx ON whatsapp_consents (external_contact_identifier);

-- 2. WhatsApp Conversation Windows Table (24-Hour Customer Service Window Tracking)
CREATE TABLE IF NOT EXISTS whatsapp_conversation_windows (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    last_inbound_at TIMESTAMPTZ NOT NULL,
    window_expires_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT whatsapp_windows_tenant_conv_unique UNIQUE (tenant_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS whatsapp_windows_tenant_idx ON whatsapp_conversation_windows (tenant_id);
CREATE INDEX IF NOT EXISTS whatsapp_windows_expires_idx ON whatsapp_conversation_windows (window_expires_at);

-- 3. WhatsApp Active Flow States Table
CREATE TABLE IF NOT EXISTS whatsapp_flow_states (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    active_flow_type TEXT NOT NULL,
    current_step TEXT NOT NULL,
    structured_context JSONB DEFAULT '{}'::jsonb,
    version INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'expired', 'paused'
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT whatsapp_flows_tenant_conv_unique UNIQUE (tenant_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS whatsapp_flows_tenant_idx ON whatsapp_flow_states (tenant_id);

-- 4. WhatsApp Handover Markers Table
CREATE TABLE IF NOT EXISTS whatsapp_handovers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    reason_code TEXT NOT NULL,
    sanitized_context JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'assigned', 'resolved'
    assigned_user_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whatsapp_handovers_tenant_idx ON whatsapp_handovers (tenant_id);

-- 5. WhatsApp Usage & Metering Table
CREATE TABLE IF NOT EXISTS whatsapp_usage_meters (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_category TEXT NOT NULL, -- 'inbound', 'outbound_freeform', 'outbound_template', 'status'
    routing_category TEXT DEFAULT 'UNKNOWN',
    event_count INT NOT NULL DEFAULT 1,
    period_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT whatsapp_usage_tenant_category_period_unique UNIQUE (tenant_id, event_category, routing_category, period_date)
);

CREATE INDEX IF NOT EXISTS whatsapp_usage_tenant_idx ON whatsapp_usage_meters (tenant_id);

-- Add is_handover_required and consent_status columns to whatsapp_conversations if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='whatsapp_conversations' AND column_name='is_handover_required'
    ) THEN
        ALTER TABLE whatsapp_conversations ADD COLUMN is_handover_required BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='whatsapp_conversations' AND column_name='consent_status'
    ) THEN
        ALTER TABLE whatsapp_conversations ADD COLUMN consent_status TEXT NOT NULL DEFAULT 'opted_in';
    END IF;
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE whatsapp_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversation_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_flow_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_usage_meters ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-applying
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_consents" ON whatsapp_consents;
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_conversation_windows" ON whatsapp_conversation_windows;
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_flow_states" ON whatsapp_flow_states;
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_handovers" ON whatsapp_handovers;
DROP POLICY IF EXISTS "Tenant isolation for whatsapp_usage_meters" ON whatsapp_usage_meters;

-- Tenant Isolation Policies
CREATE POLICY "Tenant isolation for whatsapp_consents" ON whatsapp_consents
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation for whatsapp_conversation_windows" ON whatsapp_conversation_windows
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation for whatsapp_flow_states" ON whatsapp_flow_states
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation for whatsapp_handovers" ON whatsapp_handovers
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation for whatsapp_usage_meters" ON whatsapp_usage_meters
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
