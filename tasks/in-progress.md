# In Progress

## Task: Web Home Command Center V1

Goal:
Turn the web home page into an Option 1-inspired field-command dashboard that is useful immediately after sign-in while keeping data access inside existing hook, domain, and API-client boundaries.

Steps:
- [x] Add domain-backed derived state for home KPIs, schedule rows, alerts, next best action copy, portal/provider labeling, and guided demo smoke checklist prompts.
- [x] Replace the static home page with a client command center that consumes existing React Query hooks for customers, jobs, technicians, inventory, invoices, and portal provider status.
- [x] Keep `DemoSeedControls` on the home page and visually integrate it into the command-center workflow.
- [x] Restyle the web home surface toward the Option 1 field-command direction with a navy command header, compact KPI cards, dispatch schedule, readiness panel, and blue/yellow/red/green operational accents.
- [x] Add guided demo smoke links and sanitized evidence prompts without storing checklist pass/fail state.
- [x] Lightly polish `AdminNav` with a stronger brand strip, tighter density, clearer active state, preserved sign-out, and hidden portal navigation.
- [x] Run full verification: focused tests, `corepack pnpm test`, `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm build`, and `git diff --check`.

Follow-up candidates:
- [ ] Add richer dashboard widgets for dispatch map/live technician routing after the web command-center shell is stable.
- [ ] Add persistent operator-owned demo checklist state only if a later slice explicitly needs it.
- [ ] Plan a separate mobile restyle pass instead of folding mobile UI changes into this web-first slice.

Status:
Implementation and verification are complete. This slice does not add routes, migrations, provider setup, production/env mutations, or new data-fetching boundaries.
