# Preview Smoke Findings

This file records operator-assisted preview smoke preflight and run findings. Do not include secrets, recovery links, raw portal URLs, service-role keys, webhook payloads, provider dashboard data, or real customer data.

## 2026-05-13 Web-First Manual-Fallback Preflight

Status: blocked before browser smoke.

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

Blockers:
- Preview deployment URL could not be discovered from the current tooling.
- Vercel connector returned `403 Forbidden` for project inspection.
- Vercel CLI is not installed in this workspace.
- GitHub deployments API returned `403` for this token.
- No admin/dispatcher preview credentials or approved preview URL were available in the workspace.

Operator inputs needed before smoke can continue:
- Approved preview deployment URL.
- Confirmation that the preview deployment points at the existing dev Supabase project inspected above.
- Admin or dispatcher sign-in path for the smoke run, shared outside docs/chat if credentials are needed.
- Confirmation that portal and notification webhooks are intentionally unset for the manual-fallback pass, or confirmation of the expected provider mode.

Next pass:
- Open the approved preview URL.
- Run the web-only manual-fallback smoke checklist in `docs/PREVIEW_LAUNCH_READINESS.md`.
- Record each workflow as pass/fail with the failure class: app bug, missing env/setup, migration drift, expected manual-fallback limitation, or follow-up polish.
