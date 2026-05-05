# Implementation Plan

## Current Priority: Customer CRUD

1. Define customer and location contracts in `packages/types`.
2. Add customer data functions in `packages/api-client`.
3. Add customer domain validation and normalization in `packages/domain/customers`.
4. Add React Query hooks for list, create, update, and delete/archive.
5. Build the admin customer list screen in `apps/web`.
6. Build create and edit forms with optimistic mutations.
7. Add focused tests once the test runner is introduced.
8. Update `tasks/in-progress.md` after each completed slice.

## Guardrails

- UI components must not call Supabase directly.
- Keep mobile write paths offline-safe.
- Shared types belong in `packages/types`.
- Business logic belongs in shared packages, not app components.
