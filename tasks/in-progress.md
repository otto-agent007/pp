# In Progress

No active implementation slice is currently open.

Recent closure:

- Mobile Treatment Form Bilingual Copy V1 started from local `main` synced
  through merged PR #75 on branch `codex/mobile-treatment-form-bilingual-v1`.
- Mobile treatment-form labels, placeholders, and required-field errors now
  respect the technician language selection for English and Spanish while
  preserving the existing domain form template, JSONB field ids, offline draft
  state, and sync queue contracts.
- The slice kept STT, audio recording, dependencies, Expo config, provider
  routes, env changes, migrations, Supabase writes, preview mutations, and
  production mutations out of scope.
- Verified with focused treatment-form copy tests, full mobile tests, mobile
  typecheck, i18n typecheck, full repo gates, and `git diff --check`.
- Dispatch Calendar Proof Polish V1 synced local `main` through merged PR #75
  and moved the protected dispatch diff onto
  `codex/dispatch-calendar-proof-polish-v1`.
- `/dispatch` now keeps the 180-job weekly calendar denser: stop readiness,
  route/order context, customer/location, service-map link, status,
  technician, and GPS proof state are visible before edit controls.
- Per-job status and technician edits now stay behind an explicit `Manage`
  control, with accessible job-group labels and only the selected job's
  controls expanded.
- Empty or loading GPS evidence now renders as compact inline copy while the
  full evidence panel is reserved for synced arrival/departure proof.
- Route intelligence now has stronger summary tones, compact disclosure
  counts, smaller period navigation, and today's highlighted day column without
  adding a map provider.
- Verified with the focused dispatch test, `corepack pnpm test`,
  `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm build`,
  `corepack pnpm demo:fixture-smoke`, in-app browser DOM QA on `/dispatch`,
  and `git diff --check`.
- The slice kept migrations, schema changes, provider setup, env changes,
  Supabase writes, preview mutations, production mutations, and embedded map
  SDKs out of scope.
- Mobile Capture Proof Frames V1 adopted shared native `CaptureCard` framing
  for photo proof previews and the signature pad while preserving existing
  `CaptureButton` actions, Expo camera/library/signature flows, and offline
  queue stores.
- Focused mobile capture tests, mobile typecheck, full repo test, typecheck,
  lint, build, and whitespace checks passed for the new photo/signature
  proof-frame behavior.
- The slice kept migrations, provider setup, env changes, Supabase writes,
  preview mutations, production mutations, mobile dependency/config changes,
  and raw-audio/STT implementation out of scope.
- Local Vercel Packaging Evidence Refresh V1 synced local `main` through
  merged PR #74 and moved the evidence-only follow-up to
  `codex/vercel-packaging-evidence-v1`.
- `corepack pnpm dlx vercel build --yes` now passes on the synced PR #74
  baseline, writes `.vercel/output`, and supersedes the earlier local Windows
  symlink `EPERM` blocker.
- The remaining launch gates are unchanged: approved Supabase env names before
  real seed/reset or authenticated smoke, Docker/local Postgres availability
  before local migration-history inspection, protected-preview access, and an
  admin/dispatcher sign-in path.
- The slice kept app behavior, migrations, providers, env changes, seed/reset
  writes, Supabase writes, preview mutations, production mutations, and live
  compliance ingestion out of scope.
- Production Demo Showpiece V1 enriched the canonical demo seed and local
  fixture story with synthetic San Diego coordinates, arrival/departure GPS
  evidence, proof photos/signatures, treatment forms, chemical logs, invoices,
  pending/paid/failed payments, and portal-ready proof while preserving the
  16 technicians, 100 customers, 180 current-week jobs, and 14 inventory-item
  baseline.
- The provider-free San Diego map projection now keeps GPS truck markers on
  the coastline/inland land area; closeouts now default to proof-rich completed
  work with forms, chemical logs, proof photos, and signatures, leaving only
  three intentional needs-captures examples.
- `/technicians` now surfaces a top `Active techs` KPI derived from active
  records, `/` uses the Claude Admin UI-inspired compact Today's Dispatch row
  with technician name plus matching GPS signal before the normal status pill,
  and `/inventory` now has a selectable Product cockpit for stock, usage,
  reorder, compliance cues, low-stock examples, and an archived item.
- Verified with focused domain/web tests, `corepack pnpm test`,
  `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm build`,
  `corepack pnpm demo:fixture-smoke`, and `git diff --check`.
- The slice kept migrations, schema changes, provider setup, env changes,
  Supabase writes, preview mutations, production mutations, and real
  Stripe/map-provider wiring out of scope.
- Dashboard BI Performance + Readiness Evidence V1 moved protected dashboard
  work off the already-merged PR #72 branch onto
  `codex/dashboard-bi-performance-v1` while leaving local helper-file residue
  untracked and unstaged.
- `/` now shows BI-style dashboard KPI cards, technician performance, and an
  operator insight banner from existing loaded hook data without schema,
  provider, env, Supabase, or API contract changes.
- The local fixture smoke harness is the current repeatable no-env demo QA
  gate; `corepack pnpm demo:fixture-smoke` passed on `/`, `/dispatch`,
  `/customers`, `/jobs`, `/inventory`, `/payments`, `/closeouts`,
  `/compliance`, `/automation`, and tokened `/portal` at desktop and narrow
  widths with no page/console errors, horizontal overflow, or sensitive
  patterns.
- Mobile STT is now decisioned for a later approved implementation slice:
  recorded-audio transcription through a server/provider adapter, English and
  Spanish support, final editable transcript text only, no retained or queued
  raw audio, and insertion into existing treatment-form draft fields.
- Latest Vercel discovery found Ready preview
  `https://pest-patrol-5j7ihwnvs-ottoagent007-gmailcoms-projects.vercel.app`
  and Ready production
  `https://pest-patrol-xd9td65tl-ottoagent007-gmailcoms-projects.vercel.app`;
  `vercel inspect` reported the preview Ready and `vercel curl` returned the
  protected app shell.
- Vercel Preview env names exist for Supabase and scheduler secrets, but
  Stripe, portal/notification webhook, OpenAI compliance, and Expo public
  Supabase env names were not present in the safe env-name list.
- Read-only local and preview `demo:smoke` preflights remain blocked before
  seed/reset or authenticated preview browser smoke on missing local shell
  Supabase env names; preview also remains gated on operator-approved
  protected-preview access and admin/dispatcher sign-in.
- Supabase local target inspection remains blocked because Docker Desktop's
  Linux engine pipe is unavailable and local Postgres on `127.0.0.1:54322`
  refused `supabase migration list --local`; no migration apply command ran.
- `corepack pnpm compliance:ingest -- --dry-run --no-embed` still plans
  6 sources, 6 documents, and 6 chunks with 0 Supabase writes and 0 OpenAI
  calls.
- Large Interactive Demo Reset V1 updated the canonical demo seed and local
  fixture demo so reuse/login resets to 16 technicians, 100 customers, 108
  locations, 180 current-week jobs, and 14 realistic synthetic inventory items.
- The no-env local demo now supports editable Core Ops fixture mutations for
  customers, technicians, jobs/dispatch, inventory usage, invoices/payments,
  and portal access token state, and resets on demo login or Demo data reset.
- The slice kept migrations, schema changes, provider setup, env changes,
  preview mutations, production mutations, and public API contract changes out
  of scope.
- Automatic Large Demo Login Refresh V1 initially expanded the guarded
  synthetic San Diego demo story; Large Interactive Demo Reset V1 now
  supersedes those defaults with 16 technicians, 100 customers, 108 locations,
  180 current-week jobs, and 14 realistic synthetic inventory items while
  preserving chemical logs, treatment forms, invoices, payment state, and proof
  media.
- `demo@email.com` sign-in now calls an authenticated login-refresh route that
  verifies the signed-in profile email, refuses production, reuses existing
  service-role/local-preview guardrails, refreshes demo-owned operational
  records, and preserves the active demo admin auth user/session.
- Manual demo admin sign-in and the local one-click demo button both trigger
  refresh, while local fixture mode still works without Supabase env values.
- Focused domain/API-client/web tests, full `corepack pnpm test`, typecheck,
  lint, and `git diff --check` passed in the isolated
  `codex/automatic-large-demo-login-refresh-v1` worktree; the build passed
  from a temporary short-path verification worktree because the isolated
  Windows worktree path exceeds the Hermes compiler spawn limit.
- The slice kept migrations, schema changes, provider setup, env changes,
  preview mutations, production mutations, and public API contract changes out
  of scope.
- Launch Readiness White Canvas V1 synced local `main` to the PR #53 merge
  commit `52ab65c397e82c78d9b6c37d963d78a4cb5be7d3` and opened
  `codex/launch-readiness-white-canvas` while preserving the prior branch's
  extra post-merge dispatch evidence commit.
- GitHub/Vercel readiness evidence is current: PR #53 is merged, GitHub checks
  reported `verify` success plus Vercel success, latest Ready preview is
  `https://pest-patrol-2ayfmsfpw-ottoagent007-gmailcoms-projects.vercel.app`,
  and latest Ready production deployment is
  `https://pest-patrol-m084wbv4s-ottoagent007-gmailcoms-projects.vercel.app`.
- Read-only local and preview `demo:smoke` preflights remain blocked before
  seed/reset or authenticated preview browser smoke on missing approved
  Supabase env names; preview also remains gated on operator-approved
  protected-preview access/sign-in.
- `corepack pnpm compliance:ingest -- --dry-run --no-embed` still plans
  6 sources, 6 documents, and 6 chunks with 0 Supabase writes and 0 OpenAI
  calls.
- Pending launch-sensitive migrations were reaudited through
  `20260518021520_portal_send_succeeded_event.sql` without applying them; the
  operator checklist now requires target confirmation, migration-history
  inspection, timestamp-order apply, and post-apply dry-run checks.
- The light app canvas token and legacy `neutralLight` alias now resolve to
  white instead of cream, and `docs/DESIGN_SYSTEM.md` documents
  `primitive/cream/50` as historical only for app canvas purposes.
- Local fixture browser smoke passed on `/`, `/dispatch`, `/customers`,
  `/jobs`, `/inventory`, `/payments`, `/closeouts`, `/compliance`,
  `/automation`, and tokened `/portal` at desktop and narrow widths with
  expected fixture content, no signed-out/loading auth gate, no console/page
  errors, no document-level horizontal overflow, and white sampled canvas
  pixels on every route.
- The slice kept seed/reset writes, migrations, Supabase/Vercel/provider/env
  changes, live compliance ingestion, preview mutations, production mutations,
  and API contract changes out of scope.
- Admin Shell + Overview UI Kit Alignment V1 moved signed-in admin routes into
  a dark left-rail desktop shell with grouped operations/customer/billing/system
  navigation, mobile top brand row plus horizontal route strip, approved active
  wordmark usage, active route state, and unchanged public-route hiding.
- `/` now presents a dense dashboard overview with operations header,
  profile-aware greeting, loaded-data search, compact KPI cards, today's
  schedule, provider-free static dispatch map, jobs needing attention, low
  inventory, recent activity, smoke-readiness gates, demo controls, and guided
  smoke links while keeping hooks/domain contracts provider-free.
- Focused shell/home tests, `corepack pnpm test`, `corepack pnpm typecheck`,
  `corepack pnpm lint`, `corepack pnpm build`, and `git diff --check` passed.
- Local `next dev` compiled the changed admin overview route, but authenticated
  Browser QA remained blocked in this session because the Browser plugin did
  not expose a callable browser tool and fallback Chrome headless/CDP attempts
  were unstable from the local shell.
- The slice kept migrations, provider setup, env changes, Supabase writes, live
  compliance ingestion, preview/production mutations, shared UI exports, and
  inactive brand asset swaps out of scope.
- Provider-Free Polish Next Five V1 graduated capture-control native
  primitives, shared CountTile reuse, wordmark promotion-readiness docs,
  fixture-backed compliance advisory evaluation, and manual-fallback provider
  copy harmonization.
- Mobile capture controls now use shared `@pest-patrol/ui-native`
  `CaptureSection`, `CaptureCard`, and `CaptureButton` primitives while
  preserving offline stores, sync queue payloads, route-shell layout, and the
  existing capture-control styles that still own inputs/details.
- `/closeouts` and `/payments` now reuse a shared presentation-only
  `CountTile` primitive with accessible button semantics without changing
  filtering behavior or domain models.
- Brand readiness now documents production title text, active/reference asset
  boundaries, minimum lockup sizing, and mobile lockup behavior while keeping
  inactive v3 wordmark drafts out of app chrome and package exports.
- Compliance advisory evaluation now runs fixture-backed domain/UI checks and
  keeps schema-unavailable, RAG-disabled, and runtime-unavailable states
  advisory-only with sanitized operator copy.
- Portal, notification, payment, automation, and home launch-gate surfaces now
  share manual-fallback/provider-readiness copy without exposing provider
  internals, webhook URLs, secrets, payloads, or raw portal tokens.
- Focused tests, mobile/web/package typechecks, local Browser QA for
  `/payments`, `/closeouts`, and `/compliance` at desktop and narrow widths,
  `corepack pnpm test`, `corepack pnpm typecheck`, `corepack pnpm lint`, and
  `corepack pnpm build` passed for the final branch.
- The batch kept migrations, provider setup, env changes, Supabase writes, live
  compliance ingestion, preview/production mutations, provider dashboard work,
  and app-chrome brand swaps out of scope.
- Stash Rescue Sync Badge + Compliance Live State V1 added a shared native
  `SyncBadge` primitive with tone, dot, and pending-count support.
- `SyncStatusIndicator` now uses the shared badge for its visual state while
  preserving existing offline queue logic, sync actions, route-shell container
  styling, and offline-first behavior.
- `/compliance` now clarifies non-live multi-unit readiness, advisory runtime
  state, and audit loading/error/empty states without exposing raw setup or
  schema details.
- The rescue slice kept stale stash inventory/closeout/doc hunks, migrations,
  provider setup, environment changes, Supabase writes, live compliance
  ingestion, preview mutations, and production mutations out of scope.
- Focused native/mobile/compliance tests, mobile typecheck, local Browser QA
  on `/compliance` at desktop and narrow widths, full repo gates, and
  `git diff --check` passed for the final branch.
- Inventory Usage + Closeout Proof States V1 now surfaces per-chemical usage
  counts, low-stock last-used recency, and expandable last-3-use history on
  `/inventory` from already loaded chemical logs.
- `/closeouts` now uses missing-capture micro-lines, grouped location/billing
  proof evidence, and next-action context cues for blocked, ready, invoiced,
  sent, paid, and voided jobs.
- The 014 relay implementation kept existing hooks, data flow, API contracts,
  schema, providers, env, seed/reset writes, preview state, and production state
  out of scope.
- Mobile UI Native Primitives V1 added `@pest-patrol/ui-native` with shared
  token-driven `Button`, `Card`, `Eyebrow`, `StatusPill`, `StatTile`, and
  `Avatar` React Native primitives.
- `AssignedJobCard` now uses the shared native `StatusPill`, and
  `MobileTechnicianHeader` uses the shared native `Button` for Language and
  Sign Out controls.
- The slice kept `routeShellStyles.ts`, `mobileCaptureControlStyles`,
  migrations, provider setup, env changes, preview/production mutations, auth
  changes, and app chrome out of scope.
- Demo-Visible Fixture Smoke V1 made local fixture demo data truly no-auth:
  the dashboard Demo data panel now reports `Local fixture demo`, fixture
  seed/reset actions are local no-ops, and the UI no longer shows
  `Authentication is required` when Supabase env values are absent.
- Tokened local `/portal` now reads fixture closeouts and billing, so Rivera
  Cafe service photos and the synthetic signature render without Supabase
  storage/API access.
- Local Browser QA on `http://localhost:3000` rendered `/`, `/customers`,
  `/inventory`, `/payments`, `/closeouts`, and tokened `/portal` with Rivera
  Cafe data, 3 `/demo-media/*` assets on closeout and portal surfaces, no fresh
  console warnings/errors after the clean Turbopack restart, and no
  document-level horizontal overflow at desktop or 390px home viewport.
- Read-only local and preview `demo:smoke` preflights still block real
  seed/reset before writes because this shell lacks approved Supabase env
  names; preview smoke also remains gated on operator-approved preview access
  and admin/dispatcher sign-in.
- Current Vercel discovery found latest Ready preview
  `https://pest-patrol-es7sfp699-ottoagent007-gmailcoms-projects.vercel.app`
  and latest Ready production
  `https://pest-patrol-5sw483rdk-ottoagent007-gmailcoms-projects.vercel.app`.
- `corepack pnpm compliance:ingest -- --dry-run --no-embed` still plans 6
  sources, 6 documents, and 6 chunks with 0 Supabase writes and 0 OpenAI calls.
- Kept real seed/reset writes, migrations, provider setup, environment changes,
  preview mutations, production mutations, credentials, raw portal tokens, and
  live compliance ingestion out of scope.
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

- [ ] Consider only small remaining mobile-native primitive adoption slices;
      broad mobile restyling remains deferred.
- [ ] Operator loads approved local Supabase env names, then reruns local demo preflight against the richer seeded proof-media story.
- [ ] After local preflight is ready, run local seed/reset and authenticated browser smoke for `/closeouts`, `/customers`, tokened `/portal`, and proof-media rendering.
- [ ] Verify the approved local/preview migration target before applying pending local migration files, including `20260518021520_portal_send_succeeded_event.sql`; no preview/production migration has been applied by Codex.
- [ ] If using the local Supabase target, start or repair Docker Desktop's Linux engine and local Postgres before rerunning `supabase status -o env` and `supabase migration list --local`; the May 23, 2026 check could not inspect local containers or migration history.
- [ ] After explicit migration approval, run `compliance:ingest` against an approved local or preview Supabase environment before relying on source-backed `/compliance` advisories; the May 23, 2026 dry-run/no-embed preflight passed without Supabase writes or OpenAI calls.
- [ ] Operator runs local seed/reset with approved local Supabase credentials.
- [ ] Operator runs preview seed from the dashboard or a protected shell with preview Supabase credentials.
- [ ] Operator optionally supplies `DEMO_TECH_PASSWORD` for technician login demos.
- [ ] Operator loads approved preview Supabase env names, then reruns preview demo preflight against the newest Ready preview discovered at execution time; the May 23, 2026 discovery was `https://pest-patrol-2ayfmsfpw-ottoagent007-gmailcoms-projects.vercel.app`.
- [ ] Run authenticated preview smoke against the seeded story and record sanitized findings for dispatch exceptions, mobile next actions, closeout filters, and portal handoff review.
- [ ] Confirm manual-fallback provider smoke in an authenticated browser when webhook env names are intentionally unset.
- [ ] Decide whether portal delivery receipts, richer provider failure states, or production launch checklist work should be next after webhook-backed evidence exists.
- [ ] Separate Google Maps/Mapbox provider planning only after token, env, cost, and privacy decisions are approved.
