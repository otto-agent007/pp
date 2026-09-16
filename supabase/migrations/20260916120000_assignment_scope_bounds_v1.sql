-- Assignment-scope bounds (2026-09-10 security review follow-up).
--
-- Two reads and one write that derive from "this technician is assigned to a
-- job" without bounding what that entitles them to. Same family as
-- 20260915190000, which stopped a reassignment handing over a GPS trail.

-- 1. chemical_logs has no author column.
--
-- The insert policy lets any active technician with any assigned job write a
-- log against any chemical in the inventory, and the stock trigger deducts
-- what the log claims. The trigger refuses to go negative, so the floor is
-- zero rather than nonsense, but a technician can still zero an item -- and
-- with no author column nothing records who did, because job_id names the job,
-- not the person. Every other technician-written table in this schema stamps
-- its author (job_location_events.recorded_by, job_unit_audit_items.audited_by);
-- this one was missed.
--
-- Existing rows get null: we genuinely do not know who wrote them, and a
-- backfill guessing from jobs.assigned_tech_id would invent attribution for
-- records that may predate the current assignee.
--
-- Deliberately NOT added: a per-log cap on amount_used. Any number would be an
-- invented business rule, and "how much of one chemical may a single visit
-- consume" is the office's call, not this migration's. Attribution is what
-- turns an unbounded write into an accountable one.

alter table public.chemical_logs
add column if not exists logged_by uuid references auth.users(id) on delete set null;

-- The column stamps itself. createChemicalLogRecord builds its row from
-- ChemicalLogInput and omits logged_by entirely, and chemical logs are written
-- through the mobile offline queue, which replays a row captured minutes or
-- hours earlier -- so requiring the client to supply the id would mean an
-- auth round trip inside the queue, and getting it wrong would reject every
-- technician log rather than merely leaving it unattributed. A default reads
-- the caller's own JWT at insert time, which is the value the policy below
-- demands. Service-role writes (the demo seed) get null and fall under the
-- admin branch, which does not require it.
--
-- A default does not touch existing rows, which is what we want: they stay
-- null rather than gaining invented attribution.
alter table public.chemical_logs
alter column logged_by set default auth.uid();

create index if not exists chemical_logs_logged_by_idx
on public.chemical_logs(logged_by);

drop policy if exists "chemical logs are insertable by admins or assigned technicians"
  on public.chemical_logs;
create policy "chemical logs are insertable by admins or assigned technicians"
on public.chemical_logs
for insert
to authenticated
with check (
  (select private.has_admin_access())
  or (
    (select private.has_active_profile())
    and logged_by = (select auth.uid())
    and exists (
      select 1
      from public.jobs
      where jobs.id = chemical_logs.job_id
        and jobs.assigned_tech_id = (select auth.uid())
    )
  )
);

-- The read stays as it was. A technician reads every log on a job they are
-- assigned to, including one an admin wrote on their behalf, so constraining
-- logged_by on select would hide records they are supposed to see.

-- 2. location_units is readable for any job the technician was ever assigned.
--
-- The predicate matched on jobs.location_id with no bound on the job, so one
-- visit to an address in 2024 granted permanent read of every unit at that
-- address and its service notes -- including units serviced by other
-- technicians long afterwards. Units are per-address records that outlive any
-- single job, which is what makes an unbounded join to jobs the wrong shape.
--
-- Visibility now ends when the job closes. This is deliberately stricter than
-- the job_location_events fix, where a technician keeps reading their own
-- rows: there, the rows are theirs; here, the rows belong to the address.
--
-- Nothing reads this as a technician today -- location_units appears in the
-- client only inside complianceSchemaObjectNames, a schema-readiness probe --
-- so the tightening has no surface to break. If closeout paperwork later needs
-- unit names after completion, the answer is a bound on scheduled_start, not a
-- return to all history.

drop policy if exists "technicians read assigned location units"
  on public.location_units;
create policy "technicians read assigned location units"
on public.location_units
for select
to authenticated
using (
  (select private.has_active_profile())
  and exists (
    select 1
    from public.jobs
    where jobs.location_id = location_units.location_id
      and jobs.assigned_tech_id = (select auth.uid())
      and jobs.status in ('scheduled', 'en_route', 'in_progress')
  )
);
