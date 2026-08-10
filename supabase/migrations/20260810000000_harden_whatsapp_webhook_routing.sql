-- Makes Meta webhook routing deterministic and protects existing tenant isolation.
-- Apply through the Supabase CLI or SQL Editor before enabling inbound production traffic.

create unique index if not exists whatsapp_connections_phone_number_id_unique
  on public.whatsapp_connections (phone_number_id)
  where phone_number_id is not null;

create unique index if not exists whatsapp_idempotency_logs_event_id_unique
  on public.whatsapp_idempotency_logs (event_id);

create unique index if not exists whatsapp_messages_meta_message_id_unique
  on public.whatsapp_messages (meta_message_id)
  where meta_message_id is not null;

alter table public.whatsapp_idempotency_logs enable row level security;
alter table public.whatsapp_message_status_events enable row level security;

revoke all on table public.whatsapp_idempotency_logs from anon, authenticated;
revoke all on table public.whatsapp_message_status_events from anon, authenticated;
