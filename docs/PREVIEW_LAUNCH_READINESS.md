# Preview Launch Readiness

This punch list prepares Pest Patrol OS for a Vercel preview backed by an approved Supabase environment. It is operator-assisted: Codex may inspect code, docs, and local verification output, but dashboard changes, secrets, production data, provider config, and migration application require explicit operator approval.

## Codex-Owned Repo Work

- Keep `README.md`, `docs/IMPLEMENTATION_PLAN.md`, `tasks/in-progress.md`, and `docs/PRODUCTION_READINESS.md` aligned to preview launch readiness.
- Verify route and env names against the code before smoke testing.
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
  - `OPENAI_API_KEY` (optional, server-only compliance RAG)
  - `OPENAI_COMPLIANCE_EMBEDDING_MODEL` (optional compliance RAG model override)
- Configure mobile preview variables when testing Expo:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Configure Stripe test-mode webhook delivery to `/api/payments/stripe-webhook` if payment webhook smoke is in scope.
- Optionally configure notification and portal delivery webhook endpoints. If omitted, notification delivery and portal sharing must be smoke-tested through manual fallback behavior.
- Provide an interactive Vercel preview access path before browser smoke. If Deployment Protection is enabled, use an authenticated browser session, a temporary share link, or explicitly approve Codex to create a protected-preview access link if available.
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
- `20260512043439_portal_token_audit_events_v1.sql`
- `20260513120000_portal_send_audit_events_v1.sql`
- `20260516175724_california_compliance_rag_v1.sql` (operator-approved compliance RAG proposal; not applied by Codex)
- `20260518021520_portal_send_succeeded_event.sql` (portal send-event proposal; not applied by Codex)

Before applying migrations, the operator should confirm the target Supabase project/environment, backup/rollback comfort, and whether any migrations have already been applied. Inspect remote migration history before any apply, then apply pending files strictly in timestamp order. The compliance and portal send-event migrations are currently proposals; Codex should not run migration apply commands without explicit approval.

RLS/Data API note: apply migrations strictly in timestamp order. The compliance RAG and portal audit migrations depend on `20260507220000_supabase_security_hardening_v1.sql` because their policies call `private.has_admin_access()`; do not apply them as standalone SQL to a target missing that hardening migration. The compliance tables deliberately grant Data API reachability to `authenticated` and `service_role`, not `anon`; RLS remains the row-level boundary for authenticated users. `service_role` access is server/tooling-only, bypasses RLS, and must never be exposed as `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*`.

Apply-readiness checklist for local vs preview target:

- Confirm whether the intended target is local Supabase or the protected preview project before loading any env values.
- Inspect target migration history first; do not infer it from local files alone.
- If using local Supabase, make Docker Desktop's Linux engine and local Postgres on `127.0.0.1:54322` reachable before relying on local migration history.
- If using preview Supabase, use only an operator-approved shell or dashboard session and do not paste secrets, bypass values, or raw portal tokens into docs/chat.
- Apply pending migrations strictly in timestamp order through `20260518021520_portal_send_succeeded_event.sql`.
- After migration approval and application, rerun `corepack pnpm demo:smoke -- --target local|preview`, then `corepack pnpm compliance:ingest -- --dry-run --no-embed`, before seed/reset or live ingestion.

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
- Supabase leaked password protection if the project moves to Supabase Pro.
- Map-provider planning after token, cost, privacy, env, and provider-dashboard setup decisions are approved.
- Production launch checklist after preview smoke passes.
