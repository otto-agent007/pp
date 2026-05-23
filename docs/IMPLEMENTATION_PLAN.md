# Implementation Plan

## Current Priority: Launch Readiness Evidence + White App Canvas

The current launch-readiness track is evidence-first after PR #53 merged:
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

1. Added Demo Media Proof V1 on a fresh branch from `origin/main`: the seeded San Diego demo story now includes richer Rivera Cafe proof context, expanded treatment-form fields, 3 chemical logs, 2 form submissions, 6 inventory items, and 3 synthetic proof media records.
2. Extended seed/reset execution so demo media is uploaded to the `job-media` storage bucket, inserted into `job_media`, removed from storage during reset, and counted in CLI/dashboard/smoke-preflight summaries.
3. Added checked-in `/demo-media/*` SVG assets for local fixture mode so closeout and tokened portal proof surfaces can render service photos and a synthetic customer signature without Supabase storage access.
4. Reran the later May 20, 2026 readiness smoke evidence batch from a fresh branch after syncing `main` to the merged PR #41 baseline; Supabase/RLS audit, compliance RAG preflight, preview drift checks, local/preview smoke preflights, and manual-fallback provider tests stayed inside the approved no-preview/no-production-mutation boundary.
5. Hardened `/api/compliance/advisories` so the server checks compliance table/RPC readiness before creating an OpenAI embedding; missing or partially applied compliance schema now returns sanitized setup-required state without an OpenAI call or advisory audit write.
6. Verified the latest Ready Vercel preview as `https://pest-patrol-9p9xhuitd-ottoagent007-gmailcoms-projects.vercel.app`; `vercel inspect` reports Ready and `vercel curl` returns the Pest Patrol OS app shell.
7. Confirmed Vercel Preview env names exist for Supabase and scheduler secrets, while Stripe, portal/notification webhook, OpenAI compliance, and Expo public Supabase names remain absent from the safe env-name list and therefore deferred/manual-fallback unless the operator configures them.
8. Reran local and preview `demo:smoke` preflights; both remain blocked before seed/reset or browser smoke because approved Supabase env names are not loaded in this shell. Local Supabase target inspection is also blocked by Docker Desktop's missing Linux engine pipe and local Postgres on `127.0.0.1:54322` refusing connections.
9. Confirmed manual-fallback provider behavior through focused portal, automation, and payments tests; seed/reset smoke and authenticated preview route walking remain gated on approved env/access.
10. Added Status Color + Searchability QA V1: a shared `SearchableSelect`, tone-aware `StatTile` cards, searchable workflow controls across automation/dispatch/jobs/inventory/payments, and clearer status tones for inventory, payments, and closeouts.
11. Ran local Browser QA against `/automation`, `/dispatch`, `/jobs`, `/inventory`, `/payments`, and `/closeouts` at desktop and narrow widths with local fixture data; the routes rendered without fresh console errors or document-level horizontal overflow, and searchable option filtering worked where fixture data exists.
12. Added Demo-Visible Fixture Smoke V1: local fixture demo seed status/actions no longer call the authenticated seed route, tokened `/portal` reads local fixture closeouts/billing, and the fixture clock is stable for public portal hydration.
13. Verified the local fixture demo on `http://localhost:3000` with Browser route walking for `/`, `/customers`, `/inventory`, `/payments`, `/closeouts`, and tokened `/portal`; Rivera Cafe data, 6 inventory items, and all 3 checked-in `/demo-media/*` proof assets rendered without fresh console errors or document-level overflow.
14. Refreshed current Vercel discovery: latest Ready preview is `https://pest-patrol-es7sfp699-ottoagent007-gmailcoms-projects.vercel.app` and latest Ready production deployment is `https://pest-patrol-5sw483rdk-ottoagent007-gmailcoms-projects.vercel.app`; real seed/reset remains blocked in this shell before writes on missing approved Supabase env names.
15. Added Mobile UI Native Primitives V1: `@pest-patrol/ui-native` now provides token-driven `Button`, `Card`, `Eyebrow`, `StatusPill`, `StatTile`, and `Avatar` primitives for the Expo technician app.
16. Migrated the targeted mobile proof points only: `AssignedJobCard` uses the shared native `StatusPill`, and `MobileTechnicianHeader` uses the shared native `Button` for Language and Sign Out controls while preserving the existing route-shell styles and offline-first flow.
17. Added Inventory Usage + Closeout Proof States V1: `/inventory` now derives per-chemical usage counts, low-stock usage recency, and inline recent-use strips from already loaded chemical logs.
18. Refined `/closeouts` proof-state UI with missing-capture micro-lines, grouped location/billing evidence, and next-action cues for blocked, ready, invoiced, sent, paid, and voided jobs.
19. Preserved existing hooks, data flow, API contracts, schema, providers, env, seed/reset writes, preview state, and production state for the 014 relay implementation.
20. Verified the 014 slice with focused inventory/closeouts tests, full repo tests, typecheck, lint, build, and `git diff --check`.
21. Added Stash Rescue Sync Badge + Compliance Live State V1: `@pest-patrol/ui-native` now includes a shared `SyncBadge`, mobile `SyncStatusIndicator` adopts it without changing queue behavior, and `/compliance` now clarifies non-live multi-unit readiness, advisory runtime state, and audit loading/error/empty states.
22. Kept the rescue batch provider-free and write-free: no migrations, env changes, Supabase writes, live compliance ingestion, preview mutations, production mutations, stale stash inventory changes, or stale stash closeout changes.
23. Verified the rescue batch with focused native/mobile/compliance tests, mobile typecheck, local Browser QA on `/compliance` at desktop and narrow widths, full repo tests, typecheck, lint, build, and `git diff --check`.

Previously completed launch-readiness items still matter:

1. Added reusable web `Wordmark` and `Logomark` wrappers for the checked-in brand assets, wired the dark wordmark into the admin shell home link, and documented that `docs/design-system/` remains a reference export rather than the app token source.
2. Added domain-backed dashboard launch gates for local smoke, protected-preview smoke, compliance source setup, and portal delivery mode so operators can see the next safe action without secret values.
3. Forced `/auth/update-password` to package as a dynamic app route, clearing the previous local Vercel CLI blocker `Unable to find lambda for route: /auth/update-password`.
4. Reran local Vercel packaging; it now reaches serverless-function output but remains blocked on this Windows session by `EPERM: operation not permitted, symlink '..\portal\[customerId].func' -> '.vercel\output\functions\auth\update-password.func'`.
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
4. If local Windows Vercel packaging remains required, resolve the remaining symlink permission/tooling blocker. The `/auth/update-password` lambda mapping issue is fixed, but `corepack pnpm dlx vercel build --yes` now fails after serverless function creation with `EPERM: operation not permitted, symlink '..\portal\[customerId].func' -> '.vercel\output\functions\auth\update-password.func'`.
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
