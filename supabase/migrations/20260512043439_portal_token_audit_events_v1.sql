create type public.customer_portal_access_event_kind as enum (
  'generated',
  'opened',
  'revoked'
);

create table public.customer_portal_access_token_events (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.customer_portal_access_tokens(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  kind public.customer_portal_access_event_kind not null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index customer_portal_access_token_events_token_occurred_at_idx
  on public.customer_portal_access_token_events(token_id, occurred_at desc);

create index customer_portal_access_token_events_customer_occurred_at_idx
  on public.customer_portal_access_token_events(customer_id, occurred_at desc);

create index customer_portal_access_token_events_kind_idx
  on public.customer_portal_access_token_events(kind);

alter table public.customer_portal_access_token_events enable row level security;

drop policy if exists "admins manage portal access token events"
  on public.customer_portal_access_token_events;
create policy "admins manage portal access token events"
on public.customer_portal_access_token_events
for all
to authenticated
using ((select private.has_admin_access()))
with check ((select private.has_admin_access()));
