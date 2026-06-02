# Implementation Plan

## Current Priority: Pest Patrol Customer Portal V1

This portal-first customer workflow keeps the existing tokened
`/portal/<customerId>` trust boundary and turns QR/text invoice links into a
single customer-facing route for payment, service history, and General Pest
recurring-service follow-up. It does not add Stripe Billing, saved payment
methods, subscription schema, recurring charge creation, migrations, provider
setup, environment variables, preview data, production data, or live
compliance ingestion.

Completed in this batch:

1. Added shared portal upgrade-intent contracts and domain helpers for the
   V1 `general_pest_recurring` plan, generated keys, sanitized notification
   input, duplicate-day behavior, and customer-safe portal summary copy.
2. Added
   `POST /api/portal/[customerId]/upgrade-intents`, validating the raw portal
   access token server-side and creating one pending
   `recurring_service_prompt` notification event per customer/day through the
   existing generated-key idempotency path.
3. Polished the tokened customer portal with account overview, open-balance
   payment actions, service and billing history, proof cards, and a compact
   General Pest recurring-service request CTA.
4. Added reusable portal share cards with client-rendered QR codes for fresh
   `/customers` and `/payments` portal-link handoffs while keeping historical
   active token rows from exposing old raw URLs.
5. Updated local fixture smoke to prove tokened portal pay actions, service
   and billing history, and the upgrade CTA without Supabase env values.

Next decision points:

1. Keep Stripe Billing, Stripe Price IDs, saved payment methods, subscription
   schema, recurring charge creation, and webhook scope for a later approved
   pricing/provider slice.
2. Keep provider delivery receipts and richer provider failure states deferred
   until webhook-backed portal send evidence exists.
3. Keep local/preview seed/reset and authenticated browser smoke gated on
   approved Supabase env names, protected-preview access, and
   admin/dispatcher sign-in.

## Previous Priority: Technician Access Handoff

This product polish pass starts from local `main` after merged PR #75 and keeps
the next slice away from the open draft PR surfaces for mobile capture,
dispatch, payments/closeouts/inventory/portal/automation, mobile bilingual
treatment copy, customer ledger follow-up, and jobs assignment handoff. It adds
provider-neutral technician invite handoff guidance and brings `/technicians`
into the repeatable local fixture smoke route plan without changing auth
behavior, migrations, providers, environment variables, seed/reset state,
preview data, production data, or live compliance ingestion.

Completed in this batch:

1. Confirmed PR #75 is merged and local `main` is fast-forwarded to
   `origin/main`.
2. Added `/technicians` access handoff guidance that explains the invite,
   email confirmation, and dispatch assignment sequence without exposing
   provider internals or changing invite behavior.
3. Added `/technicians` to the local fixture smoke plan with route signals for
   the technician roster and dispatch-ready crew.
4. Kept the remaining launch blockers explicit: approved Supabase env names,
   local Docker/Postgres availability for local migration inspection,
   protected-preview access, and admin/dispatcher sign-in are still required
   before real seed/reset or authenticated preview smoke.

Next decision points:

1. Operator loads approved local or preview Supabase env names before any real
   seed/reset, live ingestion, or authenticated preview browser smoke.
2. If local Supabase remains the chosen migration target, repair Docker
   Desktop's Linux engine and local Postgres before relying on local migration
   history.
3. Keep provider delivery receipts, richer provider failure states, and
   production launch checklist work deferred until authenticated preview and
   webhook-backed evidence exist.

## Previous Priority: Jobs Assignment Handoff

That product polish pass started from local `main` after merged PR #75 and
added dispatch assignment handoff clarity to `/jobs` without changing app
behavior outside the jobs workspace, migrations, providers, environment
variables, seed/reset state, preview data, production data, or live compliance
ingestion.

Completed in this batch:

1. Confirmed PR #75 is merged and local `main` is fast-forwarded to
   `origin/main`.
2. Added a `/jobs` assignment handoff summary that counts assigned and
   unassigned active jobs from existing loaded job data.
3. Added per-job technician handoff state so dispatch can see the assigned
   technician, missing assignment work, or pending technician details without
   leaving the job queue.
4. Kept the remaining launch blockers explicit: approved Supabase env names,
   local Docker/Postgres availability for local migration inspection,
   protected-preview access, and admin/dispatcher sign-in are still required
   before real seed/reset or authenticated preview smoke.

Next decision points:

1. Operator loads approved local or preview Supabase env names before any real
   seed/reset, live ingestion, or authenticated preview browser smoke.
2. If local Supabase remains the chosen migration target, repair Docker
   Desktop's Linux engine and local Postgres before relying on local migration
   history.
3. Keep provider delivery receipts, richer provider failure states, and
   production launch checklist work deferred until authenticated preview and
   webhook-backed evidence exist.

## Previous Priority: Customer Account Follow-Up Status

That provider-free customer polish started from local `main` synced through PR
#75 and makes `/customers` easier to scan during real operator walkthroughs. It
does not change migrations, providers, environment variables, seed/reset state,
preview data, production data, Supabase writes, API contracts, or live
compliance ingestion.

Completed in this batch:

1. Added a shared customer account follow-up classifier in `packages/domain`
   from the existing customer ledger summary.
2. Surfaced compact customer-card follow-up states for schedule-first-job,
   ready-to-invoice, payment-review, open-balance, and account-current paths.
3. Linked attention states to the existing jobs and payments workflows while
   keeping provider metadata, raw payment records, portal tokens, admin notes,
   and provider internals off customer cards.
4. Added focused domain and web coverage for the new classifier and
   `/customers` follow-up surface.
5. Reran local fixture smoke across the standard admin and tokened portal
   routes at desktop and narrow widths.

Next decision points:

1. Keep provider delivery receipts and richer provider failure states deferred
   until webhook-backed evidence exists.
2. Keep local/preview seed/reset and authenticated browser smoke gated on
   approved Supabase env names, protected-preview access, and admin/dispatcher
   sign-in.
3. Continue product polish as small provider-free slices while open draft PRs
   for mobile, dispatch, and schedule surfaces are still in review.

## Previous Priority: Mobile Treatment Form Bilingual Copy

That product-polish slice advanced the active bilingual field-copy candidate
without changing the offline queue, native config, dependencies, providers,
environment variables, migrations, seed/reset state, preview data, production
data, or the later STT/provider decision.

Completed in this batch:

1. Added English and Spanish treatment-form field labels and placeholders in
   `@pest-patrol/i18n`.
2. Added a mobile-local copy adapter so `JobTreatmentForm` can render localized
   labels/placeholders while preserving the domain template and JSONB field ids.
3. Localized required-field validation copy in the mobile treatment form by
   mapping unchanged domain validation messages to the selected technician
   language.
4. Added focused tests for the copy adapter and ran mobile/i18n verification
   plus full repo gates.

Next decision points:

1. Keep STT behind the already decisioned later provider/audio slice; do not
   add microphone permissions, audio packages, or provider routes until
   explicitly approved.
2. Continue mobile bilingual copy only as small follow-up slices if other
   capture controls still expose English-only dynamic form content.

## Previous Priority: Schedule Wall-Clock Consistency

That product-polish slice closed the preview smoke finding where stored
Z-suffixed job schedule values rendered as absolute instants instead of the
operator-entered local service time. It starts from `origin/main` after merged
PR #75 and keeps migrations, providers, environment variables, Supabase writes,
seed/reset state, preview data, production data, mobile component changes, and
dispatch PR #77 UI work out of scope.

Completed in this batch:

1. Added shared domain helpers for job schedule date keys, time labels, and
   date/time labels that parse job schedules as wall-clock service times.
2. Reused the helpers in technician route load summaries, home command-center
   schedule rows, dispatch route intelligence labels, inventory/payments/
   automation job pickers, closeouts queue/detail labels, and customer portal
   service/billing labels.
3. Added focused regression tests for the 9:38 AM demo schedule across domain,
   admin, billing, automation, closeout, and portal surfaces.
4. Reran focused checks plus full repo test, typecheck, lint, build, no-env
   local fixture smoke, and whitespace verification.

Next decision points:

1. Verify the 9:38 AM preview smoke case again on the next deployed preview.
2. Keep the open dispatch and mobile capture draft PRs independent unless the
   operator chooses to merge or rebase them.
3. Operator loads approved local or preview Supabase env names before any real
   seed/reset, live ingestion, or authenticated preview browser smoke.
## Previous Priority: Dispatch Calendar Proof Polish

That polish pass started from local `main` synced through merged PR #75 and
closed the protected dispatch-calendar follow-up without changing schema,
providers, environment variables, seed/reset state, preview data, production
data, or live compliance ingestion. It keeps the provider-free 180-job demo
week readable by making job proof and route context scan faster before edits.

Completed in this batch:

1. Moved the protected dispatch diff onto
   `codex/dispatch-calendar-proof-polish-v1` after syncing local `main`
   through merged PR #75.
2. Made weekly dispatch cards denser with stop readiness, route/order context,
   scheduled time, customer/location, service-map link, status, technician, and
   proof state visible before edit controls.
3. Put status and technician edits behind a per-job `Manage` control with
   accessible job-group labels and expanded controls for the selected job only.
4. Kept missing/loading GPS evidence as compact inline copy and reserved the
   full evidence panel for synced arrival/departure events.
5. Tuned route-intelligence summary tones, disclosure counts, icon-only week
   navigation, and today's day-column highlight while staying provider-free.
6. Verified with focused dispatch tests, full repo test/typecheck/lint/build,
   local fixture smoke, and in-app browser DOM QA on `/dispatch`.

## Previous Priority: Mobile Capture Proof Frames

This slice finished the next small mobile native-primitive adoption step while
operator-gated preview/Supabase launch checks remained blocked on approved
env/access. It kept the work presentation-only in the Expo technician app:
no mobile dependency/config changes, migrations, providers, env changes,
Supabase writes, seed/reset writes, preview mutations, production mutations, or
raw-audio/STT implementation.

Completed in this batch:

1. Adopted shared `@pest-patrol/ui-native` `CaptureCard` framing for queued
   photo proof previews.
2. Adopted shared `CaptureCard` framing for the signature pad surface.
3. Preserved existing `CaptureButton` camera/library actions, Expo image picker
   permission flow, signature-canvas handling, and offline queue stores.
4. Added focused mobile component coverage for photo preview and signature pad
   proof-frame behavior.
5. Verified with focused mobile capture tests, mobile typecheck,
   `corepack pnpm test`, `corepack pnpm typecheck`, `corepack pnpm lint`,
   `corepack pnpm build`, and whitespace checks.

## Previous Priority: Vercel Packaging Evidence Refresh

The evidence pass started from local `main` synced through PR #74 and removed
the stale local Windows Vercel packaging blocker from the launch gate. It did
not change app behavior, migrations, providers, environment variables,
seed/reset state, preview data, production data, or live compliance ingestion.

Completed in this batch:

1. Confirmed PR #74 is merged and fast-forwarded local `main` to `58a9eb1`.
2. Reran `corepack pnpm dlx vercel build --yes`; the command completed
   successfully, wrote `.vercel/output`, and reported `Build completed
   successfully` for the preview target.
3. Kept the remaining launch blockers explicit: approved Supabase env names,
   local Docker/Postgres availability for local migration inspection,
   protected-preview access, and admin/dispatcher sign-in are still required
   before real seed/reset or authenticated preview smoke.

## Previous Priority: Dashboard BI + Fixture Smoke Evidence

That batch closed the protected dashboard BI work, promoted the merged fixture
smoke harness as the repeatable no-env QA gate, recorded a concrete mobile STT
implementation decision without changing mobile config, and refreshed
launch-readiness evidence while keeping migrations, providers, env changes,
seed/reset writes, preview mutations, and production mutations approval-gated.

Completed in this batch:

1. Confirmed PR #72 is merged and moved the protected dashboard BI diff onto
   `codex/dashboard-bi-performance-v1`; untracked helper-file residue remains
   protected and unstaged.
2. Finished the home command-center BI closeout with technician performance,
   avatar initials, and an operator insight banner from existing hook data,
   without direct Supabase calls, schema changes, providers, or API contract
   changes.
3. Updated focused home dashboard tests for the technician performance panel
   and operator insight state.
4. Ran `corepack pnpm demo:fixture-smoke`; the harness served the local fixture
   app on `http://127.0.0.1:3300` and passed `/`, `/dispatch`, `/customers`,
   `/jobs`, `/inventory`, `/payments`, `/closeouts`, `/compliance`,
   `/automation`, and tokened `/portal` at desktop and narrow widths with no
   page/console errors, horizontal overflow, or sensitive patterns.
5. Converted the mobile STT spike into a decision artifact: later V1
   implementation should use recorded-audio transcription through an approved
   server/provider adapter, support English and Spanish, insert final editable
   transcript text into existing treatment-form drafts, and never retain or
   queue raw audio.
6. Refreshed Vercel evidence: latest Ready preview is
   `https://pest-patrol-5j7ihwnvs-ottoagent007-gmailcoms-projects.vercel.app`
   and latest Ready production deployment is
   `https://pest-patrol-xd9td65tl-ottoagent007-gmailcoms-projects.vercel.app`;
   `vercel inspect` reported the preview Ready and `vercel curl` returned the
   protected app shell.
7. Confirmed Vercel Preview env names exist for Supabase and scheduler secrets,
   while Stripe, portal/notification webhook, OpenAI compliance, and Expo
   public Supabase env names were not present in the safe env-name list.
8. Reran read-only local and preview `demo:smoke` preflights; both remain
   blocked before seed/reset or authenticated preview smoke on missing local
   shell Supabase env names, with preview also gated on operator-approved access
   and sign-in.
9. Reran Supabase CLI/migration readiness checks without applying migrations:
   CLI 2.98.2 is installed, local Docker/Postgres remain unavailable, local
   migration history inspection is blocked, and grep audit still confirms
   `private.has_admin_access()` precedes dependent portal/compliance policies
   plus explicit compliance Data API grants.
10. Reran `corepack pnpm compliance:ingest -- --dry-run --no-embed`; it planned
    6 sources, 6 documents, and 6 chunks with 0 Supabase writes and 0 OpenAI
    calls.

Next decision points:

1. Operator loads approved local or preview Supabase env names before any real
   seed/reset, live ingestion, or authenticated preview browser smoke.
2. If local Supabase remains the chosen migration target, repair Docker
   Desktop's Linux engine and local Postgres before relying on local migration
   history.
3. Keep provider delivery receipts, richer provider failure states, and
   production launch checklist work deferred until authenticated preview and
   webhook-backed evidence exist.

## Previous Priority: Launch Readiness Evidence + White App Canvas

That launch-readiness track was evidence-first after PR #53 merged:
post-merge GitHub/Vercel/Supabase/compliance checks are refreshed, migration
application remains operator-approved only, and the app shell now reads as a
white canvas instead of sand/cream while preserving dark rail chrome, cards,
status tones, and semantic state colors. It keeps protected-preview smoke gated
on operator env/access and does not apply migrations, mutate preview or
production data, configure providers, add Google Maps/Mapbox, add background
tracking, or expose server-only keys to browser/mobile clients.

Completed in this batch:

1. Synced local `main` to the PR #53 merge commit `52ab65c397e82c78d9b6c37d963d78a4cb5be7d3` and opened `codex/launch-readiness-white-canvas` for the next readiness batch, leaving the prior branch's extra post-merge dispatch evidence commit untouched.
2. Refreshed GitHub and Vercel readiness evidence: PR #53 is merged, GitHub checks reported `verify` success plus Vercel success, the latest Ready preview is `https://pest-patrol-2ayfmsfpw-ottoagent007-gmailcoms-projects.vercel.app`, and latest Ready production deployment is `https://pest-patrol-m084wbv4s-ottoagent007-gmailcoms-projects.vercel.app`.
3. Reran read-only local and preview `demo:smoke` preflights; both remain blocked before seed/reset or authenticated preview browser smoke because approved Supabase env names are not loaded in this shell, and preview also remains gated on operator-approved protected-preview access/sign-in.
4. Reran `corepack pnpm compliance:ingest -- --dry-run --no-embed`; it planned 6 sources, 6 documents, and 6 chunks with 0 Supabase writes and 0 OpenAI calls.
5. Reaudited pending launch-sensitive migrations through `20260518021520_portal_send_succeeded_event.sql` without applying them; `private.has_admin_access()` still precedes dependent portal/compliance policies, RLS remains enabled, and compliance grants stay explicit for `authenticated` and `service_role`.
6. Confirmed local Supabase target inspection is still blocked until Docker Desktop's Linux engine pipe and local Postgres on `127.0.0.1:54322` are reachable.
7. Changed the light app canvas token and legacy `neutralLight` alias from cream to white, and documented that `primitive/cream/50` is historical only and should not be used for app canvas backgrounds.
8. Ran local fixture browser smoke on `/`, `/dispatch`, `/customers`, `/jobs`, `/inventory`, `/payments`, `/closeouts`, `/compliance`, `/automation`, and tokened `/portal` at `1440x1000` and `390x900`; the temp Playwright Firefox spec found expected fixture content, no signed-out/loading auth gate, no console/page errors, no document-level horizontal overflow, and white sampled canvas pixels on every route.
9. Confirmed the served app CSS no longer includes `#F6F2EA`, `#f6f2ea`, or `246, 242, 234` for the local fixture app.
10. Kept seed/reset writes, migrations, Supabase/Vercel/provider/env changes, live compliance ingestion, preview mutations, production mutations, and API contract changes out of scope.

Previously completed in this broader launch-readiness track:

1. Added Automatic Large Demo Login Refresh V1, later superseded by Large Interactive Demo Reset V1: the seeded San Diego demo story now resets to 16 technicians, 100 customers, 108 locations, 180 current-week jobs, and 14 realistic synthetic inventory items, and `demo@email.com` login automatically refreshes demo-owned operational records while preserving the signed-in demo admin session.
1. Added Demo Media Proof V1 on a fresh branch from `origin/main`: the seeded San Diego demo story now includes richer Rivera Cafe proof context, expanded treatment-form fields, 3 chemical logs, 2 form submissions, 6 inventory items, and 3 synthetic proof media records.
1. Extended seed/reset execution so demo media is uploaded to the `job-media` storage bucket, inserted into `job_media`, removed from storage during reset, and counted in CLI/dashboard/smoke-preflight summaries.
1. Added checked-in `/demo-media/*` SVG assets for local fixture mode so closeout and tokened portal proof surfaces can render service photos and a synthetic customer signature without Supabase storage access.
1. Reran the later May 20, 2026 readiness smoke evidence batch from a fresh branch after syncing `main` to the merged PR #41 baseline; Supabase/RLS audit, compliance RAG preflight, preview drift checks, local/preview smoke preflights, and manual-fallback provider tests stayed inside the approved no-preview/no-production-mutation boundary.
1. Hardened `/api/compliance/advisories` so the server checks compliance table/RPC readiness before creating an OpenAI embedding; missing or partially applied compliance schema now returns sanitized setup-required state without an OpenAI call or advisory audit write.
1. Verified the latest Ready Vercel preview as `https://pest-patrol-9p9xhuitd-ottoagent007-gmailcoms-projects.vercel.app`; `vercel inspect` reports Ready and `vercel curl` returns the Pest Patrol OS app shell.
1. Confirmed Vercel Preview env names exist for Supabase and scheduler secrets, while Stripe, portal/notification webhook, OpenAI compliance, and Expo public Supabase names remain absent from the safe env-name list and therefore deferred/manual-fallback unless the operator configures them.
1. Reran local and preview `demo:smoke` preflights; both remain blocked before seed/reset or browser smoke because approved Supabase env names are not loaded in this shell. Local Supabase target inspection is also blocked by Docker Desktop's missing Linux engine pipe and local Postgres on `127.0.0.1:54322` refusing connections.
1. Confirmed manual-fallback provider behavior through focused portal, automation, and payments tests; seed/reset smoke and authenticated preview route walking remain gated on approved env/access.
1. Added Status Color + Searchability QA V1: a shared `SearchableSelect`, tone-aware `StatTile` cards, searchable workflow controls across automation/dispatch/jobs/inventory/payments, and clearer status tones for inventory, payments, and closeouts.
1. Ran local Browser QA against `/automation`, `/dispatch`, `/jobs`, `/inventory`, `/payments`, and `/closeouts` at desktop and narrow widths with local fixture data; the routes rendered without fresh console errors or document-level horizontal overflow, and searchable option filtering worked where fixture data exists.
1. Added Demo-Visible Fixture Smoke V1: local fixture demo seed status/actions no longer call the authenticated seed route, tokened `/portal` reads local fixture closeouts/billing, and the fixture clock is stable for public portal hydration.
1. Verified the local fixture demo on `http://localhost:3000` with Browser route walking for `/`, `/customers`, `/inventory`, `/payments`, `/closeouts`, and tokened `/portal`; Rivera Cafe data, fixture inventory, and all 3 checked-in `/demo-media/*` proof assets rendered without fresh console errors or document-level overflow.
1. Refreshed current Vercel discovery: latest Ready preview is `https://pest-patrol-es7sfp699-ottoagent007-gmailcoms-projects.vercel.app` and latest Ready production deployment is `https://pest-patrol-5sw483rdk-ottoagent007-gmailcoms-projects.vercel.app`; real seed/reset remains blocked in this shell before writes on missing approved Supabase env names.
1. Added Mobile UI Native Primitives V1: `@pest-patrol/ui-native` now provides token-driven `Button`, `Card`, `Eyebrow`, `StatusPill`, `StatTile`, and `Avatar` primitives for the Expo technician app.
1. Migrated the targeted mobile proof points only: `AssignedJobCard` uses the shared native `StatusPill`, and `MobileTechnicianHeader` uses the shared native `Button` for Language and Sign Out controls while preserving the existing route-shell styles and offline-first flow.
1. Added Inventory Usage + Closeout Proof States V1: `/inventory` now derives per-chemical usage counts, low-stock usage recency, and inline recent-use strips from already loaded chemical logs.
1. Refined `/closeouts` proof-state UI with missing-capture micro-lines, grouped location/billing evidence, and next-action cues for blocked, ready, invoiced, sent, paid, and voided jobs.
1. Preserved existing hooks, data flow, API contracts, schema, providers, env, seed/reset writes, preview state, and production state for the 014 relay implementation.
1. Verified the 014 slice with focused inventory/closeouts tests, full repo tests, typecheck, lint, build, and `git diff --check`.
1. Added Stash Rescue Sync Badge + Compliance Live State V1: `@pest-patrol/ui-native` now includes a shared `SyncBadge`, mobile `SyncStatusIndicator` adopts it without changing queue behavior, and `/compliance` now clarifies non-live multi-unit readiness, advisory runtime state, and audit loading/error/empty states.
1. Kept the rescue batch provider-free and write-free: no migrations, env changes, Supabase writes, live compliance ingestion, preview mutations, production mutations, stale stash inventory changes, or stale stash closeout changes.
1. Verified the rescue batch with focused native/mobile/compliance tests, mobile typecheck, local Browser QA on `/compliance` at desktop and narrow widths, full repo tests, typecheck, lint, build, and `git diff --check`.

Previously completed launch-readiness items still matter:

1. Added reusable web `Wordmark` and `Logomark` wrappers for the checked-in brand assets, wired the dark wordmark into the admin shell home link, and documented that `docs/design-system/` remains a reference export rather than the app token source.
2. Added domain-backed dashboard launch gates for local smoke, protected-preview smoke, compliance source setup, and portal delivery mode so operators can see the next safe action without secret values.
3. Forced `/auth/update-password` to package as a dynamic app route, clearing the previous local Vercel CLI blocker `Unable to find lambda for route: /auth/update-password`.
4. Reran local Vercel packaging on May 27, 2026 after PR #74; `corepack pnpm dlx vercel build --yes` now passes and writes `.vercel/output`, superseding the earlier Windows symlink `EPERM` blocker.
5. Reran the May 18, 2026 compliance dry-run/no-embed preflight and local/protected-preview demo smoke preflights. Compliance dry-run passed with 0 writes and 0 OpenAI calls; smoke remains blocked before seed/reset or browser work on missing approved env/access.
6. Cleaned up the critique repo audit items by removing production `as never` casts, adding strict app color guardrails, tokenizing web/mobile app shell colors, adding `@pest-patrol/ui-tokens` to web transpilation, removing the dead `packages/ui` Tailwind glob, and adding a local `send_succeeded` portal audit-event migration proposal without applying it to any database.

The earlier compliance baseline still matters:

1. Added shared compliance contracts for official source metadata, documents, chunks, advisory citations/findings, advisory audit records, location units, and per-unit audit items.
2. Added a Supabase migration proposal for `pgvector`, compliance source/document/chunk/audit tables, multi-unit audit tables, RLS policies, explicit authenticated/service-role Data API grants, and a vector match RPC; Codex did not apply it to any database.
3. Added domain/API-client compliance helpers for source filtering, fixture-based chunking, advisory building, missing-field checks, runtime status, multi-unit summaries, and audit persistence.
4. Added a server-only `/api/compliance/advisories` route that uses OpenAI embeddings only when `OPENAI_API_KEY` is present, keeps browser/mobile clients away from provider calls, and returns explicit disabled/insufficient-source states, including a sanitized setup-required state when the compliance schema is not applied.
5. Added `/compliance` plus advisory surfaces in inventory, dispatch, and closeouts for chemical EPA/DPR review, recurring-route review, WDO/Branch 3 evidence, and multi-unit audit readiness.
6. Added `corepack pnpm compliance:ingest` with a reviewed EPA/DPR/SPCB manifest, deterministic local chunk planning, Supabase upsert helpers, dry-run/no-embed modes, optional workflow/authority filters, and source-readiness UI.
7. Added a monorepo `outputFileTracingRoot` in `apps/web/next.config.ts` so local Vercel packaging can trace shared workspace dependencies from the repo root.

The prior provider-free operations readiness baseline still matters:

1. Provider-free dispatch route intelligence covers scheduled-order stops, technician filtering, location readiness, status counts, a still San Diego dispatch map, and service-coordinate external links.
2. The mobile technician visit flow stays organized around existing offline-first controls and queue behavior.
3. Admin closeout proof handoff readiness and customer-safe portal proof summaries avoid exposing exact technician GPS.
4. The design-token foundation feeds Tailwind, Figma variable names, the Expo mobile route shell, and tokenized mobile capture controls.
5. Payment and billing review flows remain provider-free unless Stripe/provider setup is explicitly approved.

Preview launch readiness from `origin/main` remains the smoke handoff baseline:

1. Use `docs/PREVIEW_LAUNCH_READINESS.md` as the launch punch list and `docs/PRODUCTION_READINESS.md` as the longer setup and smoke-test reference.
2. Current baseline includes portal send critique cleanup, dispatch technician preselection from `/dispatch?technician=...`, a Ready Vercel preview, and local Supabase migration files through `20260518021520_portal_send_succeeded_event.sql`; Codex has not applied preview or production migrations.
3. Run the read-only `demo:smoke` preflight before local or protected-preview seed/reset/browser smoke.
4. Keep seed/reset writes in `demo:seed`, `demo:reset`, the dashboard Demo data panel, and the localhost demo login path.
5. Require local seed/smoke to point at a local Supabase URL, and never print env values, service-role keys, credentials, bypass URLs, portal raw tokens, or provider payloads.

## Next Decision Points

1. Verify the approved local/preview migration target before applying pending local migration files, including the compliance RAG schema and `20260518021520_portal_send_succeeded_event.sql`.
2. If using local Supabase for that target verification, start or repair Docker Desktop's Linux engine and local Postgres before rerunning `supabase status -o env` and `supabase migration list --local`; the May 23, 2026 check could not inspect local containers or migration history.
3. After explicit migration approval, run `corepack pnpm compliance:ingest` against an approved local or preview Supabase environment before treating `/compliance` as source-backed; the May 23, 2026 dry-run/no-embed preflight passed locally without Supabase writes or OpenAI calls.
4. Keep local Vercel packaging as optional pre-deploy evidence; the May 27, 2026 `corepack pnpm dlx vercel build --yes` pass cleared the prior Windows symlink blocker on the synced PR #74 baseline.
5. For local fixture demos, start `corepack pnpm --filter @pest-patrol/web dev --turbopack -p 3000` and use the no-auth `Local fixture demo` path; real Supabase seed/reset is unnecessary for fixture presentation.
6. Load approved local Supabase env names and rerun `corepack pnpm demo:smoke -- --target local` only before real local seed/reset; the May 23, 2026 read-only pass is still blocked on the required env names.
7. Run real local seed/reset only after the local preflight is ready, then smoke `/`, `/dispatch`, `/closeouts`, `/customers`, `/compliance`, the mobile route flow, and tokened portal surfaces with sanitized notes, including the seeded proof photos and synthetic signature.
8. Operator loads approved preview Supabase credentials in their shell, then runs `corepack pnpm demo:smoke -- --target preview --base-url https://pest-patrol-2ayfmsfpw-ottoagent007-gmailcoms-projects.vercel.app` or the newest Ready preview discovered at execution time; the May 23, 2026 read-only pass against the latest Ready preview is still blocked on the required env names and operator-approved protected-preview access.
9. Operator optionally sets `DEMO_TECH_PASSWORD` and passes `--tech-password-env DEMO_TECH_PASSWORD` to both smoke preflight and preview seed commands when technician login demos are needed.
10. Run protected-preview browser smoke only after approved preview access and admin/dispatcher sign-in path are available, then record sanitized findings in `docs/PREVIEW_SMOKE_FINDINGS.md`.
11. Confirm manual-fallback provider smoke in an authenticated browser when webhook env names are intentionally unset; local focused tests now cover the manual-only portal, notification, and payment setup states, but browser evidence remains gated on env/access.
12. Continue mobile primitive adoption only as small follow-up slices, such as capture-control buttons/cards; keep broad mobile restyling deferred.
13. Decide whether reviewed compliance advisory evaluation, provider delivery receipts, production launch checklist work, or another smoke-proven provider-free polish slice should be next only after authenticated preview evidence is available.
14. Keep future map-provider work deferred until token, cost, privacy, env, and provider-dashboard setup are explicitly approved.
