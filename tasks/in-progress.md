# In Progress

No active implementation slice is currently open.

Follow-up candidates:
- [ ] After explicit migration approval, run `compliance:ingest` against an approved local or preview Supabase environment before relying on source-backed `/compliance` advisories; the May 17, 2026 dry-run/no-embed preflight already passed without Supabase writes or OpenAI calls.
- [ ] Investigate the remaining local Vercel CLI packaging blocker if local `vercel build` remains required: after `next build` succeeds, Vercel CLI still reports `Unable to find lambda for route: /auth/update-password` while creating serverless functions.
- [ ] Operator loads approved local Supabase env names, then reruns local demo preflight.
- [ ] Operator runs local seed/reset with approved local Supabase credentials.
- [ ] Operator runs preview seed from the dashboard or a protected shell with preview Supabase credentials.
- [ ] Operator optionally supplies `DEMO_TECH_PASSWORD` for technician login demos.
- [ ] Run authenticated preview smoke against the seeded story and record sanitized findings for dispatch exceptions, mobile next actions, closeout filters, and portal handoff review.
- [ ] Confirm manual-fallback provider smoke when webhook env names are intentionally unset.
- [ ] Decide whether portal delivery receipts, richer provider failure states, or production launch checklist work should be next after webhook-backed evidence exists.
- [ ] Separate Google Maps/Mapbox provider planning only after token, env, cost, and privacy decisions are approved.
