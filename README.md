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

The seed creates the easy admin demo login `demo@email.com` / `password` plus the synthetic ops story. Local development sign-in also shows a one-click demo login button that prepares the fake story on localhost before signing in, so a manual local seed step is optional. Use `--target preview` only from an operator shell with the approved preview Supabase URL and `SUPABASE_SERVICE_ROLE_KEY` already loaded. Optional technician login demos can pass `--tech-password-env DEMO_TECH_PASSWORD`; that technician password value stays in the operator environment and is never written to the repo. The dashboard action uses the same server-side guardrails and replaces existing demo-owned records before reseeding.

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
```

Mobile builds also need Expo public Supabase values:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

See [Preview Launch Readiness](docs/PREVIEW_LAUNCH_READINESS.md) for the current operator-assisted preview punch list, and [Production Readiness](docs/PRODUCTION_READINESS.md) for setup order, Vercel settings, Supabase admin bootstrap, smoke tests, and security boundaries.

## Current Focus

Current priority is preview launch readiness after the portal-led batch in PR #27:

- `/closeouts` is the Billing work queue for completed-job readiness
- `/payments` remains the invoice workspace with closeouts, reconciliation, customer, and portal handoffs
- `/customers` now includes expandable account ledger drill-downs, portal-token readiness, provider status, fresh-token send, and send-attempt history
- tokened `/portal` routes now include a customer-safe service and billing timeline
- current slice: Demo Smoke Preflight V1 adds a read-only preflight before local/protected-preview demo smoke, then keeps all writes in the existing seed/reset/dashboard paths
- next candidates: operator runs local or protected-preview smoke against the seeded story, then decide whether portal delivery receipts are needed
- use Claude as optional external UI design input for UI-heavy polish while Codex owns implementation and verification
- use `docs/CODEX_CLAUDE_GITHUB_WORKFLOW.md` for the Codex-Claude-GitHub handoff and stewardship loop
- keep mobile writes offline-safe and shared logic in packages
- avoid migration application, Supabase dashboard changes, environment variable changes, provider dashboard mutations, or production data mutations without explicit approval
