# Preview Smoke Findings

This file records operator-assisted preview smoke preflight and run findings. Do not include secrets, recovery links, raw portal URLs, service-role keys, webhook payloads, provider dashboard data, or real customer data.

## 2026-05-13 Web-First Manual-Fallback Preflight

Status: preflight repaired; blocked before interactive browser smoke.

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
- Vercel Preview env vars are present for Supabase and scheduler secrets:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CRON_SECRET`
  - `AUTOMATION_CRON_SECRET`

Blockers:
- Vercel connector returned `403 Forbidden` for project inspection.
- GitHub deployments API returned `403` for this token.
- Direct browser access to the preview URL returns Vercel Deployment Protection (`401`) unless the operator provides an authenticated browser session, a temporary share link, or explicitly approves a protection-bypass access path.
- The Browser plugin could not start in this desktop session because its runtime asset initialization failed, so interactive smoke was not attempted.
- No admin/dispatcher preview credentials or approved browser access path were available in the workspace.
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
- Approved interactive browser access path: authenticated Vercel/browser session, temporary share link, or explicit approval for Codex to create a protected-preview access link if available.
- Admin or dispatcher sign-in path for the smoke run, shared outside docs/chat if credentials are needed.
- Confirmation that portal and notification webhooks are intentionally unset for the manual-fallback pass, or confirmation of the expected provider mode.

Next pass:
- Open the Ready preview URL through the approved browser access path.
- Run the web-only manual-fallback smoke checklist in `docs/PREVIEW_LAUNCH_READINESS.md`.
- Record each workflow as pass/fail with the failure class: app bug, missing env/setup, migration drift, expected manual-fallback limitation, or follow-up polish.
