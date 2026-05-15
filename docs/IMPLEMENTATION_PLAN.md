# Implementation Plan

## Current Priority: Web Home Command Center V1

1. Make the web home page an operational command center, not a marketing landing page.
2. Keep live data flowing through existing React Query hooks and existing domain/API-client boundaries; do not add home-specific API routes, Supabase calls from UI, database tables, or migrations.
3. Add domain-only presentation state for home KPIs, schedule rows, alerts, next best action copy, provider labeling, and guided smoke checklist prompts.
4. Follow the Option 1 visual direction: bold navy command header, compact KPI cards, high-clarity panels, and blue/yellow/red/green status accents.
5. Keep `DemoSeedControls` available on the home page, but fold it into the command-center workflow.
6. Add guided demo smoke route links with sanitized evidence prompts and no persistent pass/fail state.
7. Lightly polish `AdminNav` while preserving active-route accessibility, portal-route hiding, and sign-out.

## Next Decision Points

1. Run full verification for the command-center slice.
2. Decide whether the next web slice should add richer dispatch map/route widgets, deeper billing readiness, or more provider delivery evidence.
3. Keep mobile restyling as a separate slice.
4. Add persistent checklist completion only after an explicit operator workflow requires it.
