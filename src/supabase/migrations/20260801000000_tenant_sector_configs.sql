-- Migration: 20260801000000_tenant_sector_configs.sql
-- Description: Additive migration for tenant sector configurations and version history with strict RLS policies

-- 1. Tenant Sector Configurations Table
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

-- Index on sector_id
CREATE INDEX IF NOT EXISTS tenant_sector_configs_sector_id_idx ON tenant_sector_configs (sector_id);

-- 2. Tenant Sector History Table
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

-- Index on tenant_id + version
CREATE INDEX IF NOT EXISTS tenant_sector_history_tenant_version_idx ON tenant_sector_history (tenant_id, version);

-- Enable RLS
ALTER TABLE tenant_sector_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_sector_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if exists to ensure idempotent policy application
DROP POLICY IF EXISTS "Tenant isolation select for tenant_sector_configs" ON tenant_sector_configs;
DROP POLICY IF EXISTS "Tenant isolation insert for tenant_sector_configs" ON tenant_sector_configs;
DROP POLICY IF EXISTS "Tenant isolation update for tenant_sector_configs" ON tenant_sector_configs;
DROP POLICY IF EXISTS "Tenant isolation delete for tenant_sector_configs" ON tenant_sector_configs;
DROP POLICY IF EXISTS "Tenant isolation for tenant_sector_configs" ON tenant_sector_configs;

DROP POLICY IF EXISTS "Tenant isolation select for tenant_sector_history" ON tenant_sector_history;
DROP POLICY IF EXISTS "Tenant isolation insert for tenant_sector_history" ON tenant_sector_history;
DROP POLICY IF EXISTS "Tenant isolation update for tenant_sector_history" ON tenant_sector_history;
DROP POLICY IF EXISTS "Tenant isolation delete for tenant_sector_history" ON tenant_sector_history;
DROP POLICY IF EXISTS "Tenant isolation for tenant_sector_history" ON tenant_sector_history;

-- Create granular RLS policies with both USING and WITH CHECK for tenant_sector_configs
CREATE POLICY "Tenant isolation select for tenant_sector_configs" ON tenant_sector_configs
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation insert for tenant_sector_configs" ON tenant_sector_configs
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation update for tenant_sector_configs" ON tenant_sector_configs
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role')
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation delete for tenant_sector_configs" ON tenant_sector_configs
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

-- Create granular RLS policies with both USING and WITH CHECK for tenant_sector_history
CREATE POLICY "Tenant isolation select for tenant_sector_history" ON tenant_sector_history
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation insert for tenant_sector_history" ON tenant_sector_history
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation update for tenant_sector_history" ON tenant_sector_history
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role')
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation delete for tenant_sector_history" ON tenant_sector_history
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

-- Notify PostgREST to refresh schema cache
NOTIFY pgrst, 'reload schema';
