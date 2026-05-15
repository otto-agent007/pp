# Implementation Plan

## Current Priority: Demo Smoke Preflight V1

1. Add a read-only `demo:smoke` preflight before local or protected-preview demo smoke.
2. Keep the preflight helper in `packages/domain` so readiness, blockers, seed summary, safe commands, and sanitized evidence prompts are testable without app or Supabase access.
3. Keep all write paths in the existing `demo:seed`, `demo:reset`, dashboard Demo data panel, and localhost demo login flows.
4. Require local smoke to name `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`, while refusing non-local Supabase URLs for `--target local`.
5. For protected preview, report shell seed readiness separately from the required operator-approved preview browser access and admin/dispatcher sign-in path.
6. Never print env values, service-role keys, credentials, bypass URLs, portal raw tokens, or provider payloads.
7. Include local tooling or critique scratch only when explicitly requested, and keep secrets, credentials, protected preview URLs, and provider payloads out of committed artifacts.

## Next Decision Points

1. Run `corepack pnpm demo:smoke -- --target local` before local seed/reset or Browser smoke.
2. Operator loads approved preview Supabase credentials in their shell, then runs `corepack pnpm demo:smoke -- --target preview --base-url <protected-preview-url>`.
3. Operator optionally sets `DEMO_TECH_PASSWORD` and passes `--tech-password-env DEMO_TECH_PASSWORD` to both smoke preflight and preview seed commands when technician login demos are needed.
4. Run authenticated preview smoke against the seeded demo story and record sanitized findings in `docs/PREVIEW_SMOKE_FINDINGS.md`.
5. Decide whether demo seed should later get richer fixture variants or stay as the current dashboard-plus-CLI workflow.
