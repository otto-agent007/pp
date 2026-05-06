create type invoice_status as enum ('draft', 'sent', 'paid', 'void');
create type payment_status as enum ('pending', 'succeeded', 'failed');
create type payment_provider as enum ('stripe');

create table invoices (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete restrict,
  customer_id uuid not null references customers(id) on delete restrict,
  status invoice_status not null default 'draft',
  currency text not null default 'usd',
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  due_date timestamptz,
  notes text,
  payment_url text,
  stripe_payment_link_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id)
);

create table invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10, 2) not null check (quantity > 0),
  unit_amount_cents integer not null check (unit_amount_cents > 0),
  total_cents integer not null check (total_cents > 0),
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  provider payment_provider not null default 'stripe',
  provider_payment_id text,
  status payment_status not null default 'pending',
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index invoices_customer_id_idx on invoices(customer_id);
create index invoices_status_idx on invoices(status);
create index invoice_line_items_invoice_id_idx on invoice_line_items(invoice_id);
create index payments_invoice_id_idx on payments(invoice_id);

alter table invoices enable row level security;
alter table invoice_line_items enable row level security;
alter table payments enable row level security;

create policy "Admins and dispatchers can manage invoices"
  on invoices
  for all
  using (
    exists (
      select 1
      from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'dispatcher')
    )
  )
  with check (
    exists (
      select 1
      from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'dispatcher')
    )
  );

create policy "Admins and dispatchers can manage invoice line items"
  on invoice_line_items
  for all
  using (
    exists (
      select 1
      from invoices
      join profiles on profiles.id = auth.uid()
      where invoices.id = invoice_line_items.invoice_id
        and profiles.role in ('admin', 'dispatcher')
    )
  )
  with check (
    exists (
      select 1
      from invoices
      join profiles on profiles.id = auth.uid()
      where invoices.id = invoice_line_items.invoice_id
        and profiles.role in ('admin', 'dispatcher')
    )
  );

create policy "Admins and dispatchers can manage payments"
  on payments
  for all
  using (
    exists (
      select 1
      from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'dispatcher')
    )
  )
  with check (
    exists (
      select 1
      from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'dispatcher')
    )
  );
