create table if not exists public.customer_portal_sessions (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.customer_portal_access_tokens(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  session_hash text not null unique,
  expires_at timestamptz not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_portal_sessions_token_id_idx
  on public.customer_portal_sessions(token_id);

create index if not exists customer_portal_sessions_customer_id_idx
  on public.customer_portal_sessions(customer_id);

create index if not exists customer_portal_sessions_expires_at_idx
  on public.customer_portal_sessions(expires_at);

drop trigger if exists customer_portal_sessions_set_updated_at
  on public.customer_portal_sessions;
create trigger customer_portal_sessions_set_updated_at
before update on public.customer_portal_sessions
for each row execute function public.set_updated_at();

alter table public.customer_portal_sessions enable row level security;

drop policy if exists "admins manage portal sessions"
  on public.customer_portal_sessions;
create policy "admins manage portal sessions"
on public.customer_portal_sessions
for all
to authenticated
using ((select private.has_admin_access()))
with check ((select private.has_admin_access()));
