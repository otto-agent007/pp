# In Progress

No active implementation slice is currently open.

Recent closure:
- Demo Media Proof V1 moved the dirty demo seed/media work onto a fresh branch from `origin/main`, preserving the readiness-evidence PR as a separate review surface.
- The demo seed story now includes San Diego-specific customer locations, richer Rivera Cafe closeout data, expanded treatment-form fields, 3 chemical logs, 2 form submissions, 6 inventory items, and 3 synthetic proof media items.
- Seed/reset now uploads SVG proof media to the `job-media` storage bucket, inserts matching `job_media` rows, removes those storage paths during reset, and reports media counts through the CLI/dashboard summary.
- Local fixture mode maps the seeded media paths to checked-in `/demo-media/*` SVG assets, so closeout and portal proof surfaces can render service photos and a synthetic customer signature without Supabase storage access.
- Verified with focused demo seed/domain/API-client/web tests, `corepack pnpm test`, `corepack pnpm typecheck`, `corepack pnpm lint`, and `corepack pnpm build`; no migration, provider setup, env mutation, preview mutation, production mutation, seed/reset write, or browser login was performed.

Follow-up candidates:
- [ ] Operator loads approved local Supabase env names, then reruns local demo preflight against the richer seeded proof-media story.
- [ ] After local preflight is ready, run local seed/reset and authenticated browser smoke for `/closeouts`, `/customers`, tokened `/portal`, and proof-media rendering.
- [ ] Verify the approved local/preview migration target before applying pending local migration files, including `20260518021520_portal_send_succeeded_event.sql`; no preview/production migration has been applied by Codex.
- [ ] If using the local Supabase target, start or repair Docker Desktop's Linux engine before rerunning `supabase status -o env`; the May 20, 2026 check could not inspect the local containers.
- [ ] After explicit migration approval, run `compliance:ingest` against an approved local or preview Supabase environment before relying on source-backed `/compliance` advisories; the May 20, 2026 dry-run/no-embed preflight passed without Supabase writes or OpenAI calls.
- [ ] If local Windows `vercel build` remains required, resolve the remaining Vercel CLI symlink blocker: after the `/auth/update-password` lambda mapping fix, local packaging now fails on `EPERM: operation not permitted, symlink '..\portal\[customerId].func' -> '.vercel\output\functions\auth\update-password.func'`.
- [ ] Operator loads approved local Supabase env names, then reruns local demo preflight.
- [ ] Operator runs local seed/reset with approved local Supabase credentials.
- [ ] Operator runs preview seed from the dashboard or a protected shell with preview Supabase credentials.
- [ ] Operator optionally supplies `DEMO_TECH_PASSWORD` for technician login demos.
- [ ] Operator loads approved preview Supabase env names, then reruns preview demo preflight against `https://pest-patrol-ehvt94v55-ottoagent007-gmailcoms-projects.vercel.app` or the newest Ready preview discovered at execution time.
- [ ] Run authenticated preview smoke against the seeded story and record sanitized findings for dispatch exceptions, mobile next actions, closeout filters, and portal handoff review.
- [ ] Confirm manual-fallback provider smoke when webhook env names are intentionally unset.
- [ ] Decide whether portal delivery receipts, richer provider failure states, or production launch checklist work should be next after webhook-backed evidence exists.
- [ ] Separate Google Maps/Mapbox provider planning only after token, env, cost, and privacy decisions are approved.
