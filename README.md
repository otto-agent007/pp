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
- current slice: Preview Launch Readiness prepares a Vercel preview backed by an approved Supabase environment
- next candidates: run operator-assisted preview smoke, then decide whether dispatch query-param preselection or provider delivery receipts are needed
- use Claude as optional external UI design input for UI-heavy polish while Codex owns implementation and verification
- use `docs/CODEX_CLAUDE_GITHUB_WORKFLOW.md` for the Codex-Claude-GitHub handoff and stewardship loop
- keep mobile writes offline-safe and shared logic in packages
- avoid migration application, Supabase dashboard changes, environment variable changes, provider dashboard mutations, or production data mutations without explicit approval
