# Preview Launch Readiness

This punch list prepares Pest Patrol OS for a Vercel preview backed by an approved Supabase environment. It is operator-assisted: Codex may inspect code, docs, and local verification output, but dashboard changes, secrets, production data, provider config, and migration application require explicit operator approval.

## Codex-Owned Repo Work

- Keep `README.md`, `docs/IMPLEMENTATION_PLAN.md`, `tasks/in-progress.md`, and `docs/PRODUCTION_READINESS.md` aligned to preview launch readiness.
- Verify route and env names against the code before smoke testing.
- Run local verification before every readiness PR:
  - `corepack pnpm test`
  - `corepack pnpm typecheck`
  - `corepack pnpm lint`
  - `corepack pnpm build`
  - `git diff --check`
- Open draft PRs for readiness docs or small blocking app fixes.
- Record preview smoke findings without committing secrets, reset links, portal tokens, provider payloads, or production data.

## Operator-Only Setup

- Choose the Supabase project/environment for preview.
- Apply Supabase migrations in timestamp order only after approving the target environment.
- Configure Vercel preview variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `NOTIFICATION_DELIVERY_WEBHOOK_URL`
  - `NOTIFICATION_DELIVERY_WEBHOOK_SECRET`
  - `PORTAL_DELIVERY_WEBHOOK_URL`
  - `PORTAL_DELIVERY_WEBHOOK_SECRET`
  - `CRON_SECRET`
  - `AUTOMATION_CRON_SECRET`
- Configure mobile preview variables when testing Expo:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Configure Stripe test-mode webhook delivery to `/api/payments/stripe-webhook` if payment webhook smoke is in scope.
- Optionally configure notification and portal delivery webhook endpoints. If omitted, notification delivery and portal sharing must be smoke-tested through manual fallback behavior.

## Migration Readiness

Apply all migrations in timestamp order for a new preview database. The latest launch-readiness-sensitive migrations are:

- `20260507130000_technicians_admin_v1.sql`
- `20260507220000_supabase_security_hardening_v1.sql`
- `20260512043439_portal_token_audit_events_v1.sql`
- `20260513120000_portal_send_audit_events_v1.sql`

Before applying migrations, the operator should confirm the target Supabase project, backup/rollback comfort, and whether any migrations have already been applied. Codex should not run migration apply commands without explicit approval.

## Preview Smoke Run

Run these in order after the preview deployment has the approved environment variables:

1. Sign in as admin or dispatcher and confirm the protected admin shell loads.
2. Create a customer and active location.
3. Invite a technician and complete technician password setup through `/technician-login`.
4. Create a scheduled job, assign the technician, and confirm `/dispatch` and `/technicians` show the assignment.
5. Use the Expo app to queue status, geofence, form, chemical, photo, and signature captures while offline or simulated offline.
6. Return online and confirm queued mobile writes sync.
7. Review the completed job in `/closeouts` and confirm billing readiness.
8. Create an invoice in `/payments`, create a Stripe payment link when test Stripe is configured, and confirm manual `Mark paid` and `Void` require confirmation.
9. Expand the customer ledger and confirm service, invoice, open-balance, and review filters do not expose provider internals.
10. Generate a portal token, copy the session link, and open `/portal/<customer-id>?access_token=<token>`.
11. Confirm portal provider readiness shows webhook-backed or manual-only mode without exposing env values.
12. If portal webhook is configured, use `Send link` and active-row `Send new link`; confirm the UI says `Send requested` without claiming delivery and the history drawer shows provider-safe send attempt events.
13. If portal webhook is not configured, confirm manual copy remains available and provider send controls do not invite a send.
14. Revoke an active portal link and confirm the old tokened portal URL no longer loads.
15. Create an automation template/rule, preview scheduler output, run the scheduler manually, and confirm generated notifications.
16. If notification webhook is configured, send one notification and bulk-send visible pending notifications; otherwise confirm manual delivery fallback.
17. Trigger the cron route only with an approved `CRON_SECRET` or `AUTOMATION_CRON_SECRET`.
18. Confirm browser-visible screens do not expose service-role keys, cron secrets, Stripe secrets, webhook secrets, token hashes, raw stored tokens, provider payloads, or provider message internals.

## Deferred Follow-Ups

- Dispatch query-param preselection for `/dispatch?technician=...`.
- Durable provider delivery receipts for portal sends.
- Richer provider failure classification in portal send UI.
- Supabase leaked password protection if the project moves to Supabase Pro.
- Production launch checklist after preview smoke passes.
