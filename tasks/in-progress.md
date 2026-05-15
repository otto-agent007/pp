# In Progress

## Task: Preview Demo Smoke Handoff V1

Goal:
Keep preview launch readiness and demo smoke tooling aligned so operators can run safe local or protected-preview smoke without committing secrets, provider payloads, or production data.

Steps:
- [x] Confirm PR #27 and PR #29 readiness work is merged into `origin/main`.
- [x] Preserve portal send critique cleanup, dispatch technician query-param preselection, readiness docs, and preview preflight findings from `origin/main`.
- [x] Add a domain-backed demo smoke preflight helper with target, ready/blocked state, missing env names, seed summary, safe next commands, and sanitized evidence prompts.
- [x] Add root `demo:smoke`, `demo:seed`, and `demo:reset` commands with local/preview guardrails.
- [x] Keep `demo:smoke` read-only and keep seed/reset writes behind explicit confirmation, local URL safety, preview handoff gating, and server-side service-role boundaries.
- [x] Add a local no-env browser demo fallback that loads typed fixture data when local seed/login is blocked by missing Supabase env.
- [x] Fold local GitHub MCP tooling and critique notes into the cleanup request without committing secrets or protected preview values.
- [x] Run focused tests, blocked CLI preflight, and full verification.

Follow-up candidates:
- [ ] Operator runs local seed/reset with approved local Supabase credentials.
- [ ] Operator runs preview seed from the dashboard or a protected shell with preview Supabase credentials.
- [ ] Operator optionally supplies `DEMO_TECH_PASSWORD` for technician login demos.
- [ ] Run authenticated preview smoke against the seeded story and record sanitized findings.
- [ ] Decide whether portal delivery receipts, richer provider failure states, or production launch checklist work should be next after webhook-backed evidence exists.

Status:
Preview launch readiness is caught up with the latest `origin/main` baseline and demo seed/smoke tooling is ready for operator-assisted local or protected-preview smoke. Provider setup, secret mutation, production data mutation, and migration application remain operator-approved only.
