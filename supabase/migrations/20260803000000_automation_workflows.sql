-- Migration: 20260803000000_automation_workflows.sql
-- Description: Multi-tenant automation workflows, executions, scheduled actions, and settings tables

-- 1. Automation Workflows Table
CREATE TABLE IF NOT EXISTS automation_workflows (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'appointment', -- 'appointment', 'reminder', 'followup', 'lead', 'recall', 'review'
    trigger_type TEXT NOT NULL, -- 'appointment_created', 'appointment_24h_before', 'appointment_1h_before', 'appointment_noshow', 'appointment_completed', 'appointment_rescheduled', 'appointment_cancelled', 'lead_created', 'inactive_customer', 'manual'
    status TEXT NOT NULL DEFAULT 'active', -- 'draft', 'active', 'paused', 'error', 'archived'
    version INT NOT NULL DEFAULT 1,
    config JSONB NOT NULL DEFAULT '{}'::jsonb, -- trigger config, conditions, actions, variables
    stats JSONB NOT NULL DEFAULT '{"totalExecutions": 0, "successfulExecutions": 0, "failedExecutions": 0}'::jsonb,
    is_template BOOLEAN NOT NULL DEFAULT FALSE,
    template_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT,
    CONSTRAINT automation_workflows_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS automation_workflows_tenant_idx ON automation_workflows (tenant_id);
CREATE INDEX IF NOT EXISTS automation_workflows_status_idx ON automation_workflows (tenant_id, status);

-- 2. Automation Executions Table (Audit Log of workflow runs)
CREATE TABLE IF NOT EXISTS automation_executions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    workflow_id TEXT NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
    workflow_name TEXT NOT NULL,
    contact_id TEXT,
    contact_name TEXT,
    contact_phone TEXT,
    appointment_id TEXT,
    trigger_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running', -- 'scheduled', 'running', 'waiting', 'completed', 'partially_completed', 'failed', 'cancelled', 'needs_attention', 'skipped'
    current_step TEXT,
    steps_log JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { stepId, stepName, status, timestamp, output, error }
    whatsapp_message_id TEXT,
    whatsapp_delivery_status TEXT, -- 'sent', 'delivered', 'read', 'replied', 'failed'
    calendar_event_id TEXT,
    calendar_sync_status TEXT, -- 'synced', 'failed', 'skipped'
    error_code TEXT,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS automation_exec_tenant_idx ON automation_executions (tenant_id);
CREATE INDEX IF NOT EXISTS automation_exec_workflow_idx ON automation_executions (workflow_id);
CREATE INDEX IF NOT EXISTS automation_exec_status_idx ON automation_executions (tenant_id, status);
CREATE INDEX IF NOT EXISTS automation_exec_contact_idx ON automation_executions (tenant_id, contact_phone);
CREATE INDEX IF NOT EXISTS automation_exec_appt_idx ON automation_executions (tenant_id, appointment_id);

-- 3. Automation Scheduled Actions Table (Durable Queue for Delayed Triggers)
CREATE TABLE IF NOT EXISTS automation_scheduled_actions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    workflow_id TEXT NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
    execution_id TEXT,
    contact_id TEXT NOT NULL,
    contact_name TEXT,
    contact_phone TEXT NOT NULL,
    appointment_id TEXT,
    action_type TEXT NOT NULL, -- 'send_whatsapp_reminder', 'send_review_request', 'followup_noshow', 'recall_check', 'update_calendar'
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'cancelled', 'failed', 'skipped'
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    claimed_by TEXT,
    claimed_at TIMESTAMPTZ,
    lease_expires_at TIMESTAMPTZ,
    last_error TEXT,
    idempotency_key TEXT UNIQUE,
    whatsapp_outbound_job_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS automation_sched_due_idx ON automation_scheduled_actions (scheduled_for, status);
CREATE INDEX IF NOT EXISTS automation_sched_tenant_idx ON automation_scheduled_actions (tenant_id);
CREATE INDEX IF NOT EXISTS automation_sched_appt_idx ON automation_scheduled_actions (tenant_id, appointment_id);
CREATE INDEX IF NOT EXISTS automation_sched_claim_idx ON automation_scheduled_actions (scheduled_for, status, lease_expires_at);

-- 4. Tenant Automation Settings Table
CREATE TABLE IF NOT EXISTS automation_settings (
    tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    global_kill_switch BOOLEAN NOT NULL DEFAULT FALSE,
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    quiet_hours_start TEXT NOT NULL DEFAULT '21:00',
    quiet_hours_end TEXT NOT NULL DEFAULT '08:00',
    frequency_cap_days INT NOT NULL DEFAULT 1,
    auto_pause_on_handover BOOLEAN NOT NULL DEFAULT TRUE,
    google_calendar_auto_sync BOOLEAN NOT NULL DEFAULT TRUE,
    fallback_doctor_name TEXT NOT NULL DEFAULT 'Dr. Prasad',
    whatsapp_default_sender TEXT NOT NULL DEFAULT 'Sri Sai Dental Clinic',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Appointment Outbox Events Table (Durable Transactional Outbox)
CREATE TABLE IF NOT EXISTS appointment_outbox_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    appointment_id TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSED', 'FAILED'
    idempotency_key TEXT UNIQUE NOT NULL,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS appt_outbox_tenant_status_idx ON appointment_outbox_events (tenant_id, status);
CREATE INDEX IF NOT EXISTS appt_outbox_idemp_idx ON appointment_outbox_events (idempotency_key);

-- 6. Atomic Claim Function for Worker
CREATE OR REPLACE FUNCTION claim_due_automation_actions(
    p_worker_id TEXT,
    p_batch_size INT DEFAULT 10,
    p_lease_seconds INT DEFAULT 60
)
RETURNS SETOF automation_scheduled_actions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH due_actions AS (
        SELECT sa_inner.id
        FROM automation_scheduled_actions sa_inner
        WHERE (
            sa_inner.status = 'pending' 
            OR sa_inner.status = 'SCHEDULED' 
            OR (sa_inner.status = 'processing' AND sa_inner.lease_expires_at < NOW())
        )
        AND sa_inner.scheduled_for <= NOW()
        AND sa_inner.attempts < sa_inner.max_attempts
        ORDER BY sa_inner.scheduled_for ASC
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    )
    UPDATE automation_scheduled_actions sa
    SET status = 'processing',
        claimed_by = p_worker_id,
        claimed_at = NOW(),
        lease_expires_at = NOW() + (p_lease_seconds || ' seconds')::INTERVAL,
        attempts = sa.attempts + 1,
        updated_at = NOW()
    FROM due_actions
    WHERE sa.id = due_actions.id
    RETURNING sa.*;
END;
$$;

-- Enable RLS
ALTER TABLE automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_scheduled_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_outbox_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Tenant isolation for automation_workflows" ON automation_workflows;
CREATE POLICY "Tenant isolation for automation_workflows" ON automation_workflows
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation for automation_executions" ON automation_executions;
CREATE POLICY "Tenant isolation for automation_executions" ON automation_executions
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation for automation_scheduled_actions" ON automation_scheduled_actions;
CREATE POLICY "Tenant isolation for automation_scheduled_actions" ON automation_scheduled_actions
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation for automation_settings" ON automation_settings;
CREATE POLICY "Tenant isolation for automation_settings" ON automation_settings
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation for appointment_outbox_events" ON appointment_outbox_events;
CREATE POLICY "Tenant isolation for appointment_outbox_events" ON appointment_outbox_events
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');

NOTIFY pgrst, 'reload schema';

