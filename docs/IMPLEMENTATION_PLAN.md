# Implementation Plan

## Current Priority: Provider-Free Operations Readiness

The latest completed batch made dispatch, mobile field work, and closeout proof more useful without adding Google Maps, Mapbox, background tracking, provider keys, environment changes, migrations, or production mutations.

Completed in this batch:

1. Packaged prior completed work into separate commits for agent guidance, Web Home Command Center V1, and GPS Arrival Proof + Dispatch Evidence V1.
2. Added provider-free dispatch route intelligence for scheduled-order stops, technician filtering, location readiness, status counts, and service-coordinate external links.
3. Organized the mobile technician visit flow around existing offline-first controls and queue behavior.
4. Added admin closeout proof handoff readiness and customer-safe portal proof summaries without exposing exact technician GPS.

Preview launch readiness from `origin/main` remains the smoke handoff baseline:

1. Use `docs/PREVIEW_LAUNCH_READINESS.md` as the launch punch list and `docs/PRODUCTION_READINESS.md` as the longer setup and smoke-test reference.
2. Current baseline includes portal send critique cleanup, dispatch technician preselection from `/dispatch?technician=...`, a Ready Vercel preview, and aligned Supabase migrations through `20260513120000_portal_send_audit_events_v1.sql`.
3. Run the read-only `demo:smoke` preflight before local or protected-preview seed/reset/browser smoke.
4. Keep seed/reset writes in `demo:seed`, `demo:reset`, the dashboard Demo data panel, and the localhost demo login path.
5. Require local seed/smoke to point at a local Supabase URL, and never print env values, service-role keys, credentials, bypass URLs, portal raw tokens, or provider payloads.

## Next Decision Points

1. Run `corepack pnpm demo:smoke -- --target local` before local seed/reset or Browser smoke.
2. Operator loads approved preview Supabase credentials in their shell, then runs `corepack pnpm demo:smoke -- --target preview --base-url <protected-preview-url>`.
3. Operator optionally sets `DEMO_TECH_PASSWORD` and passes `--tech-password-env DEMO_TECH_PASSWORD` to both smoke preflight and preview seed commands when technician login demos are needed.
4. Run local/browser smoke on `/`, `/dispatch`, `/closeouts`, mobile route flow, and tokened portal when credentials/demo data are available, then record sanitized findings in `docs/PREVIEW_SMOKE_FINDINGS.md`.
5. Decide whether provider delivery receipts, richer provider-free dispatch grouping, mobile flow refinement, deeper billing readiness, or production launch checklist work should be next.
6. Keep future map-provider work deferred until token, cost, privacy, env, and provider-dashboard setup are explicitly approved.
