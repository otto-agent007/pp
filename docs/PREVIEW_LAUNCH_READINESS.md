# Preview Launch Readiness

## Operational Readiness Links

Protected-preview promotion should use the same launch guardrails that will later gate production:

- [Backup and Rollback Runbook](BACKUP_ROLLBACK_RUNBOOK.md)
- [Customer Data Privacy and Retention](CUSTOMER_DATA_PRIVACY_RETENTION.md)
- [Auth Production Hardening](AUTH_PRODUCTION_HARDENING.md)
- [OWASP API Security Review](OWASP_API_SECURITY_REVIEW.md)

Codex may run static checks and read-only smoke/preflight commands, but preview/provider/dashboard mutations remain approval-gated.

This punch list prepares Pest Patrol OS for a Vercel preview backed by an approved Supabase environment. It is operator-assisted: Codex may inspect code, docs, and local verification output, but dashboard changes, secrets, production data, provider config, and migration application require explicit operator approval.

## Codex-Owned Repo Work


- Keep `README.md`, `docs/IMPLEMENTATION_PLAN.md`, `tasks/in-progress.md`, and `docs/PRODUCTION_READINESS.md` aligned to preview launch readiness.
- Verify route and env names against the code before smoke testing.
- Keep `docs/OWASP_API_SECURITY_REVIEW.md` aligned with every
  `apps/web/app/api/**/route.ts` file and the broader OWASP Top 10 2025
  companion mapping; the static route-inventory test should fail when a new API
  route is undocumented or the 2025 web-risk lens is dropped.
- Route-level abuse protection in this slice is layered with Vercel Firewall/WAF rules:
  - run Vercel rules as operator tasks before production
  - keep route-level checks in `apps/web/app/api/_lib/rate-limit.ts` as defense-in-depth
  - local/test environments use no-op behavior to avoid blocking development retries
- Example production-oriented firewall policy payloads:

```json
{ "source": "/api/*", "mode": "waf", "actions": [{ "type": "rate_limit", "limit": 1200, "period": "60s" }] }
```

```json
{ "source": "/api/portal/*", "mode": "waf", "actions": [{ "type": "rate_limit", "limit": 120, "period": "60s" }] }
```

```json
{ "source": "/api/compliance/*", "mode": "waf", "actions": [{ "type": "rate_limit", "limit": 90, "period": "60s" }] }
```

```json
{ "source": "/api/payments/stripe-webhook", "mode": "waf", "actions": [{ "type": "rate_limit", "limit": 240, "period": "60s", "note": "allow retries" }] }
```
- Run the read-only demo smoke preflight before seed/reset commands:
  - `corepack pnpm demo:smoke -- --target local`
  - `corepack pnpm demo:smoke -- --target preview --base-url <protected-preview-url>`
- Run local verification before every readiness PR:
  - `corepack pnpm test`
  - `corepack pnpm typecheck`
  - `corepack pnpm lint`
  - `corepack pnpm build`
  - `git diff --check`
- Open draft PRs for readiness docs or small blocking app fixes.
- Record preview smoke findings without committing secrets, reset links, portal tokens, provider payloads, or production data.
- Use `/api/ops/readiness` with an admin token only for static readiness checks; it must not call Stripe, OpenAI, Supabase dashboards, or notification providers.
- Inspect preview runtime logs for sanitized event names and IDs only. Logs must not include raw request bodies, portal grants, token hashes, Stripe signatures, service-role keys, cookies, exact GPS coordinates, customer signatures, internal notes, or compliance internals.

## Security Header Observation


- Browser security headers are added through the web Next config with
  Content-Security-Policy-Report-Only first; do not treat this as enforced CSP.
- Review report-only CSP behavior in preview before any later enforcement slice.
- Preview smoke should confirm admin pages, customer portal, QR portal cards,
  Supabase signed media, Stripe payment-link handoffs, and the local Whisper dev
  rewrite path still work after headers are present.
- Enforced CSP, CSP report collection, Vercel Firewall/WAF changes, and rate
  limiting policy updates remain separate reviewed slices.
- HSTS should be reviewed only after the production HTTPS hosting path is
  confirmed; this repo slice does not add HSTS for local or preview development.

## Portal, RLS, and Media Security


- Customer portal cookie-backed unsafe POST routes require same-origin
  `Origin` or same-origin `Referer` evidence and return sanitized `403`
  responses for cross-site requests.
- RLS boundary documentation lives in `docs/RLS_BOUNDARY_AUDIT.md`; the static
  migration audit runs with `corepack pnpm exec vitest run tooling/rls-boundary-audit.test.ts`.
- Media uploads are validated before storage upload and `job_media` insert for
  safe raster MIME types, size limits, private bucket path shape, and
  customer-safe descriptions.
- Preview operators still need to verify RLS against the approved Supabase
  target after migrations, rerun Supabase advisors, verify private `job-media`
  bucket posture, enable leaked-password protection before production, and
  configure rate limiting/firewall policy outside this repo slice.

## Operator-Only Setup


- Document and configure Vercel Firewall/WAF rules (operator step) for `/api/*`, `/api/portal/*`, `/api/compliance/*`, and `/api/payments/stripe-webhook` before production go-live.
- Keep route-level checks active as a runtime fallback where suitable.
- Route 429 bodies remain generic and do not include provider keys, signatures, secrets, or tokens.
- Ensure `/api/payments/stripe-webhook` relies on signature verification and idempotent Stripe event handling for normal operations; avoid strict edge caps that would reject valid retries.

- Choose the Supabase project/environment for preview.
- Apply Supabase migrations in timestamp order only after approving the target environment.
- Configure Vercel preview variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_LIVE_MODE_APPROVED=false` unless live-mode operator approval has been completed
  - `NOTIFICATION_DELIVERY_WEBHOOK_URL`
  - `NOTIFICATION_DELIVERY_WEBHOOK_SECRET`
  - `PORTAL_DELIVERY_WEBHOOK_URL`
  - `PORTAL_DELIVERY_WEBHOOK_SECRET`
  - `CRON_SECRET`
  - `AUTOMATION_CRON_SECRET`
  - `OPENAI_API_KEY` (optional, server-only compliance RAG)
  - `OPENAI_COMPLIANCE_EMBEDDING_MODEL` (optional compliance RAG model override)
- Keep Stripe preview in test mode unless an operator explicitly approves a live-mode drill. A `sk_live_` key without `STRIPE_LIVE_MODE_APPROVED=true` should show live mode blocked and payment-link/webhook processing should not proceed.
- Confirm portal and notification provider readiness reports manual fallback, ready, or misconfigured states without showing webhook URLs or secrets.
- Watch critical preview log events for Stripe webhook errors, payment-link provider failures, portal send failures, notification delivery failures, compliance advisory unavailable states, rate-limit spikes, origin guard failures, and mobile sync failures. No external monitoring provider is configured by this slice.
- Configure mobile preview variables when testing Expo:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Configure Stripe test-mode webhook delivery to `/api/payments/stripe-webhook` if payment webhook smoke is in scope.
- Optionally configure notification and portal delivery webhook endpoints. If omitted, notification delivery and portal sharing must be smoke-tested through manual fallback behavior.
- Stripe payment-link creates should use deterministic `Idempotency-Key` headers, webhook verification requires the raw request body plus the endpoint secret, stale webhook signatures are rejected, and Stripe test mode or the Stripe CLI should be used before any production payment smoke.
- Provide an interactive Vercel preview access path before browser smoke. If Deployment Protection is enabled, use an authenticated browser session, a temporary share link, or explicitly approve Codex to create a protected-preview access link if available.
- Ensure Supabase Auth session-rate limiting and leaked-password protection are reviewed in dashboard settings.
- For synthetic demo smoke, run `corepack pnpm demo:smoke -- --target preview --base-url <protected-preview-url>` first. It is read-only and reports shell seed readiness separately from the required protected-preview browser access and admin/dispatcher sign-in path.

## Operator Smoke Access Handoff


Before authenticated smoke can run, the operator should provide access through an interactive protected-preview browser session and a valid admin or dispatcher sign-in path. Share credentials, reset links, bypass values, and portal tokens only through an approved out-of-band channel; do not paste them into repo files, docs, tests, commits, or chat.

Codex should record only sanitized smoke evidence:

- route or workflow name
- action attempted
- pass/fail result
- blocker category
- next action

Use these blocker categories consistently: app bug, missing env/setup, migration drift, expected manual-fallback limitation, operator access blocked, or deferred product follow-up.

## Preview Deployment Discovery


Use local Vercel project metadata and CLI access when connector/API access is unavailable:

- `corepack pnpm dlx vercel ls pest-patrol-os`
- `corepack pnpm dlx vercel inspect <preview-url>`
- `corepack pnpm dlx vercel env ls`
- `corepack pnpm dlx vercel curl / --deployment <preview-url>`
- `corepack pnpm dlx vercel build --yes` after ignored generated output is cleared, to verify local Vercel packaging against pulled preview settings without deploying

`vercel curl` can verify that a Deployment Protection-protected preview boots, but it does not replace an operator-approved interactive browser access path for the web smoke.

## Migration Readiness


Apply all migrations in timestamp order for a new preview database. The latest launch-readiness-sensitive migrations are:

- `20260507130000_technicians_admin_v1.sql`
- `20260507220000_supabase_security_hardening_v1.sql`
- `20260609000000_supabase_rpc_execute_grants_hardening_v1.sql`
- `20260512043439_portal_token_audit_events_v1.sql`
- `20260513120000_portal_send_audit_events_v1.sql`
- `20260516175724_california_compliance_rag_v1.sql` (operator-approved compliance RAG proposal; not applied by Codex)
- `20260518021520_portal_send_succeeded_event.sql` (portal send-event proposal; not applied by Codex)

Before applying migrations, the operator should confirm the target Supabase project/environment, backup/rollback comfort, and whether any migrations have already been applied. Inspect remote migration history before any apply, then apply pending files strictly in timestamp order. The compliance and portal send-event migrations are currently proposals; Codex should not run migration apply commands without explicit approval.

RLS/Data API note: apply migrations strictly in timestamp order. The compliance RAG and portal audit migrations depend on `20260507220000_supabase_security_hardening_v1.sql` because their policies call `private.has_admin_access()`; do not apply them as standalone SQL to a target missing that hardening migration. `20260609000000_supabase_rpc_execute_grants_hardening_v1.sql` must also be applied to remove `anon` and `public` execution from technician SECURITY DEFINER RPCs before rerunning Security Advisors. The compliance tables deliberately grant Data API reachability to `authenticated` and `service_role`, not `anon`; RLS remains the row-level boundary for authenticated users. `service_role` access is server/tooling-only, bypasses RLS, and must never be exposed as `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*`.

Apply-readiness checklist for local vs preview target:

- Confirm whether the intended target is local Supabase or the protected preview project before loading any env values.
- Inspect target migration history first; do not infer it from local files alone.
- If using local Supabase, make Docker Desktop's Linux engine and local Postgres on `127.0.0.1:54322` reachable before relying on local migration history.
- If using preview Supabase, use only an operator-approved shell or dashboard session and do not paste secrets, bypass values, or raw portal tokens into docs/chat.
- Apply pending migrations strictly in timestamp order through `20260518021520_portal_send_succeeded_event.sql`.
- After migration approval and application, rerun `corepack pnpm demo:smoke -- --target local|preview`, then `corepack pnpm compliance:ingest -- --dry-run --no-embed`, before seed/reset or live ingestion.
- Apply `20260609000000_supabase_rpc_execute_grants_hardening_v1.sql`, rerun Security Advisors, and clear technician RPC execution warnings before production-like auth smoke.

## Preview Smoke Run


Record preflight and smoke outcomes in `docs/PREVIEW_SMOKE_FINDINGS.md`.

For seeded story smoke, run the preflight first. If it is blocked, resolve only the named setup blockers; do not paste env values, bypass links, portal tokens, or credentials into docs or chat. After preflight is ready, seed through the existing dashboard controls or `corepack pnpm demo:seed -- --target local|preview --confirm seed-demo-data`.

Latest status note: as of June 5, 2026, buyer walkthrough smoke validation was
executed on `codex/demo-readiness-buyer-walkthrough` and included the full
10-step route sequence with `/escrow-re` and tokened `/portal` in
`packages/domain/demoSmokePreflight.ts`.

- Fixture run scope is now: `/` → `/dispatch` → `/customers` → `/closeouts` →
  `/payments` → `/compliance` → `/inventory` → `/technicians` → `/escrow-re` →
  `/portal/<fixture-customer-id>?access_token=<redacted>`
- `tooling/local-fixture-smoke.ts` now validates visible internal links, dead-end
  progression CTAs, console/page runtime errors, overflow, and forbidden
  internal/dev text on both desktop and narrow routes.
- The local shell still lacks approved Supabase env names, so local and preview
  `demo:smoke` preflights remain blocked before seed/reset or authenticated
  preview browser smoke. Local Supabase target inspection still depends on Docker
  Desktop Linux engine and local Postgres availability.
- No seed/reset, browser login, provider dashboard mutation, environment
  mutation, migration, live compliance ingestion, preview mutation, or production
  data action was attempted during this pass.

Run these in order after the preview deployment has the approved environment variables:

1. Sign in as admin or dispatcher and confirm the protected admin shell loads.
2. Create a customer and active location.
3. Invite a technician and complete technician password setup through `/technician-login`.
4. Create a scheduled job, assign the technician, and confirm `/dispatch` and `/technicians` show the assignment.
5. Confirm `/dispatch` exception review calls out at-risk, unassigned, missing-coordinate, and missing-GPS-evidence stops without exposing exact technician GPS outside admin/dispatch.
6. Use the Expo app to queue status, geofence, form, chemical, photo, and signature captures while offline or simulated offline, and confirm per-stop next actions stay field-friendly.
7. Return online and confirm queued mobile writes sync.
8. Review the completed job in `/closeouts` and confirm proof-ready, missing-capture, GPS-review, needs-invoice, and billing-ready filters match the seeded story.
9. Create an invoice in `/payments`, create a Stripe payment link when test Stripe is configured, and confirm manual `Mark paid` and `Void` require confirmation.
10. Expand the customer ledger and confirm service, invoice, open-balance, and review filters do not expose provider internals.
11. Confirm `/customers` portal handoff review reflects contact readiness, active link state, recent service/proof, invoice/balance state, and manual/provider send mode without raw portal tokens, token hashes, provider payloads, exact GPS, storage paths, or internal notes.
12. Run `corepack pnpm compliance:ingest -- --dry-run --no-embed` first to validate the checked-in EPA/DPR/SPCB manifest without Supabase writes or OpenAI calls.
13. If the operator later approves a local or preview Supabase target, rerun `corepack pnpm compliance:ingest` without `--dry-run` only after the required env names are loaded and the target is confirmed. Open `/compliance` and confirm source counts, source-readiness workflow cards, Chemical Product Binder summary/cards, and advisory status render; if `OPENAI_API_KEY` is intentionally unset, confirm the disabled state is explicit and no secret values appear. If `20260516175724_california_compliance_rag_v1.sql` is not applied, confirm the setup-required state is explicit and no raw Supabase error appears.
14. Generate a portal token, copy the session link, and open `/portal/<customer-id>?access_token=<token>`.
15. Confirm portal provider readiness shows webhook-backed or manual-only mode without exposing env values.
16. If portal webhook is configured, use `Send link ▶` and active-row `Send new link`; confirm the UI says `Send requested` without claiming delivery and the history drawer shows provider-safe send attempt events.
17. If portal webhook is not configured, confirm manual copy remains available and provider send controls do not invite a send.
18. Revoke an active portal link and confirm the old tokened portal URL no longer loads.
19. Create an automation template/rule, preview scheduler output, run the scheduler manually, and confirm generated notifications.
20. If notification webhook is configured, send one notification and bulk-send visible pending notifications; otherwise confirm manual delivery fallback.
21. Trigger the cron route only with an approved `CRON_SECRET` or `AUTOMATION_CRON_SECRET`.
22. Confirm browser-visible screens do not expose service-role keys, cron secrets, Stripe secrets, webhook secrets, token hashes, raw stored tokens, provider payloads, or provider message internals.

## Deferred Follow-Ups


- Durable provider delivery receipts for portal sends.
- Richer provider failure classification in portal send UI.
- Live compliance source ingestion after the compliance migration is explicitly approved and applied to the target environment.
- Supabase Security Advisor follow-up:
  - [ ] Apply `20260609000000_supabase_rpc_execute_grants_hardening_v1.sql` to the approved local target.
  - [ ] Verify local migration applies cleanly.
  - [ ] Apply to approved preview target.
  - [ ] Rerun Supabase Security Advisors.
  - [ ] Confirm no anon SECURITY DEFINER RPC warnings remain.
  - [ ] Confirm authenticated SECURITY DEFINER warnings are either gone or explicitly accepted with documented rationale.
  - [ ] Enable leaked-password protection in Supabase Auth settings (operator action).
  - [ ] Rerun Auth advisor and confirm leaked-password warning is resolved.
  - [ ] Run authenticated mobile technician RPC smoke flows.
  - [ ] Run admin smoke for jobs/dispatch/closeouts.
- Supabase leaked password protection if the project moves to Supabase Pro.
- Map-provider planning after token, cost, privacy, env, and provider-dashboard setup decisions are approved.
- Production launch checklist after preview smoke passes.
