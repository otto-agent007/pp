# Implementation Plan

## Current Priority: Production Smoke Checklist V1

1. Add a shared smoke checklist contract.
2. Cover auth, customer/location, job, portal, scheduler, and billing checks.
3. Keep the checklist documentation-only; do not run live smoke tests automatically.
4. Surface the checklist in readiness tracking.
5. Add focused domain/docs tests.
6. Update `tasks/in-progress.md` after each completed slice.

## Guardrails

- UI components must not call Supabase directly.
- Keep mobile write paths offline-safe.
- Shared types belong in `packages/types`.
- Business logic belongs in shared packages, not app components.
