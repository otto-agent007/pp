# Implementation Plan

## Current Priority: Customer/Ops Demo Readiness V1

1. Define the smallest customer-to-closeout demo workflow.
2. Identify missing UI affordances that would slow an ops demo.
3. Keep fake production seed data out unless explicitly requested.
4. Leave Stripe and notification provider integration optional until needed.
5. Run production smoke testing when admin login credentials are ready.
6. Update `tasks/in-progress.md` after each completed slice.

## Guardrails

- UI components must not call Supabase directly.
- Keep mobile write paths offline-safe.
- Shared types belong in `packages/types`.
- Business logic belongs in shared packages, not app components.
