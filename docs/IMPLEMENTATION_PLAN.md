# Implementation Plan

## Current Priority: Provider-Free Demo Reliability + California Compliance RAG

The current launch-readiness track includes the customer/admin shared-primitives
closeout, brand app-shell intake, operator-facing launch gate guidance, repo
audit cleanup, and a repo-side Vercel packaging fix for the password recovery
route alongside the advisory-only California Compliance RAG baseline and
provider-free demo handoff path. It keeps protected-preview smoke gated on
operator env/access and does not apply migrations, mutate preview or production
data, configure providers, add Google Maps/Mapbox, add background tracking, or
expose server-only keys to browser/mobile clients.

Completed in this batch:

1. Added Demo Media Proof V1 on a fresh branch from `origin/main`: the seeded San Diego demo story now includes richer Rivera Cafe proof context, expanded treatment-form fields, 3 chemical logs, 2 form submissions, 6 inventory items, and 3 synthetic proof media records.
2. Extended seed/reset execution so demo media is uploaded to the `job-media` storage bucket, inserted into `job_media`, removed from storage during reset, and counted in CLI/dashboard/smoke-preflight summaries.
3. Added checked-in `/demo-media/*` SVG assets for local fixture mode so closeout and tokened portal proof surfaces can render service photos and a synthetic customer signature without Supabase storage access.
4. Reran the later May 20, 2026 readiness smoke evidence batch from a fresh branch after syncing `main` to the merged PR #41 baseline; Supabase/RLS audit, compliance RAG preflight, preview drift checks, local/preview smoke preflights, and manual-fallback provider tests stayed inside the approved no-preview/no-production-mutation boundary.
5. Hardened `/api/compliance/advisories` so the server checks compliance table/RPC readiness before creating an OpenAI embedding; missing or partially applied compliance schema now returns sanitized setup-required state without an OpenAI call or advisory audit write.
6. Verified the latest Ready Vercel preview as `https://pest-patrol-9p9xhuitd-ottoagent007-gmailcoms-projects.vercel.app`; `vercel inspect` reports Ready and `vercel curl` returns the Pest Patrol OS app shell.
7. Confirmed Vercel Preview env names exist for Supabase and scheduler secrets, while Stripe, portal/notification webhook, OpenAI compliance, and Expo public Supabase names remain absent from the safe env-name list and therefore deferred/manual-fallback unless the operator configures them.
8. Reran local and preview `demo:smoke` preflights; both remain blocked before seed/reset or browser smoke because approved Supabase env names are not loaded in this shell. Local Supabase target inspection is also blocked by Docker Desktop's missing Linux engine pipe and local Postgres on `127.0.0.1:54322` refusing connections.
9. Confirmed manual-fallback provider behavior through focused portal, automation, and payments tests; rendered route walking remains gated on local env/preflight, a running dev server, and an active Browser pane or operator-approved preview session.

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
2. If using local Supabase for that target verification, start or repair Docker Desktop's Linux engine and local Postgres before rerunning `supabase status -o env` and `supabase migration list --local`; the later May 20, 2026 check could not inspect local containers or migration history.
3. After explicit migration approval, run `corepack pnpm compliance:ingest` against an approved local or preview Supabase environment before treating `/compliance` as source-backed; the May 20, 2026 dry-run/no-embed preflight passed locally without Supabase writes or OpenAI calls.
4. If local Windows Vercel packaging remains required, resolve the remaining symlink permission/tooling blocker. The `/auth/update-password` lambda mapping issue is fixed, but `corepack pnpm dlx vercel build --yes` now fails after serverless function creation with `EPERM: operation not permitted, symlink '..\portal\[customerId].func' -> '.vercel\output\functions\auth\update-password.func'`.
5. Load approved local Supabase env names and rerun `corepack pnpm demo:smoke -- --target local` before local seed/reset or Browser smoke; the May 20, 2026 read-only pass is still blocked on the required env names.
6. Run local seed/reset only after the local preflight is ready, then smoke `/`, `/dispatch`, `/closeouts`, `/customers`, `/compliance`, the mobile route flow, and tokened portal surfaces with sanitized notes, including the seeded proof photos and synthetic signature.
7. Operator loads approved preview Supabase credentials in their shell, then runs `corepack pnpm demo:smoke -- --target preview --base-url https://pest-patrol-9p9xhuitd-ottoagent007-gmailcoms-projects.vercel.app` or the newest Ready preview discovered at execution time; the later May 20, 2026 read-only pass against the latest Ready preview is still blocked on the required env names and operator-approved protected-preview access.
8. Operator optionally sets `DEMO_TECH_PASSWORD` and passes `--tech-password-env DEMO_TECH_PASSWORD` to both smoke preflight and preview seed commands when technician login demos are needed.
9. Run protected-preview browser smoke only after approved preview access and admin/dispatcher sign-in path are available, then record sanitized findings in `docs/PREVIEW_SMOKE_FINDINGS.md`.
10. Confirm manual-fallback provider smoke in an authenticated browser when webhook env names are intentionally unset; local focused tests now cover the manual-only portal, notification, and payment setup states, but browser evidence remains gated on env/access.
11. Decide whether reviewed compliance advisory evaluation, provider delivery receipts, production launch checklist work, or another smoke-proven provider-free polish slice should be next only after authenticated preview evidence is available.
12. Keep future map-provider work deferred until token, cost, privacy, env, and provider-dashboard setup are explicitly approved.
