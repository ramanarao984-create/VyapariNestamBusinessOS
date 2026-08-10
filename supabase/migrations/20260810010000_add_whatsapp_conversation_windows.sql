-- Required for correct WhatsApp 24-hour customer-service window enforcement.
-- All access remains server-side through the Supabase service-role key.

create table if not exists public.whatsapp_conversation_windows (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  conversation_id text not null references public.whatsapp_conversations(id) on delete cascade,
  last_inbound_at timestamptz not null,
  window_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, conversation_id)
);

create index if not exists whatsapp_conversation_windows_active_lookup
  on public.whatsapp_conversation_windows (tenant_id, conversation_id, window_expires_at);

alter table public.whatsapp_conversation_windows enable row level security;
revoke all on table public.whatsapp_conversation_windows from anon, authenticated;

create index if not exists whatsapp_outbound_jobs_pending_lookup
  on public.whatsapp_outbound_jobs (tenant_id, status, created_at)
  where status in ('pending', 'queued', 'failed');
