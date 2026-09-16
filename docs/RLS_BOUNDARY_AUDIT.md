# RLS Boundary Audit V1

This audit is a static, read-only boundary map for Pest Patrol OS before
production. It does not replace Supabase Advisor output or live RLS tests
against an approved target.

## Role Boundary Map

| Role | Expected access boundary |
| --- | --- |
| `anon` | No direct read or write access to operational tables. Public API routes may accept unauthenticated requests only when they validate portal grants, webhook signatures, or route-specific secrets before service-role work. |
| Authenticated admin | Full office-management access for customers, locations, jobs, closeouts, invoices, payments, notifications, technicians, inventory, and compliance review surfaces. |
| Authenticated dispatcher | Office workflow access for scheduling, customer coordination, closeouts, notifications, and billing support as intended by staff UI and RLS policies. |
| Authenticated technician | Assigned-job access only, plus related forms, job media, chemical logs, geofence events, and technician-owned credential readiness needed for field execution. No unrelated customer, invoice, credential, portal-token, compliance-source, or admin-note access. |
| Customer portal session | One-customer scope only after portal session validation. Output must remain customer-safe: no internal compliance warnings, raw GPS coordinates, provider internals, raw portal grants, raw token hashes, service-role details, or admin notes. |
| Service-role server routes | Server-only. Every service-role path must be guarded by admin auth, validated portal session/customer scope, Stripe signature verification, provider webhook secret/signature validation, or cron/manual scheduler secret validation. |

## Sensitive Data Boundaries

| Data surface | Boundary expectation |
| --- | --- |
| `profiles` | Staff/auth role metadata only; no anon access. |
| `customers`, `locations` | Staff and assigned technician access only; portal output is scoped to the active customer session. |
| `jobs` | Staff can manage office jobs; technicians see assigned jobs; portal sessions see completed/customer-safe summaries only. |
| `job_media` | Private operational media by default. Customer portal media must be explicitly customer-safe through route/selectors and signed URLs; bucket/path metadata must not be exposed in portal DTOs. |
| `job_form_submissions` | Staff and assigned technician workflow records only; customer portal output must stay proof-oriented and customer-safe. |
| `chemical_inventory`, `chemical_logs` | Staff and assigned-job technician execution records only; compliance copy is advisory, not customer-facing legal certification. Every technician-written log stamps `logged_by`, because the insert trigger moves inventory and `job_id` names the job rather than the person. |
| `invoices`, `payments` | Staff billing access; customer portal billing is scoped to one customer and excludes provider internals. |
| `notification_events` | Staff/provider workflow state only; provider payloads and secrets stay server-side. |
| `customer_portal_access_tokens`, `customer_portal_sessions` | Service-role server validation only; anon and browser clients must never read raw grants, hashes, cookies, or session internals. |
| `technician_licenses` | Staff and technician-owned credential readiness only; no anon or unrelated technician access. |
| `compliance_sources`, `compliance_documents`, `compliance_chunks`, `compliance_advisory_audits` | Staff-side advisory surfaces only. Source material, embeddings, advisory warnings, and setup errors are not customer portal output. |
| `job_location_events` | Staff read the whole arrival/departure trail. A technician reads only the events they recorded themselves, and only while still assigned: the rows are one named person's location history, so scoping them to the job's current assignee handed the trail over on every reassignment. Exact GPS coordinates are not customer portal output. |
| `location_units` | Per-address records that outlive any one job. Staff read all of them; a technician reads the units at an address only while holding an open job there (`scheduled`, `en_route`, `in_progress`), because an unbounded join to `jobs` turned one past visit into permanent access to every unit's service notes at that address. |
| WDO/Escrow readiness surfaces | Staff-side readiness/advisory workflow. Customer-facing proof must be intentionally selected and must not include internal warnings or raw compliance analysis. |

## Static Audit Tool

`tooling/rls-boundary-audit.ts` reads `supabase/migrations/*.sql` and reports
conservative findings for:

The first three rules read the concatenated SQL. The rest read the *effective*
policy set, which the tool computes by replaying every `drop policy` and
`create policy` in migration order -- a policy that was weak in 2026-05 and
rewritten in 2026-09 still has its old text sitting in the older file, so the
concatenated SQL cannot answer what a fresh database actually ends up with.

- `missing_rls_enablement` -- sensitive tables referenced without static RLS
  enablement evidence
- `anon_sensitive_grant` -- grants to `anon` on sensitive operational tables
- `sensitive_using_true` -- unconditional `using (true)` policies on sensitive
  tables
- `public_rpc_grant` -- `public` or `anon` RPC execute grants that need explicit
  review
- `technician_policy_missing_status_check` -- an effective policy reaching rows
  through `jobs.assigned_tech_id` without `private.has_active_profile()`, so a
  deactivated technician keeps every job still assigned to them
- `personal_policy_missing_author_check` -- an effective policy on a table whose
  rows are one person's personal record (`job_location_events.recorded_by`)
  reaching them through assignment alone, so reassigning a job exposes the
  previous assignee's rows
- `insert_policy_missing_author_stamp` -- an insert policy letting an assigned
  technician write a row without stamping the column that names the writer
  (`chemical_logs.logged_by`, `job_location_events.recorded_by`,
  `job_unit_audit_items.audited_by`). `job_id` says which job a row belongs to,
  not who produced it, so without it an abusive or mistaken write cannot be
  traced to a person. Only insert policies are checked: the matching read is
  usually meant to be wider than the author, since an admin may write a row on
  a technician's behalf.
- `policy_name_truncation_collision` -- two policy names on one table that
  truncate to the same 63-byte identifier. Postgres truncates silently, and six
  policy names in this repo are already over the limit, so the name in the
  migration file is not always the name in the database. A collision means a
  `drop policy` aimed at one policy removes another.

Every code above is asserted to appear in this document by
`tooling/rls-boundary-audit.test.ts`, so a new rule cannot ship undocumented.

Run the focused test with:

```bash
corepack pnpm exec vitest run tooling/rls-boundary-audit.test.ts
```

## Operator Runbook

- Apply migrations only to an explicitly approved Supabase target.
- Rerun Supabase Security and Performance Advisors after approved migration
  application.
- Resolve SECURITY DEFINER warnings or document an intentional acceptance with
  the function, role grants, and route-level guard.
- Enable leaked-password protection before production.
- Verify RLS behavior against an approved Supabase target; this static audit is
  not complete production evidence by itself.
- Verify private storage bucket posture for job media and use signed URLs with
  expirations for staff and portal previews.
