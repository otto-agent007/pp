# Preview Smoke Findings

This file records operator-assisted preview smoke preflight and run findings. Do not include secrets, recovery links, raw portal URLs, service-role keys, webhook payloads, provider dashboard data, or real customer data.

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
