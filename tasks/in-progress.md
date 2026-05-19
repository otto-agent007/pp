# In Progress

No active implementation slice is currently open.

Follow-up candidates:
- [ ] Verify the approved local/preview migration target before applying pending local migration files, including `20260518021520_portal_send_succeeded_event.sql`; no preview/production migration has been applied by Codex.
- [ ] If using the local Supabase target, start or repair Docker Desktop's Linux engine before rerunning `supabase status -o env`; the May 19, 2026 check could not inspect the local containers.
- [ ] After explicit migration approval, run `compliance:ingest` against an approved local or preview Supabase environment before relying on source-backed `/compliance` advisories; the May 19, 2026 dry-run/no-embed preflight passed without Supabase writes or OpenAI calls.
- [ ] If local Windows `vercel build` remains required, resolve the remaining Vercel CLI symlink blocker: after the `/auth/update-password` lambda mapping fix, local packaging now fails on `EPERM: operation not permitted, symlink '..\portal\[customerId].func' -> '.vercel\output\functions\auth\update-password.func'`.
- [ ] Operator loads approved local Supabase env names, then reruns local demo preflight.
- [ ] Operator runs local seed/reset with approved local Supabase credentials.
- [ ] Operator runs preview seed from the dashboard or a protected shell with preview Supabase credentials.
- [ ] Operator optionally supplies `DEMO_TECH_PASSWORD` for technician login demos.
- [ ] Run authenticated preview smoke against the seeded story and record sanitized findings for dispatch exceptions, mobile next actions, closeout filters, and portal handoff review.
- [ ] Confirm manual-fallback provider smoke when webhook env names are intentionally unset.
- [ ] Decide whether portal delivery receipts, richer provider failure states, or production launch checklist work should be next after webhook-backed evidence exists.
- [ ] Separate Google Maps/Mapbox provider planning only after token, env, cost, and privacy decisions are approved.
