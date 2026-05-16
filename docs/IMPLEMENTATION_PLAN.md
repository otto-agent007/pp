# Implementation Plan

## Current Priority: Provider-Free Demo Reliability Batch

The latest local batch strengthens the demo handoff path across dispatch,
mobile capture, closeout review, customer portal handoff, and smoke docs while
protected-preview smoke remains gated on operator env/access. It does not add
Google Maps, Mapbox, background tracking, provider keys, environment changes,
migrations, Figma canvas writes, Vercel mutations, Supabase mutations, or
production mutations.

Completed in this batch:

1. Added a domain-built dispatch exception review summary for at-risk, unassigned, missing-coordinate, and missing-GPS-evidence stops, then rendered it alongside existing provider-free route intelligence.
2. Added mobile route next-action labels derived from existing capture/readiness state so technicians can see when to capture arrival, retry photo sync, finish queued proof, or send a stop to office review.
3. Added closeout review queue filters for proof-ready, missing-capture, GPS-review, needs-invoice, and billing-ready working sets without changing customer portal payloads.
4. Added customer portal handoff review that combines active-link, contact, service/proof, invoice/balance, and manual/provider mode context while keeping tokens, hashes, provider payloads, exact GPS, storage paths, and internal notes hidden.
5. Aligned smoke-readiness docs and task ledgers around local preflight, local seed/reset, protected-preview smoke, manual-fallback provider smoke, and deferred webhook-backed provider smoke.

The prior provider-free operations readiness baseline still matters:

1. Provider-free dispatch route intelligence covers scheduled-order stops, technician filtering, location readiness, status counts, and service-coordinate external links.
2. The mobile technician visit flow stays organized around existing offline-first controls and queue behavior.
3. Admin closeout proof handoff readiness and customer-safe portal proof summaries avoid exposing exact technician GPS.
4. The design-token foundation feeds Tailwind, Figma variable names, the Expo mobile route shell, and tokenized mobile capture controls.
5. Payment and billing review flows remain provider-free unless Stripe/provider setup is explicitly approved.

Preview launch readiness from `origin/main` remains the smoke handoff baseline:

1. Use `docs/PREVIEW_LAUNCH_READINESS.md` as the launch punch list and `docs/PRODUCTION_READINESS.md` as the longer setup and smoke-test reference.
2. Current baseline includes portal send critique cleanup, dispatch technician preselection from `/dispatch?technician=...`, a Ready Vercel preview, and aligned Supabase migrations through `20260513120000_portal_send_audit_events_v1.sql`.
3. Run the read-only `demo:smoke` preflight before local or protected-preview seed/reset/browser smoke.
4. Keep seed/reset writes in `demo:seed`, `demo:reset`, the dashboard Demo data panel, and the localhost demo login path.
5. Require local seed/smoke to point at a local Supabase URL, and never print env values, service-role keys, credentials, bypass URLs, portal raw tokens, or provider payloads.

## Next Decision Points

1. Load approved local Supabase env names and rerun `corepack pnpm demo:smoke -- --target local` before local seed/reset or Browser smoke.
2. Run local seed/reset only after the local preflight is ready, then smoke `/`, `/dispatch`, `/closeouts`, `/customers`, the mobile route flow, and tokened portal surfaces with sanitized notes.
3. Operator loads approved preview Supabase credentials in their shell, then runs `corepack pnpm demo:smoke -- --target preview --base-url <protected-preview-url>`.
4. Operator optionally sets `DEMO_TECH_PASSWORD` and passes `--tech-password-env DEMO_TECH_PASSWORD` to both smoke preflight and preview seed commands when technician login demos are needed.
5. Run protected-preview browser smoke only after approved preview access and admin/dispatcher sign-in path are available, then record sanitized findings in `docs/PREVIEW_SMOKE_FINDINGS.md`.
6. Confirm manual-fallback provider smoke when webhook env names are intentionally unset; defer webhook-backed provider delivery receipts until provider evidence exists.
7. Decide whether provider delivery receipts, production launch checklist work, or another smoke-proven provider-free polish slice should be next after authenticated preview evidence is available.
8. Keep future map-provider work deferred until token, cost, privacy, env, and provider-dashboard setup are explicitly approved.
