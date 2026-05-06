create table if not exists public.form_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version integer not null default 1 check (version > 0),
  schema jsonb not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, version)
);

create table if not exists public.job_form_submissions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete restrict,
  template_id uuid not null references public.form_templates(id) on delete restrict,
  form_data jsonb not null,
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists form_templates_status_idx on public.form_templates(status);
create index if not exists job_form_submissions_job_id_idx on public.job_form_submissions(job_id);
create index if not exists job_form_submissions_template_id_idx on public.job_form_submissions(template_id);
create index if not exists job_form_submissions_submitted_at_idx on public.job_form_submissions(submitted_at);

drop trigger if exists form_templates_set_updated_at on public.form_templates;
create trigger form_templates_set_updated_at
before update on public.form_templates
for each row execute function public.set_updated_at();

drop trigger if exists job_form_submissions_set_updated_at on public.job_form_submissions;
create trigger job_form_submissions_set_updated_at
before update on public.job_form_submissions
for each row execute function public.set_updated_at();

insert into public.form_templates (id, name, version, schema, status)
values (
  '00000000-0000-4000-8000-000000000101',
  'Treatment Form',
  1,
  '{
    "fields": [
      {
        "id": "target_pests",
        "label": "Target pests",
        "type": "textarea",
        "required": true,
        "placeholder": "Ants, roaches, rodents"
      },
      {
        "id": "areas_treated",
        "label": "Areas treated",
        "type": "textarea",
        "required": true,
        "placeholder": "Kitchen, garage, exterior perimeter"
      },
      {
        "id": "materials_applied",
        "label": "Materials applied",
        "type": "textarea",
        "required": false,
        "placeholder": "Products or methods used"
      },
      {
        "id": "customer_instructions",
        "label": "Customer instructions",
        "type": "textarea",
        "required": false,
        "placeholder": "Re-entry notes, prep, follow-up instructions"
      },
      {
        "id": "follow_up_required",
        "label": "Follow-up required",
        "type": "boolean",
        "required": false
      }
    ]
  }'::jsonb,
  'active'
)
on conflict (name, version)
do update set
  schema = excluded.schema,
  status = excluded.status;

alter table public.form_templates enable row level security;
alter table public.job_form_submissions enable row level security;

drop policy if exists "admins manage form templates" on public.form_templates;
create policy "admins manage form templates"
on public.form_templates
for all
using (public.has_admin_access())
with check (public.has_admin_access());

drop policy if exists "technicians read active form templates" on public.form_templates;
create policy "technicians read active form templates"
on public.form_templates
for select
using (status = 'active');

drop policy if exists "admins manage job form submissions" on public.job_form_submissions;
create policy "admins manage job form submissions"
on public.job_form_submissions
for all
using (public.has_admin_access())
with check (public.has_admin_access());

drop policy if exists "technicians read assigned job form submissions" on public.job_form_submissions;
create policy "technicians read assigned job form submissions"
on public.job_form_submissions
for select
using (
  exists (
    select 1
    from public.jobs
    where jobs.id = job_form_submissions.job_id
      and jobs.assigned_tech_id = auth.uid()
  )
);

drop policy if exists "technicians insert assigned job form submissions" on public.job_form_submissions;
create policy "technicians insert assigned job form submissions"
on public.job_form_submissions
for insert
with check (
  submitted_by = auth.uid()
  and exists (
    select 1
    from public.jobs
    where jobs.id = job_form_submissions.job_id
      and jobs.assigned_tech_id = auth.uid()
  )
);
