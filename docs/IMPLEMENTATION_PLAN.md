# Implementation Plan

## Current Priority: Demo/Ops Polish Batch V1

1. Add a compact readiness snapshot to the signed-in home dashboard.
2. Polish customer and job demo guidance so operators know the next action after saves.
3. Clarify dispatch and closeout handoffs for scheduled and completed jobs.
4. Tighten payments and automation finish-line copy for optional provider setup.
5. Avoid migrations, seed data, production mutations, and direct Supabase calls from UI components.

## Current Follow-Up: Supabase Auth Dashboard Hardening

1. Enable leaked password protection in Supabase Auth settings.
2. Rerun Supabase security advisors and confirm `auth_leaked_password_protection` clears.
3. Keep performance advisors as a routine post-migration check.

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
