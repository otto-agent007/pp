# Preview Smoke Findings

This file records operator-assisted preview smoke preflight and run findings. Do not include secrets, recovery links, raw portal URLs, service-role keys, webhook payloads, provider dashboard data, or real customer data.

## 2026-05-20 Gated Launch-Readiness Batch

Status: Supabase/RLS audit and compliance RAG hardening are locally verified; preview discovery is current; local and protected-preview smoke remain gated before seed/reset or authenticated browser smoke.

Read-only checks:
- Command: `supabase --version`
- Result: pass; local CLI is `2.98.2`. The CLI reported `2.100.1` is available.
- Command: `supabase migration list --local`
- Result: blocked by local Docker/Supabase health inspection: Docker Desktop returned a 500 for `supabase_db_pest-patrol-os`. No migration apply command was run.
- Command: migration/RLS grep audit plus Supabase security review.
- Result: pass; the compliance RAG migration enables RLS on its new tables, grants Data API reachability to `authenticated` and `service_role` but not `anon`, and uses `private.has_admin_access()` after the hardening migration. Apply migrations strictly in timestamp order because compliance and portal audit policies depend on `20260507220000_supabase_security_hardening_v1.sql`.
- Command: `corepack pnpm compliance:ingest -- --dry-run --no-embed`
- Result: pass; checked-in EPA/DPR/SPCB fixtures planned 6 sources, 6 documents, and 6 chunks with 0 Supabase writes and 0 OpenAI calls.
- Command: focused compliance tests with `--pool=threads --maxWorkers=1 --no-file-parallelism`
- Result: pass for route/API-client/UI compliance coverage; the broad first Vitest pass hit Windows worker-start timeouts, so focused reruns used lower concurrency.
- Command: full repo gate: `corepack pnpm test`, `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm build`, and `git diff --check`.
- Result: pass. The first build attempt hit machine disk pressure with `ENOSPC` while C: reported 0 GB free; clearing only the repo-local generated `.turbo` cache freed about 4.16 GB and the build rerun passed.
- Command: `corepack pnpm dlx vercel ls pest-patrol-os`
- Result: pass; latest Ready preview found at `https://pest-patrol-ehvt94v55-ottoagent007-gmailcoms-projects.vercel.app`.
- Command: `corepack pnpm dlx vercel inspect https://pest-patrol-ehvt94v55-ottoagent007-gmailcoms-projects.vercel.app`
- Result: pass; deployment `dpl_EoiVf5MRzQaxUXNoTNtn2XGPQYPW` is Ready with alias `https://pest-patrol-os-git-codex-ace315-ottoagent007-gmailcoms-projects.vercel.app`.
- Command: `corepack pnpm dlx vercel env ls`
- Result: pass; encrypted Preview env names exist for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, and `AUTOMATION_CRON_SECRET`. Stripe, portal/notification webhook, OpenAI compliance, and Expo public Supabase names were not present in the safe env-name list.
- Command: `corepack pnpm dlx vercel curl / --deployment https://pest-patrol-ehvt94v55-ottoagent007-gmailcoms-projects.vercel.app`
- Result: pass; the protected preview returned the Pest Patrol OS app shell with the admin gate text `Checking admin access...`.
- Command: `corepack pnpm demo:smoke -- --target local`
- Result: blocked safely before local seed/reset or browser smoke.
- Blocker category: missing env/setup.
- Missing setup names reported by the preflight: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Command: `corepack pnpm demo:smoke -- --target preview --base-url https://pest-patrol-ehvt94v55-ottoagent007-gmailcoms-projects.vercel.app`
- Result: blocked safely before preview seed/reset or authenticated browser smoke.
- Blocker category: missing env/setup and operator access blocked.
- Missing setup names reported by the preflight: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Command: Codex Browser runtime connection through the Browser plugin.
- Result: Browser runtime listed the Codex In-app Browser, but rendered route walking was not attempted because the local preflight is env-blocked and no local dev server/browser pane was ready for smoke.

Slice outcomes:
- Compliance RAG Schema Guard V1: `/api/compliance/advisories` now probes the compliance tables and `match_compliance_chunks` RPC before creating an OpenAI embedding, so missing or partial schema drift returns sanitized setup-required state without an OpenAI call or audit write.
- Supabase/RLS Audit V1: no migration edit was needed; compliance Data API grants are explicit and RLS remains the authenticated row-level boundary. `service_role` remains server/tooling-only and must never be exposed as `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*`.
- Preview Drift Check V1: latest Ready preview, app-shell boot, project metadata, cron path, and safe env-name presence were verified through the Vercel CLI; Vercel connector/API inspection still needs re-auth or CLI fallback for this scope.
- Local Rendered Smoke Gate V1: local smoke remains blocked before seed/reset or route walking until approved local Supabase env names are loaded and the local Browser/dev-server path is active.

No seed/reset writes, browser login, provider dashboard mutations, environment mutations, migration application, live compliance ingestion, raw portal URLs, credentials, protected-preview access values, webhook payloads, preview data mutation, or production data actions were performed.

## 2026-05-19 Customer Admin UI Kit And Launch Gate Execution

Status: the customer/admin shared-primitives closeout is locally verified through focused UI tests and web typecheck; the brand-font direction bundle is recorded as design-only guidance; compliance dry-run passed; local and protected-preview smoke remain blocked before seed/reset, browser smoke, live compliance ingestion, provider receipt work, or production action.

Read-only checks:
- Command: `corepack pnpm exec vitest run packages/ui/index.test.tsx apps/web/app/customers/customers-client.test.tsx apps/web/app/customers/customer-portal-links.test.tsx`
- Result: pass; 3 files and 44 tests passed.
- Command: `corepack pnpm --filter @pest-patrol/web typecheck`
- Result: pass.
- Command: local Next dev server on `http://127.0.0.1:3000` plus Playwright screenshot attempts for `/customers`
- Result: local route compiled and returned HTTP 200, but rendered screenshot capture was blocked by local browser tooling (`chromium` target crash and Chrome `EACCES`). No screenshot artifact was accepted as proof.
- Command: `corepack pnpm compliance:ingest -- --dry-run --no-embed`
- Result: pass; checked-in EPA/DPR/SPCB fixtures planned 6 sources, 6 documents, and 6 chunks with 0 Supabase writes and 0 OpenAI calls.
- Command: `supabase --version`
- Result: pass; local CLI is `2.98.2`. The CLI reported `2.100.1` is available.
- Command: `supabase status -o env`
- Result: blocked before target verification because Docker Desktop's Linux engine pipe was unavailable in this session.
- Blocker category: missing env/setup.
- Command: `corepack pnpm demo:smoke -- --target local`
- Result: blocked safely before local seed/reset or browser smoke.
- Blocker category: missing env/setup.
- Missing setup names reported by the preflight: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Command: `corepack pnpm dlx vercel ls pest-patrol-os`
- Result: pass; latest Ready preview found at `https://pest-patrol-v4a42puf9-ottoagent007-gmailcoms-projects.vercel.app`.
- Command: `corepack pnpm demo:smoke -- --target preview --base-url https://pest-patrol-v4a42puf9-ottoagent007-gmailcoms-projects.vercel.app`
- Result: blocked safely before preview seed/reset or authenticated browser smoke.
- Blocker category: missing env/setup and operator access blocked.
- Missing setup names reported by the preflight: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

Slice outcomes:
- Customer Admin UI-Kit Closeout V1: tracked customer/admin UI changes remain presentation-only and verified with focused tests plus web typecheck.
- Brand Font Direction Relay Closeout V1: relay/design assets are kept as review guidance only; no app chrome or active logo wrappers changed.
- Migration Target + Compliance Activation V1: live target verification, migration application, and source-backed ingestion remain gated on approved Supabase env/access and explicit migration approval.
- Local Demo Smoke Unlock V1: blocked before local seed/reset and browser smoke on missing approved Supabase env names.
- Protected Preview Smoke + Manual-Fallback Gate V1: latest Ready preview discovered, but preview smoke remains blocked on missing approved Supabase env names plus operator-approved protected-preview access and sign-in.

No seed/reset writes, browser login, provider dashboard mutations, environment mutations, migration application, live compliance ingestion, raw portal URLs, credentials, protected-preview access values, webhook payloads, preview data mutation, or production data actions were performed.

## 2026-05-18 Next Five Launch Gate Batch

Status: brand app-shell intake and provider-free launch-gate guidance are implemented locally; compliance dry-run passed; local and protected-preview smoke remain blocked before any seed/reset, browser smoke, live compliance ingestion, provider-receipt work, or production action.

Read-only checks:
- Command: `corepack pnpm vitest run packages/domain/auth.test.ts packages/domain/closeouts.test.ts packages/domain/homeCommandCenter.test.ts apps/web/app/admin-nav.test.tsx apps/web/app/page.test.tsx apps/web/app/brand/wordmark.test.tsx apps/web/app/api/portal/access-tokens/send/route.test.ts apps/web/app/api/portal/access-tokens/[tokenId]/events/route.test.ts apps/web/app/customers/customer-portal-links.test.tsx`
- Result: pass; 9 files and 80 tests passed.
- Command: Browser DOM/console smoke on `http://localhost:3000`, then home `Open dispatch`.
- Result: pass; home rendered smoke-readiness launch gates, dispatch navigation rendered `Dispatch Calendar`, no framework overlay was present, and no relevant warning/error console logs were reported. Browser screenshot capture timed out, so no screenshot artifact was recorded.
- Command: `corepack pnpm test`, `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm build`, and `git diff --check`
- Result: pass; full repo verification passed. Build printed the existing Expo `NO_COLOR`/`FORCE_COLOR` warning.
- Command: `corepack pnpm compliance:ingest -- --dry-run --no-embed`
- Result: pass; checked-in EPA/DPR/SPCB fixtures planned 6 sources, 6 documents, and 6 chunks with 0 Supabase writes and 0 OpenAI calls.
- Command: `corepack pnpm demo:smoke -- --target local`
- Result: blocked safely before seed/reset or browser smoke.
- Blocker category: missing env/setup.
- Missing setup names reported by the preflight: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Command: `corepack pnpm dlx vercel ls pest-patrol-os`
- Result: latest Ready preview found at `https://pest-patrol-rhujvtkqx-ottoagent007-gmailcoms-projects.vercel.app`.
- Command: `corepack pnpm dlx vercel build --yes`
- Result: the prior `/auth/update-password` lambda-mapping blocker is fixed; local Vercel CLI now emits `/auth/update-password` as dynamic and reaches serverless-function output.
- Blocker category: local Windows Vercel CLI packaging blocker.
- Exact remaining failure: `EPERM: operation not permitted, symlink '..\portal\[customerId].func' -> '.vercel\output\functions\auth\update-password.func'`.
- Command: `corepack pnpm demo:smoke -- --target preview --base-url https://pest-patrol-rhujvtkqx-ottoagent007-gmailcoms-projects.vercel.app`
- Result: blocked safely before preview seed/reset or authenticated browser smoke.
- Blocker category: missing env/setup and operator access blocked.
- Missing setup names reported by the preflight: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

Slice outcomes:
- Brand Asset App-Shell Intake V1: locally implemented with brand wrappers, admin shell wordmark, ID suffixing coverage, and asset docs.
- Local Vercel Packaging Blocker Fix V1: repo-side `/auth/update-password` lambda mapping fixed; remaining failure is local Windows symlink creation during Vercel output assembly.
- Provider-Free Smoke Readiness Polish V1: dashboard launch gates now surface local smoke, protected-preview smoke, compliance setup, and portal delivery mode next actions without secret values.
- Compliance Source-Backed Local Ingestion V1: dry-run/no-embed passed; live migration/application and source ingestion remain gated on explicit approved local target.
- Authenticated Preview Smoke + Launch Gate V1: latest Ready preview was discovered, but preflight remains blocked before seed/reset and browser smoke.

No seed/reset writes, browser login, provider dashboard mutations, environment mutations, migration application, live compliance ingestion, raw portal URLs, credentials, protected-preview access values, webhook payloads, preview data mutation, or production data actions were performed.

## 2026-05-17 Production-Readiness Slice Execution

Status: compliance closeout verification passed locally; local and protected-preview smoke remain blocked before any seed/reset, browser smoke, blocker-fix, or provider-receipt work.

Read-only checks:
- Command: `corepack pnpm compliance:ingest -- --dry-run --no-embed`
- Result: pass; checked-in EPA/DPR/SPCB fixtures planned 6 sources, 6 documents, and 6 chunks with 0 Supabase writes and 0 OpenAI calls.
- Command: `corepack pnpm exec vitest run tooling/compliance-ingest.test.ts packages/domain/compliance.test.ts packages/api-client/compliance.test.ts apps/web/app/api/compliance/advisories/route.test.ts apps/web/app/compliance/compliance-client.test.tsx`
- Result: pass; 5 files and 21 tests passed.
- Command: `corepack pnpm demo:smoke -- --target local`
- Result: blocked safely before seed/reset or browser smoke.
- Blocker category: missing env/setup.
- Missing setup names reported by the preflight: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Command: `corepack pnpm dlx vercel ls pest-patrol-os`
- Result: latest Ready preview found at `https://pest-patrol-axms2ozg8-ottoagent007-gmailcoms-projects.vercel.app`.
- Command: `corepack pnpm dlx vercel build --yes` after clearing ignored generated output.
- Result: blocked after `next build` completed and route output was generated.
- Blocker category: local Vercel CLI packaging blocker.
- Exact failure: `Unable to find lambda for route: /auth/update-password`; Vercel CLI also reported tracing entries due to missing build traces while creating serverless functions.
- Command: `corepack pnpm demo:smoke -- --target preview --base-url https://pest-patrol-axms2ozg8-ottoagent007-gmailcoms-projects.vercel.app`
- Result: blocked safely before preview seed/reset or authenticated browser smoke.
- Blocker category: missing env/setup and operator access blocked.
- Missing setup names reported by the preflight: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

Slice outcomes:
- Compliance RAG Closeout and Migration Approval Package V1: locally verified through dry-run/no-embed and focused tests; the migration remains proposal-only and was not applied.
- Local Demo Smoke Unlock V1: blocked before seed/reset and Browser smoke.
- Protected Preview Authenticated Smoke V1: blocked before seed/reset and authenticated Browser smoke.
- Smoke-Proven Blocker Fixes V1: no smoke-proven app bug was available to fix.
- Production Launch Gate and Provider Mode Decision V1: preview-first remains the route to production readiness; manual fallback stays the accepted provider mode until webhook-backed evidence exists.

No seed/reset writes, browser login, provider dashboard mutations, environment mutations, migration application, raw portal URLs, credentials, protected-preview access values, webhook payloads, or production data actions were performed.

## 2026-05-16 Next Five Slice Smoke Gate

Status: the planned local and protected-preview smoke unlock slices were attempted read-only; seed/reset, browser smoke, blocker fixes, manual-fallback closure, and portal delivery receipts remain gated on setup evidence.

Read-only checks:
- Command: `corepack pnpm demo:smoke -- --target local`
- Result: blocked safely before seed/reset or browser smoke.
- Blocker category: missing env/setup.
- Missing setup names reported by the preflight: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Command: `corepack pnpm demo:smoke -- --target preview --base-url <latest-preview-url>`
- Result: blocked safely before seed/reset or browser smoke.
- Blocker category: missing env/setup and operator access blocked.
- Missing setup names reported by the preflight: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

Slice outcomes:
- Local Demo Smoke Unlock V1: blocked before seed/reset and Browser smoke.
- Protected Preview Authenticated Smoke V1: blocked before seed/reset and authenticated Browser smoke.
- Smoke-Proven Blocker Fixes V1: no smoke-proven app bug was available to fix.
- Manual-Fallback Provider Smoke Closure V1: deferred until an authenticated local or preview browser smoke path is available.
- Portal Delivery Receipts V1: deferred until webhook-backed portal send evidence exists and any required migration proposal is explicitly approved.

No seed/reset writes, browser login, provider dashboard mutations, environment mutations, migrations, raw portal URLs, credentials, protected-preview access values, webhook payloads, or production data actions were performed.

## 2026-05-16 Provider-Free Demo Reliability Batch

Status: local implementation and focused verification are in progress; local and protected-preview smoke remain blocked on approved environment and operator access inputs.

Repo updates ready for smoke once access is available:
- Route: `/dispatch`
- Result: added provider-free exception review for at-risk, unassigned, missing-coordinate, and missing-GPS-evidence stops.
- Route: mobile route flow
- Result: added per-stop next-action labels for queued, failed, missing, and office-review-ready capture states.
- Route: `/closeouts`
- Result: added proof-ready, missing-capture, GPS-review, needs-invoice, and billing-ready review filters.
- Route: `/customers`
- Result: added portal handoff review across active-link, contact, proof/service, billing, balance, and manual/provider send mode context.

Launch gate:
- Local smoke still needs approved local Supabase env names loaded before seed/reset or browser workflow checks.
- Protected-preview smoke still needs approved preview Supabase env names, an operator-approved protected-preview browser access path, and an admin or dispatcher sign-in path.
- Manual-fallback provider smoke remains valid when portal, notification, or Stripe webhook env names are intentionally unset.
- Webhook-backed provider smoke remains deferred until provider env/access is explicitly approved.

No seed/reset writes, provider dashboard mutations, environment mutations, migrations, raw portal URLs, credentials, protected-preview access values, or production data actions were performed.

## 2026-05-16 Authenticated Preview Smoke Resume

Status: read-only smoke preflight resumed; local and preview workflow smoke remain blocked on approved environment and operator access inputs.

Read-only checks:
- Command: `corepack pnpm demo:smoke -- --target local`
- Result: blocked safely before seed/reset or browser smoke.
- Blocker category: missing env/setup.
- Missing setup names reported by the preflight: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Command: `corepack pnpm demo:smoke -- --target preview --base-url <latest-preview-url>`
- Result: blocked safely before seed/reset or browser smoke.
- Blocker category: missing env/setup and operator access blocked.
- Missing setup names reported by the preflight: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

Launch gate:
- Local smoke needs approved local Supabase env names loaded before any seed/reset or browser workflow check.
- Preview smoke needs approved preview Supabase env names, an operator-approved protected-preview browser access path, and an admin or dispatcher sign-in path.
- No seed/reset writes, provider dashboard mutations, environment mutations, migrations, raw portal URLs, credentials, or production data actions were performed.

Next action:
- Continue with provider-free product slices that reduce demo risk while operator access remains unavailable.

## 2026-05-15 Provider-Free Workflow Local Preflight

Status: local smoke preflight ran read-only and is blocked on missing local Supabase environment names.

Findings:
- Route: local preflight
- Action: ran `corepack pnpm demo:smoke -- --target local`.
- Result: blocked; shell seed readiness and browser smoke readiness are blocked because local Supabase env names are not loaded.
- Blocker category: missing env/setup.
- Next action: operator loads approved local Supabase values outside docs/chat, reruns the preflight, then seeds or browser-smokes only after the preflight is ready.

Missing env names reported by the preflight:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

No seed/reset command, migration, provider setup, Vercel env mutation, Supabase dashboard mutation, production data mutation, browser login, credential capture, raw portal token, or protected preview URL was used in this pass.

## 2026-05-14 Preview Launch Baseline And Preflight

Status: latest preview is Ready and app-shell reachable; authenticated workflow smoke remains operator-blocked.

Baseline:
- Local branch: `codex/preview-smoke-runbook`.
- Current repo baseline includes portal send critique cleanup and dispatch technician query-param preselection.
- Local GitHub MCP tooling and critique notes were later folded into the repo cleanup commit; no secrets or protected preview values were committed.
- No migrations, Supabase dashboard changes, Vercel env mutations, provider dashboard mutations, credentials, or production data changes were performed.

Read-only checks:
- Supabase CLI is available (`2.98.2`).
- Supabase migration history matches all 23 local migrations through `20260513120000_portal_send_audit_events_v1.sql`.
- Vercel lists the latest preview deployment as Ready:
  - `https://pest-patrol-eicfcqvgm-ottoagent007-gmailcoms-projects.vercel.app`
  - alias: `https://pest-patrol-os-git-codex-11c506-ottoagent007-gmailcoms-projects.vercel.app`
- `vercel inspect` confirms the latest preview deployment is Ready.
- `vercel curl / --deployment <latest-preview-url>` returns the Pest Patrol OS app shell through Deployment Protection.
- `apps/web/vercel.json` still configures `/api/automation/scheduler` at `0 5 * * *`.
- Vercel Preview env names are present for Supabase and scheduler access:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CRON_SECRET`
  - `AUTOMATION_CRON_SECRET`

Current launch gate:
- Authenticated browser smoke was not run because no admin/dispatcher preview credentials or operator-confirmed sign-in path are available in the workspace.
- Direct interactive browser access still requires the operator browser with the approved Deployment Protection bypass cookie or an authenticated Vercel browser session.
- Stripe preview env names are still absent, so Stripe payment-link/webhook smoke remains deferred:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
- Portal and notification webhook env names are still absent. This is acceptable for a manual-fallback preview pass if the operator confirms that provider mode:
  - `PORTAL_DELIVERY_WEBHOOK_URL`
  - `PORTAL_DELIVERY_WEBHOOK_SECRET`
  - `NOTIFICATION_DELIVERY_WEBHOOK_URL`
  - `NOTIFICATION_DELIVERY_WEBHOOK_SECRET`

Triage:
- Must-fix before authenticated smoke: operator provides admin/dispatcher sign-in access outside docs/chat and confirms the interactive protected-preview access path.
- Acceptable manual-fallback items: Stripe, portal delivery, and notification delivery provider smoke can remain deferred when their preview env names are intentionally unset.
- Deferred product follow-ups: portal delivery receipts and richer provider failure classification should wait until webhook-backed portal smoke proves they are useful.

## 2026-05-14 Next Five Slice Closure

Status: preview launch batch is locally verified and ready for operator handoff; authenticated smoke is still blocked on operator access.

Slice outcomes:
- Preview Launch Batch Closure V1: current tracked changes include portal send critique cleanup, dispatch technician preselection, readiness docs, and preview preflight findings.
- Operator Smoke Access Handoff V1: `docs/PREVIEW_LAUNCH_READINESS.md` now names the required protected-preview browser session, admin/dispatcher sign-in path, sanitized evidence format, and blocker categories.
- Authenticated Preview Smoke Run V1: not run because no operator-confirmed interactive protected-preview session and no admin/dispatcher sign-in path are available in the workspace.
- Preview Smoke Blocker Fixes V1: no new smoke-proven app blocker was available to fix beyond the already implemented portal send cleanup and dispatch preselection.
- Launch Gate And Product Follow-Up V1: launch remains gated on operator access for authenticated smoke. Manual fallback remains acceptable if Stripe, portal delivery, and notification provider env vars are intentionally unset for preview.

Launch gate:
- Must resolve before authenticated preview smoke: operator provides the protected-preview browser path and admin/dispatcher sign-in path through an approved channel.
- Must resolve before webhook-backed provider smoke: operator confirms or configures the relevant Stripe, portal delivery, and notification delivery preview env vars.
- Acceptable for manual-fallback preview: provider webhook env vars stay unset when the operator confirms manual fallback is the intended preview mode.
- Next product decision after smoke: choose between portal delivery receipts, richer provider failure states, or production launch checklist work based on recorded webhook-backed evidence.

## 2026-05-14 Operator-Assisted Authenticated Smoke

Status: authenticated smoke started through operator browser access.

Findings:
- Route: `/customers`
- Action: operator signed in with an admin or dispatcher account and opened the Customers tab.
- Result: pass.
- Blocker category: none.
- Next action: continue the customer, portal, dispatch, and automation smoke steps with sanitized pass/fail evidence only.
- Route: `/customers`
- Action: operator confirmed the visible customer records are safe test data.
- Result: pass.
- Blocker category: none.
- Next action: use existing safe test records for smoke where possible instead of creating unnecessary preview data.
- Route: `/customers`
- Action: operator generated a portal link for a safe test customer.
- Result: pass; UI reported the link was copied, showed active status with no expiration, and exposed history/revoke controls.
- Blocker category: none.
- Next action: confirm manual-fallback provider controls and tokened portal access without sharing the raw portal URL or token.
- Route: `/customers`
- Action: operator reviewed portal delivery readiness for the safe test customer.
- Result: pass; UI showed portal delivery provider is manual-only, instructed manual sharing, and did not claim the link had been opened.
- Blocker category: expected manual-fallback limitation.
- Next action: open the copied portal link in the operator browser and confirm customer-safe portal content without sharing the raw URL or token.
- Route: `/portal/<customer-id>?access_token=<redacted>`
- Action: operator opened the copied portal link for the safe test customer.
- Result: pass; portal loaded successfully and no unsafe exposure was reported.
- Blocker category: none.
- Next action: continue dispatch and automation smoke with sanitized evidence.
- Route: `/dispatch` and `/jobs`
- Action: operator compared a safe test job schedule expected at 9:38 AM-10:38 AM with the displayed admin schedule.
- Result: fail; both pages displayed 2:38 AM, indicating scheduled job timestamps were rendered as absolute instants instead of operator-entered wall-clock job time.
- Blocker category: app bug.
- Next action: fixed in repo by parsing job schedule values as wall-clock timestamps for jobs/dispatch display, grouping, sorting, and date filters; verify in the next deployed preview.
- Route: `/customers`
- Action: operator requested richer portal access recency details.
- Result: repo-contained follow-up added; opened portal links now show full Pacific timestamp plus relative age where the last access timestamp is available.
- Blocker category: deferred product follow-up.
- Next action: verify the richer last-opened copy in the next deployed preview after a customer opens a portal link.

## 2026-05-14 Codex Browser Recovery Check

Status: Codex in-app Browser runtime is available for local smoke in this desktop session.

Findings:
- Route: local `/`
- Action: started the web dev server on `http://localhost:3000` and opened it through the Codex in-app Browser.
- Result: pass; the app loaded at `http://127.0.0.1:3000/` and showed the admin sign-in screen with the local demo login shortcut.
- Blocker category: none for local browser use.
- Next action: use Browser for local UI smoke where useful; protected preview browser smoke still requires an operator-approved Vercel preview access path and sign-in path.

## 2026-05-13 Web-First Manual-Fallback Preflight

Status: Vercel preview access repaired; blocked before authenticated workflow smoke.

What passed:
- Local `main` was fast-forwarded to `139123d` from PR #28.
- GitHub CI for `139123d` completed successfully.
- Local scratch remained untracked and out of scope: `tools/` and `critique-009-staging.md`.
- Supabase CLI is available (`2.98.2`).
- Linked dev Supabase project ref is present locally.
- Remote Supabase migration history matches all 23 local migrations through `20260513120000_portal_send_audit_events_v1.sql`.
- Required web environment variable names are documented in `docs/PREVIEW_LAUNCH_READINESS.md`.
- Vercel project metadata exists locally for project `pest-patrol-os`.
- `apps/web/vercel.json` contains the scheduler cron path `/api/automation/scheduler` at `0 5 * * *`.
- Vercel CLI is usable through `corepack pnpm dlx vercel` and is authenticated as an operator account.
- Vercel lists a Ready preview deployment:
  - `https://pest-patrol-b51wf0b2g-ottoagent007-gmailcoms-projects.vercel.app`
  - alias: `https://pest-patrol-os-git-codex-11c506-ottoagent007-gmailcoms-projects.vercel.app`
- `vercel inspect` confirms the preview deployment is Ready.
- `vercel curl / --deployment <preview-url>` returns the Pest Patrol OS app shell through Deployment Protection.
- Existing Vercel Protection Bypass for Automation is enabled for the project.
- The existing bypass value returns HTTP 200 for the latest preview when passed as the `x-vercel-protection-bypass` header.
- The approved bypass-cookie URL was opened in the operator's browser for interactive preview access without printing or committing the bypass value.
- Vercel Preview env vars are present for Supabase and scheduler secrets:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CRON_SECRET`
  - `AUTOMATION_CRON_SECRET`

Blockers:
- Vercel connector returned `403 Forbidden` for project inspection.
- GitHub deployments API returned `403` for this token.
- Direct browser access to the preview URL returns Vercel Deployment Protection (`401`) unless the operator uses the approved protection-bypass cookie or an authenticated Vercel session.
- The Browser plugin could not start in this desktop session because its runtime asset initialization failed, so interactive smoke was not attempted.
- No admin/dispatcher preview credentials were available in the workspace.
- Stripe preview env vars are not present, so Stripe payment-link/webhook smoke remains deferred:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
- Portal and notification webhook env vars are not present, which is expected for the manual-fallback pass:
  - `PORTAL_DELIVERY_WEBHOOK_URL`
  - `PORTAL_DELIVERY_WEBHOOK_SECRET`
  - `NOTIFICATION_DELIVERY_WEBHOOK_URL`
  - `NOTIFICATION_DELIVERY_WEBHOOK_SECRET`

Operator inputs needed before smoke can continue:
- Confirmation that the preview deployment points at the existing dev Supabase project inspected above.
- Admin or dispatcher sign-in path for the smoke run, shared outside docs/chat if credentials are needed.
- Confirmation that portal and notification webhooks are intentionally unset for the manual-fallback pass, or confirmation of the expected provider mode.

Next pass:
- Use the operator browser where the bypass cookie was set, or another authenticated Vercel browser session.
- Run the web-only manual-fallback smoke checklist in `docs/PREVIEW_LAUNCH_READINESS.md`.
- Record each workflow as pass/fail with the failure class: app bug, missing env/setup, migration drift, expected manual-fallback limitation, or follow-up polish.
