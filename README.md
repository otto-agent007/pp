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

Use Node.js `24.20.0` (pinned in `.nvmrc`) or a newer 24.x release and pnpm `12.3.4`.

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

The seed creates the admin demo login `demo@email.com` plus the synthetic ops story, including 16 technicians, 100 customers, 108 locations, 180 current-week San Diego demo jobs, 14 realistic synthetic inventory items, proof-ready closeout data, and synthetic service-photo/signature media. When the demo admin account signs in, the app automatically refreshes demo-owned operational records while preserving the signed-in demo admin session. Local development sign-in also shows a one-click demo login button; when Supabase env values are absent, it opens the no-auth local fixture demo instead of calling authenticated seed routes, so a manual local seed step is optional. The demo admin password is never committed: seeding reads it from `DEMO_SEED_ADMIN_PASSWORD` in the operator environment, and local development falls back to a throwaway default so `demo:seed` stays one command against a local database. To show the one-click button in a production-mode build, set **both** `NEXT_PUBLIC_SHOW_DEMO_LOGIN=true` and `NEXT_PUBLIC_DEMO_LOGIN_PASSWORD` on that deployment only — the second is deliberately `NEXT_PUBLIC_`, because a one-click demo button publishes whatever password it types, so treat it as a public credential, point it at a demo-only Supabase project, and rotate it from the deployment's environment rather than from code. With neither variable set (the default) no demo password reaches the client bundle and the button is hidden, while the normal email/password form still works for an operator who knows the credential. Use `--target preview` only from an operator shell with the approved preview Supabase URL and `SUPABASE_SERVICE_ROLE_KEY` already loaded, and set `DEMO_SEED_ALLOWED_SUPABASE_URL` to the Supabase project demos may write to: a preview seed refuses any project that variable does not name, because preview deployments otherwise point at whatever project the deployment is configured with. A preview seed or reset through the HTTP route additionally has to present `DEMO_SEED_PREVIEW_SECRET` as an `x-demo-seed-secret` header — the variable merely existing is not enough, and a browser cannot hold it, so the dashboard's Demo data panel seeds local targets only. Optional technician login demos can pass `--tech-password-env DEMO_TECH_PASSWORD`; that technician password value stays in the operator environment and is never written to the repo. The dashboard action uses the same server-side guardrails and replaces existing demo-owned records before reseeding.

The current fixture-ready admin polish also surfaces dashboard BI cards,
technician performance, denser dispatch proof cards, inventory usage recency,
closeout proof-state cues, compliance live-state clarity, shared job schedule
wall-clock labels across admin/customer proof and billing surfaces, a shared
mobile sync badge, WDO / Escrow Clearance readiness queues, and a white app
canvas from existing hook/runtime data and design tokens, without new
migrations, providers, seed/reset writes, preview mutations, or production
mutations.

## Environment

Copy `.env.example` to the app-specific env file you need, then provide Supabase and provider credentials.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SHOW_DEMO_LOGIN=false
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

The preflight report shows the target, mode, source counts, chunk counts, and
which env names are still unset without printing secret values. Use `--dry-run`
for a read-only evidence pass, `--no-embed` to avoid OpenAI calls, and only run
without `--dry-run` after an operator approves the local or preview Supabase
target and loads the required env names. If `OPENAI_API_KEY` is unset, the live
run stores text chunks without embeddings.

See [Preview Launch Readiness](docs/PREVIEW_LAUNCH_READINESS.md) for the current operator-assisted preview punch list, and [Production Readiness](docs/PRODUCTION_READINESS.md) for setup order, Vercel settings, Supabase admin bootstrap, smoke tests, and security boundaries. Before production migration or deployment, review the [Backup and Rollback Runbook](docs/BACKUP_ROLLBACK_RUNBOOK.md), [Customer Data Privacy and Retention](docs/CUSTOMER_DATA_PRIVACY_RETENTION.md), and [Auth Production Hardening](docs/AUTH_PRODUCTION_HARDENING.md) checklists.

Use [Protected Preview Security Closure](docs/PROTECTED_PREVIEW_SECURITY_CLOSURE.md)
as the current production-readiness protection ledger. Production remains blocked
until its High gates are closed and Medium gates are closed or explicitly
accepted by the operator.

## Rate Limiting & Abuse Protection

- Sensitive API routes use a shared server-only helper at
  `apps/web/app/api/_lib/rate-limit.ts`.
- Local development and local/test executions use a safe no-op fallback for rate-limit enforcement.
- Production behavior is layered: route-level runtime policy checks and Vercel Firewall/WAF policy coverage.
- Rate-limit responses are intentionally sanitized (`429` with a generic error message) and do not return counters, keys, tokens, or secret values.

## Current Focus

Current status as of June 9, 2026:

- The active implementation focus is Estimate to Work Order Conversion V1 on
  `codex/estimate-to-work-order-conversion-v1`.
- Office staff can convert an estimate into a new scheduled work order from
  `/closeouts` while preserving the estimate as the source record.
- The work order is linked by `parent_job_id`, inherits customer/location,
  maps to structured job classification, and appears to jobs/dispatch/mobile as
  normal scheduled work.
- Conversion prevents silent duplicate work orders, marks the estimate accepted
  where supported, and does not create invoices, payment links, payments,
  customer notifications, customer acceptance flows, quote engines, recurring
  billing, or project billing automation.
- `parent_job_id` and the needed classification fields already exist from Job
  Classification Foundation V1, so no new migration is needed for this slice.
