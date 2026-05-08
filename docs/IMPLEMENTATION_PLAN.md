# Implementation Plan

## Current Priority: Mobile Technician Demo Readiness V1

1. Make the mobile technician demo path easy to follow from login through assigned job review.
2. Clarify queued and synced states for status writes, forms, chemical logs, photos, signatures, and geofencing.
3. Keep all mobile write paths offline-first and retry-safe.
4. Avoid new migrations unless the slice uncovers a concrete schema gap.

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
