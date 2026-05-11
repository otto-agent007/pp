# Implementation Plan

## Current Priority: Portal Revoke Confirmation V1 Cleanup

1. Commit the completed portal revoke confirmation slice with Claude proposal and critique markers.
2. Leave `tools/` untouched because it is unrelated local MCP/tooling scratch.
3. Start the next safe no-provider, no-migration slice from the remaining portal follow-up candidates.

## Recently Completed: Portal Revoke Confirmation V1

1. Captured Claude's portal revoke confirmation proposal plus Codex's Adopt/Adapt/Defer/Reject review marker.
2. Added an inline confirmation step before active portal links can be revoked from `/customers`.
3. Added state-aware confirmation copy for no-expiration, expiring, never-opened, and opened portal links.
4. Preserved existing generate/copy/manual-share behavior, React Query hooks, API route boundaries, optimistic revoke rollback, and token schema.
5. Applied Claude's critique fix so Cancel returns focus to the triggering Revoke button.
6. Verified with focused portal-link tests, repository test, typecheck, lint, build, and diff whitespace checks.

## Recently Completed: Customer Ledger Drill-Down V1

1. Captured Claude's customer ledger proposal plus Codex's Adopt/Adapt/Defer/Reject review marker.
2. Expanded the `/customers` account ledger into an inline drill-down with all/services/invoices/open/review filters.
3. Added row-level service and billing actions for jobs, closeouts, invoices, receipts, and payment review.
4. Applied Claude's post-implementation critique with compact review copy, zero-balance pill cleanup, directional action copy, and an intentional Open-filter note.
5. Preserved existing React Query data flow, shared domain ledger helpers, API-client boundaries, and no-migration/provider-free scope.
6. Verified with focused customer tests, repository test, typecheck, lint, build, and diff whitespace checks.

## Recently Completed: Portal Share/Resend UI Polish V1 Critique Patch

1. Applied Claude's portal share/resend critique with copy polish, duplicate readiness chip removal, denser token rows, copy-again flash, generate-new focus return, and row-scoped revoke pending state.
2. Added `codex-critique-review.md` markers for reviewed Claude critiques so the relay watcher skips completed critique intake.
3. Verified with repository test, typecheck, lint, build, browser gut-check, and diff whitespace checks.

## Recently Completed: Portal Share/Resend UI Polish V1

1. Created the Claude design relay brief for portal sharing and captured Claude's proposal plus Codex's Adopt/Adapt/Defer/Reject review.
2. Updated the design relay convention so reviewed proposals get a durable `codex-review.md` marker before watcher runs skip them.
3. Reworked `CustomerPortalLinks` around compact readiness, manual generate/copy/share states, clipboard fallback, generated-link session copy, and dense token audit rows.
4. Preserved existing portal access token schema, API-client hooks, server boundaries, raw-token handling, and provider-free/manual-share scope.
5. Stabilized the dispatch calendar test clock after full-suite verification exposed a date-sensitive fixture week.
6. Verified with repository test, typecheck, lint, build, and diff whitespace checks.

## Recently Completed: Next Five Portal + Ledger Batch V1

1. Added shared portal-token readiness helpers and admin readiness summaries for generated customer portal links.
2. Added domain-only customer ledger entries, summaries, and billing/portal next-action helpers from existing customers, jobs, invoices, and payments.
3. Added active customer ledger summaries and recent account activity on `/customers` while preserving CRUD, archive, search, and portal-link generation behavior.
4. Added a customer-safe tokened portal timeline from existing portal closeout and billing payloads.
5. Added closeouts, payments, and customers handoff polish for create invoice, review payment, share portal, and open customer ledger paths.
6. Preserved API-client/domain boundaries and avoided migrations, provider setup, provider IDs, service-role data, admin notes, and raw storage paths.

## Recently Completed: Bilingual Field Copy V1

1. Added shared English/Spanish technician copy in `packages/i18n` for mobile field status, location, chemical, photo, signature, and treatment capture surfaces.
2. Wired mobile field capture components and route status labels through the existing language store.
3. Added a compact mobile header language toggle for technician switching.
4. Preserved existing offline queue, draft, capture, and sync contracts without migrations, provider changes, or production mutations.
5. Verified with repository test, typecheck, lint, and build commands.

## Recently Completed: Payment Reconciliation Polish V1

1. Added shared invoice reconciliation helpers for paid totals, balances, latest payment dates, review labels, and status classification.
2. Classified draft, awaiting payment, partially paid, reconciled paid, manually marked paid, needs-review, and void invoice states without schema changes.
3. Added `/payments` reconciliation labels, paid/balance copy, latest payment dates, a needs-review counter, and a reconciliation status filter.
4. Preserved invoice creation, payment-link creation, mark-paid, void, search, status filters, and the closeouts handoff strip.
5. Verified with repository test, typecheck, lint, and build commands.

## Recently Completed: Billing Work Queue V1

1. Added aggregate closeout capture summaries through `packages/api-client` for completed-job forms, chemical logs, photos, and signatures.
2. Added shared billing queue grouping, counts, invoice selection, and sorting in `packages/domain`.
3. Retitled `/closeouts` to Billing work queue with counter filters, grouped sections, and next-action states.
4. Added the `/payments` From closeouts handoff strip while preserving `?job_id=` invoice preselection.
5. Verified with repository test, typecheck, lint, and build commands.

## Recently Completed: Field Ops + Billing Handoff Batch V1

1. Persisted mobile offline queue and draft stores across app restarts without changing queue contracts.
2. Added route-stop focus and completion readiness guard behavior to the mobile route flow.
3. Added per-job sync triage labels so queued/retrying/synced/failed work is visible by route stop.
4. Added closeout-to-invoice query-param handoff while preserving the existing invoice model and provider boundaries.
5. Verified the full batch with repository test, typecheck, lint, and build commands.

## Recently Completed: Daily Route Timeline + Field Ops Handoff V1

1. Landed Daily Route Timeline V1 as the baseline for current, next, and later mobile route stops.
2. Persisted mobile offline queue and draft stores across app restarts without changing queue contracts.
3. Added route-stop focus and completion readiness guard behavior to the mobile route flow.
4. Added per-job sync triage labels so queued/retrying/synced/failed work is visible by route stop.
5. Added closeout-to-invoice query-param handoff while preserving the existing invoice model and provider boundaries.

## Recently Completed: Field Workflow Batch V1

1. Connected mobile job work-plan readiness across status, geofence, chemical, photo, signature, and treatment form captures.
2. Added capture-specific mobile queue labels while preserving the existing offline queue storage and sync worker.
3. Summarized closeout review readiness for office billing handoff.
4. Showed customer-safe portal service summaries with capture counts, service date, location, and invoice state.
5. Extended production smoke guidance for mobile captures and closeout review.

## Recently Completed: Mobile Technician Demo Readiness V1

1. Merged the mobile demo-readiness PR into `main`.
2. Added the technician readiness panel and assigned-job card polish.
3. Clarified queued and synced states for mobile field captures.
4. Added manual mobile technician smoke guidance to production readiness docs.

## Deferred Platform Hardening: Supabase Pro Feature

1. Supabase leaked password protection is a Pro-plan feature.
2. Keep `auth_leaked_password_protection` advisor findings documented as deferred unless the project moves to Supabase Pro.
3. Continue treating security and performance advisors as routine post-migration checks.

## Recently Completed: Demo/Ops Polish Batch V1

1. Merged PR #18 into `main`.
2. Added the home readiness snapshot for the manual smoke checklist and remaining dashboard action.
3. Polished customer and job save-success handoffs.
4. Clarified dispatch, closeout, payments, and automation demo finish states.
5. Kept the batch free of migrations, seed data, env changes, and production mutations.

## Recently Completed: Ops Demo Readiness V1

1. Merged PR #17 into `main`.
2. Added the signed-in home dashboard demo workflow as the command center.
3. Kept the workflow static, live-data safe, and free of seed behavior.
4. Left leaked password protection as the remaining Supabase dashboard-only hardening action.

## Recently Completed: Live Admin Smoke Test V1

1. Confirmed the latest `main` deployment is live on Vercel.
2. Reran Supabase advisors after the production hardening migration.
3. Confirmed performance advisors report no issues.
4. Verified admin sign-in, technicians, customer/location/job creation, dispatch, closeouts, automation, and payments manually with operator assistance.
5. Verified customer portal token behavior: tokened closeout and billing APIs returned `200`, while missing-token calls returned `401`.

## Recently Completed: Supabase Security Hardening V1

1. Merged PR #14 into `main`.
2. Applied `20260507220000_supabase_security_hardening_v1.sql` to production after explicit approval.
3. Repaired the duplicate technicians migration history drift and aligned local and remote migrations.
4. Moved internal admin and chemical-stock helpers out of public RPC reach.
5. Removed the temporary auth diagnostics route.

## Guardrails

- UI components must not call Supabase directly.
- Keep mobile write paths offline-safe.
- Shared types belong in `packages/types`.
- Business logic belongs in shared packages, not app components.
- Do not apply production migrations without explicit approval.
