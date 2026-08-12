-- Durable patient directory shared by Patients, Patient 360, and WhatsApp.
-- The backend is the only API consumer. Browser clients never receive Supabase service credentials.

CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  normalized_phone TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'New Lead',
  email TEXT,
  category TEXT NOT NULL DEFAULT 'Lead' CHECK (category IN ('Lead', 'Active', 'Inactive', 'Follow-up')),
  notes TEXT NOT NULL DEFAULT '',
  last_contacted_at TIMESTAMPTZ,
  treatment_type TEXT,
  treatment_value NUMERIC,
  amount_collected NUMERIC,
  payment_method TEXT,
  pipeline_stage TEXT CHECK (pipeline_stage IN ('Inquiry', 'Scheduled', 'Visited', 'Treatment', 'Completed')),
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_autopilot BOOLEAN NOT NULL DEFAULT TRUE,
  source TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT crm_contacts_tenant_phone_unique UNIQUE (tenant_id, normalized_phone)
);

CREATE TABLE IF NOT EXISTS public.crm_interactions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  conversation_id TEXT REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('WhatsApp Sent', 'Incoming Message', 'Phone Call', 'In-Person', 'Email', 'Calendar Follow-up', 'Note')),
  notes TEXT NOT NULL,
  outcome TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_contacts_tenant_last_contacted_idx
  ON public.crm_contacts (tenant_id, last_contacted_at DESC);
CREATE INDEX IF NOT EXISTS crm_interactions_tenant_contact_occurred_idx
  ON public.crm_interactions (tenant_id, contact_id, occurred_at DESC);

-- Backfill existing WhatsApp conversations into the patient directory without replacing names.
INSERT INTO public.crm_contacts (
  id, tenant_id, normalized_phone, name, category, notes, last_contacted_at, ai_autopilot, source, created_at, updated_at
)
SELECT
  'contact_' || wc.tenant_id || '_' || regexp_replace(wc.external_contact_identifier, '[^0-9]', '', 'g'),
  wc.tenant_id,
  regexp_replace(wc.external_contact_identifier, '[^0-9]', '', 'g'),
  COALESCE(NULLIF(wc.contact_name, ''), 'New Lead'),
  'Lead',
  '',
  wc.last_message_at,
  TRUE,
  'WhatsApp',
  wc.created_at,
  NOW()
FROM public.whatsapp_conversations wc
WHERE regexp_replace(wc.external_contact_identifier, '[^0-9]', '', 'g') <> ''
ON CONFLICT (tenant_id, normalized_phone) DO UPDATE
SET
  name = CASE
    WHEN public.crm_contacts.name = 'New Lead' AND EXCLUDED.name <> 'New Lead' THEN EXCLUDED.name
    ELSE public.crm_contacts.name
  END,
  last_contacted_at = GREATEST(public.crm_contacts.last_contacted_at, EXCLUDED.last_contacted_at),
  updated_at = NOW();

-- Link every existing conversation to its tenant-scoped patient record.
UPDATE public.whatsapp_conversations wc
SET contact_id = cc.id,
    contact_name = cc.name,
    updated_at = NOW()
FROM public.crm_contacts cc
WHERE cc.tenant_id = wc.tenant_id
  AND cc.normalized_phone = regexp_replace(wc.external_contact_identifier, '[^0-9]', '', 'g')
  AND (wc.contact_id IS DISTINCT FROM cc.id OR wc.contact_name IS DISTINCT FROM cc.name);

-- Backfill message history into the unified patient timeline. The deterministic ID makes re-runs safe.
INSERT INTO public.crm_interactions (
  id, tenant_id, contact_id, conversation_id, type, notes, outcome, occurred_at, created_at
)
SELECT
  'interaction_' || wm.id,
  wm.tenant_id,
  wc.contact_id,
  wm.conversation_id,
  CASE WHEN wm.direction = 'inbound' THEN 'Incoming Message' ELSE 'WhatsApp Sent' END,
  COALESCE(wm.body, '[' || wm.message_type || ' message]'),
  wm.status,
  COALESCE(wm.provider_timestamp, wm.created_at),
  wm.created_at
FROM public.whatsapp_messages wm
JOIN public.whatsapp_conversations wc
  ON wc.id = wm.conversation_id AND wc.tenant_id = wm.tenant_id
WHERE wc.contact_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;

-- The authenticated Express API enforces tenant and role checks. Do not expose CRM data directly from the browser.
REVOKE ALL ON TABLE public.crm_contacts FROM anon, authenticated;
REVOKE ALL ON TABLE public.crm_interactions FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
