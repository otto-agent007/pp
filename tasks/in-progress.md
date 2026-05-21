# In Progress

No active implementation slice is currently open.

Recent closure:

- Status Color + Searchability QA V1 added a shared `SearchableSelect`
  primitive, made `StatTile` tone affect card border/background, and tightened
  status colors across automation, dispatch, jobs, inventory, payments, and
  closeouts.
- Searchable controls now cover reminder templates/rules/customers/jobs,
  dispatch technician filtering/assignment, job customer/location/technician
  selection, inventory job/chemical logging, and completed-job invoice handoff.
- `/inventory`, `/payments`, and `/closeouts` now use clearer warning,
  danger, info, success, and neutral treatment for low stock, reconciliation,
  compliance, GPS, billing, invoice, and sync-confidence states.
- Local Browser QA on `http://127.0.0.1:3001` rendered `/automation`,
  `/dispatch`, `/jobs`, `/inventory`, `/payments`, and `/closeouts` at desktop
  and narrow widths with no fresh console errors, no document-level horizontal
  overflow, and expected searchable option filtering where fixture data exists.
- Kept migrations, provider setup, Supabase dashboard work, environment
  changes, preview/production mutations, direct database calls from UI, and
  domain/API contract changes out of scope.
- Claude Design Inventory + Closeouts Refinement V1 preserved local demo
  before/after references under
  `.claude/design/013-inventory-closeouts-refinement/references`.
- `/inventory` now uses shared Patrol UI primitives for the header, stat tiles,
  compliance strip, low-stock watchlist, inventory rows, forms, and recent logs
  while preserving the existing hooks and data flow.
- `/closeouts` now uses shared Patrol UI primitives for billing counters,
  compliance audit copy, queue cards, proof-handoff panels, action cards, and a
  sticky detail rail while preserving existing closeout data and mutations.
- Verified with focused inventory/closeouts tests, local browser before/after
  QA at desktop and narrow widths, `corepack pnpm test`,
  `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm build`, and
  `git diff --check`.
- Kept migrations, provider setup, Supabase dashboard work, environment changes,
  preview/production mutations, direct database calls from UI, and brand/font
  promotion out of scope.
- The readiness smoke evidence batch reran Supabase/RLS audit, compliance RAG checks, preview drift checks, local/preview smoke preflights, and manual-fallback provider tests without mutating preview, production, providers, env, or Supabase data.
- `/api/compliance/advisories` now checks compliance schema/RPC readiness before creating an OpenAI embedding, so missing or partially applied compliance schema returns sanitized setup-required state without an OpenAI call or audit write.
- `corepack pnpm compliance:ingest -- --dry-run --no-embed` planned 6 sources, 6 documents, and 6 chunks with 0 Supabase writes and 0 OpenAI calls.
- Latest Ready preview discovered by Vercel CLI is `https://pest-patrol-9p9xhuitd-ottoagent007-gmailcoms-projects.vercel.app`; `vercel inspect` reports it Ready and `vercel curl / --deployment <preview-url>` returns the Pest Patrol OS app shell.
- Full repo verification passed in this batch with `corepack pnpm test`, `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm build`, and `git diff --check`.
- Vercel Preview env names exist for Supabase and scheduler secrets, but Stripe, portal/notification webhook, OpenAI compliance, and Expo public Supabase names were not present in the safe env-name list.
- Local and preview smoke preflights remain blocked before seed/reset or authenticated browser smoke because approved Supabase env names are not loaded in this shell.
- Local Supabase target inspection is blocked because Docker Desktop's Linux engine pipe is unavailable for `supabase status -o env` and local Postgres on `127.0.0.1:54322` refused `supabase migration list --local`.
- Codex Browser runtime connected and local fixture route walking now works for
  presentation QA; seed/reset smoke and authenticated preview route walking
  remain gated on approved env/access.
- Protected-preview smoke remains blocked on operator-approved preview access and an admin/dispatcher sign-in path.
- Manual-fallback provider states are locally test-proven for portal, notification, and payment setup copy, but authenticated browser smoke remains gated on env/access.
- Demo Media Proof V1 moved the dirty demo seed/media work onto a fresh branch from `origin/main`, preserving the readiness-evidence PR as a separate review surface.
- The demo seed story now includes San Diego-specific customer locations, richer Rivera Cafe closeout data, expanded treatment-form fields, 3 chemical logs, 2 form submissions, 6 inventory items, and 3 synthetic proof media items.
- Seed/reset now uploads SVG proof media to the `job-media` storage bucket, inserts matching `job_media` rows, removes those storage paths during reset, and reports media counts through the CLI/dashboard summary.
- Local fixture mode maps the seeded media paths to checked-in `/demo-media/*` SVG assets, so closeout and portal proof surfaces can render service photos and a synthetic customer signature without Supabase storage access.
- Verified with focused demo seed/domain/API-client/web tests, `corepack pnpm test`, `corepack pnpm typecheck`, `corepack pnpm lint`, and `corepack pnpm build`; no migration, provider setup, env mutation, preview mutation, production mutation, seed/reset write, or browser login was performed.

Follow-up candidates:

- [ ] Operator loads approved local Supabase env names, then reruns local demo preflight against the richer seeded proof-media story.
- [ ] After local preflight is ready, run local seed/reset and authenticated browser smoke for `/closeouts`, `/customers`, tokened `/portal`, and proof-media rendering.
- [ ] Verify the approved local/preview migration target before applying pending local migration files, including `20260518021520_portal_send_succeeded_event.sql`; no preview/production migration has been applied by Codex.
- [ ] If using the local Supabase target, start or repair Docker Desktop's Linux engine and local Postgres before rerunning `supabase status -o env` and `supabase migration list --local`; the later May 20, 2026 check could not inspect local containers or migration history.
- [ ] After explicit migration approval, run `compliance:ingest` against an approved local or preview Supabase environment before relying on source-backed `/compliance` advisories; the May 20, 2026 dry-run/no-embed preflight passed without Supabase writes or OpenAI calls.
- [ ] If local Windows `vercel build` remains required, resolve the remaining Vercel CLI symlink blocker: after the `/auth/update-password` lambda mapping fix, local packaging now fails on `EPERM: operation not permitted, symlink '..\portal\[customerId].func' -> '.vercel\output\functions\auth\update-password.func'`.
- [ ] Operator runs local seed/reset with approved local Supabase credentials.
- [ ] Operator runs preview seed from the dashboard or a protected shell with preview Supabase credentials.
- [ ] Operator optionally supplies `DEMO_TECH_PASSWORD` for technician login demos.
- [ ] Operator loads approved preview Supabase env names, then reruns preview demo preflight against `https://pest-patrol-9p9xhuitd-ottoagent007-gmailcoms-projects.vercel.app` or the newest Ready preview discovered at execution time.
- [ ] Run authenticated preview smoke against the seeded story and record sanitized findings for dispatch exceptions, mobile next actions, closeout filters, and portal handoff review.
- [ ] Confirm manual-fallback provider smoke in an authenticated browser when webhook env names are intentionally unset.
- [ ] Decide whether portal delivery receipts, richer provider failure states, or production launch checklist work should be next after webhook-backed evidence exists.
- [ ] Separate Google Maps/Mapbox provider planning only after token, env, cost, and privacy decisions are approved.
