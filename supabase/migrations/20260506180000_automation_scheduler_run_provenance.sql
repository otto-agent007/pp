create type automation_scheduler_run_trigger as enum ('cron', 'manual');

alter table automation_scheduler_runs
  add column triggered_by automation_scheduler_run_trigger not null default 'cron',
  add column triggered_by_user_id uuid references profiles(id) on delete set null;

create index automation_scheduler_runs_triggered_by_idx
  on automation_scheduler_runs(triggered_by);

create index automation_scheduler_runs_triggered_by_user_id_idx
  on automation_scheduler_runs(triggered_by_user_id);
