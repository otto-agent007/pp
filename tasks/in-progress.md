# In Progress

No active implementation slice is currently open.

Recent closure:
- The gated launch-readiness batch reran Supabase/RLS audit, compliance RAG checks, preview drift checks, and local smoke preflight without mutating preview, production, providers, env, or Supabase data.
- `/api/compliance/advisories` now checks compliance schema/RPC readiness before creating an OpenAI embedding, so missing or partially applied compliance schema returns sanitized setup-required state without an OpenAI call or audit write.
- `corepack pnpm compliance:ingest -- --dry-run --no-embed` planned 6 sources, 6 documents, and 6 chunks with 0 Supabase writes and 0 OpenAI calls.
- Latest Ready preview discovered by Vercel CLI is `https://pest-patrol-ehvt94v55-ottoagent007-gmailcoms-projects.vercel.app`; `vercel inspect` reports it Ready and `vercel curl / --deployment <preview-url>` returns the Pest Patrol OS app shell.
- Full repo verification passed with `corepack pnpm test`, `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm build`, and `git diff --check`; the first build attempt was machine-space blocked by `ENOSPC` until the repo-local generated `.turbo` cache was cleared.
- Vercel Preview env names exist for Supabase and scheduler secrets, but Stripe, portal/notification webhook, OpenAI compliance, and Expo public Supabase names were not present in the safe env-name list.
- Local and preview smoke preflights remain blocked before seed/reset or authenticated browser smoke because approved Supabase env names are not loaded in this shell.
- Local Supabase target inspection is blocked because Docker Desktop returned a local container health error for `supabase status -o env`.
- Codex Browser runtime connected and listed the in-app Browser, but rendered route walking remains blocked until local env/preflight, dev server, and an active Browser pane are ready.
- Protected-preview smoke remains blocked on operator-approved preview access and an admin/dispatcher sign-in path.

Follow-up candidates:
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
