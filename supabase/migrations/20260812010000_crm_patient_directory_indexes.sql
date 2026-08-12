-- Supports patient timeline lookups and safe cascading updates at production volume.
-- This is additive and does not change WhatsApp delivery behavior.

CREATE INDEX IF NOT EXISTS crm_interactions_contact_id_idx
  ON public.crm_interactions (contact_id);

CREATE INDEX IF NOT EXISTS crm_interactions_conversation_id_idx
  ON public.crm_interactions (conversation_id)
  WHERE conversation_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
