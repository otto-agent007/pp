# Implementation Plan

## Current Priority: Live Admin Smoke Test V1

1. Confirm the latest `main` deployment is live on Vercel.
2. Rerun Supabase security and performance advisors after the production hardening migration.
3. Enable leaked password protection in Supabase Auth settings.
4. Sign in as an admin and confirm protected admin routes load.
5. Invite or verify a technician through `/technicians` and the `/technician-login` setup flow.
6. Create a smoke-test customer, location, and scheduled job assigned to the technician.
7. Verify `/dispatch`, `/closeouts`, `/portal`, `/automation`, and `/payments` remain usable without exposing secrets.

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
