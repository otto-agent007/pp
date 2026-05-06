# Implementation Plan

## Current Priority: Notification Delivery Retry Policy V1

1. Add a domain helper that classifies notification retry state.
2. Treat `not_sent` and low-attempt `failed` reminders as retryable.
3. Treat over-attempt failed reminders as manual review.
4. Show retry state on `/automation` notification cards.
5. Keep provider calls and scheduler behavior unchanged.
6. Add focused domain and UI tests.
7. Keep campaigns, background delivery workers, and provider-specific SDKs out of this slice.
8. Update `tasks/in-progress.md` after each completed slice.

## Guardrails

- UI components must not call Supabase directly.
- Keep mobile write paths offline-safe.
- Shared types belong in `packages/types`.
- Business logic belongs in shared packages, not app components.
