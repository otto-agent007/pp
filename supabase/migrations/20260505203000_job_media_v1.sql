insert into storage.buckets (id, name, public)
values ('job-media', 'job-media', false)
on conflict (id) do nothing;

create table if not exists public.job_media (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete restrict,
  media_type text not null default 'photo' check (media_type in ('photo')),
  storage_bucket text not null default 'job-media',
  storage_path text not null,
  description text,
  uploaded_by uuid references auth.users(id) on delete set null,
  captured_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create index if not exists job_media_job_id_idx on public.job_media(job_id);
create index if not exists job_media_uploaded_by_idx on public.job_media(uploaded_by);
create index if not exists job_media_created_at_idx on public.job_media(created_at);

drop trigger if exists job_media_set_updated_at on public.job_media;
create trigger job_media_set_updated_at
before update on public.job_media
for each row execute function public.set_updated_at();

alter table public.job_media enable row level security;

drop policy if exists "admins manage job media" on public.job_media;
create policy "admins manage job media"
on public.job_media
for all
using (public.has_admin_access())
with check (public.has_admin_access());

drop policy if exists "technicians read assigned job media" on public.job_media;
create policy "technicians read assigned job media"
on public.job_media
for select
using (
  exists (
    select 1
    from public.jobs
    where jobs.id = job_media.job_id
      and jobs.assigned_tech_id = auth.uid()
  )
);

drop policy if exists "technicians insert assigned job media" on public.job_media;
create policy "technicians insert assigned job media"
on public.job_media
for insert
with check (
  uploaded_by = auth.uid()
  and storage_bucket = 'job-media'
  and exists (
    select 1
    from public.jobs
    where jobs.id = job_media.job_id
      and jobs.assigned_tech_id = auth.uid()
  )
);

drop policy if exists "admins manage job media objects" on storage.objects;
create policy "admins manage job media objects"
on storage.objects
for all
using (bucket_id = 'job-media' and public.has_admin_access())
with check (bucket_id = 'job-media' and public.has_admin_access());

drop policy if exists "technicians insert assigned job media objects" on storage.objects;
create policy "technicians insert assigned job media objects"
on storage.objects
for insert
with check (
  bucket_id = 'job-media'
  and exists (
    select 1
    from public.jobs
    where jobs.id = ((storage.foldername(name))[1])::uuid
      and jobs.assigned_tech_id = auth.uid()
  )
);

drop policy if exists "technicians read assigned job media objects" on storage.objects;
create policy "technicians read assigned job media objects"
on storage.objects
for select
using (
  bucket_id = 'job-media'
  and exists (
    select 1
    from public.jobs
    where jobs.id = ((storage.foldername(name))[1])::uuid
      and jobs.assigned_tech_id = auth.uid()
  )
);
