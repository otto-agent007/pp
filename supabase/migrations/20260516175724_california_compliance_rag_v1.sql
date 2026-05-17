create extension if not exists vector with schema extensions;

create table if not exists public.compliance_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  jurisdiction text not null check (jurisdiction in ('california', 'federal')),
  authority text not null check (authority in ('cdpr', 'epa', 'spcb', 'internal')),
  workflow text not null check (workflow in ('chemical_application', 'multi_unit_audit', 'recurring_route', 'wdo_branch3')),
  branch text not null default 'general' check (branch in ('branch_2', 'branch_3', 'general')),
  effective_date date,
  retrieved_at timestamptz not null,
  source_hash text not null,
  review_status text not null default 'draft' check (review_status in ('draft', 'reviewed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_hash)
);

create table if not exists public.compliance_documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.compliance_sources(id) on delete cascade,
  title text not null,
  document_url text not null,
  content_type text not null default 'text/plain',
  retrieved_at timestamptz not null,
  source_hash text not null,
  review_status text not null default 'draft' check (review_status in ('draft', 'reviewed', 'archived')),
  raw_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, source_hash)
);

create table if not exists public.compliance_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.compliance_sources(id) on delete cascade,
  document_id uuid not null references public.compliance_documents(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  heading text,
  content text not null,
  tokens_estimate integer check (tokens_estimate is null or tokens_estimate > 0),
  metadata jsonb not null default '{}'::jsonb,
  embedding extensions.vector(1536),
  search_vector tsvector generated always as (
    to_tsvector('english', coalesce(heading, '') || ' ' || content)
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create table if not exists public.compliance_advisory_audits (
  id uuid primary key default gen_random_uuid(),
  workflow text not null check (workflow in ('chemical_application', 'multi_unit_audit', 'recurring_route', 'wdo_branch3')),
  request jsonb not null default '{}'::jsonb,
  response jsonb not null default '{}'::jsonb,
  citation_chunk_ids uuid[] not null default '{}'::uuid[],
  status text not null check (status in ('advisory_ready', 'insufficient_sources', 'rag_disabled')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.location_units (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete restrict,
  unit_label text not null,
  floor text,
  area_type text not null default 'unit' check (area_type in ('common_area', 'exterior', 'other', 'unit')),
  status text not null default 'active' check (status in ('active', 'archived')),
  service_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_id, unit_label)
);

create table if not exists public.job_unit_audit_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete restrict,
  location_unit_id uuid not null references public.location_units(id) on delete restrict,
  status text not null default 'pending' check (status in ('inaccessible', 'pending', 'requires_follow_up', 'skipped', 'treated')),
  evidence jsonb not null default '{}'::jsonb,
  notes text,
  audited_by uuid references public.profiles(id) on delete set null,
  audited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, location_unit_id)
);

create index if not exists compliance_sources_workflow_idx on public.compliance_sources(workflow);
create index if not exists compliance_sources_authority_idx on public.compliance_sources(authority);
create index if not exists compliance_sources_review_status_idx on public.compliance_sources(review_status);
create index if not exists compliance_documents_source_id_idx on public.compliance_documents(source_id);
create index if not exists compliance_chunks_source_id_idx on public.compliance_chunks(source_id);
create index if not exists compliance_chunks_document_id_idx on public.compliance_chunks(document_id);
create index if not exists compliance_chunks_search_vector_idx on public.compliance_chunks using gin(search_vector);
create index if not exists compliance_chunks_embedding_hnsw_idx on public.compliance_chunks
using hnsw (embedding extensions.vector_cosine_ops)
where embedding is not null;
create index if not exists compliance_advisory_audits_created_at_idx on public.compliance_advisory_audits(created_at);
create index if not exists compliance_advisory_audits_workflow_idx on public.compliance_advisory_audits(workflow);
create index if not exists location_units_location_id_idx on public.location_units(location_id);
create index if not exists location_units_status_idx on public.location_units(status);
create index if not exists job_unit_audit_items_job_id_idx on public.job_unit_audit_items(job_id);
create index if not exists job_unit_audit_items_location_unit_id_idx on public.job_unit_audit_items(location_unit_id);
create index if not exists job_unit_audit_items_status_idx on public.job_unit_audit_items(status);

grant select, insert, update, delete on table public.compliance_sources to authenticated, service_role;
grant select, insert, update, delete on table public.compliance_documents to authenticated, service_role;
grant select, insert, update, delete on table public.compliance_chunks to authenticated, service_role;
grant select, insert, update, delete on table public.compliance_advisory_audits to authenticated, service_role;
grant select, insert, update, delete on table public.location_units to authenticated, service_role;
grant select, insert, update, delete on table public.job_unit_audit_items to authenticated, service_role;

drop trigger if exists compliance_sources_set_updated_at on public.compliance_sources;
create trigger compliance_sources_set_updated_at
before update on public.compliance_sources
for each row execute function public.set_updated_at();

drop trigger if exists compliance_documents_set_updated_at on public.compliance_documents;
create trigger compliance_documents_set_updated_at
before update on public.compliance_documents
for each row execute function public.set_updated_at();

drop trigger if exists compliance_chunks_set_updated_at on public.compliance_chunks;
create trigger compliance_chunks_set_updated_at
before update on public.compliance_chunks
for each row execute function public.set_updated_at();

drop trigger if exists location_units_set_updated_at on public.location_units;
create trigger location_units_set_updated_at
before update on public.location_units
for each row execute function public.set_updated_at();

drop trigger if exists job_unit_audit_items_set_updated_at on public.job_unit_audit_items;
create trigger job_unit_audit_items_set_updated_at
before update on public.job_unit_audit_items
for each row execute function public.set_updated_at();

create or replace function public.match_compliance_chunks(
  query_embedding extensions.vector(1536),
  match_count integer default 8,
  workflow_filter text default null,
  authority_filter text default null
)
returns table (
  id uuid,
  source_id uuid,
  document_id uuid,
  chunk_index integer,
  heading text,
  content text,
  tokens_estimate integer,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  similarity double precision,
  source jsonb,
  document jsonb
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    chunks.id,
    chunks.source_id,
    chunks.document_id,
    chunks.chunk_index,
    chunks.heading,
    chunks.content,
    chunks.tokens_estimate,
    chunks.metadata,
    chunks.created_at,
    chunks.updated_at,
    1 - (chunks.embedding <=> query_embedding) as similarity,
    to_jsonb(sources.*) as source,
    to_jsonb(documents.*) as document
  from public.compliance_chunks chunks
  join public.compliance_sources sources on sources.id = chunks.source_id
  join public.compliance_documents documents on documents.id = chunks.document_id
  where chunks.embedding is not null
    and sources.review_status = 'reviewed'
    and documents.review_status = 'reviewed'
    and (workflow_filter is null or sources.workflow = workflow_filter)
    and (authority_filter is null or sources.authority = authority_filter)
  order by chunks.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

grant execute on function public.match_compliance_chunks(
  extensions.vector,
  integer,
  text,
  text
) to authenticated, service_role;

alter table public.compliance_sources enable row level security;
alter table public.compliance_documents enable row level security;
alter table public.compliance_chunks enable row level security;
alter table public.compliance_advisory_audits enable row level security;
alter table public.location_units enable row level security;
alter table public.job_unit_audit_items enable row level security;

drop policy if exists "admins manage compliance sources" on public.compliance_sources;
create policy "admins manage compliance sources"
on public.compliance_sources
for all
to authenticated
using ((select private.has_admin_access()))
with check ((select private.has_admin_access()));

drop policy if exists "admins manage compliance documents" on public.compliance_documents;
create policy "admins manage compliance documents"
on public.compliance_documents
for all
to authenticated
using ((select private.has_admin_access()))
with check ((select private.has_admin_access()));

drop policy if exists "admins manage compliance chunks" on public.compliance_chunks;
create policy "admins manage compliance chunks"
on public.compliance_chunks
for all
to authenticated
using ((select private.has_admin_access()))
with check ((select private.has_admin_access()));

drop policy if exists "admins manage compliance advisory audits" on public.compliance_advisory_audits;
create policy "admins manage compliance advisory audits"
on public.compliance_advisory_audits
for all
to authenticated
using ((select private.has_admin_access()))
with check ((select private.has_admin_access()));

drop policy if exists "admins manage location units" on public.location_units;
create policy "admins manage location units"
on public.location_units
for all
to authenticated
using ((select private.has_admin_access()))
with check ((select private.has_admin_access()));

drop policy if exists "technicians read assigned location units" on public.location_units;
create policy "technicians read assigned location units"
on public.location_units
for select
to authenticated
using (
  exists (
    select 1
    from public.jobs
    where jobs.location_id = location_units.location_id
      and jobs.assigned_tech_id = (select auth.uid())
  )
);

drop policy if exists "admins manage job unit audit items" on public.job_unit_audit_items;
create policy "admins manage job unit audit items"
on public.job_unit_audit_items
for all
to authenticated
using ((select private.has_admin_access()))
with check ((select private.has_admin_access()));

drop policy if exists "technicians read assigned job unit audit items" on public.job_unit_audit_items;
create policy "technicians read assigned job unit audit items"
on public.job_unit_audit_items
for select
to authenticated
using (
  exists (
    select 1
    from public.jobs
    where jobs.id = job_unit_audit_items.job_id
      and jobs.assigned_tech_id = (select auth.uid())
  )
);

drop policy if exists "technicians insert assigned job unit audit items" on public.job_unit_audit_items;
create policy "technicians insert assigned job unit audit items"
on public.job_unit_audit_items
for insert
to authenticated
with check (
  audited_by = (select auth.uid())
  and exists (
    select 1
    from public.jobs
    where jobs.id = job_unit_audit_items.job_id
      and jobs.assigned_tech_id = (select auth.uid())
  )
);

drop policy if exists "technicians update assigned job unit audit items" on public.job_unit_audit_items;
create policy "technicians update assigned job unit audit items"
on public.job_unit_audit_items
for update
to authenticated
using (
  exists (
    select 1
    from public.jobs
    where jobs.id = job_unit_audit_items.job_id
      and jobs.assigned_tech_id = (select auth.uid())
  )
)
with check (
  audited_by = (select auth.uid())
  and exists (
    select 1
    from public.jobs
    where jobs.id = job_unit_audit_items.job_id
      and jobs.assigned_tech_id = (select auth.uid())
  )
);
