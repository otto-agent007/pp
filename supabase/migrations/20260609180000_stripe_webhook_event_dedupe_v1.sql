create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now()
);

-- Service-role only: the webhook route uses the service-role client, which
-- bypasses RLS. No policies are added so authenticated/anon roles have no
-- access at all.
alter table public.stripe_webhook_events enable row level security;

revoke all on public.stripe_webhook_events from authenticated, anon;
