-- Durable, tenant-safe claiming for WhatsApp outbound jobs.
-- This function is intentionally callable only by the Supabase service role.

alter table public.whatsapp_outbound_jobs
  add column if not exists max_attempts integer not null default 5,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists claimed_by text,
  add column if not exists claimed_at timestamptz,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists last_error_code text,
  add column if not exists last_error_message text,
  add column if not exists meta_message_id text;

update public.whatsapp_outbound_jobs
set max_attempts = 5
where max_attempts is null or max_attempts < 1;

create index if not exists whatsapp_outbound_jobs_dispatch_lookup
  on public.whatsapp_outbound_jobs (status, next_attempt_at, created_at)
  where status in ('pending', 'queued', 'processing');

create or replace function public.claim_whatsapp_outbound_jobs(
  p_worker_id text,
  p_batch_size integer default 25,
  p_lease_seconds integer default 120
)
returns setof public.whatsapp_outbound_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(nullif(trim(p_worker_id), ''), '') = '' then
    raise exception 'p_worker_id is required';
  end if;

  return query
  with candidates as (
    select id
    from public.whatsapp_outbound_jobs
    where (
      status in ('pending', 'queued')
      or (status = 'processing' and lease_expires_at < now())
    )
      and coalesce(next_attempt_at, now()) <= now()
      and coalesce(attempts, 0) < greatest(coalesce(max_attempts, 5), 1)
    order by created_at
    for update skip locked
    limit least(greatest(coalesce(p_batch_size, 25), 1), 100)
  ),
  claimed as (
    update public.whatsapp_outbound_jobs job
    set status = 'processing',
        attempts = coalesce(job.attempts, 0) + 1,
        claimed_by = p_worker_id,
        claimed_at = now(),
        lease_expires_at = now() + make_interval(secs => least(greatest(coalesce(p_lease_seconds, 120), 30), 900)),
        updated_at = now()
    from candidates
    where job.id = candidates.id
    returning job.*
  )
  select * from claimed;
end;
$$;

revoke all on function public.claim_whatsapp_outbound_jobs(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_whatsapp_outbound_jobs(text, integer, integer)
  to service_role;
