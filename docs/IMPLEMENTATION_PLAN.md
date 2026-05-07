# Implementation Plan

## Current Priority: Supabase Security Hardening V1

1. Move internal Supabase helper logic out of public RPC reach.
2. Revoke direct execution of platform `SECURITY DEFINER` helpers that remain in public.
3. Add missing foreign-key indexes reported by Supabase advisors.
4. Rewrite RLS policies to avoid per-row auth initialization where practical.
5. Remove the temporary auth diagnostics route.
6. Record dashboard-only leaked password protection as an operator action.
7. After merge and explicit approval, apply the migration and rerun Supabase advisors.

## Guardrails

- UI components must not call Supabase directly.
- Keep mobile write paths offline-safe.
- Shared types belong in `packages/types`.
- Business logic belongs in shared packages, not app components.
- Do not apply production migrations without explicit approval.
