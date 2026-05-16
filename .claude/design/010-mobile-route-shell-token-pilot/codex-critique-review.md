# Codex Critique Review: Mobile Route Shell Token Pilot

## Valid findings to fix now

- Remove the duplicate header `Refresh` action. The scroll-area `Refresh` already calls the same jobs `load()` path and should remain canonical.
- Replace the `demoNextLabel` and `demoNextSummary` public domain fields with production-named `routeFocusLabel` and `routeFocusSummary`.
- Replace the demo readiness copy with route-ready and no-route copy.
- Tighten the six sync detail lines for field readability.
- Hide zero-value sync count chips and leave the last-sync chip as the clean-state signal.
- Add a visible `Retry` button inside the assigned-jobs error card.

## Deferred follow-ups

- Login and loading screen token wiring.
- Focused later-stop collapse affordance.
- Later-row readiness label suppression.
- `Sync needed` label shortening if simulator testing proves the current label wraps poorly.

## Rejected or out of scope

- No changes to GPS, status, treatment form, chemical log, photo upload, signature, or treatment-form internals.
- No map SDKs, provider setup, background tracking, notifications, schema changes, migrations, RLS changes, Figma writes, Vercel mutations, or production mutations.
- No direct Supabase reads or writes from mobile UI.

## Verification needed after fixes

- Confirm the route shell still loads assigned jobs through the existing store and preserves offline queue behavior.
- Confirm the scroll-area `Refresh` still reloads jobs and updates header readiness counts.
- Confirm sync copy and summary chips remain readable at narrow mobile widths.
- Confirm the error-card `Retry` button calls the existing jobs `load()` path.
