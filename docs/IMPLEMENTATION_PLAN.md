# Implementation Plan

## Current Priority: Preview Demo Smoke Handoff

1. Use `docs/PREVIEW_LAUNCH_READINESS.md` as the launch punch list and `docs/PRODUCTION_READINESS.md` as the longer setup and smoke-test reference.
2. Keep provider dashboard changes, environment variable mutations, production data mutations, and migration application operator-approved only.
3. Current baseline includes portal send critique cleanup, dispatch technician preselection from `/dispatch?technician=...`, a Ready Vercel preview, and aligned Supabase migrations through `20260513120000_portal_send_audit_events_v1.sql`.
4. Run the read-only `demo:smoke` preflight before local or protected-preview seed/reset/browser smoke.
5. Keep seed/reset writes in `demo:seed`, `demo:reset`, the dashboard Demo data panel, and the localhost demo login path.
6. Require local seed/smoke to point at a local Supabase URL, and never print env values, service-role keys, credentials, bypass URLs, portal raw tokens, or provider payloads.
7. Include local tooling or critique scratch only when explicitly requested, and keep secrets, credentials, protected preview URLs, and provider payloads out of committed artifacts.

## Next Decision Points

1. Run `corepack pnpm demo:smoke -- --target local` before local seed/reset or Browser smoke.
2. Operator loads approved preview Supabase credentials in their shell, then runs `corepack pnpm demo:smoke -- --target preview --base-url <protected-preview-url>`.
3. Operator optionally sets `DEMO_TECH_PASSWORD` and passes `--tech-password-env DEMO_TECH_PASSWORD` to both smoke preflight and preview seed commands when technician login demos are needed.
4. Run authenticated preview smoke against the seeded demo story and record sanitized findings in `docs/PREVIEW_SMOKE_FINDINGS.md`.
5. Decide whether provider delivery receipts, richer provider failure states, or production launch checklist work should be the next product slice after operator-assisted webhook smoke testing.
