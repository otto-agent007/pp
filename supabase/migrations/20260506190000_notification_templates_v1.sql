create type notification_template_status as enum ('active', 'archived');

create table notification_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type automation_rule_type not null,
  status notification_template_status not null default 'active',
  title text not null,
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notification_templates_status_idx
  on notification_templates(status);

create index notification_templates_type_idx
  on notification_templates(type);

alter table notification_templates enable row level security;

create policy "Admins and dispatchers can manage notification templates"
  on notification_templates
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
