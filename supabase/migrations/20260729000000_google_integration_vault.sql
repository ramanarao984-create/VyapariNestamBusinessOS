-- Migration File: 20260729000000_google_integration_vault.sql
-- Dedicated, AES-256 Encrypted Credential Vault & State Store for Google Workspace Integration

-- 1. Google Connections Table
CREATE TABLE IF NOT EXISTS google_connections (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    google_email TEXT,
    access_token_ciphertext TEXT NOT NULL,
    refresh_token_ciphertext TEXT,
    token_expiry_at TIMESTAMPTZ,
    granted_scopes TEXT[] DEFAULT '{}',
    connection_status TEXT NOT NULL DEFAULT 'connected', -- 'connected', 'disconnected', 'expired', 'revoked'
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    disconnected_at TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT google_connections_tenant_unique UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS google_connections_tenant_idx ON google_connections (tenant_id);

-- 2. Google OAuth States Table (Single-use, short TTL CSRF protection)
CREATE TABLE IF NOT EXISTS google_oauth_states (
    state_hash TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_uid TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS google_oauth_states_tenant_idx ON google_oauth_states (tenant_id);
CREATE INDEX IF NOT EXISTS google_oauth_states_exp_idx ON google_oauth_states (expires_at);

-- Enable RLS
ALTER TABLE google_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_oauth_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for google_connections" ON google_connections;
DROP POLICY IF EXISTS "Tenant isolation for google_oauth_states" ON google_oauth_states;

CREATE POLICY "Tenant isolation for google_connections" ON google_connections
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

CREATE POLICY "Tenant isolation for google_oauth_states" ON google_oauth_states
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

-- Notify PostgREST to refresh schema cache
NOTIFY pgrst, 'reload schema';
