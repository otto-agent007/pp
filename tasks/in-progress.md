# In Progress

## Task: Demo Smoke Preflight V1

Goal:
Add a read-only preflight path for local and protected-preview demo smoke so operators can see readiness, blockers, safe next commands, and sanitized evidence prompts before any seed/reset writes.

Steps:
- [x] Add a domain-backed demo smoke preflight helper with target, ready/blocked state, missing env names, seed summary, safe next commands, and sanitized evidence prompts.
- [x] Add root `demo:smoke` via a thin read-only CLI with `--target local|preview`, optional `--base-url`, and optional `--tech-password-env`.
- [x] Keep `demo:smoke` free of Supabase calls, seed/reset writes, dev-server startup, browser automation, and secret value output.
- [x] Require local smoke env names and block non-local Supabase URLs for `--target local`.
- [x] Report protected-preview shell seed readiness separately from operator-approved browser access and sign-in requirements.
- [x] Update README, preview readiness, implementation plan, and task status so preflight comes before seed/reset and Browser smoke.
- [x] Run focused tests, blocked CLI preflight, and full verification.

Follow-up candidates:
- [x] Local no-env browser demo fallback loads the seeded story as read-only fixtures when the local seed/login write path is blocked.
- [ ] Operator runs local seed/reset with approved local Supabase credentials.
- [ ] Operator runs preview seed from the dashboard or a protected shell with preview Supabase credentials.
- [ ] Operator optionally supplies `DEMO_TECH_PASSWORD` for technician login demos.
- [ ] Run authenticated preview smoke against the seeded story and record sanitized findings.
- [ ] Decide whether a formal E2E harness is worthwhile after the operator-run smoke path stabilizes.

Status:
Demo Smoke Preflight V1 is implemented and verified as a read-only domain-backed CLI preflight with env-name blockers, local URL safety, preview handoff gating, safe commands, sanitized evidence prompts, and no new write path.

Post-smoke correction:
The local browser demo now has a no-secret fixture fallback for the basic demo story. When local seed/login is blocked by missing Supabase env, the demo shortcut signs into a local fixture session and customer, job, dispatch, inventory, closeout, payment, portal-link, and automation reads use typed demo workflow fixtures instead of failing empty.
