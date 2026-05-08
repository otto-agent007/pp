# Implementation Plan

## Current Priority: Pick Next Follow-Up Slice

1. Field Ops + Billing Handoff Batch V1 is implemented and verified.
2. Keep future work aligned with AGENTS guardrails: shared domain logic, API-client data boundaries, React Query server state, and offline-safe mobile writes.
3. Treat Claude as external UI design input for future UI polish, while Codex owns architecture, data flow, offline safety, tests, integration, and verification.
4. Favor one of the next follow-up candidates: bilingual field copy, billing work queue, payment reconciliation polish, portal readiness polish, or customer ledger.
5. Continue avoiding production migrations, provider config, Supabase dashboard changes, or production mutations without explicit approval.

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
