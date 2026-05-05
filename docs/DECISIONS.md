# Architecture & Logic Decisions
1. **Monorepo Structure (April 2026)**: Shifted from standard MVC to Domain-Driven Design to heavily isolate EPA/WDO compliance rules and offline sync logic from the UI.
2. **Offline Sync**: Will use a local queue pattern separated into `packages/sync` to ensure mobile app functions without cell service.
3. **Chemical Inventory**: Handled via Supabase PostgreSQL Triggers at the database level to ensure no deductions are missed, regardless of whether they come from web or mobile.