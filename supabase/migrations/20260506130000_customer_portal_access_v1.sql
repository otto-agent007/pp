create type customer_portal_access_status as enum ('active', 'revoked');

create table customer_portal_access_tokens (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  token_hash text not null unique,
  status customer_portal_access_status not null default 'active',
  expires_at timestamptz,
  last_used_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customer_portal_access_tokens_customer_id_idx
  on customer_portal_access_tokens(customer_id);
create index customer_portal_access_tokens_status_idx
  on customer_portal_access_tokens(status);
create index customer_portal_access_tokens_expires_at_idx
  on customer_portal_access_tokens(expires_at);

drop trigger if exists customer_portal_access_tokens_set_updated_at
  on customer_portal_access_tokens;
create trigger customer_portal_access_tokens_set_updated_at
before update on customer_portal_access_tokens
for each row execute function set_updated_at();

alter table customer_portal_access_tokens enable row level security;

create policy "Admins and dispatchers can manage portal access tokens"
  on customer_portal_access_tokens
  for all
  using (has_admin_access())
  with check (has_admin_access());
