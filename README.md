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
CRON_SECRET=
AUTOMATION_CRON_SECRET=
```

Mobile builds also need Expo public Supabase values:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

See [Production Readiness](docs/PRODUCTION_READINESS.md) for setup order, Vercel settings, Supabase admin bootstrap, smoke tests, and security boundaries.

## Current Focus

Current priority is Daily Route Timeline V1:

- guide technician mobile work through current, next, and later assigned jobs
- prioritize route focus by job status, then scheduled order
- reuse offline queue and field work-plan readiness for capture progress labels
- keep dispatch aligned with technician route ordering
- avoid maps, route optimization, and provider configuration in this slice
- track Supabase leaked password protection as a deferred Pro-plan hardening item
