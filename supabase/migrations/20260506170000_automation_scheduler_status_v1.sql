create type automation_scheduler_run_status as enum ('success', 'failed');

create table automation_scheduler_runs (
  id uuid primary key default gen_random_uuid(),
  status automation_scheduler_run_status not null,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  created_count integer not null default 0 check (created_count >= 0),
  skipped_duplicate_count integer not null default 0 check (skipped_duplicate_count >= 0),
  evaluated_rule_count integer not null default 0 check (evaluated_rule_count >= 0),
  evaluated_job_count integer not null default 0 check (evaluated_job_count >= 0),
  error_message text
);

create index automation_scheduler_runs_finished_at_idx
  on automation_scheduler_runs(finished_at desc);

alter table automation_scheduler_runs enable row level security;

create policy "Admins and dispatchers can read automation scheduler runs"
  on automation_scheduler_runs
  for select
  using (
    exists (
      select 1
      from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'dispatcher')
    )
  );
