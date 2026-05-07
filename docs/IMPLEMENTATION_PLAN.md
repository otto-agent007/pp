# Implementation Plan

## Current Priority: Live Admin Smoke Test V1

1. Reset or confirm the first admin password privately.
2. Sign in to the production admin shell.
3. Create a real customer with one active service location.
4. Invite a technician from `/technicians` and confirm the invite uses `/technician-login`.
5. Create a scheduled job against that customer/location and assigned technician.
6. Generate portal access and verify token-protected portal loading.
7. Run the scheduler smoke path and confirm `/payments` setup guidance is visible.
8. Record smoke-test results without storing credentials or secrets.

## Guardrails

- UI components must not call Supabase directly.
- Keep mobile write paths offline-safe.
- Shared types belong in `packages/types`.
- Business logic belongs in shared packages, not app components.
