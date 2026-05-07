# Implementation Plan

## Current Priority: Demo Data Entry Helpers V1

1. Add concise customer setup guidance.
2. Add concise job scheduling guidance.
3. Link helpers to the next workflow surface.
4. Keep helpers informational only; do not auto-create records.
5. Add focused customer and job UI tests.
6. Update `tasks/in-progress.md` after each completed slice.

## Guardrails

- UI components must not call Supabase directly.
- Keep mobile write paths offline-safe.
- Shared types belong in `packages/types`.
- Business logic belongs in shared packages, not app components.
