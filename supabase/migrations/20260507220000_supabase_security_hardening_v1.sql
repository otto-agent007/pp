create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.has_admin_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'dispatcher')
  );
$$;

revoke all on function private.has_admin_access() from public;
grant execute on function private.has_admin_access() to authenticated;

create or replace function private.deduct_chemical_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  available_stock numeric;
begin
  select current_stock
  into available_stock
  from public.chemical_inventory
  where id = new.chemical_id
    and status = 'active'
  for update;

  if available_stock is null then
    raise exception 'Chemical inventory item is not active or does not exist';
  end if;

  if available_stock < new.amount_used then
    raise exception 'Insufficient chemical stock';
  end if;

  update public.chemical_inventory
  set current_stock = current_stock - new.amount_used
  where id = new.chemical_id;

  return new;
end;
$$;

revoke all on function private.deduct_chemical_stock() from public;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create index if not exists customer_portal_access_tokens_created_by_idx
  on public.customer_portal_access_tokens(created_by);

create index if not exists job_form_submissions_submitted_by_idx
  on public.job_form_submissions(submitted_by);

create index if not exists notification_events_rule_id_idx
  on public.notification_events(rule_id);

drop trigger if exists chemical_logs_deduct_stock on public.chemical_logs;
create trigger chemical_logs_deduct_stock
before insert on public.chemical_logs
for each row execute function private.deduct_chemical_stock();

drop policy if exists "profiles are readable by owner or admins" on public.profiles;
drop policy if exists "admins manage profiles" on public.profiles;
create policy "profiles are readable by owner or admins"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()) or (select private.has_admin_access()));
create policy "admins insert profiles"
on public.profiles
for insert
to authenticated
with check ((select private.has_admin_access()));
create policy "admins update profiles"
on public.profiles
for update
to authenticated
using ((select private.has_admin_access()))
with check ((select private.has_admin_access()));
create policy "admins delete profiles"
on public.profiles
for delete
to authenticated
using ((select private.has_admin_access()));

drop policy if exists "admins manage customers" on public.customers;
create policy "admins manage customers"
on public.customers
for all
to authenticated
using ((select private.has_admin_access()))
with check ((select private.has_admin_access()));

drop policy if exists "admins manage locations" on public.locations;
create policy "admins manage locations"
on public.locations
for all
to authenticated
using ((select private.has_admin_access()))
with check ((select private.has_admin_access()));

drop policy if exists "admins manage jobs" on public.jobs;
drop policy if exists "technicians read assigned jobs" on public.jobs;
drop policy if exists "technicians update assigned jobs" on public.jobs;
create policy "jobs are readable by admins or assigned technicians"
on public.jobs
for select
to authenticated
using (
  (select private.has_admin_access())
  or assigned_tech_id = (select auth.uid())
);
create policy "admins insert jobs"
on public.jobs
for insert
to authenticated
with check ((select private.has_admin_access()));
create policy "jobs are updateable by admins or assigned technicians"
on public.jobs
for update
to authenticated
using (
  (select private.has_admin_access())
  or assigned_tech_id = (select auth.uid())
)
with check (
  (select private.has_admin_access())
  or assigned_tech_id = (select auth.uid())
);
create policy "admins delete jobs"
on public.jobs
for delete
to authenticated
using ((select private.has_admin_access()));

drop policy if exists "admins manage chemical inventory" on public.chemical_inventory;
drop policy if exists "technicians read active chemical inventory" on public.chemical_inventory;
create policy "chemical inventory is readable by admins or technicians"
on public.chemical_inventory
for select
to authenticated
using ((select private.has_admin_access()) or status = 'active');
create policy "admins insert chemical inventory"
on public.chemical_inventory
for insert
to authenticated
with check ((select private.has_admin_access()));
create policy "admins update chemical inventory"
on public.chemical_inventory
for update
to authenticated
using ((select private.has_admin_access()))
with check ((select private.has_admin_access()));
create policy "admins delete chemical inventory"
on public.chemical_inventory
for delete
to authenticated
using ((select private.has_admin_access()));

drop policy if exists "admins manage chemical logs" on public.chemical_logs;
drop policy if exists "technicians read assigned chemical logs" on public.chemical_logs;
drop policy if exists "technicians insert assigned chemical logs" on public.chemical_logs;
create policy "chemical logs are readable by admins or assigned technicians"
on public.chemical_logs
for select
to authenticated
using (
  (select private.has_admin_access())
  or exists (
    select 1
    from public.jobs
    where jobs.id = chemical_logs.job_id
      and jobs.assigned_tech_id = (select auth.uid())
  )
);
create policy "chemical logs are insertable by admins or assigned technicians"
on public.chemical_logs
for insert
to authenticated
with check (
  (select private.has_admin_access())
  or exists (
    select 1
    from public.jobs
    where jobs.id = chemical_logs.job_id
      and jobs.assigned_tech_id = (select auth.uid())
  )
);
create policy "admins update chemical logs"
on public.chemical_logs
for update
to authenticated
using ((select private.has_admin_access()))
with check ((select private.has_admin_access()));
create policy "admins delete chemical logs"
on public.chemical_logs
for delete
to authenticated
using ((select private.has_admin_access()));

drop policy if exists "admins manage form templates" on public.form_templates;
drop policy if exists "technicians read active form templates" on public.form_templates;
create policy "form templates are readable by admins or technicians"
on public.form_templates
for select
to authenticated
using ((select private.has_admin_access()) or status = 'active');
create policy "admins insert form templates"
on public.form_templates
for insert
to authenticated
with check ((select private.has_admin_access()));
create policy "admins update form templates"
on public.form_templates
for update
to authenticated
using ((select private.has_admin_access()))
with check ((select private.has_admin_access()));
create policy "admins delete form templates"
on public.form_templates
for delete
to authenticated
using ((select private.has_admin_access()));

drop policy if exists "admins manage job form submissions" on public.job_form_submissions;
drop policy if exists "technicians read assigned job form submissions" on public.job_form_submissions;
drop policy if exists "technicians insert assigned job form submissions" on public.job_form_submissions;
create policy "job form submissions are readable by admins or assigned technicians"
on public.job_form_submissions
for select
to authenticated
using (
  (select private.has_admin_access())
  or exists (
    select 1
    from public.jobs
    where jobs.id = job_form_submissions.job_id
      and jobs.assigned_tech_id = (select auth.uid())
  )
);
create policy "job form submissions are insertable by admins or assigned technicians"
on public.job_form_submissions
for insert
to authenticated
with check (
  (select private.has_admin_access())
  or (
    submitted_by = (select auth.uid())
    and exists (
      select 1
      from public.jobs
      where jobs.id = job_form_submissions.job_id
        and jobs.assigned_tech_id = (select auth.uid())
    )
  )
);
create policy "admins update job form submissions"
on public.job_form_submissions
for update
to authenticated
using ((select private.has_admin_access()))
with check ((select private.has_admin_access()));
create policy "admins delete job form submissions"
on public.job_form_submissions
for delete
to authenticated
using ((select private.has_admin_access()));

drop policy if exists "admins manage job media" on public.job_media;
drop policy if exists "technicians read assigned job media" on public.job_media;
drop policy if exists "technicians insert assigned job media" on public.job_media;
create policy "job media is readable by admins or assigned technicians"
on public.job_media
for select
to authenticated
using (
  (select private.has_admin_access())
  or exists (
    select 1
    from public.jobs
    where jobs.id = job_media.job_id
      and jobs.assigned_tech_id = (select auth.uid())
  )
);
create policy "job media is insertable by admins or assigned technicians"
on public.job_media
for insert
to authenticated
with check (
  (select private.has_admin_access())
  or (
    uploaded_by = (select auth.uid())
    and storage_bucket = 'job-media'
    and exists (
      select 1
      from public.jobs
      where jobs.id = job_media.job_id
        and jobs.assigned_tech_id = (select auth.uid())
    )
  )
);
create policy "admins update job media"
on public.job_media
for update
to authenticated
using ((select private.has_admin_access()))
with check ((select private.has_admin_access()));
create policy "admins delete job media"
on public.job_media
for delete
to authenticated
using ((select private.has_admin_access()));

drop policy if exists "admins manage job location events" on public.job_location_events;
drop policy if exists "technicians read assigned job location events" on public.job_location_events;
drop policy if exists "technicians insert assigned job location events" on public.job_location_events;
create policy "job location events are readable by admins or assigned technicians"
on public.job_location_events
for select
to authenticated
using (
  (select private.has_admin_access())
  or exists (
    select 1
    from public.jobs
    where jobs.id = job_location_events.job_id
      and jobs.assigned_tech_id = (select auth.uid())
  )
);
create policy "job location events are insertable by admins or assigned technicians"
on public.job_location_events
for insert
to authenticated
with check (
  (select private.has_admin_access())
  or (
    recorded_by = (select auth.uid())
    and exists (
      select 1
      from public.jobs
      where jobs.id = job_location_events.job_id
        and jobs.assigned_tech_id = (select auth.uid())
    )
  )
);
create policy "admins update job location events"
on public.job_location_events
for update
to authenticated
using ((select private.has_admin_access()))
with check ((select private.has_admin_access()));
create policy "admins delete job location events"
on public.job_location_events
for delete
to authenticated
using ((select private.has_admin_access()));

drop policy if exists "Admins and dispatchers can manage invoices" on public.invoices;
create policy "Admins and dispatchers can manage invoices"
on public.invoices
for all
to authenticated
using ((select private.has_admin_access()))
with check ((select private.has_admin_access()));

drop policy if exists "Admins and dispatchers can manage invoice line items" on public.invoice_line_items;
create policy "Admins and dispatchers can manage invoice line items"
on public.invoice_line_items
for all
to authenticated
using ((select private.has_admin_access()))
with check ((select private.has_admin_access()));

drop policy if exists "Admins and dispatchers can manage payments" on public.payments;
create policy "Admins and dispatchers can manage payments"
on public.payments
for all
to authenticated
using ((select private.has_admin_access()))
with check ((select private.has_admin_access()));

drop policy if exists "Admins and dispatchers can manage automation rules" on public.automation_rules;
create policy "Admins and dispatchers can manage automation rules"
on public.automation_rules
for all
to authenticated
using ((select private.has_admin_access()))
with check ((select private.has_admin_access()));

drop policy if exists "Admins and dispatchers can manage notification events" on public.notification_events;
create policy "Admins and dispatchers can manage notification events"
on public.notification_events
for all
to authenticated
using ((select private.has_admin_access()))
with check ((select private.has_admin_access()));

drop policy if exists "Admins and dispatchers can manage portal access tokens" on public.customer_portal_access_tokens;
create policy "Admins and dispatchers can manage portal access tokens"
on public.customer_portal_access_tokens
for all
to authenticated
using ((select private.has_admin_access()))
with check ((select private.has_admin_access()));

drop policy if exists "Admins and dispatchers can read automation scheduler runs" on public.automation_scheduler_runs;
create policy "Admins and dispatchers can read automation scheduler runs"
on public.automation_scheduler_runs
for select
to authenticated
using ((select private.has_admin_access()));

drop policy if exists "Admins and dispatchers can manage notification templates" on public.notification_templates;
create policy "Admins and dispatchers can manage notification templates"
on public.notification_templates
for all
to authenticated
using ((select private.has_admin_access()))
with check ((select private.has_admin_access()));

drop policy if exists "admins manage job media objects" on storage.objects;
drop policy if exists "technicians insert assigned job media objects" on storage.objects;
drop policy if exists "technicians read assigned job media objects" on storage.objects;
create policy "job media objects are readable by admins or assigned technicians"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'job-media'
  and (
    (select private.has_admin_access())
    or exists (
      select 1
      from public.jobs
      where jobs.id = ((storage.foldername(objects.name))[1])::uuid
        and jobs.assigned_tech_id = (select auth.uid())
    )
  )
);
create policy "job media objects are insertable by admins or assigned technicians"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'job-media'
  and (
    (select private.has_admin_access())
    or exists (
      select 1
      from public.jobs
      where jobs.id = ((storage.foldername(objects.name))[1])::uuid
        and jobs.assigned_tech_id = (select auth.uid())
    )
  )
);
create policy "admins update job media objects"
on storage.objects
for update
to authenticated
using (bucket_id = 'job-media' and (select private.has_admin_access()))
with check (bucket_id = 'job-media' and (select private.has_admin_access()));
create policy "admins delete job media objects"
on storage.objects
for delete
to authenticated
using (bucket_id = 'job-media' and (select private.has_admin_access()));

drop function if exists public.deduct_chemical_stock();
drop function if exists public.has_admin_access();

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public;
    revoke execute on function public.rls_auto_enable() from anon;
    revoke execute on function public.rls_auto_enable() from authenticated;
  end if;
end;
$$;
