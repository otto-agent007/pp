alter table public.jobs
  add column if not exists job_purpose text not null default 'service',
  add column if not exists service_offering_id text,
  add column if not exists service_family text,
  add column if not exists billing_disposition text not null default 'billable',
  add column if not exists service_cadence text not null default 'one_time',
  add column if not exists estimate_status text not null default 'not_applicable',
  add column if not exists parent_job_id uuid references public.jobs(id) on delete set null;

alter table public.jobs
  drop constraint if exists jobs_job_purpose_check,
  add constraint jobs_job_purpose_check
    check (job_purpose in (
      'estimate',
      'service',
      'inspection',
      'follow_up',
      'callback',
      'warranty',
      'project_phase'
    ));

alter table public.jobs
  drop constraint if exists jobs_billing_disposition_check,
  add constraint jobs_billing_disposition_check
    check (billing_disposition in (
      'billable',
      'estimate_only',
      'included_in_recurring',
      'no_charge',
      'warranty_callback',
      'deposit_required'
    ));

alter table public.jobs
  drop constraint if exists jobs_service_cadence_check,
  add constraint jobs_service_cadence_check
    check (service_cadence in (
      'none',
      'one_time',
      'monthly',
      'bimonthly',
      'quarterly',
      'annual',
      'project'
    ));

alter table public.jobs
  drop constraint if exists jobs_estimate_status_check,
  add constraint jobs_estimate_status_check
    check (estimate_status in (
      'not_applicable',
      'draft',
      'presented',
      'accepted',
      'declined',
      'needs_follow_up'
    ));

alter table public.jobs
  drop constraint if exists jobs_service_family_check,
  add constraint jobs_service_family_check
    check (
      service_family is null or service_family in (
        'general_pest',
        'recurring_general_pest',
        'termite_wdo',
        'rodent_attic',
        'bed_bug',
        'commercial',
        'hoa_property_management',
        'bird_gopher',
        'green_diy',
        'other'
      )
    );

create index if not exists jobs_job_purpose_idx
  on public.jobs(job_purpose);

create index if not exists jobs_service_offering_id_idx
  on public.jobs(service_offering_id);

create index if not exists jobs_service_family_idx
  on public.jobs(service_family);

create index if not exists jobs_billing_disposition_idx
  on public.jobs(billing_disposition);

create index if not exists jobs_parent_job_id_idx
  on public.jobs(parent_job_id);

comment on column public.jobs.job_purpose is
  'Structured job intent such as estimate, service, inspection, callback, warranty, or project phase.';
comment on column public.jobs.service_offering_id is
  'Optional ServiceBillingOfferingId from the shared service billing catalog.';
comment on column public.jobs.service_family is
  'Optional ServiceBillingFamily from the shared service billing catalog.';
comment on column public.jobs.billing_disposition is
  'Billing handling hint such as billable, estimate_only, included_in_recurring, no_charge, warranty_callback, or deposit_required.';
comment on column public.jobs.service_cadence is
  'Service cadence such as one_time, monthly, bimonthly, quarterly, annual, or project.';
comment on column public.jobs.estimate_status is
  'Estimate lifecycle status; not_applicable for non-estimate jobs.';
comment on column public.jobs.parent_job_id is
  'Optional parent job reference for future estimate-to-work-order or project phase grouping.';
