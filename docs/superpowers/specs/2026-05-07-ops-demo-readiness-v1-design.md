# Ops Demo Readiness V1 Design

## Goal

Make the signed-in home dashboard a practical demo command center for operators who need to show the product with live data and no seed scripts.

## Scope

This slice enriches the existing `/` dashboard. It does not add a new route, persist checklist state, seed production data, or call Supabase from the dashboard.

## Experience

The dashboard should show a concise "Ops demo command center" section with:

- A clear live-data reminder.
- Ordered workflow steps from customer creation through billing and portal follow-up.
- For each step: route, operator action, and success signal.
- Existing navigation cards remain available.

## Architecture

Demo guidance stays static in `packages/domain/demoReadiness.ts` and is consumed by `apps/web/app/page.tsx`. This keeps UI copy and workflow ordering testable outside React while avoiding new data access. UI components remain presentational and do not call Supabase directly.

## Testing

- Domain test verifies the enriched workflow contract and order.
- Home page test verifies the command-center copy, action text, success text, and links render without promising seeded production data.

## Follow-Up

Later slices can add live readiness counts or persisted checklist progress, but those require explicit data-flow work through hooks/domain/api-client and are intentionally out of scope here.
