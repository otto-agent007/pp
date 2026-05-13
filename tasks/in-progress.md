# In Progress

## Task: Preview Launch Readiness V1

Goal:
Prepare Pest Patrol OS for a preview-first launch readiness pass after PR #27. Keep provider setup operator-assisted and avoid dashboard, secret, production data, or migration-application mutations unless explicitly approved.

Steps:
- [x] Confirm PR #27 is merged and start from updated `main`.
- [x] Refresh `README.md`, `docs/IMPLEMENTATION_PLAN.md`, and task status for the post-PR #27 launch-readiness phase.
- [x] Add `docs/PREVIEW_LAUNCH_READINESS.md` with Codex-owned work, operator-only setup, migration readiness, preview smoke steps, and deferred follow-ups.
- [x] Tighten production readiness guidance for preview guardrails, operator-assisted providers, and the current Vercel cron config path.
- [x] Apply low-risk portal UI polish discovered during readiness review without changing the approved send-event history scope.
- [x] Run local verification.
- [x] Run web-first manual-fallback preflight against updated `main`.
- [x] Record preflight findings and current smoke blockers.
- [x] Repair Vercel preflight visibility with CLI discovery, preview inspection, env listing, and protected app-shell curl.

Follow-up candidates:
- [ ] Choose the Supabase environment for the first preview smoke run.
- [ ] Operator applies pending migrations in the approved environment.
- [ ] Operator configures Vercel preview env vars and optional provider webhooks.
- [ ] Run the preview smoke checklist and record findings.
- [ ] Decide whether dispatch should consume `/dispatch?technician=...` as a preselected technician filter.
- [ ] Decide whether portal send events need provider delivery receipts after webhook-backed sends prove useful.

Status:
Preview Launch Readiness V1 documents the operator-assisted launch path and keeps provider setup, secret mutation, production data mutation, and migration application out of Codex scope. Web-first manual-fallback preflight found the linked dev Supabase migrations aligned and a Ready Vercel preview that boots through `vercel curl`, but interactive browser smoke is blocked until the operator provides or approves a Deployment Protection access path plus admin/dispatcher sign-in path.
