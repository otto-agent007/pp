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

The seed creates the easy admin demo login `demo@email.com` / `password` plus the synthetic ops story, including 16 technicians, 100 customers, 108 locations, 180 current-week San Diego demo jobs, 14 realistic synthetic inventory items, proof-ready closeout data, and synthetic service-photo/signature media. When the demo admin account signs in, the app automatically refreshes demo-owned operational records while preserving the signed-in demo admin session. Local development sign-in also shows a one-click demo login button; when Supabase env values are absent, it opens the no-auth local fixture demo instead of calling authenticated seed routes, so a manual local seed step is optional. Use `--target preview` only from an operator shell with the approved preview Supabase URL and `SUPABASE_SERVICE_ROLE_KEY` already loaded. Optional technician login demos can pass `--tech-password-env DEMO_TECH_PASSWORD`; that technician password value stays in the operator environment and is never written to the repo. The dashboard action uses the same server-side guardrails and replaces existing demo-owned records before reseeding.

The current fixture-ready admin polish also surfaces dashboard BI cards,
technician performance, denser dispatch proof cards, inventory usage recency,
closeout proof-state cues, compliance live-state clarity, shared job schedule
wall-clock labels across admin/customer proof and billing surfaces, a shared
mobile sync badge, and a white app canvas from existing hook/runtime data and
design tokens, without new migrations, providers, seed/reset writes, preview
mutations, or production mutations.

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

Current status as of June 4, 2026:

- PR #89, Chemical Product Binder V1, merged on June 3, 2026.
- PR #90, the fresh `codex/*` branch and draft-PR completion rule, merged on June 3, 2026.
- PR #98, Pest Patrol Service Billing Catalog V1, merged on June 4, 2026.
- PR #99, Shared Compliance Review Items Safe Hook V1, merged on June 4, 2026.
- Active branch: `codex/technician-license-branch-credentials-v1` implements Technician License / Branch Credential Tracking V1 with proposed-only `technician_licenses` schema, shared credential readiness helpers, React Query hooks, `/technicians` credential panels/forms, and `/compliance` credential alerts.
- `/compliance` remains advisory-only: RAG/source-backed advisories degrade cleanly when `OPENAI_API_KEY` is absent or `20260516175724_california_compliance_rag_v1.sql` has not been applied, Chemical Product Binder status stays deterministic where possible from existing inventory, chemical logs, jobs, reviewed source readiness, and technician credential evidence, and missing/expiring credential copy stays advisory.
- Core admin workflows are provider-free and demo-ready locally: `/`, `/dispatch`, `/customers`, `/jobs`, `/technicians`, `/inventory`, `/payments`, `/closeouts`, `/compliance`, `/automation`, and tokened `/portal` have fixture-smoke coverage from recent verified slices.
- Demo seed/reset still carries the larger San Diego proof story with 16 technicians, 100 customers, 108 locations, 180 current-week jobs, 14 inventory items, proof media, invoices/payments, portal-ready closeouts, and guarded `demo@email.com` refresh behavior.
- No Codex-run local, preview, or production migration apply, provider dashboard mutation, environment mutation, seed/reset write, live compliance ingestion, or production data action has been performed; the technician credential migration is checked in for review only.
- Real local and protected-preview seed/reset or authenticated browser smoke remain blocked until the operator supplies approved Supabase env names, a reachable local Docker/Postgres target if local Supabase is used, protected-preview access, and an admin/dispatcher sign-in path.
- Next candidates after this credential slice lands: inventory deep-linking from Chemical Product Binder or service/catalog follow-through based on operator priority.
