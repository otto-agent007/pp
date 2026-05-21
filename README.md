# Pest Patrol OS

Pest Patrol OS is a pest control operations platform intended to replace PestPac with an offline-first technician app, an admin dashboard, customer portal workflows, and Supabase-backed operational data.

## Stack

- Monorepo: Turborepo + pnpm
- Web: Next.js App Router, Tailwind CSS, React Query
- Mobile: Expo React Native
- Backend: Supabase Postgres with RLS and triggers
- Planned integrations: Stripe, Google Maps/Mapbox

## Architecture Rules

- All database access goes through `packages/api-client`.
- Business logic belongs in shared packages, especially `packages/domain`.
- Apps consume server state through React Query hooks and optimistic mutations.
- Mobile writes must be offline-safe, queued, retried, and synced.
- Shared contracts live in `packages/types`.

## Getting Started

Use Node.js `20.19.4` or newer and pnpm `9.15.4`.

```bash
pnpm install
pnpm dev
```

Run checks:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Preflight local or protected preview demo smoke before running any write-capable seed/reset command:

```bash
corepack pnpm demo:smoke -- --target local
corepack pnpm demo:seed -- --target local --confirm seed-demo-data
corepack pnpm demo:reset -- --target local --confirm seed-demo-data
```

`demo:smoke` is read-only: it checks required environment variable names, reports blockers, prints the safe next commands, and never calls Supabase or prints secret values. Seed local or protected preview demo data from the dashboard's Demo data panel, or from an operator shell after the preflight is ready.

The seed creates the easy admin demo login `demo@email.com` / `password` plus the synthetic ops story, including San Diego demo stops, proof-ready closeout data, and synthetic service-photo/signature media. Local development sign-in also shows a one-click demo login button that prepares the fake story on localhost before signing in, so a manual local seed step is optional. Use `--target preview` only from an operator shell with the approved preview Supabase URL and `SUPABASE_SERVICE_ROLE_KEY` already loaded. Optional technician login demos can pass `--tech-password-env DEMO_TECH_PASSWORD`; that technician password value stays in the operator environment and is never written to the repo. The dashboard action uses the same server-side guardrails and replaces existing demo-owned records before reseeding.

## Environment

Copy `.env.example` to the app-specific env file you need, then provide Supabase and provider credentials.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NOTIFICATION_DELIVERY_WEBHOOK_URL=
NOTIFICATION_DELIVERY_WEBHOOK_SECRET=
PORTAL_DELIVERY_WEBHOOK_URL=
PORTAL_DELIVERY_WEBHOOK_SECRET=
CRON_SECRET=
AUTOMATION_CRON_SECRET=
OPENAI_API_KEY=
OPENAI_COMPLIANCE_EMBEDDING_MODEL=
```

Mobile builds also need Expo public Supabase values:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Compliance RAG source ingestion is operator-run and safe to preflight without
database writes:

```bash
corepack pnpm compliance:ingest -- --dry-run --no-embed
```

After the compliance migration is applied to an approved local or preview
Supabase environment, the same command can be run without `--dry-run`.
If `OPENAI_API_KEY` is unset, ingestion stores text chunks without embeddings.

See [Preview Launch Readiness](docs/PREVIEW_LAUNCH_READINESS.md) for the current operator-assisted preview punch list, and [Production Readiness](docs/PRODUCTION_READINESS.md) for setup order, Vercel settings, Supabase admin bootstrap, smoke tests, and security boundaries.

## Current Focus

Current priority is the provider-free demo reliability batch and California compliance RAG baseline while protected-preview smoke remains operator-gated:

- `/closeouts` is the Billing work queue for completed-job readiness
- `/payments` remains the invoice workspace with closeouts, reconciliation, customer, and portal handoffs
- `/customers` now includes expandable account ledger drill-downs, portal-token readiness, portal handoff review, provider status, fresh-token send, and send-attempt history
- tokened `/portal` routes now include a customer-safe service, billing timeline, and proof-of-service summary
- `/dispatch` includes provider-free scheduled route intelligence, a still San Diego dispatch map, exception review, triage filters, route groups by technician/day/status, GPS evidence after mobile sync, and external map links without embedded map SDKs
- `/compliance` provides an advisory-only, Supabase-first RAG workspace for California structural pest rules, EPA label review, recurring routes, WDO/Branch 3 evidence, and multi-unit audit readiness; it includes source-readiness review and degrades cleanly when `OPENAI_API_KEY` is absent or `20260516175724_california_compliance_rag_v1.sql` has not been applied
- the design-token foundation now feeds Tailwind, Figma variable names, the Expo mobile route shell, and tokenized mobile capture controls while preserving offline-first field stores and queue behavior
- the mobile technician route flow groups existing offline-first field controls into a clearer visit sequence with done, queued, retry, needed readiness, and per-stop next actions
- `/closeouts` now summarizes proof handoff readiness, admin proof review, GPS evidence, invoice state, billing handoff confidence, and review-queue filters while keeping customer portal proof sanitized
- `/payments` now includes closeout-to-invoice handoff states, reconciliation summaries, needs-review explanations, and manual paid/void confirmation feedback without Stripe provider setup
- the app shell now uses checked-in brand wordmark/logomark wrappers with SVG ID suffixing, while `docs/design-system/` remains a reference export rather than the app token source
- the home dashboard now shows provider-free launch gates for local smoke, protected-preview smoke, compliance source setup, and portal delivery mode without exposing secret values
- the repo audit cleanup removed production `as never` casts, added token-drift guardrails, tokenized app chrome/admin surfaces, and added a local `send_succeeded` portal audit-event migration proposal without applying it to any database
- demo seed/reset now carries a richer San Diego proof story, including uploaded synthetic service-photo/signature media, media-aware summary counts, and checked-in local fixture assets for proof rendering without Supabase storage access
- preview launch readiness has a Ready Vercel preview baseline, pending local Supabase migration files, dispatch technician query-param preselection, and demo seed/smoke tooling
- current status: California Compliance RAG V1 plus source-ingestion tooling are implemented as an advisory-only baseline, the dry-run/no-embed source preflight passes locally, the compliance advisory route checks schema/RPC readiness before OpenAI embeddings, the customer/admin shared-primitives closeout is locally verified, the brand-font direction bundle is design-only guidance, the `/auth/update-password` Vercel lambda mapping blocker is fixed, local Windows Vercel packaging is now blocked by a symlink `EPERM`, and pending migration application remains gated on an approved local or preview target; no preview/production migration has been applied by Codex; the latest Ready preview is `https://pest-patrol-9p9xhuitd-ottoagent007-gmailcoms-projects.vercel.app`; the latest local and preview preflights remain blocked on approved Supabase env names, local Docker/Postgres availability for local Supabase target inspection, protected-preview access, and admin/dispatcher sign-in
- next candidates: verify the approved local/preview migration target before applying compliance or portal audit-event migrations, run `compliance:ingest` in a local/approved environment, resolve the remaining local Windows Vercel symlink packaging blocker if local `vercel build` remains required, operator loads approved env/access and reruns local or protected-preview smoke, provider delivery receipts after webhook-backed evidence, production launch checklist work, or later map-provider planning
- use Claude as optional external UI design input for UI-heavy polish while Codex owns implementation and verification
- use `docs/CODEX_CLAUDE_GITHUB_WORKFLOW.md` for the Codex-Claude-GitHub handoff and stewardship loop
- keep mobile writes offline-safe and shared logic in packages
- avoid migration application, Supabase dashboard changes, environment variable changes, provider dashboard mutations, or production data mutations without explicit approval
