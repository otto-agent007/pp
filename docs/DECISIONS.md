# Architecture & Logic Decisions

1. **Monorepo Structure (April 2026)**: Shifted from standard MVC to
   domain-driven design to isolate EPA/WDO compliance rules and offline sync
   logic from the UI.
2. **Offline Sync**: The target architecture will use a local durable queue in
   the planned `packages/sync` package so the mobile app can function without
   cell service. That package is absent in CR01 and will be implemented in a
   later controlled-rebuild slice.
3. **Chemical Inventory**: Is handled through Supabase PostgreSQL triggers so
   deductions are not missed, whether work originates on web or mobile.
4. **Controlled rebuild architecture debt (August 25, 2026)**: Package
   direction is currently violated, and conforming destinations arrive in
   later controlled-rebuild slices. Encode the target allowlists now, freeze
   exact debt as expiring executable exceptions, and remove that debt only in
   graph-owned slices. This prevents silent growth, keeps temporary exceptions
   visible, and does not move runtime code as part of CR01.
