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
- [x] Confirm existing Vercel automation bypass works and open the approved bypass-cookie URL in the operator browser without recording the secret.
- [x] Apply portal send critique cleanup for provider-ready copy, generated-link send copy, and send-attempt event ordering.
- [x] Add dispatch technician query-param preselection for `/dispatch?technician=...`.
- [x] Refresh preview baseline, read-only preflight findings, and launch triage status.
- [x] Add the operator smoke access handoff, sanitized findings format, blocker categories, and launch gate for the next five preview slices.

Follow-up candidates:
- [ ] Operator provides the protected-preview browser path and admin/dispatcher sign-in path through an approved channel.
- [ ] Operator confirms whether Stripe, portal delivery, and notification delivery provider env vars are intentionally unset for manual fallback mode.
- [ ] Run the authenticated preview smoke checklist and record sanitized findings.
- [ ] Triage smoke-proven blockers and implement only small repo-contained fixes.
- [ ] Decide whether portal send events need delivery receipts, richer failure states, or neither after webhook-backed sends prove useful.

Status:
Preview Launch Readiness V1 documents the operator-assisted launch path and keeps provider setup, secret mutation, production data mutation, and migration application out of Codex scope. Portal send critique cleanup keeps send-attempt history in V1, removes redundant provider-ready readiness copy, and records `send_requested` only after provider acceptance. Dispatch now consumes valid `/dispatch?technician=...` links from technician route-load cards. Read-only preflight found the linked dev Supabase migrations aligned and a Ready Vercel preview that boots through `vercel curl`. The next five preview slices are closed to the current evidence: batch closure and handoff docs are recorded, authenticated smoke cannot run without operator access, no additional smoke-proven repo blocker is available, and the launch gate is now the operator-provided protected-preview browser session plus admin/dispatcher sign-in path.
