# Implementation Plan

## Current Priority: Stripe Test Mode Readiness V1

1. Show payment setup guidance on `/payments`.
2. Name the server-only Stripe env vars without exposing values.
3. Clarify that Stripe can remain optional for non-payment demos.
4. Preserve current invoice/payment behavior.
5. Add focused payments UI tests.
6. Update `tasks/in-progress.md` after each completed slice.

## Guardrails

- UI components must not call Supabase directly.
- Keep mobile write paths offline-safe.
- Shared types belong in `packages/types`.
- Business logic belongs in shared packages, not app components.
