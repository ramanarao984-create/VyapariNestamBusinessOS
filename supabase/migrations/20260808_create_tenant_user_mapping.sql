-- Tenant membership required by the server-side WhatsApp credential vault.
-- Firebase user IDs are strings, so the primary key intentionally uses text.
create table if not exists public.users (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete restrict,
  role text not null check (role in ('Owner', 'Admin', 'Member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_tenant_id_idx on public.users (tenant_id);

alter table public.users enable row level security;

-- Membership is managed only by trusted server-side code using the Supabase
-- service-role key. Browser clients have no direct access to this table.
revoke all on table public.users from anon, authenticated;
