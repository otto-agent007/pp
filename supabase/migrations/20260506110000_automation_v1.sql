create type automation_rule_type as enum (
  'follow_up_reminder',
  'recurring_service_prompt'
);
create type automation_rule_status as enum ('active', 'paused', 'archived');
create type notification_event_status as enum ('pending', 'handled', 'dismissed');

create table automation_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type automation_rule_type not null,
  status automation_rule_status not null default 'active',
  offset_days integer check (offset_days is null or offset_days >= 0),
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notification_events (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references automation_rules(id) on delete set null,
  type automation_rule_type not null,
  customer_id uuid references customers(id) on delete set null,
  job_id uuid references jobs(id) on delete set null,
  status notification_event_status not null default 'pending',
  title text not null,
  message text,
  due_at timestamptz not null,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (customer_id is not null or job_id is not null)
);

create index automation_rules_status_idx on automation_rules(status);
create index automation_rules_type_idx on automation_rules(type);
create index notification_events_due_at_idx on notification_events(due_at);
create index notification_events_status_idx on notification_events(status);
create index notification_events_customer_id_idx on notification_events(customer_id);
create index notification_events_job_id_idx on notification_events(job_id);

alter table automation_rules enable row level security;
alter table notification_events enable row level security;

create policy "Admins and dispatchers can manage automation rules"
  on automation_rules
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

create policy "Admins and dispatchers can manage notification events"
  on notification_events
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
