# Architecture & Logic Decisions

1. **Monorepo Structure (April 2026)**: Shifted from standard MVC to
   domain-driven design to isolate EPA/WDO compliance rules and offline sync
   logic from the UI.
2. **Offline Sync**: Uses a local queue pattern separated into `packages/sync`
   so the mobile app can function without cell service.
3. **Chemical Inventory**: Is handled through Supabase PostgreSQL triggers so
   deductions are not missed, whether work originates on web or mobile.
4. **Controlled rebuild architecture debt (August 25, 2026)**: Package
   direction is currently violated, and conforming destinations arrive in
   later controlled-rebuild slices. Encode the target allowlists now, freeze
   exact debt as expiring executable exceptions, and remove that debt only in
   graph-owned slices. This prevents silent growth, keeps temporary exceptions
   visible, and does not move runtime code as part of CR01.
